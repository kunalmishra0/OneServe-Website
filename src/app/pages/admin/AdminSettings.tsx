import { useState, useEffect } from "react";
import { User, Bell, Shield, Lock, Save, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export function AdminSettings() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || user?.user_metadata?.name || "MCF Administrator",
    officialDesignation: "Chief Municipal Administrator",
    department: "Municipal Corporation of Faridabad",
  });

  const [preferences, setPreferences] = useState({
    autoAssign: true,
    escalationAlerts: true,
    weeklyReport: true,
  });

  useEffect(() => {
    const fetchAdminProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) {
          setFormData((prev) => ({
            ...prev,
            officialDesignation: data.official_designation || prev.officialDesignation,
            department: data.department || prev.department,
          }));
        }
      } catch (e) {
        console.error("Error fetching admin profile:", e);
      }
    };
    fetchAdminProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // 1. Update profiles table
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          official_designation: formData.officialDesignation,
          department: formData.department,
        })
        .eq("id", user.id);

      if (profErr) throw profErr;

      // 2. Update user metadata
      await supabase.auth.updateUser({
        data: { full_name: formData.fullName, name: formData.fullName },
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error("Failed to save admin settings:", err);
      setError(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            System & Admin Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your administrative credentials and municipal platform configurations
          </p>
        </div>

        {saved && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Admin profile and system settings saved successfully to database.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xs border border-gray-200 divide-y divide-gray-100">
          {/* Profile Section */}
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-100">
                AD
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {formData.fullName}
                </h2>
                <p className="text-xs font-medium text-blue-600">{formData.officialDesignation}</p>
                <p className="text-[11px] text-gray-400">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Admin Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 bg-gray-100 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Official Designation
                </label>
                <input
                  type="text"
                  value={formData.officialDesignation}
                  onChange={(e) => setFormData({ ...formData, officialDesignation: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Municipal Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* System Preferences */}
          <div className="p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Municipal Operations & Automation
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div>
                  <p className="font-bold text-xs text-gray-800">Auto-Escalation Engine</p>
                  <p className="text-[11px] text-gray-500">
                    Automatically recalculate priority scores according to aging thresholds and official verified tiers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.autoAssign}
                  onChange={(e) => setPreferences({ ...preferences, autoAssign: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div>
                  <p className="font-bold text-xs text-gray-800">Critical Priority SMS Alerts</p>
                  <p className="text-[11px] text-gray-500">
                    Dispatch instant high-priority alerts to zone engineers when critical tickets age over 48h.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.escalationAlerts}
                  onChange={(e) => setPreferences({ ...preferences, escalationAlerts: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="p-6 bg-gray-50/50 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default AdminSettings;
