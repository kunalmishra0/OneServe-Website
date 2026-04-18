import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, CheckCircle, Camera, Upload, AlertCircle, X, 
  Map as MapIcon, Clock, ToggleLeft, ToggleRight, List, Phone
} from "lucide-react";
import { getGoogleMapsDirectionsUrl } from "@/lib/geo";

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  location_text: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  location_coords?: [number, number];
  priority_score: number;
  priority_level?: string;
  citizen_name?: string;
  citizen_phone?: string;
}

interface CompletedTask {
  id: string;
  title: string;
  category: string;
  completed_at: string;
  rating?: number;
}

export function WorkerDashboard() {
  const { user, staffProfile } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAvailable, setIsAvailable] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && staffProfile) {
      setIsAvailable(staffProfile.status !== 'off_duty');
      fetchCurrentTask();
    }
  }, [user, staffProfile]);

  const fetchCurrentTask = async () => {
    if (!staffProfile?.current_assignment_id) {
      setTask(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: rawData, error: rawError } = await supabase
        .from("raw_complaints")
        .select("*, citizens(full_name, phoneno)")
        .eq("id", staffProfile.current_assignment_id)
        .single();

      if (rawError) throw rawError;

      const { data: procData, error: procError } = await supabase
        .from("processed_complaints")
        .select("priority_score, priority_level")
        .eq("id", staffProfile.current_assignment_id)
        .single();

      if (procError) throw procError;

      const locationStr = [
        rawData.address_line_1,
        rawData.address_line_2,
        rawData.city
      ].filter(Boolean).join(", ") || rawData.location_text;

      setTask({
        id: rawData.id,
        title: rawData.title,
        description: rawData.description,
        category: rawData.category,
        location_text: locationStr,
        address_line_1: rawData.address_line_1,
        address_line_2: rawData.address_line_2,
        city: rawData.city,
        location_coords: rawData.location?.coordinates,
        priority_score: procData.priority_score,
        priority_level: procData.priority_level,
        citizen_name: (rawData.citizens as any)?.full_name,
        citizen_phone: (rawData.citizens as any)?.phoneno
      });

    } catch (err) {
      console.error("Error fetching task:", err);
      // Don't crash, just show no task if there's an error fetching it 
      // (might have been deleted by admin)
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!staffProfile) return;
    try {
      const { data, error } = await supabase
        .from("completed_complaints")
        .select("*, raw_complaints(title, category)")
        .eq("worker_id", staffProfile.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const mapped = data.map(d => ({
        id: d.id,
        title: (d.raw_complaints as any).title,
        category: (d.raw_complaints as any).category,
        completed_at: d.completed_at,
        rating: d.rating
      }));
      setCompletedTasks(mapped);

    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const toggleAvailability = async () => {
    if (!staffProfile) return;
    const newStatus = isAvailable ? 'off_duty' : (task ? 'busy' : 'available');
    
    try {
      const { error } = await supabase
        .from("staff")
        .update({ status: newStatus })
        .eq("id", staffProfile.id);
        
      if (error) throw error;
      setIsAvailable(!isAvailable);
    } catch (err) {
      console.error("Failed to toggle status", err);
      alert("Failed to update status");
    }
  };

  const handleCompleteTask = async () => {
    if (!task || !imageFile) {
      setError("Please upload a completion photo");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload photo
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${staffProfile?.id}/${task.id}/completed.${fileExt}`;
      
      const { error: uploadErr } = await supabase.storage
        .from("complaints")
        .upload(fileName, imageFile);

      let publicUrl = "";
      if (uploadErr && !uploadErr.message.includes('already exists')) {
         console.warn("Storage upload failed, falling back to dummy", uploadErr);
         publicUrl = `https://placehold.co/600x400?text=Completed`;
      } else {
         const { data: { publicUrl: url } } = supabase.storage.from("complaints").getPublicUrl(fileName);
         publicUrl = url;
      }

      // 2. Call RPC
      const { error: rpcError } = await supabase.rpc("worker_complete_task", {
        p_complaint_id: task.id,
        p_image_url: publicUrl,
        p_notes: notes || ""
      });

      if (rpcError) throw rpcError;

      // 3. Cleanup & Auto-assign
      setCompleteModalOpen(false);
      setImageFile(null);
      setNotes("");
      setTask(null); // Clear current
      
      // Auto assign next
      const { data: assignResult, error: assignError } = await supabase.rpc("auto_assign_nearest_task", {
        p_worker_id: staffProfile?.id
      });
      
      if (!assignError && assignResult?.success) {
         // Need to refresh profile state or trigger fetch
         window.location.reload(); 
      } else {
         alert("Task marked complete! No new tasks within your radius currently.");
         window.location.reload();
      }

    } catch (err: any) {
      console.error("Completion error:", err);
      setError(err.message || "Failed to complete task");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Field Dashboard</h1>
          <p className="text-gray-600 flex items-center gap-2 mt-1">
             Welcome, {staffProfile?.full_name} • <span className="font-medium text-blue-600">{staffProfile?.role}</span>
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setHistoryOpen(true);
              fetchHistory();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium border border-gray-200"
          >
            <List size={18} /> History
          </button>
          
          <button 
            onClick={toggleAvailability}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-white ${
              isAvailable ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {isAvailable ? "On Duty" : "Off Duty"}
          </button>
        </div>
      </div>

      {!isAvailable && !task && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center text-yellow-800">
           <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
           <h2 className="text-xl font-bold mb-2">You are currently Off Duty</h2>
           <p>Toggle your status to "On Duty" to receive new assignments.</p>
        </div>
      )}

      {isAvailable && !task && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-12 text-center text-blue-800 flex flex-col items-center shadow-inner">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm relative">
            <CheckCircle className="w-12 h-12 text-blue-500" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <h2 className="text-2xl font-bold mb-2">You're caught up!</h2>
          <p className="text-blue-600/80 max-w-sm mb-6">
            There are currently no pending `{staffProfile?.role}` tasks near your location. We'll automatically assign you when one appears.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 transition"
          >
            Refresh Area Search
          </button>
        </div>
      )}

      {task && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Priority Header */}
          <div className={`p-4 flex justify-between items-center text-white ${
             task.priority_score > 7 ? 'bg-red-600' : 
             task.priority_score > 4 ? 'bg-orange-500' : 'bg-blue-600'
          }`}>
             <div className="font-semibold flex items-center gap-2">
                <AlertCircle size={18} />
                Current Assignment
             </div>
             <div className="text-sm px-3 py-1 bg-white/20 rounded-full font-medium tracking-wide">
                Ref: {task.id.substring(0,8).toUpperCase()}
             </div>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{task.title}</h2>
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm font-medium">
                  {task.category}
                </span>
              </div>
            </div>

            <p className="text-gray-700 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
              {task.description}
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Location Card */}
              <div className="flex flex-col border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
                  <MapPin className="text-blue-600" size={18} /> Location
                </div>
                <p className="text-gray-600 text-sm mb-4 flex-1">
                  {task.location_text}
                </p>
                {task.location_coords ? (
                  <a 
                    href={getGoogleMapsDirectionsUrl(
                      staffProfile?.location?.coordinates?.[1] || 28.4, // Fallback lat
                      staffProfile?.location?.coordinates?.[0] || 77.3, // Fallback lon
                      task.location_coords[1], 
                      task.location_coords[0]
                    )}
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex justify-center items-center gap-2 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium text-sm"
                  >
                    <MapIcon size={16} /> Get Directions
                  </a>
                ) : (
                  <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-md text-sm cursor-not-allowed">
                    Coordinates Unavailable
                  </button>
                )}
              </div>

              {/* Citizen Card */}
              <div className="flex flex-col border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
                  <Phone className="text-green-600" size={18} /> Reporter Details
                </div>
                {task.citizen_name ? (
                  <div className="flex-1 space-y-2">
                    <p className="text-gray-800 font-medium">{task.citizen_name}</p>
                    <p className="text-gray-600 text-sm">Ph: {task.citizen_phone || 'N/A'}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center text-gray-500 text-sm italic">
                    Reporter details hidden or unavailable
                  </div>
                )}
                {task.citizen_phone && (
                  <a 
                    href={`tel:${task.citizen_phone}`}
                    className="w-full flex justify-center items-center gap-2 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors font-medium text-sm mt-4 md:mt-0"
                  >
                    <Phone size={16} /> Call Citizen
                  </a>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-gray-200 flex justify-end">
               <button
                 onClick={() => setCompleteModalOpen(true)}
                 className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
               >
                 <CheckCircle size={20} /> Mark Issue Resolved
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Complete Assignment</h3>
              <button onClick={() => !submitting && setCompleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Proof of Resolution <span className="text-red-500">*</span>
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  {imageFile ? (
                    <div className="flex flex-col items-center">
                      <img src={URL.createObjectURL(imageFile)} alt="Preview" className="h-32 object-contain mb-2 rounded" />
                      <p className="text-sm font-medium text-blue-600">Click to change photo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-500">
                        <Camera size={24} />
                      </div>
                      <p className="font-medium text-gray-800 mb-1">Take or upload a photo</p>
                      <p className="text-xs text-gray-500 text-balance">Required to verify the issue has been resolved.</p>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                  capture="environment" // Suggests camera on mobile
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Resolution Notes <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="E.g., Replaced 2 bulbs, wiring was corroded."
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setCompleteModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCompleteTask}
                disabled={submitting || !imageFile}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin"></div> Saving...</>
                ) : (
                  <><Upload size={18} /> Submit Report</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Slide-over */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/20 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2"><List size={18}/> Shift History</h3>
              <button onClick={() => setHistoryOpen(false)} className="hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {completedTasks.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <p>No tasks completed yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasks.map(ct => (
                    <div key={ct.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-gray-800 text-sm truncate pr-2">{ct.title}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(ct.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-1">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{ct.category}</span>
                        {ct.rating ? (
                          <div className="flex text-yellow-500 text-xs items-center gap-0.5 font-medium">
                            {'★'.repeat(ct.rating)}{'☆'.repeat(5 - ct.rating)}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No rating yet</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
