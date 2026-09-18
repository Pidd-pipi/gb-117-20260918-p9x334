const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expo',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 同一用户同一展会只保留一条提醒，重复生成时靠唯一索引兜底
notificationSchema.index({ userId: 1, expoId: 1 }, { unique: true });

module.exports = mongoose.model('Notification', notificationSchema);
