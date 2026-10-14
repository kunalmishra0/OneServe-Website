import { useState, useEffect } from "react";
import { Star, X, CheckCircle, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function RatingPopup() {
  const [pendingRatings, setPendingRatings] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchPendingRatings();

    // Listen for real-time resolution events (Phase 4)
    const handleLiveUpdate = () => fetchPendingRatings();
    window.addEventListener("show-rating-popup", handleLiveUpdate);
    
    return () => window.removeEventListener("show-rating-popup", handleLiveUpdate);
  }, []);

  const fetchPendingRatings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find complaints that are resolved and have a completed_complaints record with no rating
      const { data, error } = await supabase
        .from("completed_complaints")
        .select(`
          complaint_id,
          completed_at,
          raw_complaints!inner (
            title,
            category,
            user_id
          )
        `)
        .eq("raw_complaints.user_id", user.id)
        .is("rating", null)
        .order("completed_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      if (data && data.length > 0) {
        setPendingRatings(data);
        setOpen(true);
      }
    } catch (err) {
      console.error("Error fetching pending ratings:", err);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    const currentComplaint = pendingRatings[currentIndex];
    setSubmitting(true);
    
    try {
      const { error } = await supabase.rpc("submit_rating", {
        p_complaint_id: currentComplaint.complaint_id,
        p_rating: rating,
        p_feedback: feedback || null
      });

      if (error) throw error;

      setSuccess(true);
      
      setTimeout(() => {
        // Move to next rating or close
        if (currentIndex < pendingRatings.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setRating(0);
          setFeedback("");
          setSuccess(false);
        } else {
          setOpen(false);
        }
      }, 1500);

    } catch (err) {
      console.error("Failed to submit rating:", err);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < pendingRatings.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setRating(0);
      setFeedback("");
    } else {
      setOpen(false);
    }
  };

  if (!open || pendingRatings.length === 0) return null;

  const currentTask = pendingRatings[currentIndex];
  const title = (currentTask.raw_complaints as any).title;
  const category = (currentTask.raw_complaints as any).category;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 relative">
          <button 
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
          
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-500">Your feedback helps us improve our services.</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Rate Your Experience</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your complaint has been resolved. How did the worker do?
              </p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 text-left">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                  {category}
                </span>
                <p className="font-bold text-gray-800 line-clamp-2">{title}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">ID: #{currentTask.complaint_id.slice(0, 8)}</p>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      size={40}
                      className={`transition-colors ${
                        (hoveredRating ? star <= hoveredRating : star <= rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Feedback Textarea */}
              <div className="mb-6 relative">
                <MessageSquare className="absolute top-3 left-3 text-gray-400" size={18} />
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Any additional comments? (Optional)"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                  rows={3}
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || submitting}
                  className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2"
                >
                  {submitting ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
              
              {pendingRatings.length > 1 && (
                <p className="text-xs text-gray-400 mt-4">
                  {currentIndex + 1} of {pendingRatings.length} pending ratings
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
