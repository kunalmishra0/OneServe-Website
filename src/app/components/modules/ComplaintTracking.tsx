import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Complaint {
  id: string;
  description: string;
  category: string;
  status: "submitted" | "analyzing" | "verified" | "resolved" | "rejected";
  created_at: string;
  priority_score: number;
  location: string;
  images?: string[];
  admin_visible?: boolean;
}

export function ComplaintTracking() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );

  const openModal = (complaint: Complaint) => setSelectedComplaint(complaint);

  useEffect(() => {
    if (user) {
      fetchComplaints();

      // Real-time subscription to 'raw_complaints'
      const channel = supabase
        .channel("public:raw_complaints")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "raw_complaints",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Real-time change:", payload);
            fetchComplaints(); // Refresh data on change
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  /* New: 3-Layer System Integration */
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      // 1. Fetch Raw Complaints (Layer 1)
      const { data: rawData, error: rawError } = await supabase
        .from("raw_complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (rawError) {
        // Fallback to old table if migration missing
        if (
          rawError.code === "PGRST204" ||
          rawError.message.includes("does not exist")
        ) {
          console.warn("Using fallback 'complaints' table");
          const { data, error } = await supabase
            .from("complaints")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          setComplaints(data || []);
          return;
        }
        throw rawError;
      }

      const enrichedComplaints = [];

      // 2. Fetch Processed Data (Layer 2) for these complaints
      if (rawData && rawData.length > 0) {
        const rawIds = rawData.map((c) => c.id);
        const { data: processedData, error: procError } = await supabase
          .from("processed_complaints")
          .select("*")
          .in("id", rawIds);

        if (!procError && processedData) {
          // Merge Data
          for (const raw of rawData) {
            const processed = processedData.find((p) => p.id === raw.id);
            enrichedComplaints.push({
              id: raw.id,
              description: raw.description, // or processed.description
              category: raw.category,
              location: raw.location_text,
              created_at: raw.created_at,
              images: raw.images, // Use Raw images (or processed if AI filtered them)
              status: processed ? processed.complaint_status : "analyzing", // Show 'analyzing' if not yet processed
              // Hide priority from citizen view unless necessary, but we might store it in state if logic needs it.
              // For UI simple display, we map status.
              priority_score: processed ? processed.priority_score : 0,
              admin_visible: processed ? processed.admin_visible : false,
            });
          }
        } else {
          // If fetching processed failed or empty, just show raw as 'submitted/analyzing'
          enrichedComplaints.push(
            ...rawData.map((r) => ({
              id: r.id,
              description: r.description,
              category: r.category,
              location: r.location_text,
              created_at: r.created_at,
              images: r.images,
              status: r.status === "processed" ? "analyzing" : "submitted", // If raw says processed but we found no record, it's weird.
              priority_score: 0,
              admin_visible: false,
            })),
          );
        }
        setComplaints(enrichedComplaints);
      } else {
        setComplaints([]);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
      case "analyzing":
      case "pending_analysis":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "verified":
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
      case "analyzing":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "verified":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || complaint.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Track Your Complaints
        </h1>
        <p className="text-gray-600">
          Monitor real-time status updates of all your registered complaints
        </p>
      </div>
      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, title, or category..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </button>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700 font-medium mb-1">Submitted</p>
          <p className="text-2xl font-bold text-yellow-800">
            {
              complaints.filter(
                (c) =>
                  c.status === "submitted" ||
                  c.status === "analyzing" ||
                  (c.status as string) === "pending_analysis",
              ).length
            }
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium mb-1">Verified</p>
          <p className="text-2xl font-bold text-blue-800">
            {complaints.filter((c) => c.status === "verified").length}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium mb-1">Resolved</p>
          <p className="text-2xl font-bold text-green-800">
            {complaints.filter((c) => c.status === "resolved").length}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 font-medium mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-800">
            {complaints.length}
          </p>
        </div>
      </div>
      {/* Complaints list */}
      <div className="space-y-4">
        {filteredComplaints.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No complaints found</p>
            {complaints.length === 0 && (
              <p className="text-sm text-blue-600 mt-2">
                Go to Register Complaint to file your first issue!
              </p>
            )}
          </div>
        ) : (
          filteredComplaints.map((complaint) => {
            return (
              <div
                key={complaint.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="font-mono text-xs font-semibold text-gray-500"
                        title={complaint.id}
                      >
                        Search ID: #{complaint.id.slice(0, 8)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {complaint.description}
                    </h3>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span>📋 {complaint.category}</span>
                      <span>📍 {complaint.location || "No location"}</span>
                      <span>
                        📅{" "}
                        {new Date(complaint.created_at).toLocaleDateString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openModal(complaint)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                    >
                      View Details
                    </button>
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStatusColor(complaint.status)}`}
                    >
                      {getStatusIcon(complaint.status)}
                      <span className="text-sm font-semibold capitalize">
                        {complaint.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800">
                Complaint Details
              </h2>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ID & Status */}
              <div className="flex flex-wrap gap-4 justify-between items-start bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                    Complaint ID
                  </p>
                  <p className="font-mono text-sm text-gray-700">
                    #{selectedComplaint.id}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded text-sm font-bold capitalize ${getStatusColor(selectedComplaint.status)}`}
                >
                  {selectedComplaint.status}
                </div>
              </div>

              {/* Main Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-500 block mb-1">
                    Category
                  </label>
                  <p className="text-gray-800">{selectedComplaint.category}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500 block mb-1">
                    Date Submitted
                  </label>
                  <p className="text-gray-800">
                    {new Date(selectedComplaint.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-500 block mb-1">
                    Location
                  </label>
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-1 text-gray-400" />
                    <p className="text-gray-800">
                      {selectedComplaint.location}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-gray-500 block mb-1">
                  Description
                </label>
                <p className="text-gray-800 text-sm leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Images - Real URLs from Supabase Storage */}
              {selectedComplaint.images &&
                selectedComplaint.images.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-500 block mb-2">
                      Attached Evidence
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedComplaint.images.map((imgUrl, idx) => (
                        <a
                          key={idx}
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative group aspect-video overflow-hidden rounded-lg border border-gray-200"
                        >
                          <img
                            src={imgUrl}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded">
                              View Full
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              {/* Note: AI Assessment & Priority Score hidden for Citizens as requested */}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
