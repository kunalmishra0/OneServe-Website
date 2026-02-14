import {
  Home,
  MessageSquareWarning,
  ClipboardList,
  CreditCard,
  FolderOpen,
  Trophy,
  Bell,
  Bot,
  Settings,
  MessageCircle,
  LogOut,
  ShieldCheck,
  Newspaper,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  {
    path: "/complaint-registration",
    label: "Register Complaint",
    icon: MessageSquareWarning,
  },
  {
    path: "/complaint-tracking",
    label: "Track Complaints",
    icon: ClipboardList,
  },
  { path: "/bill-payment", label: "Pay Bills", icon: CreditCard },
  { path: "/bill-management", label: "Bill Management", icon: FolderOpen },
  { path: "/gamification", label: "Rewards & Badges", icon: Trophy },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { path: "/feedback", label: "Feedback", icon: MessageCircle },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Dynamic nav items based on role
  const displayNavItems = isAdmin
    ? [
        { path: "/admin", label: "Admin Dashboard", icon: ShieldCheck },
        { path: "/admin-settings", label: "Admin Settings", icon: Settings },
      ]
    : [
        ...navItems.slice(0, 5),
        { path: "/schemes", label: "Govt. Schemes", icon: Newspaper },
        ...navItems.slice(5),
      ];

  const handleLogoClick = () => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
    if (window.innerWidth < 1024 && isOpen) onToggle();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 z-50
          transition-transform duration-300 ease-in-out w-64
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          shadow-lg
        `}
      >
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
            >
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg
                  className="h-6 w-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-gray-800 dark:text-white">
                  OneServe
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Menu</p>
              </div>
            </div>
            {/* Close button removed as per request */}
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {displayNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) onToggle();
                      }}
                      className={({ isActive }) => `
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-all duration-200
                        ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`h-5 w-5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
                          />
                          <span className="text-sm">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
