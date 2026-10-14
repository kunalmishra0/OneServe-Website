import { useState, useEffect } from "react";
import { X, Star, MapPin, Clock, Shield, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StaffManageModalProps {
  staff: any;
  onClose: (refresh?: boolean) => void;
}

export function StaffManageModal({ staff, onClose }: StaffManageModalProps) {
  const [activeTask, setActiveTask] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [staff]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Active Task if busy
      if (staff.status === 'busy' && staff.current_assignment_id) {
        const { data: rawData } = await supabase
          .from("raw_complaints")
          .select("description, category, address_line_1, city")
          .eq("id", staff.current_assignment_id)
          .single();
        setActiveTask(rawData);
      }

      // Fetch History
      const { data: historyData } = await supabase
        .from("completed_complaints")
        .select("*, raw_complaints(description, category)")
        .eq("worker_id", staff.id)
        .order("completed_at", { ascending: false })
        .limit(5);
      
      setHistory(historyData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!staff.current_assignment_id) return;
    setActionLoading(true);
    try {
      // 1. Set worker back to available
      await supabase
        .from("staff")
        .update({ status: 'available', current_assignment_id: null })
        .eq("id", staff.id);

      // 2. Set task back to verified
      await supabase
        .from("processed_complaints")
        .update({ complaint_status: 'verified' })
        .eq("id", staff.current_assignment_id);

      alert("Task has been successfully unassigned and sent back to the queue.");
      onClose(true);
    } catch (err) {
      console.error(err);
      alert("Failed to unassign task.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await supabase
        .from("staff")
        .update({ status: newStatus })
        .eq("id", staff.id);
      
      onClose(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
              {staff.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{staff.full_name}</h2>
              <p className="text-xs text-blue-600 font-medium">{staff.role}</p>
            </div>
          </div>
          <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Rating</p>
              <p className="flex items-center gap-1 text-lg font-bold text-gray-800">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                {staff.performance_rating}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Tasks</p>
              <p className="text-lg font-bold text-gray-800">{staff.complaints_handled}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Contact</p>
                <p className="text-sm font-bold text-blue-600">{staff.contact_number}</p>
              </div>
              <a 
                href={`tel:${staff.contact_number}`}
                className="mt-2 text-[10px] uppercase font-bold bg-blue-100 text-blue-700 py-1 px-2 rounded hover:bg-blue-200 transition-colors inline-block text-center"
              >
                Call
              </a>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Zone</p>
              <p className="text-sm font-bold text-gray-800 break-words">{staff.assigned_zone}</p>
            </div>
          </div>

          {/* Active Task Override */}
          {staff.status === 'busy' && activeTask && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              </div>
              <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <Clock size={16} /> Worker is Currently Busy
              </h3>
              <div className="bg-white/60 p-3 rounded-lg mb-4 text-sm text-amber-800">
                <p className="font-bold">{activeTask.title || activeTask.category}</p>
                <p>{activeTask.address_line_1}, {activeTask.city}</p>
                <p className="text-xs text-amber-600 mt-1">Task ID: #{staff.current_assignment_id.slice(0, 8)}</p>
              </div>
              <button 
                onClick={handleUnassign}
                disabled={actionLoading}
                className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : "Unassign Task & Free Worker"}
              </button>
            </div>
          )}

          {/* Controls */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Admin Overrides</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => handleForceStatus('available')}
                disabled={staff.status === 'available' || actionLoading}
                className="flex-1 py-2 text-sm font-bold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Force Available
              </button>
              <button 
                onClick={() => handleForceStatus('off_duty')}
                disabled={staff.status === 'off_duty' || actionLoading}
                className="flex-1 py-2 text-sm font-bold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Force Off-Duty
              </button>
            </div>
          </div>

          {/* History */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Task History</h3>
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">
                No tasks completed yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{(h.raw_complaints as any)?.title || (h.raw_complaints as any)?.category}</p>
                      <p className="text-xs text-gray-500">{new Date(h.completed_at).toLocaleDateString()}</p>
                    </div>
                    {h.rating && (
                      <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                        {h.rating} <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
