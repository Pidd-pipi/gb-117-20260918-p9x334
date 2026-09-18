const express = require('express');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Favorite = require('../models/Favorite');
const Expo = require('../models/Expo');

const router = express.Router();

// 展会开始前48小时内生成提醒
const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

// 为当前用户生成到期提醒：开始前48小时内、有收藏摊位的展会各生成一条
// 通过 (userId, expoId) 唯一索引 + upsert 保证重复请求不会重复生成
const generateReminders = async (userId) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const expos = await Expo.find({
    startDate: { $gt: now, $lte: windowEnd },
    status: { $ne: 'ended' }
  }).select('_id name startDate');

  for (const expo of expos) {
    const hasFavorite = await Favorite.exists({ userId, expoId: expo._id });
    if (!hasFavorite) continue;

    await Notification.updateOne(
      { userId, expoId: expo._id },
      {
        $setOnInsert: {
          userId,
          expoId: expo._id,
          message: `你收藏的展会「${expo.name}」将于 ${expo.startDate.toLocaleString('zh-CN')} 开始，记得准时参加！`
        }
      },
      { upsert: true }
    );
  }
};

// 查询有效提醒：展会已开始或收藏已清空的不再展示
const getVisibleNotifications = async (userId, filter = {}) => {
  const notifications = await Notification.find({ userId, ...filter })
    .populate('expoId', 'name startDate endDate status')
    .sort({ createdAt: -1 });

  const now = new Date();
  const visible = [];
  for (const n of notifications) {
    const expo = n.expoId;
    if (!expo) continue;
    if (expo.status === 'ended' || new Date(expo.startDate) <= now) continue;
    const hasFavorite = await Favorite.exists({ userId, expoId: expo._id });
    if (!hasFavorite) continue;
    visible.push(n);
  }
  return visible;
};

// 我的提醒列表
router.get('/', auth, async (req, res) => {
  try {
    await generateReminders(req.user._id);
    const notifications = await getVisibleNotifications(req.user._id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 未读数（导航角标用）
router.get('/unread-count', auth, async (req, res) => {
  try {
    await generateReminders(req.user._id);
    const unread = await getVisibleNotifications(req.user._id, { read: false });
    res.json({ count: unread.length });
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
    res.json({ message: '全部已读' });
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
