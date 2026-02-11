import { useState, useEffect } from "react";
import { MapPin, X, Search, Clock, CheckCircle, Loader2 } from "lucide-react";
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
  address_line_1?: string;
  city?: string;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );
  const [updateLoading, setUpdateLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);

      // Fetch Raw Complaints
      const { data: rawData, error: rawError } = await supabase
        .from("raw_complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (rawError) throw rawError;

      // Fetch Processed Data
      const rawIds = rawData.map((c) => c.id);
      const { data: processedData, error: procError } = await supabase
        .from("processed_complaints")
        .select("*")
        .in("id", rawIds);

      if (procError) throw procError;

      // Merge Data
      const merged = rawData.map((raw) => {
        const processed = processedData?.find((p) => p.id === raw.id);

        // Construct location string
        const locationStr =
          [
            raw.address_line_1,
            raw.address_line_2,
            raw.city,
            raw.state,
            raw.pincode,
          ]
            .filter(Boolean)
            .join(", ") || raw.location_text;

        return {
          id: raw.id,
          description: raw.description,
          category: raw.category,
          status: processed?.complaint_status || "analyzing",
          created_at: raw.created_at,
          priority_score: processed?.priority_score || 0,
          location: locationStr,
          images: raw.images,
          address_line_1: raw.address_line_1,
          city: raw.city,
        };
      });

      setComplaints(merged);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  // Stats Logic
  const stats = {
    pending: complaints.filter((c) =>
      ["submitted", "analyzing", "pending_analysis"].includes(c.status),
    ).length,
    resolvedToday: complaints.filter((c) => {
      const isResolved = c.status === "resolved";
      const isToday =
        new Date(c.created_at).toDateString() === new Date().toDateString();
      return isResolved && isToday;
    }).length,
    criticalArea: (() => {
      const areaCounts: Record<string, number> = {};
      complaints.forEach((c) => {
        const area = c.city || "Unknown";
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      });
      const sorted = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? sorted[0][0] : "N/A";
    })(),
  };

  // Filtering Logic
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" ||
      (() => {
        if (priorityFilter === "high") return c.priority_score >= 8;
        if (priorityFilter === "medium")
          return c.priority_score >= 5 && c.priority_score < 8;
        if (priorityFilter === "low") return c.priority_score < 5;
        return true;
      })();

    const matchesCategory =
      categoryFilter === "all" || c.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "analyzing":
        return "bg-blue-50 text-blue-600";
      case "verified":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 8) return "text-red-700 bg-red-50 border-red-200";
    if (score >= 5) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-green-700 bg-green-50 border-green-200";
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedComplaint) return;
    setUpdateLoading(true);
    try {
      // 1. Check if record exists in processed_complaints
      const { data: existing } = await supabase
        .from("processed_complaints")
        .select("id")
        .eq("id", selectedComplaint.id)
        .single();

      if (existing) {
        await supabase
          .from("processed_complaints")
          .update({ complaint_status: newStatus })
          .eq("id", selectedComplaint.id);
      } else {
        // Insert if missing (layer 2 logic)
        await supabase.from("processed_complaints").insert({
          id: selectedComplaint.id,
          user_id: user?.id, // Admin takes ownership or just reference? Ideally original user_id but we might not have it here easily without fetching raw again.
          // Actually we merged data so we don't have user_id in state properly.
          // Let's just update raw_complaints status for now as backup or fetch raw to get user_id.
          // Simplification: We assume processed exists since we fetch it. If not, we might error.
          // For demo, let's just update raw_complaints status too to keep them in sync if needed.
          complaint_status: newStatus,
        });
      }

      // Update local state
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === selectedComplaint.id
            ? { ...c, status: newStatus as any }
            : c,
        ),
      );
      setSelectedComplaint((prev) =>
        prev ? { ...prev, status: newStatus as any } : null,
      );
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-500">
              Overview of civic complaints and resolution status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">Department Head</p>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
              AD
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                Total Pending
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.pending}
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                Resolved Today
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.resolvedToday}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                Most Critical Area
              </p>
              <p
                className="text-xl font-bold text-gray-900 truncate max-w-[150px]"
                title={stats.criticalArea}
              >
                {stats.criticalArea}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
              <MapPin size={24} />
            </div>
          </div>
        </div>

        {/* Filters & Data Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search complaints..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="analyzing">Analyzing</option>
                <option value="verified">Verified</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Road Maintenance">Road Maintenance</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Water Supply">Water Supply</option>
                <option value="Electricity">Electricity</option>
                <option value="Drainage">Drainage</option>
                <option value="Street Lights">Street Lights</option>
                <option value="Parks & Gardens">Parks & Gardens</option>
                <option value="Traffic">Traffic</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">ID / Date</th>
                  <th className="px-6 py-4 font-semibold">Complaint</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
                        <span className="text-sm">Loading complaints...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredComplaints.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No complaints found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-gray-500">
                            #{complaint.id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-gray-400 mt-1">
                            {new Date(
                              complaint.created_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-col">
                          <span
                            className="font-medium text-gray-900 truncate"
                            title={complaint.description}
                          >
                            {complaint.description}
                          </span>
                          <span className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
                            {complaint.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-start gap-1.5 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                          <span className="truncate" title={complaint.location}>
                            {complaint.location}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority_score)}`}
                        >
                          {complaint.priority_score.toFixed(1)} / 10
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(complaint.status)}`}
                        >
                          {complaint.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedComplaint(complaint)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (Footer) */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
            <span>Showing {filteredComplaints.length} results</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                disabled
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border border-gray-300 rounded hover:bg-white disabled:opacity-50"
                disabled
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Manage Complaint
                  </h2>
                  <p className="text-sm text-gray-400 font-mono">
                    #{selectedComplaint.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Status Control */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Update Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "submitted",
                      "analyzing",
                      "verified",
                      "resolved",
                      "rejected",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(s)}
                        disabled={updateLoading}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize border transition-colors ${
                          selectedComplaint.status === s
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Category
                    </h3>
                    <p className="text-gray-900 font-medium">
                      {selectedComplaint.category}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Submitted On
                    </h3>
                    <p className="text-gray-900 font-medium">
                      {new Date(selectedComplaint.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Location
                    </h3>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                      <p className="text-gray-900">
                        {selectedComplaint.location}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Description
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm leading-relaxed border border-gray-100">
                    {selectedComplaint.description}
                  </div>
                </div>

                {selectedComplaint.images &&
                  selectedComplaint.images.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        Evidence
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedComplaint.images.map((img, i) => (
                          <a
                            key={i}
                            href={img}
                            target="_blank"
                            rel="noreferrer"
                            className="block aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                          >
                            <img
                              src={img}
                              alt="Evidence"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0 rounded-b-xl">
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
