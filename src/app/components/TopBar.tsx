import { Search, Bell, Menu, User, LogOut, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface TopBarProps {
  userName: string;
  onMenuToggle: () => void;
}

export function TopBar({ userName, onMenuToggle }: TopBarProps) {
  const { signOut, isAdmin, role } = useAuth();
  const [notificationCount, setNotificationCount] = useState(2);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const citizenNotifications = [
    {
      id: "1",
      title: "Urgent: Water Line Maintenance",
      time: "45 mins ago",
      unread: true,
      desc: "Water pressure will be low between 10 AM and 2 PM.",
    },
    {
      id: "2",
      title: "Complaint #OS-FBD-2026-01 Assigned",
      time: "2 hours ago",
      unread: true,
      desc: "Technician Amit Verma dispatched for road repair.",
    },
    {
      id: "3",
      title: "Upcoming Bill Due Date",
      time: "1 day ago",
      unread: false,
      desc: "Electricity bill #ELEC-2026-0418 due on 20 Apr.",
    },
  ];

  const adminNotifications = [
    {
      id: "1",
      title: "High Priority Complaint Logged",
      time: "5 min ago",
      unread: true,
      desc: "Deep Pothole at Sector 16 flagged as High SLA.",
    },
    {
      id: "2",
      title: "Worker Shift Clock-In",
      time: "1 hour ago",
      unread: true,
      desc: "Amit Verma (Road Tech) is on-duty in Sector 15 Hub.",
    },
    {
      id: "3",
      title: "3 Work Orders Pending Review",
      time: "4 hours ago",
      unread: false,
      desc: "Resolutions awaiting admin verification.",
    },
  ];

  const notifications = isAdmin ? adminNotifications : citizenNotifications;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-2.5 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-700 dark:text-gray-200"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {(() => {
            const homeRoute =
              role === "admin"
                ? "/admin"
                : role === "worker"
                ? "/field-dashboard"
                : "/dashboard";

            return (
              <Link to={homeRoute} className="flex items-center gap-2 group">
                <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                  <svg
                    className="h-5 w-5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold text-gray-800 dark:text-white leading-tight">
                    OneServe
                  </h1>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Civic Services Portal
                  </p>
                </div>
              </Link>
            );
          })()}
        </div>

        {/* Search bar */}
        <div className="hidden md:flex flex-1 max-w-sm mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search services, bills, complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 relative">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative text-gray-700 dark:text-gray-200"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                  {notificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-gray-800 dark:text-gray-200">
                      Notifications
                    </span>
                    {notificationCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">
                        {notificationCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setNotificationCount(0)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/notifications");
                      }}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-snug">
                          {n.title}
                        </p>
                        {n.unread && (
                          <span className="h-2 w-2 bg-blue-600 rounded-full shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {n.desc}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {n.time}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2 text-center border-t border-gray-100 dark:border-gray-700 bg-gray-50/50">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 block py-1"
                  >
                    View All Notifications & Advisories →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <div className="h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                  {role}
                </p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                <Link
                  to={role === "admin" ? "/admin-settings" : role === "worker" ? "/worker-settings" : "/settings"}
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-500" />
                  Account Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-red-500" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
