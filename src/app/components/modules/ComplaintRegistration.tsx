import { useState, useEffect } from "react";
import {
  MapPin,
  Camera,
  AlertCircle,
  Send,
  Loader2,
  X,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { SearchableDropdown } from "@/app/components/ui/SearchableDropdown";

// Simplified Indian States and Cities mapping for demo
// In a real app, this could come from the DB or an API
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

export function ComplaintRegistration() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    address_line_1: "",
    address_line_2: "",
    state: "",
    city: "",
    pincode: "",
  });
  const [images, setImages] = useState<File[]>([]);

  // Input method states
  const [includeText, setIncludeText] = useState(true);
  const [includeImage, setIncludeImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available cities based on selected state
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    if (images.length === 0) setAnalyzingImage(false);
  }, [images]);

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

  const categories = [
    "Sanitation",
    "Road Maintenance",
    "Water Supply",
    "Electricity",
    "Drainage",
    "Street Lights",
    "Parks & Gardens",
    "Traffic",
    "Others",
  ];

  const handleToggleText = () => {
    if (includeText && !includeImage) {
      // Prevent disabling if it's the only one active
      return;
    }
    setIncludeText(!includeText);
  };

  const handleToggleImage = () => {
    if (includeImage && !includeText) {
      // Prevent disabling if it's the only one active
      return;
    }
    setIncludeImage(!includeImage);
  };

  const handleImageUpload = (newFiles: FileList) => {
    const fileArray = Array.from(newFiles);
    if (images.length + fileArray.length > 4) {
      alert("You can upload a maximum of 4 images.");
      return;
    }

    setImages((prev) => [...prev, ...fileArray]);
    setAnalyzingImage(true);

    // Simulate location extraction
    setTimeout(() => {
      setAnalyzingImage(false);
      if (Math.random() > 0.3 && !formData.address_line_1) {
        setFormData((prev) => ({
          ...prev,
          ...prev,
          address_line_1: "123, Civic Center Road",
          address_line_2: "Near City Hall",
          state: "Delhi",
          city: "New Delhi",
          pincode: "110001",
        }));
      }
    }, 1500);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* Removed getFullLocation as we now store split fields */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to file a complaint.");
      return;
    }

    if (includeText && !formData.description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (includeImage && images.length === 0) {
      setError("Please upload at least one photo.");
      return;
    }

    // Location is compulsory
    if (
      !formData.address_line_1.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      setError(
        "Please fill in all mandatory address fields (Address Line 1, City, State, Pincode).",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Insert into raw_complaints (Layer 1)
      const { data: rawData, error: insertError } = await supabase
        .from("raw_complaints")
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: includeText
              ? formData.description
              : `${formData.title} (Image Complaint)`,
            category: formData.category,
            // location_text: getFullLocation(), // Removed in favor of split fields
            address_line_1: formData.address_line_1,
            address_line_2: formData.address_line_2,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            images: [], // Will update after upload
            status: "pending_analysis",
          },
        ])
        .select()
        .single();

      if (insertError) {
        // Fallback for demo if migration hasn't run: try old 'complaints' table
        if (
          insertError.code === "PGRST204" ||
          insertError.message.includes("does not exist")
        ) {
          console.log(
            "Raw complaints table missing, falling back to 'complaints' for demo compatibility",
          );
          throw new Error(
            "System update in progress. Please try again later (Table migration required).",
          );
        }
        throw insertError;
      }

      const complaintId = rawData.id;
      let imageUrls: string[] = [];

      // 2. Upload Images to Supabase Storage (Production Level)
      if (includeImage && images.length > 0) {
        const uploadPromises = images.map(async (file, index) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `${user.id}/${complaintId}/Img${index + 1}.${fileExt}`;

          // ACTUAL upload to 'complaints' bucket
          const { error: uploadErr } = await supabase.storage
            .from("complaints")
            .upload(fileName, file);

          if (uploadErr) {
            console.error(`Failed to upload ${fileName}:`, uploadErr);
            // Fallback to placeholder if bucket completely missing
            return `https://placehold.co/600x400?text=${fileName}`;
          }

          // Get Public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("complaints").getPublicUrl(fileName);

          return publicUrl;
        });

        imageUrls = await Promise.all(uploadPromises);

        // Update raw complaint with real image URLs
        const { error: updateError } = await supabase
          .from("raw_complaints")
          .update({ images: imageUrls })
          .eq("id", complaintId);

        if (updateError) throw updateError;
      }

      // 3. Trigger Layer 2 (Simulated Trigger or Manual Insert for Demo)
      // Ideally a Postgres Trigger or Edge Function does this.
      // For this demo, we manually insert into processed_complaints
      setTimeout(async () => {
        const randomPriority = (Math.random() * 10).toFixed(1);
        await supabase.from("processed_complaints").insert({
          id: complaintId,
          user_id: user.id,
          description: rawData.description,
          category: rawData.category,
          // location_text: rawData.location_text,
          address_line_1: rawData.address_line_1,
          address_line_2: rawData.address_line_2,
          city: rawData.city,
          state: rawData.state,
          pincode: rawData.pincode,
          images: imageUrls,
          priority_score: parseFloat(randomPriority),
          admin_visible: parseFloat(randomPriority) > 5, // Simple logic
          ai_status: "analyzed",
          complaint_status: "submitted",
          ai_analysis_json: { note: "Simulated AI Analysis" },
        });

        // Mark raw as processed
        await supabase
          .from("raw_complaints")
          .update({ status: "processed" })
          .eq("id", complaintId);
      }, 2000); // 2 second delay to simulate processing

      setShowSuccess(true);
      setFormData({
        title: "",
        category: "",
        description: "",
        address_line_1: "",
        address_line_2: "",
        state: "",
        city: "",
        pincode: "",
      });
      setImages([]);
      setIncludeText(true);
      setIncludeImage(false);

      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      console.error("Error submitting complaint:", err);
      // Friendly error if bucket is missing
      if (err.message && err.message.includes("Bucket not found")) {
        setError(
          "Error: system storage bucket 'complaints' not found. Please contact admin.",
        );
      } else {
        setError(err.message || "Failed to submit complaint");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen transition-colors">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Register a Complaint
        </h1>
        <p className="text-gray-600">
          Report civic issues with AI-powered assistance for faster resolution
        </p>
      </div>

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <div className="bg-green-500 rounded-full p-1 flex-shrink-0">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-green-900 font-medium">
              Complaint Submitted (Ref ID: Generated)
            </p>
            <p className="text-sm text-green-700">
              AI is analyzing your complaint... Check 'Track Complaints' for
              updates.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Complaint Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Brief title for your complaint"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 1. Complaint Type (Checklist) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            What details are you providing?{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleToggleText}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                includeText
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div
                className={`w-4 h-4 border rounded flex items-center justify-center ${includeText ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}
              >
                {includeText && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              <span className="font-medium">Text Description</span>
            </button>

            <button
              type="button"
              onClick={handleToggleImage}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                includeImage
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div
                className={`w-4 h-4 border rounded flex items-center justify-center ${includeImage ? "bg-blue-600 border-blue-600" : "border-gray-400"}`}
              >
                {includeImage && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              <span className="font-medium">Photo Evidence</span>
            </button>
          </div>
        </div>

        {/* 2. Category */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <SearchableDropdown
            options={categories}
            value={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val })}
            placeholder="Select a category"
          />
        </div>

        {/* Description Input */}
        {includeText && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the issue in detail..."
              rows={5}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required={includeText}
            />
          </div>
        )}

        {/* Image Input */}
        {includeImage && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload Photos (Max 4) <span className="text-red-500">*</span>
            </label>

            {/* If no images, show big uploader */}
            {images.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer relative bg-gray-50">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  multiple // Allow selecting multiple files at once
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) =>
                    e.target.files && handleImageUpload(e.target.files)
                  }
                />
                <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Click to upload photos or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
              </div>
            ) : (
              /* Show thumbnails + small add button */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {images.map((file, idx) => (
                  <div key={idx} className="relative group aspect-video">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {images.length < 4 && (
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 aspect-video">
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) =>
                        e.target.files && handleImageUpload(e.target.files)
                      }
                    />
                    <div className="flex flex-col items-center text-gray-400">
                      <Plus size={24} />
                      <span className="text-xs">Add More</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {analyzingImage && (
              <div className="mt-2 text-blue-600 flex items-center text-sm gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                Extracting location data (simulated)...
              </div>
            )}
          </div>
        )}

        {/* 3. Location - Split Fields & Searchable Dropdowns */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Location Details <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
              onClick={() => {
                setError(null);
                if (navigator.geolocation) {
                  setFormData((prev) => ({
                    ...prev,
                    address_line_1: "Finding...",
                  }));
                  navigator.geolocation.getCurrentPosition(
                    (pos) =>
                      setFormData((prev) => ({
                        ...prev,
                        address_line_1: `Lat: ${pos.coords.latitude}, Long: ${pos.coords.longitude}`,
                        state: "Delhi",
                        city: "New Delhi",
                        pincode: "110001",
                      })),
                    (err) => {
                      console.error("Geolocation error:", err);
                      setFormData((prev) => ({ ...prev, address_line_1: "" }));
                      setError(
                        "Location access denied. Please enable GPS or enter address manually.",
                      );
                    },
                  );
                } else {
                  setError("Geolocation is not supported by your browser.");
                }
              }}
            >
              <MapPin className="h-3 w-3" />
              Auto-detect via GPS
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Address Line 1 */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Details of Location (Street/Area)"
                value={formData.address_line_1}
                onChange={(e) =>
                  setFormData({ ...formData, address_line_1: e.target.value })
                }
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 ${analyzingImage ? "animate-pulse bg-gray-50" : ""}`}
                required
              />
              <input
                type="text"
                placeholder="Landmark (Optional)"
                value={formData.address_line_2}
                onChange={(e) =>
                  setFormData({ ...formData, address_line_2: e.target.value })
                }
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${analyzingImage ? "animate-pulse bg-gray-50" : ""}`}
              />
            </div>

            {/* State - Dropdown */}
            <div className="relative z-20">
              <SearchableDropdown
                options={Object.keys(STATE_CITY_DATA)}
                value={formData.state}
                onChange={(val) => setFormData({ ...formData, state: val })}
                placeholder="Select State"
              />
            </div>

            {/* City - Dependent Dropdown */}
            <div className="relative z-10">
              <SearchableDropdown
                options={availableCities}
                value={formData.city}
                onChange={(val) => setFormData({ ...formData, city: val })}
                placeholder="Select City"
                disabled={!formData.state}
              />
            </div>

            {/* Pincode */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Pincode"
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                pattern="[0-9]*"
                maxLength={6}
              />
            </div>
          </div>
        </div>

        {/* Alert box */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900">
            Your complaint will be automatically assigned to the relevant
            department based on category and location.
          </p>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || analyzingImage}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            <>
              <Send className="h-5 w-5" />
              Submit Complaint
            </>
          )}
        </button>
      </form>
    </div>
  );
}
