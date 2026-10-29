import {
  MessageSquare,
  Star,
  Send,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileQuestion,
  UserCheck,
  CreditCard,
  Building,
  Wrench,
  Clock,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

type FeedbackTargetType = "complaint" | "worker" | "billing" | "general";

export function Feedback() {
  const { user } = useAuth();
  const [targetType, setTargetType] = useState<FeedbackTargetType>("complaint");
  const [selectedComplaintId, setSelectedComplaintId] = useState("OS-FBD-2026-01");
  const [selectedWorkerId, setSelectedWorkerId] = useState("w1");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active user complaints eligible for feedback
  const userComplaints = [
    {
      id: "OS-FBD-2026-01",
      title: "Deep Pothole near Sector 16 Metro Pillar 582",
      worker: "Amit Verma (Road Technician)",
      date: "Assigned today",
      status: "In Progress",
    },
    {
      id: "OS-FBD-2026-03",
      title: "Sparking Street Light Pole in Sector 15 Lane 4",
      worker: "Suresh Chand (Electrician)",
      date: "Yesterday",
      status: "Verified",
    },
    {
      id: "OS-FBD-2026-02",
      title: "Overflowing Waste Dumpster near NIT 1 Market",
      worker: "Rajesh Kumar (Sanitation Lead)",
      date: "3 days ago",
      status: "Pending Review",
    },
  ];

  // Specific diagnostic issue checkboxes based on target
  const issueTagsByTarget: Record<FeedbackTargetType, string[]> = {
    complaint: [
      "Resolution delayed beyond promised ETA",
      "Issue recurred shortly after fix",
      "Work left partially incomplete",
      "Citizen not contacted before arrival",
      "Incorrect category assigned",
    ],
    worker: [
      "Field staff was professional and punctual",
      "Staff was late or uncontactable",
      "Staff did not have proper tools/materials",
      "Unsatisfactory resolution verification",
    ],
    billing: [
      "Double deduction or payment gateway error",
      "Meter reading mismatch with actual consumption",
      "Delay in official payment receipt generation",
      "Excessive surcharge or late fee disputed",
    ],
    general: [
      "App navigation is confusing",
      "Page load speed is slow",
      "Need more regional language options",
      "Notification alerts not received in time",
    ],
  };

  const toggleIssueTag = (tag: string) => {
    setSelectedIssues((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setRating(0);
    setSelectedIssues([]);
    setFeedbackText("");
    setSubmitted(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Service Quality & Grievance Feedback
        </h1>
        <p className="text-gray-600 mt-1">
          Report specific issues regarding your filed complaints, field workers, or utility billing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Feedback Form */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            {submitted ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                  Feedback Logged in Quality Audit System
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  Your remarks and issue flags have been linked to{" "}
                  <strong>{selectedComplaintId}</strong>. Municipal supervisors and the field quality cell have received this audit report.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Report on Another Service
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Target Selector Tabs */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    What are you providing feedback on?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "complaint", label: "My Complaint", icon: FileQuestion },
                      { id: "worker", label: "Field Worker", icon: UserCheck },
                      { id: "billing", label: "Utility Billing", icon: CreditCard },
                      { id: "general", label: "Platform App", icon: Building },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = targetType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setTargetType(tab.id as FeedbackTargetType);
                            setSelectedIssues([]);
                          }}
                          className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all ${
                            active
                              ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Select Specific Complaint (when target is complaint or worker) */}
                {(targetType === "complaint" || targetType === "worker") && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Select Linked Complaint / Work Order
                    </label>
                    <select
                      value={selectedComplaintId}
                      onChange={(e) => setSelectedComplaintId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {userComplaints.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id} — {c.title} (Staff: {c.worker})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Rating Stars */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Experience Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 text-gray-300 hover:text-amber-400 focus:outline-none transition-colors"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (hoveredRating || rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-gray-600 ml-2">
                      {rating === 5
                        ? "5 Stars - Fully Satisfied"
                        : rating === 4
                        ? "4 Stars - Good"
                        : rating === 3
                        ? "3 Stars - Average"
                        : rating === 2
                        ? "2 Stars - Dissatisfied"
                        : rating === 1
                        ? "1 Star - Critical Issue"
                        : "Tap to rate"}
                    </span>
                  </div>
                </div>

                {/* 4. Diagnostic Specific Issues Checkboxes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Select Specific Factors / Bottlenecks Encountered:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {issueTagsByTarget[targetType].map((tag) => {
                      const checked = selectedIssues.includes(tag);
                      return (
                        <div
                          key={tag}
                          onClick={() => toggleIssueTag(tag)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                            checked
                              ? "bg-blue-50/70 border-blue-400 text-blue-900 font-medium"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                          />
                          <span>{tag}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Detailed Problem Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Specific Remarks & Description
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Provide specific details to help the supervisor audit this case..."
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "Transmitting Report..." : "Submit Quality Audit Report"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Side: Operational Information (No ads/marketing testimonials) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              How Your Feedback Is Used
            </h3>
            <div className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
              <p>
                <strong>1. SLA Audit:</strong> Ratings of 1 or 2 stars automatically trigger an alert on the municipal supervisor dashboard for immediate review.
              </p>
              <p>
                <strong>2. Worker Scores:</strong> Staff performance metrics in the system are directly calculated from citizen resolution acknowledgments.
              </p>
              <p>
                <strong>3. Recurring Fault Prevention:</strong> Root-cause tags highlight areas where drainage, road repair, or electrical equipment requires comprehensive infrastructure overhaul.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
            <p className="font-semibold text-gray-700">Need Immediate Emergency Assistance?</p>
            <p className="mt-1">
              For live power line hazards or severe road collapse, dial civic helpline <strong>1912</strong> or file a Critical Priority complaint directly on the home portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
