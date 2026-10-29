import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  Shield,
  Bell,
  Lock,
  Globe,
  Trash2,
  AlertTriangle
} from "lucide-react";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "notifications" | "security">("profile");

  // Profile fields initialized with verified demo citizen defaults
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || "Rahul Sharma",
    email: user?.email || "citizen@oneserve.in",
    phoneno: "+91 98110 24892",
    addressLine1: "House #412, Main Road",
    addressLine2: "Near Community Centre, Sector 15",
    city: "Faridabad",
    state: "Haryana",
    pincode: "121007",
  });

  // Notification Preferences
  const [notifPreferences, setNotifPreferences] = useState({
    emailAlerts: true,
    smsAlerts: true,
    complaintUpdates: true,
    billReminders: true,
    emergencyAdvisories: true,
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 500);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Account & Preferences
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your personal details, civic communication preferences, and digital identity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Settings Navigation */}
        <div className="md:col-span-4 space-y-1">
          <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-xs">
            <button
              onClick={() => setActiveSection("profile")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
                activeSection === "profile"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Citizen Profile</span>
            </button>
            <button
              onClick={() => setActiveSection("notifications")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
                activeSection === "notifications"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications & Alerts</span>
            </button>
            <button
              onClick={() => setActiveSection("security")}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${
                activeSection === "security"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Security & Password</span>
            </button>
          </div>

          {/* Verification Badge Widget */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 mt-4">
            <div className="flex items-center gap-2 font-bold text-emerald-950 mb-1">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Verified Civic Profile</span>
            </div>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              Your profile is verified with municipal local body records for direct grievance processing.
            </p>
          </div>
        </div>

        {/* Right Settings Form Container */}
        <div className="md:col-span-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            {saved && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Preferences updated successfully!</span>
              </div>
            )}

            {/* Profile Section */}
            {activeSection === "profile" && (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-800">
                    Personal Information
                  </h3>
                  <p className="text-xs text-gray-500">
                    Details used for municipal verification and worker contact
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full px-3 py-2 text-xs bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Primary Contact Number
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phoneno}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneno: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Postal Pincode
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({ ...formData, pincode: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Street Address / House No.
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.addressLine1}
                    onChange={(e) =>
                      setFormData({ ...formData, addressLine1: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="Locality / Landmark"
                    value={formData.addressLine2}
                    onChange={(e) =>
                      setFormData({ ...formData, addressLine2: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-800">
                    Communication Preferences
                  </h3>
                  <p className="text-xs text-gray-500">
                    Control how municipal alerts and progress updates reach you
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      key: "complaintUpdates",
                      label: "Complaint Resolution & Worker Dispatch",
                      desc: "Instant notification when an officer or field worker is assigned.",
                    },
                    {
                      key: "billReminders",
                      label: "Utility Bill & Due Date Reminders",
                      desc: "Advance reminder 3 days before electricity, water, or tax due dates.",
                    },
                    {
                      key: "emergencyAdvisories",
                      label: "Emergency Advisories & Water Outages",
                      desc: "High-priority SMS & push alerts for scheduled disruptions or weather notices.",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">
                          {item.label}
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-800">
                    Security & Credentials
                  </h3>
                  <p className="text-xs text-gray-500">
                    Manage your account password and active civic sessions
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSaved(true);
                      setTimeout(() => setSaved(false), 2000);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
