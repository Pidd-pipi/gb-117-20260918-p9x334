import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { notificationAPI } from '../api'
import { useNotifications } from '../contexts/NotificationContext'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { refreshUnread } = useNotifications()

  useEffect(() => {
    loadNotifications()
  }, [])

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

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id)
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      )
      refreshUnread()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
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
        <h1 className="text-2xl font-bold text-gray-800">🔔 我的提醒</h1>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            全部标记已读
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <p className="text-gray-500">暂无提醒，收藏摊位后展会开始前48小时会提醒你哦～</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(n => (
            <div
              key={n._id}
              className={`bg-white rounded-xl shadow p-5 flex items-start justify-between gap-4 ${
                n.read ? 'opacity-60' : 'border-l-4 border-purple-500'
              }`}
            >
              <div className="flex-1">
                <p className="text-gray-800">
                  {!n.read && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>}
                  {n.message}
                </p>
                {n.expoId && (
                  <Link
                    to={`/expo/${n.expoId._id}`}
                    className="text-sm text-purple-600 hover:text-purple-800 mt-2 inline-block"
                  >
                    查看展会「{n.expoId.name}」→
                  </Link>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => handleMarkRead(n._id)}
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
