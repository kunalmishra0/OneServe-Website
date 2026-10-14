import { useState, useEffect } from "react";
import {
  MapPin,
  X,
  Search,
  Clock,
  CheckCircle,
  Loader2,
  Wrench,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ManpowerModal } from "./ManpowerModal";

interface Complaint {
  id: string;
  ref_id?: string;
  description: string;
  category: string;
  status:
    | "submitted"
    | "analyzing"
    | "verified"
    | "in_progress"
    | "pending_review"
    | "resolved"
    | "rejected";
  created_at: string;
  updated_at?: string;
  priority_score: number;
  location: string;
  images?: string[];
  address_line_1?: string;
  city?: string;
  citizen_email?: string;
  location_coords?: [number, number]; // [lon, lat] for ETA
  priority_level: "low" | "medium" | "high" | "critical";
}

export function AdminDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Hard Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    if (selectedComplaint?.status === "pending_review") {
      fetchReviewData(selectedComplaint.id);
    } else {
      setReviewData(null);
    }
  }, [selectedComplaint]);

  const fetchReviewData = async (complaintId: string) => {
    try {
      setReviewLoading(true);
      const { data, error } = await supabase
        .from("completed_complaints")
        .select("*, staff(full_name)")
        .eq("complaint_id", complaintId)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setReviewData(data);
    } catch (error) {
      console.error("Error fetching review data:", error);
    } finally {
      setReviewLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);

      // Fetch Raw Complaints with Citizen Info and GeoLocation
      const { data: rawData, error: rawError } = await supabase
        .from("raw_complaints")
        .select("*, citizens(email)")
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
          ref_id: raw.ref_id,
          description: raw.description,
          category: raw.category,
          status: processed?.complaint_status || "analyzing",
          created_at: raw.created_at,
          updated_at: processed?.updated_at || raw.updated_at,
          priority_score: processed?.priority_score || 0,
          location: locationStr,
          location_coords: raw.location?.coordinates,
          address_line_1: raw.address_line_1,
          city: raw.city,
          citizen_email: (raw.citizens as any)?.email,
          priority_level: processed?.priority_level || "low",
          raw_location: raw.location,
        };

      });

      setComplaints(merged);
      
      // Phase 4: Run Auto-Escalation Check (Silent)
      await supabase.rpc("check_and_escalate_priorities");
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  // Stats Logic
  const stats = {
    pending: complaints.filter((c) =>
      ["submitted", "analyzing", "verified", "in_progress", "pending_review"].includes(c.status),
    ).length,
    pendingByCat: (() => {
      const pending = complaints.filter((c) =>
        ["submitted", "analyzing", "verified", "in_progress", "pending_review"].includes(c.status),
      );
      const catMap: Record<string, number> = {};
      pending.forEach((c) => {
        const mapping: Record<string, string> = {
          Sanitation: "SNT",
          "Road Maintenance": "ROD",
          "Water Supply": "WTR",
          Electricity: "ELE",
          Drainage: "DRN",
          "Street Lights": "LGT",
          "Parks & Gardens": "PRK",
          Traffic: "TRF",
          Others: "GRB",
        };
        const short = mapping[c.category] || "GRB";
        catMap[short] = (catMap[short] || 0) + 1;
      });
      return Object.entries(catMap)
        .map(([k, v]) => `${k}:${v}`)
        .join(" | ");
    })(),
    resolvedToday: complaints.filter((c) => {
      const isResolved = c.status === "resolved";
      // Fallback to created_at if updated_at is missing for some reason
      const dateToCheck = c.updated_at || c.created_at;
      const isToday =
        new Date(dateToCheck).toDateString() === new Date().toDateString();
      return isResolved && isToday;
    }).length,
    reviewQueue: complaints.filter((c) => c.status === "pending_review").length,
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
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location &&
        c.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || c.priority_level === priorityFilter;

    const matchesCategory =
      categoryFilter === "all" || c.category === categoryFilter;

    const matchesResolved = showResolved || c.status !== "resolved";

    return (matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesResolved);
  }).sort((a, b) => {

    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[b.priority_level] - weights[a.priority_level];
  });

  const handleVerifyTask = async (approved: boolean, feedback: string) => {
    if (!selectedComplaint) return;
    setUpdateLoading(true);
    try {
      const { error } = await supabase.rpc("admin_verify_task", {
        p_complaint_id: selectedComplaint.id,
        p_approved: approved,
        p_feedback: feedback,
      });

      if (error) throw error;

      // Update local state
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === selectedComplaint.id
            ? { ...c, status: approved ? "resolved" : "verified" }
            : c,
        ),
      );
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Error verifying task:", error);
      alert("Failed to verify task. Please try again.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "analyzing":
        return "bg-blue-50 text-blue-600";
      case "verified":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-amber-100 text-amber-800";
      case "pending_review":
        return "bg-indigo-100 text-indigo-800 animate-pulse";
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
    if (score >= 5.5) return "text-orange-700 bg-orange-50 border-orange-200";
    if (score >= 3.5) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-green-700 bg-green-50 border-green-200";
  };

  const getPriorityLevelColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-600 text-white shadow-sm shadow-red-200";
      case "high": return "bg-orange-500 text-white shadow-sm shadow-orange-100";
      case "medium": return "bg-amber-400 text-gray-900";
      case "low": return "bg-emerald-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedComplaint) return;
    setUpdateLoading(true);
    try {
      // 1. Call Secure RPC to handle database updating cleanly and bypass RLS constraints
      const { error } = await supabase.rpc("admin_update_complaint_status", {
        p_complaint_id: selectedComplaint.id,
        p_new_status: newStatus,
      });

      if (error) {
        throw new Error(error.message || "Failed to update complaint status");
      }

      // 2. Update local state
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
    } catch (err: any) {
      console.error("Failed to update status", err);
      alert(`Error updating status: ${err.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleHardDelete = async () => {
    if (!selectedComplaint || deleteInput !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("admin_hard_delete_complaint", {
        p_complaint_id: selectedComplaint.id
      });

      if (error) throw error;

      // Update local state
      setComplaints(prev => prev.filter(c => c.id !== selectedComplaint.id));
      setSelectedComplaint(null);
      setShowDeleteConfirm(false);
      setDeleteInput("");
      alert("Complaint and all associated data permanently deleted.");
    } catch (err: any) {
      console.error("Hard delete failed:", err);
      alert(`Error deleting complaint: ${err.message}`);
    } finally {
      setIsDeleting(false);
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
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
              setCategoryFilter("all");
              setSearchQuery("");
            }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-blue-200 transition-all group"
          >
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-blue-600 transition-colors">
                Total Active
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.pending}
              </p>
              <p className="text-[10px] text-blue-500 mt-1 font-bold uppercase tracking-tight">
                {stats.pendingByCat}
              </p>
            </div>

            <div className="h-12 w-12 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform">
              <Clock size={24} />
            </div>
          </div>


          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                In Progress
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {complaints.filter((c) => c.status === "in_progress").length}
              </p>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <Wrench size={24} />
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter("pending_review")}
            className="bg-white p-6 rounded-xl shadow-sm border border-indigo-200 flex items-center justify-between relative overflow-hidden cursor-pointer group"
          >
            <div>
              <p className="text-sm font-medium text-indigo-600 mb-1 font-bold">
                To Review
              </p>
              <p className="text-3xl font-bold text-indigo-900">
                {stats.reviewQueue}
              </p>
              <p className="text-[10px] text-indigo-400 mt-1 uppercase font-bold">
                Awaiting Approval
              </p>
            </div>
            <div className="h-12 w-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={24} />
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
        </div>

        {/* Filters & Data Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Filter Bar */}
          {/* Multi-Level Queue Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setPriorityFilter("critical")}
              className={`flex-1 px-4 py-3 text-xs font-bold border-b-2 transition-all ${priorityFilter === "critical" ? "border-red-600 text-red-600 bg-red-50" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
            >
              CRITICAL QUEUE ({complaints.filter(c => c.priority_level === 'critical').length})
            </button>
            <button
              onClick={() => setPriorityFilter("high")}
              className={`flex-1 px-4 py-3 text-xs font-bold border-b-2 transition-all ${priorityFilter === "high" ? "border-orange-500 text-orange-500 bg-orange-50" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
            >
              HIGH PRIORITY ({complaints.filter(c => c.priority_level === 'high').length})
            </button>
            <button
              onClick={() => setPriorityFilter("all")}
              className={`flex-1 px-4 py-3 text-xs font-bold border-b-2 transition-all ${priorityFilter === "all" ? "border-blue-600 text-blue-600 bg-blue-50" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
            >
              ALL COMPLAINTS
            </button>
          </div>

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
                <option value="verified">
                  Verified (Ready for Assignment)
                </option>
                <option value="in_progress">In Progress (Field Action)</option>
                <option value="pending_review">
                  Pending Review (Awaiting Approval)
                </option>
                <option value="resolved">Resolved (Completed)</option>
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

              <button
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setCategoryFilter("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-blue-600 text-white border border-blue-700 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-100"
              >
                <RefreshCw size={14} />
                Clear Filters
              </button>

              <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showResolved} 
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-700">Show Resolved</span>
              </label>
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
                            #{complaint.ref_id || complaint.id.slice(0, 8)}
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
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority_score)}`}
                          >
                            {complaint.priority_score.toFixed(1)} / 10
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getPriorityLevelColor(complaint.priority_level)}`}
                          >
                            {complaint.priority_level}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(complaint.status)}`}
                        >
                          {complaint.status}
                        </span>
                        {complaint.status !== "resolved" && complaint.status !== "rejected" && complaint.priority_level !== "critical" && (
                          <div className="mt-1 text-[9px] text-orange-600 font-bold flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                            <Clock size={10} className="animate-pulse" />
                            {(() => {
                              const ageHours = (new Date().getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60);
                              // Calculate time until next level
                              const nextEscalation = 
                                complaint.priority_level === 'low' ? 24 :
                                complaint.priority_level === 'medium' ? 48 : 72;
                              const remaining = Math.max(0, Math.ceil(nextEscalation - ageHours));
                              return remaining > 0 ? `Escalates in ~${remaining}h` : "Escalation Overdue";
                            })()}
                          </div>
                        )}
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
                {/* Status & Control Section */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Current Status
                      </p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold capitalize ${getStatusColor(selectedComplaint.status)}`}
                      >
                        {selectedComplaint.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Manual Reject Button (Only for unassigned/unresolved complaints) */}
                    {["analyzing", "verified", "submitted"].includes(
                      selectedComplaint.status,
                    ) && (
                      <div className="relative">
                        {!showRejectMenu ? (
                          <button
                            onClick={() => setShowRejectMenu(true)}
                            className="text-red-600 bg-white border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
                          >
                            <X size={16} /> Reject Complaint
                          </button>
                        ) : (
                          <div className="bg-white border border-red-200 shadow-lg rounded-lg p-3 absolute right-0 top-10 w-56 z-10">
                            <p className="text-xs font-bold text-gray-700 mb-2">
                              Why reject this?
                            </p>
                            <select
                              className="w-full text-sm border border-gray-300 p-1.5 rounded mb-2"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            >
                              <option value="">Select reason...</option>
                              <option value="Spam / Fake image">
                                Spam / Fake image
                              </option>
                              <option value="Out of Jurisdiction">
                                Out of Jurisdiction
                              </option>
                              <option value="Duplicate Complaint">
                                Duplicate Complaint
                              </option>
                              <option value="Not a civic issue">
                                Not a civic issue
                              </option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowRejectMenu(false);
                                  setRejectReason("");
                                }}
                                className="flex-1 bg-gray-100 text-gray-700 font-bold text-xs py-1.5 rounded hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={!rejectReason}
                                onClick={async () => {
                                  await handleStatusUpdate("rejected");
                                  if (selectedComplaint.citizen_email) {
                                    import("@/lib/notifications").then((m) =>
                                      m.sendComplaintRejectionNotification(
                                        selectedComplaint.citizen_email!,
                                        selectedComplaint.ref_id ||
                                          selectedComplaint.id,
                                        rejectReason,
                                      ),
                                    );
                                  }
                                  setShowRejectMenu(false);
                                  setRejectReason("");
                                }}
                                className="flex-1 bg-red-600 text-white font-bold text-xs py-1.5 rounded disabled:opacity-50 hover:bg-red-700 transition-colors"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contextual Information */}
                  <div className="text-sm text-gray-500">
                    {selectedComplaint.status === "analyzing" &&
                      "AI is currently extracting location and priority details..."}
                    {selectedComplaint.status === "verified" &&
                      "AI Analysis complete. Ready for field assignment."}
                    {selectedComplaint.status === "in_progress" &&
                      "Work order is active. Field agent is on-site."}
                    {selectedComplaint.status === "pending_review" &&
                      "Worker has submitted completion proof. Awaiting your approval."}
                    {selectedComplaint.status === "resolved" &&
                      "This issue has been successfully resolved and closed."}
                  </div>
                </div>

                {/* Worker Resolution Proof - NEW */}
                {selectedComplaint.status === "pending_review" && (
                  <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        <CheckCircle2 className="text-indigo-600" />
                        Worker Resolution Proof
                      </h3>
                      {reviewLoading && (
                        <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                      )}
                    </div>

                    {reviewData ? (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-indigo-400 uppercase mb-1">
                              Submitted By
                            </p>
                            <p className="text-sm font-medium text-gray-800">
                              {reviewData.staff?.full_name || "Field Agent"}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-indigo-400 uppercase mb-1">
                              Completion Date
                            </p>
                            <p className="text-sm font-medium text-gray-800">
                              {new Date(
                                reviewData.completed_at,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-indigo-400 uppercase mb-1">
                            Worker Notes
                          </p>
                          <div className="bg-white p-3 rounded-lg border border-indigo-50 text-sm text-gray-700 italic">
                            "{reviewData.notes || "No notes provided"}"
                          </div>
                        </div>

                        {reviewData.image_url && (
                          <div>
                            <p className="text-xs font-bold text-indigo-400 uppercase mb-1">
                              Resolution Photo
                            </p>
                            <a
                              href={reviewData.image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block aspect-video bg-gray-200 rounded-lg overflow-hidden border border-indigo-100 hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={reviewData.image_url}
                                alt="Resolution Proof"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() =>
                              handleVerifyTask(true, "Work approved by admin.")
                            }
                            disabled={updateLoading}
                            className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={18} /> Approve & Close
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt(
                                "Enter reason for rejection:",
                              );
                              if (reason) handleVerifyTask(false, reason);
                            }}
                            disabled={updateLoading}
                            className="flex-1 bg-white text-red-600 border border-red-200 py-2 rounded-lg font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <AlertCircle size={18} /> Reject / Rework
                          </button>
                        </div>
                      </div>
                    ) : (
                      !reviewLoading && (
                        <p className="text-sm text-indigo-400 italic text-center py-4">
                          No completion proof found for this task.
                        </p>
                      )
                    )}
                  </div>
                )}

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

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-3 sticky bottom-0 rounded-b-xl">
                <div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    Hard Delete
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Close
                  </button>

                  {/* Assignment Logic: Only show if NOT in progress, review, resolved, or rejected */}
                  {![
                  "in_progress",
                  "pending_review",
                  "resolved",
                  "rejected",
                ].includes(selectedComplaint.status) ? (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="px-4 py-2 border border-transparent bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-100"
                  >
                    Assign Work
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium border border-gray-200">
                    {selectedComplaint.status === "resolved" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : selectedComplaint.status === "rejected" ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {selectedComplaint.status === "in_progress" &&
                      "Currently in Field Action"}
                    {selectedComplaint.status === "pending_review" &&
                      "Awaiting Your Final Review"}
                    {selectedComplaint.status === "resolved" &&
                      "Task Already Resolved"}
                    {selectedComplaint.status === "rejected" &&
                      "Complaint Rejected"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Assign Work Modal */}
        {showAssignModal && selectedComplaint && (
          <ManpowerModal
            complaint={selectedComplaint}
            onClose={(success) => {
              setShowAssignModal(false);
              if (success) {
                setSelectedComplaint(null);
                fetchComplaints(); // Refresh the list after bundle assignments
              }
            }}
            onAssign={(staffId) => {
              // Now completely handled by the ManpowerModal via assign_task_bundle RPC
              console.log("Assignment initiated for:", staffId);
            }}
          />
        )}

        {/* HARD DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && selectedComplaint && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
              <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-red-900 mb-2">Permanent Deletion</h2>
                <p className="text-red-700 text-sm">
                  This action cannot be undone. It will permanently wipe the complaint, AI analysis, field assignments, and completion proofs from the database.
                </p>
              </div>
              
              <div className="p-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Type <span className="font-mono bg-gray-100 text-red-600 px-1 rounded select-none">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg font-mono focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all uppercase mb-6"
                />
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInput("");
                    }}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHardDelete}
                    disabled={deleteInput !== "DELETE" || isDeleting}
                    className={`flex-1 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      deleteInput === "DELETE" && !isDeleting
                        ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200" 
                        : "bg-red-200 text-red-400 cursor-not-allowed"
                    }`}
                  >
                    {isDeleting ? <Loader2 className="animate-spin h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
