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
import { NotificationsPage } from "@/app/components/modules/NotificationsPage";
import { LawAdvisor } from "@/app/components/modules/LawAdvisor";
import { Feedback } from "@/app/components/modules/Feedback";
import { AdminDashboard } from "@/app/components/modules/AdminDashboard";
import { WorkerDashboard } from "@/app/components/modules/WorkerDashboard";
import { StaffManagement } from "@/app/components/modules/StaffManagement";
import LoginPage from "@/app/pages/auth/LoginPage";
import SignupPage from "@/app/pages/auth/SignupPage";
import WorkerSignupPage from "@/app/pages/auth/WorkerSignupPage";
import VerifyPage from "@/app/pages/auth/VerifyPage";
import ForgotPasswordPage from "@/app/pages/auth/ForgotPasswordPage";
import SettingsPage from "@/app/pages/SettingsPage";
import { AdminSettings } from "@/app/pages/admin/AdminSettings";
import WorkerSettings from "@/app/pages/worker/WorkerSettings";
import { SchemesPage } from "@/app/pages/SchemesPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RoleRoute } from "@/app/components/auth/RoleRoute";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

function ProtectedLayout() {
  const { user, role, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 1024,
  );

  useEffect(() => {
    const handleResize = () => {
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

  // Dynamic Root Redirect based on role
  const effectiveRole = role || user?.user_metadata?.role || "citizen";
  const path = window.location.pathname;
  if ((path === "/" || path === "/dashboard") && effectiveRole !== "citizen") {
    if (effectiveRole === "admin") {
      return <Navigate to="/admin" replace />;
    } else if (effectiveRole === "worker") {
      return <Navigate to="/field-dashboard" replace />;
    }
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

function RoleDefaultRedirect() {
  const { user, role } = useAuth();
  const effectiveRole = role || user?.user_metadata?.role || "citizen";
  if (effectiveRole === "admin") return <Navigate to="/admin" replace />;
  if (effectiveRole === "worker") return <Navigate to="/field-dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/worker-signup" element={<WorkerSignupPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<RoleDefaultRedirect />} />

            {/* Common Authenticated Routes */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Citizen Only Routes */}
            <Route element={<RoleRoute allowedRoles={["citizen"]} />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="complaint-registration"
                element={<ComplaintRegistration />}
              />
              <Route path="bill-payment" element={<BillPayment />} />
              <Route path="bill-management" element={<BillManagement />} />
              <Route path="law-advisor" element={<LawAdvisor />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="schemes" element={<SchemesPage />} />
            </Route>

            {/* Citizen Only Complaint Tracking */}
            <Route element={<RoleRoute allowedRoles={["citizen"]} />}>
              <Route path="complaint-tracking" element={<ComplaintTracking />} />
            </Route>

            {/* Admin Only Routes */}
            <Route element={<RoleRoute allowedRoles={["admin"]} />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="staff-management" element={<StaffManagement />} />
              <Route path="admin-settings" element={<AdminSettings />} />
            </Route>

            {/* Worker Only Routes */}
            <Route element={<RoleRoute allowedRoles={["worker"]} />}>
              <Route path="field-dashboard" element={<WorkerDashboard />} />
              <Route path="worker-settings" element={<WorkerSettings />} />
            </Route>

            {/* Fallback to role-specific home */}
            <Route path="*" element={<RoleDefaultRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
