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
  Scale,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext"; // Import useAuth for username
import { RatingPopup } from "@/app/components/modules/RatingPopup";

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
    id: "notifications",
    title: "Notifications",
    description: "Emergency alerts & updates",
    icon: Bell,
    color: "text-red-600",
    bgColor: "bg-red-50",
    hoverColor: "hover:bg-red-100",
  },
  {
    id: "bill-payment",
    title: "Bill Payment",
    description: "Pay electricity, water & tax bills via Razorpay",
    icon: CreditCard,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    hoverColor: "hover:bg-emerald-100",
  },
  {
    id: "law-advisor",
    title: "Law Advisor",
    description: "Get civic and legal guidance",
    icon: Scale,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    hoverColor: "hover:bg-pink-100",
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

  /* Phase 6: Community Wins Feed */
  const [recentWins, setRecentWins] = useState<any[]>([]);
  const [loadingWins, setLoadingWins] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchCount = async () => {
        // Count Active Complaints by fetching them exactly as ComplaintTracking does to avoid mismatch
        const { data: rawData } = await supabase
          .from("raw_complaints")
          .select("id, status")
          .eq("user_id", user.id);

        const { data: procData } = await supabase
          .from("processed_complaints")
          .select("id, complaint_status")
          .eq("user_id", user.id);

        let activeCount = 0;

        if (rawData) {
          rawData.forEach((raw) => {
            const processed = procData?.find((p) => p.id === raw.id);
            const status = processed ? processed.complaint_status : (raw.status === "processed" ? "analyzing" : "submitted");
            
            // Only count if it's not resolved and not rejected
            if (status !== "resolved" && status !== "rejected") {
              activeCount++;
            }
          });
        }

        setActiveComplaintsCount(activeCount);
      };

      const fetchWins = async () => {
        try {
          const { data, error } = await supabase.rpc("get_community_wins");
          if (!error && data?.success) {
            setRecentWins(data.wins);
          }
        } catch (err) {
          console.error("Failed to fetch community wins", err);
        } finally {
          setLoadingWins(false);
        }
      };

      fetchCount();
      fetchWins();
      
      // Subscribe to changes to update count live
      const channel = supabase
        .channel("dashboard-count")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "raw_complaints",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchCount(),
        )
        .subscribe();

      // Real-time listener for rating popups (Phase 4 upgrade)
      const ratingChannel = supabase
        .channel("realtime-ratings")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "processed_complaints",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new.complaint_status === "resolved") {
              // Trigger the local state to show the popup
              window.dispatchEvent(new CustomEvent("show-rating-popup", { detail: payload.new.id }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(ratingChannel);
      };
    }
  }, [user]);

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* 1. HERO IMPACT SECTION */}
      <div className="relative bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white overflow-hidden shadow-xl">
        {/* Decorative background pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400 opacity-10 rounded-full blur-2xl transform -translate-x-1/4 translate-y-1/4"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
              Hello, {userName}
            </h1>
            <p className="text-blue-100 text-lg mb-6 leading-relaxed">
              You are making Faridabad better. Join thousands of citizens reporting issues and transforming our community every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/complaint-registration")}
                className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquareWarning size={20} />
                Report an Issue
              </button>
              <button
                onClick={() => navigate("/complaint-tracking")}
                className="bg-blue-800/50 hover:bg-blue-800/70 border border-blue-400/30 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <ClipboardList size={20} />
                Track My Reports
              </button>
            </div>
          </div>
          
          {/* Personal Stats Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex items-center gap-6 min-w-[280px]">
            <div className="bg-blue-500/30 p-4 rounded-full">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-blue-100 font-medium text-sm">Your Active Reports</p>
              <p className="text-4xl font-bold text-white">{activeComplaintsCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Services & Win Feed */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* COMMUNITY WIN FEED */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="text-yellow-500 h-6 w-6" />
                Community Impact
              </h2>
              <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Live Feed
              </span>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 overflow-hidden relative">
              {/* Fade masks for scrolling effect */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10"></div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10"></div>
              
              <div className="flex overflow-x-auto gap-4 p-4 pb-2 scrollbar-hide snap-x">
                {loadingWins ? (
                  // Skeleton Loaders
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="min-w-[280px] bg-gray-50 rounded-lg p-4 border border-gray-100 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))
                ) : recentWins.length > 0 ? (
                  recentWins.map((win, idx) => (
                    <div key={idx} className="min-w-[280px] snap-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase font-bold text-green-600 tracking-wider">Resolved</span>
                        <span className="text-[10px] text-gray-500">{new Date(win.resolved_at).toLocaleDateString()}</span>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm mb-1 line-clamp-1">{win.title}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        Reported by <span className="font-medium text-gray-800">{win.reporter_name}</span>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center w-full text-gray-500 text-sm italic">
                    No recent resolutions. Be the first to report an issue!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MAIN SERVICE MENU */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="text-blue-600 h-5 w-5" />
              Civic Services
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dashboardCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    onClick={() => navigate(`/${card.id}`)}
                    className="group bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col items-center text-center"
                  >
                    <div className={`${card.bgColor} ${card.color} ${card.hoverColor} w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors shadow-inner`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </h3>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Secondary Stats & Security */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 shadow-sm border border-indigo-100">
            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-indigo-600" /> Your Civic Score
            </h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-extrabold text-indigo-700">450</span>
              <span className="text-sm font-medium text-indigo-500 mb-1">pts</span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2 mb-2">
              <div className="bg-indigo-600 h-2 rounded-full w-[45%]"></div>
            </div>
            <p className="text-xs text-indigo-600 font-medium">50 pts to Civic Guardian Badge</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-blue-100">
            <h3 className="font-bold text-blue-950 mb-2 flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" /> Civic Law Advisor
            </h3>
            <p className="text-xs text-blue-800/80 mb-4 leading-relaxed">
              Understand your legal rights, cite BNS & Municipal laws, and draft formal RTI applications.
            </p>
            <button onClick={() => navigate('/law-advisor')} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
              <Scale size={16} /> Consult Law Advisor
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-start gap-3">
            <Shield className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700 font-bold mb-1">Secure & Private</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your data is encrypted. OneServe follows strict privacy guidelines and never shares your personal information without consent.
              </p>
            </div>
          </div>
        </div>

      </div>
      
      {/* Citizen Ratings Queue */}
      <RatingPopup />
    </div>
  );
}

