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
  AlertCircle,
} from "lucide-react";
import { SearchableDropdown } from "@/app/components/ui/SearchableDropdown";

const STATE_CITY_DATA: Record<string, string[]> = {
  Delhi: [
    "New Delhi",
    "North Delhi",
    "South Delhi",
    "East Delhi",
    "West Delhi",
  ],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
  ],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Noida"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contactInfo: "",
    address: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Update cities when state changes
  useEffect(() => {
    if (formData.state && STATE_CITY_DATA[formData.state]) {
      setAvailableCities(STATE_CITY_DATA[formData.state]);
      // Clear city if not in new state list
      if (!STATE_CITY_DATA[formData.state].includes(formData.city)) {
        setFormData((prev) => ({ ...prev, city: "" }));
      }
    } else {
      setAvailableCities([]);
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  }, [formData.state]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // Try fetching from new 'citizens' table first
      let { data, error } = await supabase
        .from("citizens")
        .select("*")
        .eq("id", user!.id)
        .single();

      // Fallback/Migration logic: if no citizen record, check 'profiles'
      if (
        error &&
        (error.code === "PGRST116" || error.message.includes("citizens"))
      ) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .single();

        if (!profileError && profileData) {
          data = profileData;
          // Map old profile fields if needed (assuming structure is similar enough or mapping required)
        } else if (profileError) {
          // No profile either, just ignore err for new user
          console.log("No profile found.");
        }
      } else if (error) {
        throw error;
      }

      if (data) {
        setFormData({
          fullName: data.full_name || "",
          email: data.email || user!.email || "",
          contactInfo: data.phoneno || data.contact_info || "", // Handle both names
          address: data.address || "",
          state: data.state || "",
          city: data.city || "",
          pincode: data.pincode || "",
        });
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Upsert into 'citizens' table
      const { error } = await supabase.from("citizens").upsert({
        id: user.id,
        email: user.email, // Ensure email is refined
        full_name: formData.fullName,
        phoneno: formData.contactInfo,
        address: formData.address,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Supabase Error details:", error);
        throw error;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Account Settings
        </h1>
        <p className="text-gray-600">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <User size={32} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {formData.fullName || "User"}
            </h2>
            <p className="text-sm text-gray-500">Citizen Profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Profile updated successfully!
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <div className="grid gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed directly.
              </p>
            </div>

            {/* Contact Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.contactInfo}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData({ ...formData, contactInfo: val });
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter 10-digit Indian mobile number (without +91)
              </p>
            </div>

            {/* Address Section */}
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Address Details
              </h3>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street Address, Application No, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* State - Searchable Dropdown */}
                  <div className="relative z-20">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <SearchableDropdown
                      options={Object.keys(STATE_CITY_DATA)}
                      value={formData.state}
                      onChange={(val) =>
                        setFormData({ ...formData, state: val })
                      }
                      placeholder="Select State"
                    />
                  </div>
                  {/* City - Searchable Dropdown */}
                  <div className="relative z-10">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <SearchableDropdown
                      options={availableCities}
                      value={formData.city}
                      onChange={(val) =>
                        setFormData({ ...formData, city: val })
                      }
                      placeholder="Select City"
                      disabled={!formData.state}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
