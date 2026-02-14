import { useState, useEffect } from "react";
import {
  X,
  Search,
  CheckCircle,
  MapPin,
  Briefcase,
  Star,
  Info,
  Phone,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ManpowerModalProps {
  complaint: any;
  onClose: () => void;
  onAssign: (staffId: string) => void;
}

interface Staff {
  id: string;
  full_name: string;
  role: string;
  assigned_zone: string;
  status: "available" | "busy" | "off_duty";
  contact_number: string;
  performance_rating: number;
  location: any; // GeoJSON or similar
  avatar_url?: string;
  current_assignment_id?: string;
  complaints_handled?: number;
}

export function ManpowerModal({
  complaint,
  onClose,
  onAssign,
}: ManpowerModalProps) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("rating"); // rating, location
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

  const handleAssign = async (staffId: string) => {
    // Call the parent handler
    onAssign(staffId);
    // Show success popup
    setAssignmentSuccess(true);
  };

  // Pre-calculate role matches for better sorting and default filtering
  const roleMap: Record<string, string> = {
    Electricity: "Electrician",
    Sanitation: "Sanitation Worker",
    "Road Maintenance": "Road Technician",
    "Water Supply": "Water Technician",
    Drainage: "Drainage Worker",
    "Street Lights": "Street Light Technician",
    "Parks & Gardens": "Gardener",
    Traffic: "Traffic Warden",
  };

  const recommendedRole = roleMap[complaint.category];

  useEffect(() => {
    // Auto-select the filter if a match is found
    if (recommendedRole) {
      setFilterRole(recommendedRole);
    }
  }, [complaint, recommendedRole]);

  useEffect(() => {
    let ignore = false;

    const fetchStaff = async () => {
      setLoading(true);
      try {
        let query = supabase.from("staff").select("*");

        // 1. Apply Filters (Database Side)
        if (filterRole !== "all") {
          query = query.eq("role", filterRole);
        }

        if (filterStatus !== "all") {
          query = query.eq("status", filterStatus.toLowerCase());
        }

        // 2. Apply Sorting (Database Side)
        if (sortBy === "rating") {
          query = query.order("performance_rating", { ascending: false });
        } else if (sortBy === "status") {
          query = query.order("status", { ascending: true });
        }

        const { data, error } = await query;

        if (!ignore) {
          if (error) throw error;
          setStaffList(data || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching staff:", err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchStaff();

    return () => {
      ignore = true;
    };
  }, [filterRole, filterStatus, sortBy]);

  // Client-side adjustment: Ensure "Recommended Role" is visually on top if "All" is selected
  // We copy the array to avoid mutating state directly
  const filteredStaff = [...staffList].sort((a, b) => {
    if (filterRole === "all" && recommendedRole) {
      if (a.role === recommendedRole && b.role !== recommendedRole) return -1;
      if (a.role !== recommendedRole && b.role === recommendedRole) return 1;
    }
    // Otherwise preserve DB sort order
    return 0;
  });

  if (assignmentSuccess && selectedStaff) {
    return (
      <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 text-center transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Work Assigned Successfully!
          </h2>
          <p className="text-gray-500 mb-6">
            The complaint has been assigned to the selected staff member.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left border border-gray-100">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase font-semibold">
                Staff Assigned
              </span>
              <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                {selectedStaff.role}
              </span>
            </div>
            <p className="font-bold text-gray-800 text-lg mb-1">
              {selectedStaff.full_name}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin size={12} /> {selectedStaff.assigned_zone}
            </p>

            <div className="my-3 border-t border-gray-200 border-dashed"></div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 uppercase font-semibold">
                Complaint ID
              </span>
              <span className="font-mono text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                #{complaint.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400 uppercase font-semibold">
                Category
              </span>
              <span className="text-sm text-gray-700 font-medium">
                {complaint.category}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Close & Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full h-[85vh] flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Search & List */}
        <div className="flex-1 flex flex-col border-r border-gray-200 h-full overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Assign Work</h2>
            <button onClick={onClose} className="md:hidden">
              <X />
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-100 grid grid-cols-2 gap-2">
            <select
              className="p-2 border rounded-lg text-sm"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="Electrician">Electrician</option>
              <option value="Sanitation Worker">Sanitation Worker</option>
              <option value="Road Technician">Road Technician</option>
              <option value="Water Technician">Water Technician</option>
              <option value="Drainage Worker">Drainage Worker</option>
              <option value="Street Light Technician">
                Street Light Technician
              </option>
              <option value="Gardener">Gardener</option>
              <option value="Traffic Warden">Traffic Warden</option>
            </select>
            <select
              className="p-2 border rounded-lg text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 scrollbar-thin scrollbar-thumb-gray-300">
            {loading ? (
              <div className="text-center py-10 text-gray-400">
                Loading staff...
              </div>
            ) : (
              filteredStaff.map((staff) => (
                <div
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md flex items-center justify-between
                            ${selectedStaff?.id === staff.id ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" : "bg-white border-gray-200 hover:border-blue-300"}
                        `}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                      {staff.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {staff.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {staff.role} • {staff.assigned_zone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs px-2 py-0.5 rounded-full inline-block mb-1 capitalize
                                   ${staff.status === "available" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}
                               `}
                    >
                      {staff.status === "available" ? "Available" : "Busy"}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs text-yellow-600 font-medium">
                      <Star size={10} fill="currentColor" />{" "}
                      {staff.performance_rating}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Details & Action */}
        <div className="w-full md:w-[400px] bg-white flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Staff Details</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
            {selectedStaff ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="h-20 w-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-blue-600 mb-3">
                    {selectedStaff.full_name.charAt(0)}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedStaff.full_name}
                  </h2>
                  <p className="text-gray-500">{selectedStaff.role}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-400 uppercase">Rating</p>
                    <p className="font-bold text-lg text-gray-900 flex items-center justify-center gap-1">
                      {selectedStaff.performance_rating}{" "}
                      <Star
                        size={14}
                        className="text-yellow-500"
                        fill="currentColor"
                      />
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-400 uppercase">Zone</p>
                    <p
                      className="font-bold text-lg text-gray-900 truncate"
                      title={selectedStaff.assigned_zone}
                    >
                      {selectedStaff.assigned_zone}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone size={16} className="text-gray-400" />
                    <span>
                      {selectedStaff.contact_number || "No contact info"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Briefcase size={16} className="text-gray-400" />
                    <span>
                      {selectedStaff.status === "busy"
                        ? `Handling Complaint #${(selectedStaff.current_assignment_id || "Unknown").slice(0, 8)}`
                        : `Complaints Handled: ${selectedStaff.complaints_handled || 0}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <MapPin size={16} className="text-gray-400" />
                    <span>
                      Based in <strong>{selectedStaff.assigned_zone}</strong>
                    </span>
                  </div>
                </div>

                {selectedStaff.status === "busy" && (
                  <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex gap-3">
                    <Info
                      className="text-orange-600 shrink-0 mt-0.5"
                      size={18}
                    />
                    <p className="text-xs text-orange-800">
                      This worker is currently busy. Assigning them will queue
                      this task for later or require manual override.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                <Briefcase size={48} className="mb-4 opacity-20" />
                <p>
                  Select a staff member from the list
                  <br />
                  to view details and assign work.
                </p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button
              disabled={!selectedStaff}
              onClick={() => selectedStaff && handleAssign(selectedStaff.id)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {selectedStaff?.status === "busy"
                ? "Queue Assignment"
                : "Confirm Assignment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
