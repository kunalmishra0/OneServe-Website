import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  MapPin,
  Briefcase,
  Star,
  Info,
  Phone,
  CalendarDays,
  ListPlus,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sendStaffAssignmentNotification } from "@/lib/notifications";
import { calculateETA, ETAResult } from "@/lib/eta";
import { getRoadDistanceKm, parsePostGisPoint } from "@/lib/geo";



interface ManpowerModalProps {
  complaint: any;
  onClose: (success?: boolean) => void;
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
  location?: { coordinates: [number, number] }; // Consolidating to use the typed object
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
  const [sortBy] = useState("rating"); // rating, location
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);
  
  // Smart Routing States
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [bundleSuggestions, setBundleSuggestions] = useState<any[]>([]);
  const [fetchingBundles, setFetchingBundles] = useState(false);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [workerSchedule, setWorkerSchedule] = useState<any[]>([]);
  const [fetchingSchedule, setFetchingSchedule] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [viewingSuggestion, setViewingSuggestion] = useState<any | null>(null);
  const [suggestionSortMode, setSuggestionSortMode] = useState<"distance" | "priority">("distance");



  // ETA States
  const [etaResult, setEtaResult] = useState<ETAResult | null>(null);
  const [fetchingETA, setFetchingETA] = useState(false);


  // Fetch bundle suggestions when date is selected
  useEffect(() => {
    if (!scheduledDate || !complaint?.id) {
      setBundleSuggestions([]);
      setSelectedBundleIds([]);
      return;
    }
    
    const fetchBundles = async () => {
      setFetchingBundles(true);
      try {
        const { data, error } = await supabase.rpc('get_bundle_suggestions', {
          p_complaint_id: complaint.id,
          p_scheduled_date: scheduledDate
        });
        
        console.log("Smart Routing RPC Result:", data, error);
        
        if (error) throw error;

        if (data && data.success && data.suggestions) {
          const rawSuggestions = data.suggestions || [];
          
          // Initial sort based on distance (default)
          const sorted = [...rawSuggestions].sort((a: any, b: any) => a.distance_meters - b.distance_meters);
          
          setBundleSuggestions(sorted);
          setSelectedBundleIds([]); // None selected by default, admin picks and chooses

          // Fetch road distances for verification
          const targetPoint = parsePostGisPoint(complaint.raw_location || complaint.location_coords);
          if (targetPoint) {
            // Process ALL suggestions for road distance
            const suggestionsWithRoad = await Promise.all(sorted.map(async (s: any) => {
              const suggestionPoint = parsePostGisPoint(s.location);
              if (suggestionPoint && targetPoint) {
                const roadKm = await getRoadDistanceKm(targetPoint.lat, targetPoint.lon, suggestionPoint.lat, suggestionPoint.lon);
                return { ...s, roadDistanceKm: roadKm };
              }
              return s;
            }));
            
            setBundleSuggestions(suggestionsWithRoad);
          } else {
            setBundleSuggestions(sorted);
          }

        } else {

          setBundleSuggestions([]);
          setSelectedBundleIds([]);
        }

      } catch (err) {
        console.error("Error fetching bundles:", err);
      } finally {
        setFetchingBundles(false);
      }
    };
    
    fetchBundles();
  }, [scheduledDate, complaint]);

  // Fetch worker schedule when a staff member is selected
  useEffect(() => {
    if (!selectedStaff?.id) {
      setWorkerSchedule([]);
      return;
    }

    const fetchSchedule = async () => {
      setFetchingSchedule(true);
      try {
        const { data, error } = await supabase.rpc('get_worker_schedule', {
          p_worker_id: selectedStaff.id
        });
        if (error) throw error;
        setWorkerSchedule(data || []);
      } catch (err) {
        console.error("Error fetching worker schedule:", err);
      } finally {
        setFetchingSchedule(false);
      }
    };

    fetchSchedule();
  }, [selectedStaff]);

  // Calculate Realistic ETA when staff or date changes
  useEffect(() => {
    if (!selectedStaff?.id || !scheduledDate || !complaint?.location) {
      setEtaResult(null);
      return;
    }

    const getETA = async () => {
      setFetchingETA(true);
      try {
        const { parsePostGisPoint } = await import("@/lib/geo");
        
        // Use raw_location which contains the PostGIS geography object
        const targetPoint = parsePostGisPoint(complaint.raw_location || complaint.location_coords);
        if (!targetPoint) {
          console.warn("Could not parse complaint location for ETA:", complaint.raw_location);
          setFetchingETA(false);
          return;
        }

        const workerPoint = parsePostGisPoint(selectedStaff.location);
        
        console.log("Calculating ETA for:", {
          worker: selectedStaff.full_name,
          target: targetPoint,
          workerLoc: workerPoint
        });

        const res = await calculateETA(
          selectedStaff.id,
          targetPoint.lat,
          targetPoint.lon,
          workerPoint?.lat,
          workerPoint?.lon
        );

        
        console.log("ETA Result:", res);
        setEtaResult(res);

      } catch (err) {
        console.error("Failed to calculate ETA:", err);
      } finally {
        setFetchingETA(false);
      }
    };


    getETA();
  }, [selectedStaff, scheduledDate, complaint]);


  const handleAssign = async (staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) return;

    let eta = "Within next 2 - 3 business days"; // Default for available

    // Schedule-based Estimation
    if (staff.status === "busy") {
      // If busy, they have work lined up. Estimate based on workload.
      const workloadFactor = (staff.complaints_handled || 0) % 3;
      if (workloadFactor === 0) eta = "Within next 3 - 4 business days";
      else if (workloadFactor === 1) eta = "Next week";
      else eta = "By next 2 weeks";
    }

    // Call the parent handler (just logs now)
    onAssign(staffId);

    try {
      const allTaskIds = [complaint.id, ...selectedBundleIds];
      const { error } = await supabase.rpc('assign_task_bundle', {
        p_worker_id: staffId,
        p_complaint_ids: allTaskIds,
        p_scheduled_date: scheduledDate,
        p_estimated_resolution: etaResult?.estimatedDate.toISOString() || null
      });
      if (error) throw error;
      
      // Send Email Notification
      if (complaint.citizen_email) {
        sendStaffAssignmentNotification(
          complaint.citizen_email,
          complaint.ref_id || complaint.id.slice(0, 8),
          staff.full_name,
          staff.contact_number,
          etaResult?.formatted || eta,
          staff.role
        );
      }

      // Show success popup
      setAssignmentSuccess(true);
    } catch (err: any) {
      alert("Error assigning tasks: " + err.message);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            onClick={() => onClose(true)}
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
            <button onClick={() => onClose(false)} className="md:hidden">
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
              onClick={() => onClose(false)}
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

                {/* Smart Routing / Scheduling UI */}
                <div className="bg-white border-2 border-dashed border-blue-100 p-4 rounded-xl space-y-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <CalendarDays size={16} className="text-blue-600" />
                    Schedule Task
                  </h4>

                  {/* Worker Schedule Preview */}
                  {workerSchedule.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Worker's Current Bookings</h5>
                      <div className="flex flex-col gap-2">
                        {workerSchedule.map((s: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedDate(expandedDate === s.scheduled_date ? null : s.scheduled_date);
                              }}
                              className="bg-white border border-gray-100 rounded px-3 py-2 flex items-center justify-between shadow-sm hover:border-blue-200 transition-colors w-full text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-700">{new Date(s.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                <span className="text-[10px] font-medium text-gray-500">{s.task_count} task{s.task_count > 1 ? 's' : ''}</span>
                              </div>
                              <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedDate === s.scheduled_date ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {expandedDate === s.scheduled_date && (
                              <div className="bg-gray-100/50 rounded-lg p-2 ml-2 space-y-1 border-l-2 border-amber-300">
                                {s.task_titles?.map((title: string, tIdx: number) => (
                                  <p key={tIdx} className="text-[10px] text-gray-600 truncate flex items-center gap-1">
                                    <span className="h-1 w-1 bg-gray-400 rounded-full"></span>
                                    {title}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  />


                  {/* Realistic ETA Preview */}
                  {scheduledDate && selectedStaff && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Realistic ETA Preview</h5>
                        {etaResult && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            etaResult.confidence === 'high' ? 'bg-green-200 text-green-800' : 
                            etaResult.confidence === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-800'
                          }`}>
                            {etaResult.confidence} Confidence
                          </span>
                        )}
                      </div>
                      
                      {fetchingETA ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 animate-pulse">
                          <Info size={14} /> Computing workload & travel time...
                        </div>
                      ) : etaResult ? (
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-gray-800 leading-tight">
                            {etaResult.formatted}
                          </p>
                          <div className="grid grid-cols-3 gap-1 pt-1">
                            <div className="text-center">
                              <p className="text-[8px] text-gray-400 uppercase">Queue</p>
                              <p className="text-xs font-bold text-gray-700">+{etaResult.breakdown.queueDelayMinutes}m</p>
                            </div>
                            <div className="text-center border-x border-green-100">
                              <p className="text-[8px] text-gray-400 uppercase">Travel</p>
                              <p className="text-xs font-bold text-gray-700">+{etaResult.breakdown.travelOffsetMinutes}m</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[8px] text-gray-400 uppercase">Avg Task</p>
                              <p className="text-xs font-bold text-gray-700">{etaResult.breakdown.avgCompletionMinutes}m</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">Enter date to calculate ETA</p>
                      )}
                    </div>
                  )}
                                    {scheduledDate && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-blue-800 flex items-center gap-2">
                          <ListPlus size={14} /> Smart Routing
                        </h5>
                        <div className="flex bg-blue-100 p-0.5 rounded-md border border-blue-200">
                          <button 
                            onClick={() => setSuggestionSortMode("distance")}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${suggestionSortMode === 'distance' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}
                          >
                            Distance
                          </button>
                          <button 
                            onClick={() => setSuggestionSortMode("priority")}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${suggestionSortMode === 'priority' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}
                          >
                            Priority
                          </button>
                        </div>
                      </div>

                      
                      {fetchingBundles ? (
                        <p className="text-xs text-blue-600 animate-pulse">Scanning for nearby tasks within 10KM...</p>
                      ) : bundleSuggestions.length > 0 ? (
                        <>
                          <p className="text-xs text-blue-600 leading-tight mb-2">
                            Found {bundleSuggestions.length} other unassigned {complaint.category} task{bundleSuggestions.length > 1 ? 's' : ''} nearby.
                          </p>

                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-200">
                            {[...bundleSuggestions].sort((a, b) => {
                              if (suggestionSortMode === 'priority') {
                                const weights = { critical: 4, high: 3, medium: 2, low: 1 };
                                const weightA = weights[a.priority_level as keyof typeof weights] || 0;
                                const weightB = weights[b.priority_level as keyof typeof weights] || 0;
                                
                                // If priorities are the same, sort by distance (closest first)
                                if (weightA === weightB) {
                                  return (a.roadDistanceKm || a.distance_meters / 1000) - (b.roadDistanceKm || b.distance_meters / 1000);
                                }
                                // Otherwise sort by priority descending
                                return weightB - weightA;
                              }
                              // Default Distance sort
                              return (a.roadDistanceKm || a.distance_meters / 1000) - (b.roadDistanceKm || b.distance_meters / 1000);
                            }).map((s: any) => (

                              <label key={s.id} className="flex items-start gap-2 text-xs bg-white p-2 rounded shadow-sm border border-blue-100 cursor-pointer hover:bg-blue-50">

                                <input 
                                  type="checkbox" 
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                  checked={selectedBundleIds.includes(s.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBundleIds([...selectedBundleIds, s.id]);
                                    } else {
                                      setSelectedBundleIds(selectedBundleIds.filter(id => id !== s.id));
                                    }
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-gray-800 line-clamp-1">{s.title}</p>
                                      {s.priority_level && (
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
                                          s.priority_level === 'critical' ? 'bg-red-100 text-red-600' :
                                          s.priority_level === 'high' ? 'bg-orange-100 text-orange-600' :
                                          'bg-blue-100 text-blue-600'
                                        }`}>
                                          {s.priority_level}
                                        </span>
                                      )}
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setViewingSuggestion(s);
                                      }}
                                      className="p-1 hover:bg-blue-100 rounded-full text-blue-500 transition-colors"
                                    >
                                      <Info size={14} />
                                    </button>
                                  </div>
                                  <p className="text-gray-500 text-[10px] flex items-center gap-1">
                                    <span>{(s.distance_meters / 1000).toFixed(2)} KM (Straight)</span>
                                    {s.roadDistanceKm ? (
                                      <>
                                        <span className="text-blue-400">→</span>
                                        <span className="text-blue-600 font-bold">{s.roadDistanceKm.toFixed(2)} KM (Road)</span>
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-xs text-gray-400 italic">No other unassigned {complaint.category} tasks found within 10KM.</p>
                          <p className="text-[9px] text-gray-300 mt-1 uppercase font-mono">
                            Searching: {complaint.category} | ID: {complaint.id.slice(0, 8)}
                          </p>
                        </div>
                      )}

                    </div>
                  )}
                </div>
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
              disabled={!selectedStaff || !scheduledDate}
              onClick={() => selectedStaff && handleAssign(selectedStaff.id)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {!scheduledDate 
                ? "Select a Date First" 
                : selectedStaff?.status === "busy"
                  ? `Queue Assignment (${1 + selectedBundleIds.length} tasks)`
                  : `Confirm Assignment (${1 + selectedBundleIds.length} tasks)`}
            </button>
          </div>
        </div>
      </div>
      {/* Suggestion Detail Overlay */}
      {viewingSuggestion && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 border border-blue-100">
            {/* Image Header */}
            <div className="h-48 bg-gray-100 relative group overflow-hidden">
              {viewingSuggestion.image_url ? (
                <img 
                  src={viewingSuggestion.image_url} 
                  alt={viewingSuggestion.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                  <Briefcase size={48} className="mb-2 opacity-20" />
                  <span className="text-xs uppercase font-bold tracking-widest">No Image Attached</span>
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest shadow-lg ${
                  viewingSuggestion.priority_level === 'critical' ? 'bg-red-600 text-white' :
                  viewingSuggestion.priority_level === 'high' ? 'bg-orange-600 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {viewingSuggestion.priority_level} Priority
                </span>
              </div>
              <button 
                onClick={() => setViewingSuggestion(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{viewingSuggestion.category}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{viewingSuggestion.title}</h3>
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 uppercase font-bold tracking-tight">
                  <CalendarDays size={10} /> Submitted on {new Date(viewingSuggestion.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Detailed Description</p>
                <p className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin">
                  {viewingSuggestion.description || "No detailed description provided for this complaint."}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" />
                  <span>{(viewingSuggestion.distance_meters / 1000).toFixed(2)} KM from target</span>
                </div>
                <span className="font-mono text-[10px] bg-gray-100 px-2 py-1 rounded">ID: {viewingSuggestion.id.slice(0, 8)}</span>
              </div>
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={() => setViewingSuggestion(null)}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

