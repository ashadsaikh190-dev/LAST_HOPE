import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import api from '../../api/axios';
import { useSocket } from '../../contexts/SocketContext';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { notifications: liveNotifs } = useSocket();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/students/notifications');
        if (res.data.success) {
          setNotifications(res.data.data);
        }
      } catch (e) {
        // Ignore if unauthenticated or not student
      }
    };
    fetchNotifications();
  }, []);

  // Merge live incoming socket notifications
  useEffect(() => {
    if (liveNotifs.length > 0) {
      setNotifications((prev) => [liveNotifs[0], ...prev]);
    }
  }, [liveNotifs]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await api.put(`/students/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-brand-600 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            <span className="text-xs text-slate-500 font-medium">{notifications.length} Total</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No notifications available
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id || Math.random()}
                  className={`p-3.5 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-brand-50/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n._id)}
                        className="text-slate-400 hover:text-brand-600 p-0.5"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.content}</p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
