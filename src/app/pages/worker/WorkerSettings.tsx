import { useState, useEffect } from "react";
import { User, Phone, MapPin, Wrench, Shield, Save, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export function WorkerSettings() {
  const { user, staffProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    assignedZone: "",
    role: "",
    status: "available",
  });

  useEffect(() => {
    if (staffProfile) {
      setFormData({
        fullName: staffProfile.full_name || "",
        contactNumber: staffProfile.contact_number || "",
        assignedZone: staffProfile.assigned_zone || "",
        role: staffProfile.role || "",
        status: staffProfile.status || "available",
      });
    } else if (user?.id) {
      fetchStaff();
    }
  }, [staffProfile, user?.id]);

  const fetchStaff = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();
      if (!error && data) {
        setFormData({
          fullName: data.full_name || "",
          contactNumber: data.contact_number || "",
          assignedZone: data.assigned_zone || "",
          role: data.role || "",
          status: data.status || "available",
        });
      }
    } catch (err) {
      console.error("Error fetching staff settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // 1. Update staff profile in database
      const { error: staffErr } = await supabase
        .from("staff")
        .update({
          full_name: formData.fullName,
          contact_number: formData.contactNumber,
          assigned_zone: formData.assignedZone,
          status: formData.status,
        })
        .eq("auth_user_id", user.id);

      if (staffErr) throw staffErr;

      // 2. Also update auth user metadata
      await supabase.auth.updateUser({
        data: { full_name: formData.fullName, name: formData.fullName },
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error("Failed to update worker profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Worker Profile & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your field technician dispatch profile and availability
        </p>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Worker profile updated successfully and synced with municipal dispatch.</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-xs divide-y divide-gray-100">
        {/* Header Profile Summary */}
        <div className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-100">
            {formData.fullName ? formData.fullName.charAt(0) : "W"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{formData.fullName || "Field Technician"}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                {formData.role || "Municipal Staff"}
              </span>
              <span>•</span>
              <span className="text-gray-600">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+91 98710 44321"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Assigned Zone / Hub
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.assignedZone}
                  onChange={(e) => setFormData({ ...formData, assignedZone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sector 15 Hub, Faridabad"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Duty Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="available">🟢 Available for Dispatch</option>
                <option value="busy">🟡 On Assignment (Busy)</option>
                <option value="on_leave">🔴 Off-Duty / On Leave</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50/50 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
}
export default WorkerSettings;
