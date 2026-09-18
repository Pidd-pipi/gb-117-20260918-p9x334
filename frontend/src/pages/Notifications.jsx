import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { notificationAPI } from '../api'
import { useNotifications } from '../contexts/NotificationContext'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { refreshUnread } = useNotifications()

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getAll()
      setNotifications(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const markRead = async (notification) => {
    if (notification.read) return
    try {
      await notificationAPI.markRead(notification._id)
      setNotifications(prev =>
        prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
      )
      refreshUnread()
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      refreshUnread()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="text-center py-20">加载中...</div>
  }

  const hasUnread = notifications.some(n => !n.read)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🔔 站内提醒</h1>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            全部标记已读
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500">暂无提醒</p>
          <p className="text-gray-400 text-sm mt-2">收藏摊位后，展会开始前48小时内会收到提醒</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n._id}
              className={`bg-white rounded-xl shadow p-5 flex items-start gap-4 ${
                n.read ? 'opacity-60' : 'border-l-4 border-purple-500'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {!n.read && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                  <span className="font-bold text-gray-800">
                    {n.expoId?.name || n.title}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">{n.message}</p>
                {n.expoId?._id && (
                  <Link
                    to={`/expo/${n.expoId._id}`}
                    className="text-purple-600 hover:text-purple-800 text-sm inline-block mt-2"
                  >
                    查看展会 →
                  </Link>
                )}
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n)}
                  className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 whitespace-nowrap"
                >
                  标记已读
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
