import { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Camera, 
  CheckCircle2, 
  Navigation, 
  AlertCircle, 
  X,
  Loader2,
  RefreshCw,
  List,
  ToggleRight,
  ShieldCheck,
  CalendarDays,
  ChevronLeft,
  ToggleLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getGoogleMapsDirectionsUrl, parsePostGisPoint, getGoogleMapsAddressUrl } from "@/lib/geo";

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  location_text: string;
  location_coords?: [number, number];
  priority_score: number;
  priority_level: string;
  citizen_name?: string;
  citizen_phone?: string;
  scheduled_date?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itinerary, setItinerary] = useState<Task[]>([]);

  useEffect(() => {
    if (user && staffProfile) {
      setIsAvailable(staffProfile.status !== 'off_duty');
      fetchItinerary();
    }
  }, [user, staffProfile?.current_assignment_id, staffProfile?.status]);

  const fetchItinerary = async () => {
    if (!staffProfile?.id) {
      setTask(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch all tasks assigned to this worker that are in_progress
      const { data: procData, error: procError } = await supabase
        .from("processed_complaints")
        .select("id, scheduled_date, priority_score")
        .eq("staff_id", staffProfile.id)
        .in("complaint_status", ["in_progress"]);

      if (procError) throw procError;

      if (!procData || procData.length === 0) {
        setItinerary([]);
        setTask(null);
        return;
      }

      const ids = procData.map(p => p.id);

      const { data: rawData, error: rawError } = await supabase
        .from("raw_complaints")
        .select("*, citizens(full_name, phoneno)")
        .in("id", ids);

      if (rawError) throw rawError;

      const mapped = rawData.map(r => {
        const p = procData.find(pd => pd.id === r.id);
        const coords = parsePostGisPoint(r.location);
        const locationStr = [r.address_line_1, r.address_line_2, r.city].filter(Boolean).join(", ") || r.location_text;
        
        return {
          id: r.id,
          title: r.title,
          description: r.description,
          category: r.category,
          location_text: locationStr,
          address_line_1: r.address_line_1,
          address_line_2: r.address_line_2,
          city: r.city,
          location_coords: coords ? [coords.lon, coords.lat] : undefined,
          priority_score: p?.priority_score || 0,
          priority_level: p?.priority_level || "Normal",
          citizen_name: (r.citizens as any)?.full_name,
          citizen_phone: (r.citizens as any)?.phoneno,
          scheduled_date: p?.scheduled_date
        };
      });

      // Sort by scheduled_date (earliest first), then priority
      mapped.sort((a, b) => {
        const dateA = a.scheduled_date || '9999-12-31';
        const dateB = b.scheduled_date || '9999-12-31';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return b.priority_score - a.priority_score;
      });

      setItinerary(mapped);

      // Active task is either the current_assignment_id, or the first one in the itinerary if busy
      if (staffProfile.current_assignment_id) {
        setTask(mapped.find(t => t.id === staffProfile.current_assignment_id) || null);
      } else {
        setTask(null);
      }

    } catch (err: any) {
      console.error("Error fetching itinerary:", err);
      setError(err.message || "Failed to load itinerary");
      setItinerary([]);
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
        .select(`
          *,
          raw_complaints(title, category, description, address_line_1, city)
        `)
        .eq("worker_id", staffProfile.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const mapped = data.map(d => ({
        id: d.id,
        title: (d.raw_complaints as any).title,
        description: (d.raw_complaints as any).description,
        location: [(d.raw_complaints as any).address_line_1, (d.raw_complaints as any).city].filter(Boolean).join(", "),
        category: (d.raw_complaints as any).category,
        completed_at: d.completed_at,
        rating: d.rating,
        worker_notes: d.notes
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

      // Update staff location to the completed task's location to track their progress
      if (task.location_coords) {
         try {
           await supabase.from("staff").update({
             location: `POINT(${task.location_coords[0]} ${task.location_coords[1]})`
           }).eq("id", staffProfile?.id);
         } catch(e) { console.error("Could not update worker location", e); }
      }

      // 3. Cleanup & Auto-assign
      setCompleteModalOpen(false);
      setImageFile(null);
      setNotes("");
      setTask(null);
      
      // Auto assign next
      // Auto assign next? We don't really need to if they have an itinerary.
      // We just reset and let them pick the next from itinerary.
      fetchItinerary();

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
        <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen space-y-6">
      {/* Header & Status Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
            {staffProfile?.full_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Field Dashboard</h1>
            <p className="text-gray-500 text-sm font-medium">Welcome back, {staffProfile?.full_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setLoading(true);
              fetchItinerary();
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-sm font-bold"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sync
          </button>

          <button 
            onClick={() => {
              setHistoryOpen(true);
              fetchHistory();
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-sm font-bold"
          >
            <Clock size={16} />
            History
          </button>


          
          <button 
            onClick={toggleAvailability}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${
              isAvailable ? 'bg-green-600 text-white shadow-green-100' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {isAvailable ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {isAvailable ? "On Duty" : "Off Duty"}
          </button>
        </div>
      </div>

      {!isAvailable && !task && (
        <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-12 text-center">
          <Clock className="w-20 h-20 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700">You are currently Off Duty</h2>
          <p className="text-gray-500">Enable "On Duty" status to view your itinerary.</p>
        </div>
      )}

      {isAvailable && !task && itinerary.length === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-12 text-center">
          <ShieldCheck className="w-20 h-20 mx-auto mb-4 text-blue-400" />
          <h2 className="text-xl font-bold text-blue-900">Itinerary Empty</h2>
          <p className="text-blue-600">You are on duty but have no assigned tasks. New tasks will appear here.</p>
          <div className="mt-8 flex justify-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Scanning for tasks...</span>
          </div>
        </div>
      )}

      {isAvailable && !task && itinerary.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <List className="text-blue-600" /> Your Itinerary
            </h2>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{itinerary.length} Total Tasks</span>
          </div>
          <div className="space-y-8">
            {/* Today's Section */}
            {itinerary.some(item => item.scheduled_date === new Date().toISOString().split('T')[0]) && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="h-px flex-1 bg-blue-100"></div>
                  Tasks for Today
                  <div className="h-px flex-1 bg-blue-100"></div>
                </h3>
                <div className="grid gap-4">
                  {itinerary.filter(item => item.scheduled_date === new Date().toISOString().split('T')[0]).map((item) => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-all">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase tracking-widest">{item.category}</span>
                          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded flex items-center gap-1">
                            <CalendarDays size={12} /> Today
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><MapPin size={14} /> {item.location_text}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await supabase.from("staff").update({ current_assignment_id: item.id }).eq("id", staffProfile.id);
                            setTask(item);
                          } catch(err) { alert("Error starting task"); } finally { setLoading(false); }
                        }}
                        className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                      >
                        Start Task
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Section */}
            {itinerary.some(item => item.scheduled_date !== new Date().toISOString().split('T')[0]) && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-100"></div>
                  Upcoming Tasks
                  <div className="h-px flex-1 bg-gray-100"></div>
                </h3>
                <div className="grid gap-4 opacity-80 grayscale-[0.5]">
                  {itinerary.filter(item => item.scheduled_date !== new Date().toISOString().split('T')[0]).map((item) => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-all">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase tracking-widest">{item.category}</span>
                          <span className="text-xs font-bold bg-gray-50 text-gray-500 px-2 py-1 rounded flex items-center gap-1">
                            <CalendarDays size={12} /> {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unscheduled'}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><MapPin size={14} /> {item.location_text}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await supabase.from("staff").update({ current_assignment_id: item.id }).eq("id", staffProfile.id);
                            setTask(item);
                          } catch(err) { alert("Error starting task"); } finally { setLoading(false); }
                        }}
                        className="w-full md:w-auto bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                      >
                        Start Task
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {task && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            {/* Task Header */}
            <div className="bg-gray-900 p-6 text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setTask(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div>
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">Active Task</span>
                    <h2 className="text-2xl font-bold mt-2">{task.title || task.category}</h2>
                    <p className="text-gray-400 text-sm mt-1">ID: #{task.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  task.priority_score >= 8 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {task.priority_level} Priority
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Location & Navigation */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-red-500 mt-1 shrink-0" size={20} />
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</h3>
                      <p className="text-gray-900 font-medium leading-relaxed">{task.location_text}</p>
                    </div>
                  </div>
                  
                  {(task.location_coords || task.location_text) && (
                    <div className="flex flex-wrap gap-4">
                      {task.location_coords && (
                        <a 
                          href={getGoogleMapsDirectionsUrl(task.location_coords[1], task.location_coords[0])}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg"
                        >
                          <Navigation size={16} /> GPS Pin
                        </a>
                      )}
                      {task.location_text && (
                        <a 
                          href={getGoogleMapsAddressUrl(task.location_text)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-gray-600 font-bold hover:underline bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                        >
                          <MapPin size={16} /> Search Address
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full md:w-px bg-gray-100"></div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="text-green-500 mt-1 shrink-0" size={20} />
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</h3>
                      <p className="text-gray-900 font-medium">{task.citizen_name || 'Anonymous Reporter'}</p>
                      {task.citizen_phone && (
                        <a href={`tel:${task.citizen_phone}`} className="text-blue-600 text-sm font-bold block mt-1">{task.citizen_phone}</a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Work Description</h3>
                <p className="text-gray-700 leading-relaxed italic">"{task.description}"</p>
              </div>

              {/* Actions */}
              <div className="pt-4">
                <button 
                  onClick={() => setCompleteModalOpen(true)}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-200"
                >
                  <CheckCircle2 size={24} className="text-green-400" />
                  Mark Task as Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Task Completion Proof</h2>
              <button onClick={() => setCompleteModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all group"
              >
                {imageFile ? (
                  <div className="relative w-full h-full">
                    <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover rounded-[22px]" alt="Proof" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px]">
                      <p className="text-white font-bold text-sm">Change Photo</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-400">Take/Upload Photo</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && setImageFile(e.target.files[0])}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Resolution Notes</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm min-h-[100px]"
                  placeholder="Describe what was done..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button 
                disabled={submitting}
                onClick={handleCompleteTask}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                {submitting ? "Submitting..." : "Submit for Verification"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center scale-in-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-600 w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Well Done!</h2>
            <p className="text-gray-500 mb-8">
              Your report has been submitted to the admin for final review.
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
      {/* History Slide-over */}
      {historyOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Work History</h2>
                <p className="text-xs text-gray-500">Your last 10 completed tasks</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {completedTasks.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <List className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No history found</p>
                </div>
              ) : (
                completedTasks.map((task) => (
                  <div key={task.id} className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">{task.category}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{new Date(task.completed_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2 italic">"{task.description}"</p>
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><MapPin size={10} /> {task.location}</p>
                    
                    {task.worker_notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg text-[10px] text-gray-500 border border-gray-100">
                        <span className="font-bold text-gray-400 block mb-1 uppercase">Your Notes:</span>
                        {task.worker_notes}
                      </div>
                    )}
                    
                    {task.rating && (

                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-full ${i < task.rating! ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                        ))}
                        <span className="text-[10px] font-bold text-yellow-600 ml-1">{task.rating}/5</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => setHistoryOpen(false)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
