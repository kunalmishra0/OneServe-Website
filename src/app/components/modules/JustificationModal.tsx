import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Scale,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";

const API_URL =
  (import.meta as any).env?.VITE_LEGAL_API_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "https://kapooryashas-legal-expert-backend.hf.space";

export interface LawItem {
  IPC: string;
  BNS: string;
  Description: string;
  Category?: string[];
  Keywords?: string[];
}

interface PerSectionData {
  label: string;
  common: string[];
  different: string[];
  conclusion: string;
}

interface JustificationResponse {
  total_cases: number;
  mode?: string;
  common: string[];
  different: string[];
  conclusion: string;
  per_section?: PerSectionData[];
}

interface JustificationModalProps {
  law?: LawItem | null;
  laws?: LawItem[] | null;
  onClose: () => void;
}

/* ── Shared spinner ──────────────────────────────────────────────────────── */
const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    <div className="relative">
      <div className="w-14 h-14 rounded-full border-4 border-indigo-100" />
      <div
        className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"
      />
    </div>
    <p className="text-slate-600 text-sm font-medium animate-pulse">Analysing past case records...</p>
  </div>
);

/* ── Judgement section (Common or Different) ─────────────────────────────── */
const JudgementSection: React.FC<{ items?: string[]; type: "common" | "different" }> = ({ items, type }) => {
  const isCommon = type === "common";
  const color    = isCommon ? "#065f46" : "#92400e";
  const bg       = isCommon ? "rgba(16, 185, 129, 0.06)" : "rgba(245, 158, 11, 0.06)";
  const border   = isCommon ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)";
  const iconBg   = isCommon ? "#d1fae5" : "#fef3c7";
  const numBg    = isCommon ? "#d1fae5" : "#fef3c7";
  const numColor = isCommon ? "#047857" : "#b45309";
  const Icon     = isCommon ? CheckCircle : AlertTriangle;
  const title    = isCommon ? "Common Judgements" : "Different / Notable Judgements";
  const subtitle = isCommon ? "— repeated patterns across cases" : "— exceptional outcomes";

  if (!items || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={16} className={isCommon ? "text-emerald-700" : "text-amber-700"} />
        </div>
        <h3 className="text-base font-bold" style={{ color }}>{title}</h3>
        <span className="text-xs text-slate-500 ml-1 font-medium">{subtitle}</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="item-stagger p-4 rounded-xl text-sm leading-relaxed transition-all duration-200 hover:scale-[1.008] hover:shadow-sm"
            style={{
              background: bg,
              border: `1px solid ${border}`,
              color: "#334155",
              animationDelay: `${i * 0.06}s`,
            }}
          >
            <div className="flex gap-3.5">
              <div
                className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: numBg, color: numColor }}
              >
                {i + 1}
              </div>
              <p className="leading-relaxed">{item}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main Modal ──────────────────────────────────────────────────────────── */
export const JustificationModal: React.FC<JustificationModalProps> = ({ law, laws, onClose }) => {
  const [data, setData]         = useState<JustificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("combined"); // 'combined' | section label
  const [isClosing, setIsClosing] = useState(false);

  const isCombined = !!laws && laws.length > 1;

  /* ── Smooth exit orchestrator ────────────────────────────────────────── */
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  /* ── Keyboard & Scroll Lock listeners ────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleClose]);

  /* ── Fetch Justification Data ────────────────────────────────────────── */
  useEffect(() => {
    const fetchJustification = async () => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        let body: any;
        if (isCombined && laws) {
          body = {
            sections: laws.map((l) => ({ ipc: l.IPC, bns: l.BNS })),
          };
        } else if (law) {
          body = { ipc: law.IPC };
        }

        const response = await fetch(`${API_URL}/api/justification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Failed to fetch justification data.");
        const json = await response.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to fetch justification.");
      } finally {
        setIsLoading(false);
      }
    };

    if (law || (laws && laws.length > 0)) {
      fetchJustification();
    }
  }, [law, laws, isCombined]);

  /* ── Active data slice ───────────────────────────────────────────────── */
  const activeData = (() => {
    if (!data) return null;
    if (!isCombined || activeTab === "combined") {
      return { common: data.common, different: data.different, conclusion: data.conclusion };
    }
    const sec = (data.per_section || []).find((s) => s.label === activeTab);
    return sec ? { common: sec.common, different: sec.different, conclusion: sec.conclusion } : null;
  })();

  if (!law && (!laws || laws.length === 0)) return null;

  /* ── Modal title info ────────────────────────────────────────────────── */
  const title = isCombined && laws
    ? `Combined Judgement (${laws.length} sections)`
    : law?.Description || "Law Justification";

  const badges = isCombined && laws
    ? laws.flatMap((l) => [
        { label: `IPC ${l.IPC}`, style: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" } },
        { label: `BNS ${l.BNS}`, style: { background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd" } },
      ])
    : law
    ? [
        { label: `IPC ${law.IPC}`, style: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" } },
        { label: `BNS ${law.BNS}`, style: { background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd" } },
      ]
    : [];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all ${
        isClosing ? "modal-backdrop-exit" : "modal-backdrop-enter"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl transition-all ${
          isClosing ? "modal-window-exit" : "modal-window-enter"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 rounded-t-2xl bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 active:scale-95"
            title="Close popup"
          >
            <X size={20} />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                isCombined ? "combined-pulse text-white" : "text-white"
              }`}
              style={{
                background: isCombined
                  ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                  : "linear-gradient(135deg, #4f46e5, #7c3aed)",
              }}
            >
              {isCombined ? <Layers size={24} /> : <Scale size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{title}</h2>
                {isCombined && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Sparkles size={11} className="text-amber-600" /> Combined Analysis
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {badges.map((b, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-md text-xs font-bold" style={b.style}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-600" />
            <p className="text-sm text-indigo-950 font-semibold">
              {isCombined ? "Combined Case Justification Analysis" : "Case Justification Analysis"}
            </p>
            {data && !isLoading && (
              <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {data.total_cases} cases analysed
              </span>
            )}
          </div>

          {/* ── Section tabs (combined mode only) ── */}
          {isCombined && data && !isLoading && (
            <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveTab("combined")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "combined"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                All Combined
              </button>
              {(data.per_section || []).map((sec) => (
                <button
                  key={sec.label}
                  onClick={() => setActiveTab(sec.label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === sec.label
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5">
          {isLoading && <Spinner />}

          {error && !isLoading && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 shadow-sm">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {activeData && !isLoading && !error && (
            <div className="space-y-6">
              <JudgementSection items={activeData.common} type="common" />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <FileText size={15} className="text-slate-400" />
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <JudgementSection items={activeData.different} type="different" />

              {/* Conclusion Section */}
              <div className="mt-8 item-stagger" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-100">
                    <FileText size={16} className="text-rose-700" />
                  </div>
                  <h3 className="text-base font-bold text-rose-900">Conclusion</h3>
                  <span className="text-xs text-slate-500 ml-1 font-medium">— legal application summary</span>
                </div>
                <div className="p-4 rounded-xl text-sm leading-relaxed border bg-rose-50/50 border-rose-200 text-slate-800 shadow-sm">
                  <p className="leading-relaxed font-normal">{activeData.conclusion}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.99]"
            style={{
              background: isCombined
                ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                : "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "white",
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default JustificationModal;
