import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Info,
  ShieldAlert,
  Trash2,
  Check,
  Search,
  Filter
} from "lucide-react";
import { useState } from "react";

export interface NotificationItem {
  id: string;
  type: "emergency" | "alert" | "info" | "success";
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: "Water" | "Complaints" | "Bills" | "Civic Works" | "Advisory";
  referenceId?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "emergency",
    title: "Urgent: Water Line Maintenance",
    message: "Volumetric boosting pipeline undergoing scheduled valve replacement. Low water pressure expected between 10:00 AM and 02:00 PM today.",
    time: "45 mins ago",
    read: false,
    category: "Water",
    referenceId: "WTR-MAINT-401",
  },
  {
    id: "notif-2",
    type: "success",
    title: "Complaint #OS-FBD-2026-01 Assigned",
    message: "Technician Amit Verma has been dispatched for road repair near Sector 16. Estimated arrival today within shift hours.",
    time: "2 hours ago",
    read: false,
    category: "Complaints",
    referenceId: "OS-FBD-2026-01",
  },
  {
    id: "notif-3",
    type: "alert",
    title: "Upcoming Bill Due Date",
    message: "Electricity utility bill #ELEC-2026-0418 of ₹1,840 is due on 20 Apr 2026. Settle early to avoid standard surcharge.",
    time: "1 day ago",
    read: false,
    category: "Bills",
    referenceId: "ELEC-2026-0418",
  },
  {
    id: "notif-4",
    type: "info",
    title: "Civic Road Surface Upgrade",
    message: "Carpeting work initiated along the main marketplace connecting road. One-way traffic diversion active till Wednesday.",
    time: "2 days ago",
    read: true,
    category: "Civic Works",
  },
  {
    id: "notif-5",
    type: "success",
    title: "Payment Receipt Acknowledged",
    message: "Your payment of ₹860 for City Gas bill #PNG-2026-1029 was processed successfully. Official voucher generated.",
    time: "4 days ago",
    read: true,
    category: "Bills",
    referenceId: "RCPT-982140",
  },
];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "unread"
        ? !n.read
        : n.type === filterType;

    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getTypeMeta = (type: NotificationItem["type"]) => {
    switch (type) {
      case "emergency":
        return {
          icon: ShieldAlert,
          iconColor: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          tagBg: "bg-red-100 text-red-800",
        };
      case "alert":
        return {
          icon: AlertTriangle,
          iconColor: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          tagBg: "bg-amber-100 text-amber-800",
        };
      case "success":
        return {
          icon: CheckCircle,
          iconColor: "text-emerald-600",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
          tagBg: "bg-emerald-100 text-emerald-800",
        };
      case "info":
      default:
        return {
          icon: Info,
          iconColor: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          tagBg: "bg-blue-100 text-blue-800",
        };
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            Real-time civic alerts, complaint progress, and utility advisories
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-blue-600" />
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "emergency", label: "Urgent" },
            { id: "alert", label: "Alerts" },
            { id: "success", label: "Updates" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? "bg-gray-800 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Cards List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-gray-700">No notifications found</p>
            <p className="text-xs text-gray-400 mt-0.5">
              You are all caught up with announcements and alerts.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const meta = getTypeMeta(notif.type);
            const Icon = meta.icon;

            return (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`relative bg-white border rounded-xl p-4 transition-all duration-150 cursor-pointer ${
                  !notif.read
                    ? "border-blue-300 ring-1 ring-blue-100 shadow-xs"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg border shrink-0 mt-0.5 ${meta.bgColor} ${meta.borderColor}`}
                    >
                      <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${meta.tagBg}`}>
                          {notif.category}
                        </span>
                        {notif.referenceId && (
                          <span className="text-[10px] font-mono text-gray-400">
                            Ref: {notif.referenceId}
                          </span>
                        )}
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>

                      <h3
                        className={`text-sm mt-1 ${
                          !notif.read ? "font-bold text-gray-900" : "font-medium text-gray-800"
                        }`}
                      >
                        {notif.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-2">
                    <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notif.time}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
