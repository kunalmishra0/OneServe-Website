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
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Complaint {
  id: string;
  description: string;
  category: string;
  status: "submitted" | "analyzing" | "verified" | "in_progress" | "resolved" | "rejected" | "pending_review";
  created_at: string;
  priority_score: number;
  location: string;
  images?: string[];
  admin_visible?: boolean;
  ref_id?: string;
  resolution_proof?: {
    image_url: string;
    notes: string;
  };
  estimated_resolution?: string;
}


export function ComplaintTracking() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [isProcessingExpanded, setIsProcessingExpanded] = useState(true);
  const [isProcessedExpanded, setIsProcessedExpanded] = useState(true);

  useEffect(() => {
    if (user) {
      fetchComplaints();
      const channel = supabase
        .channel("public:raw_complaints")
        .on("postgres_changes", { event: "*", schema: "public", table: "raw_complaints", filter: `user_id=eq.${user.id}` }, () => fetchComplaints())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchComplaints = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: rawData, error: rawError } = await supabase
        .from("raw_complaints")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (rawError) throw rawError;

      if (rawData && rawData.length > 0) {
        const rawIds = rawData.map((c) => c.id);
        const { data: processedData } = await supabase
          .from("processed_complaints")
          .select("*")
          .in("id", rawIds);

        const enriched: Complaint[] = rawData.map((raw) => {
          const processed = processedData?.find((p) => p.id === raw.id);
          const locationStr = [raw.address_line_1, raw.address_line_2, raw.city, raw.state, raw.pincode].filter(Boolean).join(", ") || raw.location_text;
          
          return {
            id: raw.id,
            ref_id: raw.ref_id,
            description: raw.description,
            category: raw.category,
            location: locationStr,
            created_at: raw.created_at,
            images: raw.images,
            status: processed ? processed.complaint_status : "analyzing",
            priority_score: processed ? processed.priority_score : 0,
            admin_visible: processed ? processed.admin_visible : false,
            estimated_resolution: processed?.estimated_resolution,
          };

        });

        // Fetch resolution proofs
        const resolvedIds = enriched.filter(c => c.status === 'resolved' || c.status === 'pending_review').map(c => c.id);
        if (resolvedIds.length > 0) {
          const { data: proofData } = await supabase
            .from('completed_complaints')
            .select('complaint_id, image_url, notes')
            .in('complaint_id', resolvedIds);
          
          if (proofData) {
            enriched.forEach(c => {
              const proof = proofData.find(p => p.complaint_id === c.id);
              if (proof) c.resolution_proof = { image_url: proof.image_url, notes: proof.notes };
            });
          }
        }
        setComplaints(enriched);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeletingId(deleteConfirmId);
      const { error } = await supabase.rpc("citizen_delete_complaint", { p_complaint_id: deleteConfirmId });
      if (error) throw error;
      setComplaints(complaints.filter(c => c.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      alert("Error deleting complaint");
    } finally {
      setIsDeletingId(null);
    }
  };

  const filtered = complaints.filter(c => {
    const matchesSearch = c.description.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.includes(searchQuery);
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="text-gray-500 font-medium">Syncing with Municipal Server...</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search by description or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="text-gray-400" size={18} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium outline-none min-w-[140px]">
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="analyzing">Analyzing</option>
            <option value="verified">Verified</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <button 
            onClick={() => {
              setFilterStatus("all");
              setSearchQuery("");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Active Section */}
        <section className="space-y-4">
          <button 
            onClick={() => setIsProcessingExpanded(!isProcessingExpanded)}
            className="w-full text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between group"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> 
              Active Tracking ({filtered.filter(c => !["resolved", "rejected"].includes(c.status)).length})
            </span>
            {isProcessingExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {isProcessingExpanded && (
            <div className="grid grid-cols-1 gap-6">
              {filtered.filter(c => !["resolved", "rejected"].includes(c.status)).length > 0 ? (
                filtered.filter(c => !["resolved", "rejected"].includes(c.status)).map(c => (
                  <ComplaintCard key={c.id} complaint={c} onOpen={() => setSelectedComplaint(c)} onDelete={(id) => setDeleteConfirmId(id)} isDeleting={isDeletingId === c.id} />
                ))
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">No active complaints matching filters.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Resolved Section */}
        <section className="space-y-4">
          <button 
            onClick={() => setIsProcessedExpanded(!isProcessedExpanded)}
            className="w-full text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between group"
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> 
              Resolved History ({filtered.filter(c => ["resolved", "rejected"].includes(c.status)).length})
            </span>
            {isProcessedExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {isProcessedExpanded && (
            <div className="grid grid-cols-1 gap-6">
              {filtered.filter(c => ["resolved", "rejected"].includes(c.status)).length > 0 ? (
                filtered.filter(c => ["resolved", "rejected"].includes(c.status)).map(c => (
                  <ComplaintCard key={c.id} complaint={c} onOpen={() => setSelectedComplaint(c)} onDelete={(id) => setDeleteConfirmId(id)} isDeleting={isDeletingId === c.id} />
                ))
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">No resolved history available.</p>
                </div>
              )}
            </div>
          )}
        </section>

      </div>


      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">Complaint Details</h2>
              <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><XCircle size={24} className="text-gray-400" /></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-8">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tracking ID</p>
                  <p className="font-mono text-lg font-bold text-blue-600">#{selectedComplaint.ref_id || selectedComplaint.id.slice(0,8)}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${getStatusStyles(selectedComplaint.status)}`}>{selectedComplaint.status.replace('_', ' ')}</div>
              </div>

              {selectedComplaint.estimated_resolution && !['resolved', 'rejected'].includes(selectedComplaint.status) && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                  <Clock className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Estimated Resolution</h3>
                    <p className="text-blue-900 font-bold text-lg">
                      {new Date(selectedComplaint.estimated_resolution).toLocaleString('en-IN', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    <p className="text-[10px] text-blue-600 mt-1 italic">Calculated based on current workload and field team history.</p>
                  </div>
                </div>
              )}

              {selectedComplaint.resolution_proof && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Resolution Proof</h3>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 aspect-square rounded-xl overflow-hidden border border-emerald-200 shadow-sm">
                      <img src={selectedComplaint.resolution_proof.image_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 italic text-emerald-900 text-sm leading-relaxed">"{selectedComplaint.resolution_proof.notes || 'The issue has been successfully resolved by the field team.'}"</div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Category</h4>
                  <p className="text-gray-900 font-medium">{selectedComplaint.category}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Location</h4>
                  <p className="text-gray-900 font-medium">{selectedComplaint.location}</p>
                </div>
              </div>

              {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Initial Complaint Photos (Filing Evidence)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedComplaint.images.map((img, i) => (
                      <div key={i} className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-xs">
                        <img src={img} alt="Initial complaint photo" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm border border-gray-100">"{selectedComplaint.description}"</div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end"><button onClick={() => setSelectedComplaint(null)} className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100">Close</button></div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Complaint?</h3>
            <p className="text-sm text-gray-500 mb-8">This will permanently remove this record from the municipal database.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 bg-gray-100 rounded-lg font-bold">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComplaintCard({ complaint, onOpen, onDelete, isDeleting }: { complaint: Complaint, onOpen: () => void, onDelete: (id: string) => void, isDeleting: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${complaint.status === 'resolved' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">#{complaint.ref_id || complaint.id.slice(0,8)}</span>
        <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyles(complaint.status)}`}>{complaint.status.replace('_', ' ')}</div>
      </div>
      <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{complaint.description}</h3>
      <p className="text-xs text-gray-500 flex items-center gap-1 mb-4"><MapPin size={12} /> {complaint.location}</p>
      {complaint.images && complaint.images.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Submitted Photo</p>
          <div className="flex gap-2">
            {complaint.images.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0 shadow-xs">
                <img src={img} alt="Submitted complaint photo" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <button onClick={onOpen} className="text-xs font-bold text-blue-600 hover:underline">View Details {complaint.status === 'resolved' && '& Proof'}</button>
        <button onClick={() => onDelete(complaint.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}

function getStatusStyles(status: string) {
  switch (status) {
    case "resolved": return "bg-emerald-100 text-emerald-700";
    case "rejected": return "bg-red-100 text-red-700";
    case "in_progress": return "bg-amber-100 text-amber-700";
    default: return "bg-blue-100 text-blue-700";
  }
}
