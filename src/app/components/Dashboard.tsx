import {
  MessageSquareWarning,
  ClipboardList,
  CreditCard,
  FolderOpen,
  Trophy,
  Bell,
  Bot,
  Settings,
  MessageCircle,
  TrendingUp,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext"; // Import useAuth for username

// Removed ViewType import as it is no longer used for props
// Removed DashboardProps interface

interface DashboardCard {
  id: string; // Changed to string for route path
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  hoverColor: string;
}

const dashboardCards: DashboardCard[] = [
  {
    id: "complaint-registration",
    title: "Register Complaint",
    description: "Report civic issues with AI assistance",
    icon: MessageSquareWarning,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    hoverColor: "hover:bg-blue-100",
  },
  {
    id: "complaint-tracking",
    title: "Track Complaints",
    description: "Monitor status of your complaints",
    icon: ClipboardList,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    hoverColor: "hover:bg-purple-100",
  },
  {
    id: "bill-payment",
    title: "Pay Bills",
    description: "Secure payment with fraud detection",
    icon: CreditCard,
    color: "text-green-600",
    bgColor: "bg-green-50",
    hoverColor: "hover:bg-green-100",
  },
  {
    id: "bill-management",
    title: "Bill Management",
    description: "View and manage all utility bills",
    icon: FolderOpen,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    hoverColor: "hover:bg-orange-100",
  },
  {
    id: "gamification",
    title: "Rewards Hub",
    description: "Earn badges and rewards",
    icon: Trophy,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    hoverColor: "hover:bg-yellow-100",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Emergency alerts & updates",
    icon: Bell,
    color: "text-red-600",
    bgColor: "bg-red-50",
    hoverColor: "hover:bg-red-100",
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "Get smart suggestions & help",
    icon: Bot,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    hoverColor: "hover:bg-indigo-100",
  },
  {
    id: "feedback",
    title: "Feedback",
    description: "Help us improve OneServe",
    icon: MessageCircle,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    hoverColor: "hover:bg-cyan-100",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Manage preferences & profile",
    icon: Settings,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    hoverColor: "hover:bg-gray-100",
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || "User";

  /* New State for Active Complaints */
  const [activeComplaintsCount, setActiveComplaintsCount] = useState(0);

  useEffect(() => {
    if (user) {
      const fetchCount = async () => {
        // Fetch count of complaints that are NOT resolved or rejected.
        // We check raw_complaints first. ideally we should check processed, but for now
        // we assume if it's not in processed as resolved, it's active.
        // Actually, let's just count raw_complaints where status is NOT 'resolved' (if we had that column synced)
        // Since we have a status column in raw_complaints (pending_analysis, processed),
        // we might need to join or just count all for now if we can't join easily.

        // BETTER APPROACH for 3-Layer:
        // We want to count items in 'processed_complaints' that are active + items in 'raw_complaints' that are pending.
        // Simplified: Count all raw_complaints for user, subtract those that are 'resolved'/'rejected' in processed.

        const { count, error } = await supabase
          .from("processed_complaints")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("complaint_status", [
            "submitted",
            "verified",
            "in_progress",
            "analyzing",
          ]); // Active statuses

        // Also add pending raw complaints (those not yet in processed)
        const { count: rawCount, error: rawError } = await supabase
          .from("raw_complaints")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "pending_analysis");

        if (!error && !rawError) {
          setActiveComplaintsCount((count || 0) + (rawCount || 0));
        }
      };

      fetchCount();
      // Subscribe to changes to update count live
      const channel = supabase
        .channel("dashboard-count")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "complaints",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchCount(),
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return (
    <div className="p-4 md:p-6 lg:p-8 transition-colors duration-200">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Welcome, {userName}
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Empowering Civic Engagement - Your one-stop platform for all civic
          services
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium mb-1">
                Active Complaints
              </p>
              <p className="text-3xl font-bold text-blue-800">
                {activeComplaintsCount}
              </p>
            </div>
            <div className="bg-blue-600 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-6 shadow-sm border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-200 font-medium mb-1">
                Pending Bills
              </p>
              <p className="text-3xl font-bold text-green-800 dark:text-white">
                2
              </p>
            </div>
            <div className="bg-green-600 p-3 rounded-full">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-lg p-6 shadow-sm border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-200 font-medium mb-1">
                Reward Points
              </p>
              <p className="text-3xl font-bold text-yellow-800 dark:text-white">
                450
              </p>
            </div>
            <div className="bg-yellow-600 p-3 rounded-full">
              <Trophy className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Services grid */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          All Services
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => navigate(`/${card.id}`)} // Use navigate hook
              className={`
                group bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700
                transition-all duration-300 hover:shadow-lg hover:-translate-y-1
                text-left
              `}
            >
              <div
                className={`${card.bgColor} dark:bg-opacity-20 ${card.hoverColor} w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-colors`}
              >
                <Icon className={`h-7 w-7 ${card.color}`} />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Security notice */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-1">
            Secure & Private
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Your data is encrypted and protected. OneServe follows strict
            privacy guidelines and never shares your personal information
            without consent.
          </p>
        </div>
      </div>
    </div>
  );
}
