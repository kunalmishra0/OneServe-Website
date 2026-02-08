import { AlertTriangle, Bell, CheckCircle, Info, Megaphone, X } from 'lucide-react';
import { useState } from 'react';

interface Notification {
  id: string;
  type: 'emergency' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'emergency',
      title: 'Water Supply Disruption',
      message: 'Water supply will be interrupted in your area from 10 AM to 2 PM today for maintenance work.',
      time: '2 hours ago',
      read: false,
      category: 'Water'
    },
    {
      id: '2',
      type: 'success',
      title: 'Complaint Resolved',
      message: 'Your complaint #CMP1002 regarding garbage collection has been marked as resolved.',
      time: '5 hours ago',
      read: false,
      category: 'Complaints'
    },
    {
      id: '3',
      type: 'alert',
      title: 'Bill Payment Due',
      message: 'Your electricity bill of ₹2,450 is due in 3 days. Pay now to avoid late fees.',
      time: '1 day ago',
      read: false,
      category: 'Bills'
    },
    {
      id: '5',
      type: 'alert',
      title: 'Road Closure',
      message: 'MG Road will be closed for repairs from Jan 24-26. Plan alternate routes.',
      time: '2 days ago',
      read: true,
      category: 'Traffic'
    },
  ]);

  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'alert':
        return <Bell className="h-6 w-6 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-600" />;
      default:
        return <Bell className="h-6 w-6 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-50 border-red-200';
      case 'alert':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Notifications
        </h1>
        <p className="text-gray-600">
          Stay updated with emergency alerts, bill reminders, and community announcements
        </p>
      </div>

      {/* Stats and filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{notifications.length}</p>
              <p className="text-sm text-gray-600">Total Notifications</p>
            </div>
            {unreadCount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {unreadCount} Unread
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'unread')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
            </select>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency broadcast banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 mb-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <Megaphone className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Emergency Broadcast System</h3>
            <p className="text-red-100">
              Critical alerts and emergency announcements will appear here. Make sure to enable notifications to stay safe.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications to display</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                bg-white rounded-lg shadow-sm border-2 p-6 transition-all
                ${!notification.read ? 'border-blue-500' : 'border-gray-200'}
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${getNotificationBgColor(notification.type).split(' ')[0]}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          NEW
                        </span>
                      )}
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {notification.category}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{notification.time}</span>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notification preferences */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Notification Preferences</h2>
        <div className="space-y-3">
          {[
            { label: 'Emergency Alerts', description: 'Critical announcements and emergency broadcasts', enabled: true },
            { label: 'Complaint Updates', description: 'Status updates on your complaints', enabled: true },
            { label: 'Bill Reminders', description: 'Due date reminders for utility bills', enabled: true },
            { label: 'Rewards & Badges', description: 'Gamification achievements', enabled: false },
          ].map((pref, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{pref.label}</p>
                <p className="text-sm text-gray-600">{pref.description}</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  defaultChecked={pref.enabled}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
