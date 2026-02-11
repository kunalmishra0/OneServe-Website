import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { TopBar } from "@/app/components/TopBar";
import { Sidebar } from "@/app/components/Sidebar";
import { Dashboard } from "@/app/components/Dashboard";
import { ComplaintRegistration } from "@/app/components/modules/ComplaintRegistration";
import { ComplaintTracking } from "@/app/components/modules/ComplaintTracking";
import { BillPayment } from "@/app/components/modules/BillPayment";
import { BillManagement } from "@/app/components/modules/BillManagement";
import { GamificationHub } from "@/app/components/modules/GamificationHub";
import { NotificationsPage } from "@/app/components/modules/NotificationsPage";
import { AIAssistant } from "@/app/components/modules/AIAssistant";
import { Feedback } from "@/app/components/modules/Feedback";
import { AdminDashboard } from "@/app/components/modules/AdminDashboard";
import LoginPage from "@/app/pages/auth/LoginPage";
import SignupPage from "@/app/pages/auth/SignupPage";
import SettingsPage from "@/app/pages/SettingsPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  // Initialize from props or default to closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 1024,
  );

  // Close sidebar on route change (mobile mostly)
  useEffect(() => {
    // Only close on mobile (check width)
    const handleResize = () => {
      // If window shrinks below 1024, force close.
      // If it grows above 1024, we don't necessarily force open, we respect the user's choice,
      // UNLESS it was previously closed purely because of size.
      // For simplicity in this fix, we just ensure it closes when going to mobile.
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:ml-64" : ""}`}
      >
        <TopBar
          userName={
            user?.user_metadata?.full_name ||
            user?.email?.split("@")[0] ||
            "User"
          }
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 bg-gray-50 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>

        <footer className="bg-white border-t border-gray-200 py-4 px-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>OneServe v1.0.0 - Empowering Civic Engagement</p>
            <div className="flex gap-4 mt-2 md:mt-0">
              <a href="#" className="hover:text-blue-600 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                Help Center
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route
              path="complaint-registration"
              element={<ComplaintRegistration />}
            />
            <Route path="complaint-tracking" element={<ComplaintTracking />} />
            <Route path="bill-payment" element={<BillPayment />} />
            <Route path="bill-management" element={<BillManagement />} />
            <Route path="gamification" element={<GamificationHub />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="settings" element={<SettingsPage />} />{" "}
            {/* Replaced Settings with SettingsPage */}
            <Route path="feedback" element={<Feedback />} />
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
