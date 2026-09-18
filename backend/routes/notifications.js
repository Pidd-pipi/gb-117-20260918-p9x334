const express = require('express');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Favorite = require('../models/Favorite');
const Expo = require('../models/Expo');

const router = express.Router();

// 展会开始前48小时内生成提醒
const REMIND_WINDOW_MS = 48 * 60 * 60 * 1000;

const formatDateTime = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 同步当前用户的提醒：
// 1. 为48小时内开幕且用户有收藏摊位的展会幂等生成提醒（同一用户同一展会仅一条）
// 2. 清理失效提醒：收藏已清空、展会已开始或已删除的不再展示
const syncNotifications = async (userId) => {
  const now = Date.now();

  const expoIds = await Favorite.distinct('expoId', { userId });
  const expos = expoIds.length > 0
    ? await Expo.find({ _id: { $in: expoIds } })
    : [];

  const keepIds = [];
  const upcoming = [];
  for (const expo of expos) {
    const start = new Date(expo.startDate).getTime();
    if (start > now) {
      keepIds.push(expo._id);
      if (start - now <= REMIND_WINDOW_MS) {
        upcoming.push(expo);
      }
    }
  }

  // 收藏清空 / 展会已开始 / 展会已删除 → 不再展示
  await Notification.deleteMany({ userId, expoId: { $nin: keepIds } });

  // upsert + $setOnInsert：重复或并发请求不会多生成，也不会重置已读状态
  for (const expo of upcoming) {
    try {
      await Notification.updateOne(
        { userId, expoId: expo._id },
        {
          $setOnInsert: {
            userId,
            expoId: expo._id,
            title: expo.name,
            message: `您收藏的展会「${expo.name}」将于 ${formatDateTime(expo.startDate)} 开始，记得来逛逛收藏的摊位哦～`
          }
        },
        { upsert: true }
      );
    } catch (error) {
      // 并发下唯一索引冲突说明提醒已存在，忽略即可
      if (error.code !== 11000) throw error;
    }
  }
};

// 我的提醒列表
router.get('/', auth, async (req, res) => {
  try {
    await syncNotifications(req.user._id);
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('expoId', 'name startDate endDate coverImage')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 未读数
router.get('/unread-count', auth, async (req, res) => {
  try {
    await syncNotifications(req.user._id);
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 全部标记已读
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: '已全部标记为已读' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 单条标记已读
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: '提醒不存在' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

module.exports = router;
