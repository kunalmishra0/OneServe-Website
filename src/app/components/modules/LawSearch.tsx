import React, { useState, useEffect } from "react";
import {
  Scale,
  Loader,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Gavel,
  FileText,
  Layers,
  Plus,
  X,
} from "lucide-react";
import { JustificationModal, LawItem } from "./JustificationModal";

const API_URL =
  (import.meta as any).env?.VITE_LEGAL_API_URL ||
  "https://kapooryashas-legal-expert-backend.hf.space";

interface PerSectionData {
  label: string;
  common: string[];
  different: string[];
  conclusion: string;
}

interface JustificationData {
  total_cases: number;
  mode?: string;
  common: string[];
  different: string[];
  conclusion: string;
  per_section?: PerSectionData[];
}

export const LawSearch: React.FC = () => {
  const [allRules, setAllRules] = useState<LawItem[]>([]);
  const [ipcCodes, setIpcCodes] = useState<string[]>([]);
  const [bnsCodes, setBnsCodes] = useState<string[]>([]);
  const [selectedIpc, setSelectedIpc] = useState<string>("");
  const [selectedBns, setSelectedBns] = useState<string>("");
  const [selectedLaw, setSelectedLaw] = useState<LawItem | null>(null);
  const [justificationData, setJustificationData] = useState<JustificationData | null>(null);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(true);
  const [isLoadingJustification, setIsLoadingJustification] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Combined section list
  const [combinedSections, setCombinedSections] = useState<LawItem[]>([]);

  // Popup modal (single or combined)
  const [modalLaw, setModalLaw] = useState<LawItem | null>(null);
  const [modalLaws, setModalLaws] = useState<LawItem[] | null>(null);

  // Active inline tab for results
  const [activeTab, setActiveTab] = useState<string>("combined");

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rules`);
        if (!res.ok) throw new Error("Failed to fetch legal rules.");
        const data = await res.json();
        const rules: LawItem[] = data.rules || [];
        setAllRules(rules);
        const uniqueIpc = Array.from(
          new Set(rules.map((r) => r.IPC).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const uniqueBns = Array.from(
          new Set(rules.map((r) => r.BNS).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setIpcCodes(uniqueIpc);
        setBnsCodes(uniqueBns);
      } catch (err: any) {
        setError(err.message || "Failed to load rules.");
      } finally {
        setIsLoadingRules(false);
      }
    };
    fetchRules();
  }, []);

  const handleIpcChange = (ipc: string) => {
    setSelectedIpc(ipc);
    setSelectedBns("");
    setSelectedLaw(null);
    setJustificationData(null);
    if (ipc) {
      const rule = allRules.find((r) => r.IPC === ipc);
      if (rule) {
        setSelectedBns(rule.BNS);
        setSelectedLaw(rule);
      }
    }
  };

  const handleBnsChange = (bns: string) => {
    setSelectedBns(bns);
    setSelectedIpc("");
    setSelectedLaw(null);
    setJustificationData(null);
    if (bns) {
      const rule = allRules.find((r) => r.BNS === bns);
      if (rule) {
        setSelectedIpc(rule.IPC);
        setSelectedLaw(rule);
      }
    }
  };

  const addToCombined = () => {
    if (!selectedLaw) return;
    const already = combinedSections.find((r) => r.IPC === selectedLaw.IPC);
    if (!already) setCombinedSections((prev) => [...prev, selectedLaw]);
  };

  const removeFromCombined = (rule: LawItem) =>
    setCombinedSections((prev) => prev.filter((r) => r.IPC !== rule.IPC));

  const handleGetJustification = async () => {
    const isCombined = combinedSections.length >= 2;
    setIsLoadingJustification(true);
    setJustificationData(null);
    setError(null);
    setActiveTab("combined");
    try {
      let body: any;
      if (isCombined) {
        body = { sections: combinedSections.map((r) => ({ ipc: r.IPC, bns: r.BNS })) };
      } else {
        const target = combinedSections[0] || selectedLaw;
        if (!target) return;
        body = { ipc: target.IPC };
      }
      const res = await fetch(`${API_URL}/api/justification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to fetch justification data.");
      setJustificationData(await res.json());
    } catch (err: any) {
      setError(err.message || "Error analyzing cases.");
    } finally {
      setIsLoadingJustification(false);
    }
  };

  const activeData = (() => {
    if (!justificationData) return null;
    const isCombined = justificationData.mode === "combined";
    if (!isCombined || activeTab === "combined") {
      return {
        common: justificationData.common,
        different: justificationData.different,
        conclusion: justificationData.conclusion,
      };
    }
    const sec = (justificationData.per_section || []).find((s) => s.label === activeTab);
    return sec ? { common: sec.common, different: sec.different, conclusion: sec.conclusion } : null;
  })();

  const canSearch = combinedSections.length >= 1 || !!selectedLaw;
  const isCombinedMode = combinedSections.length >= 2;

  const selectStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1.5px solid #cbd5e1",
    color: "#0f172a",
    borderRadius: "12px",
    padding: "13px 16px",
    fontSize: "14px",
    fontWeight: "500",
    width: "100%",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 16px center",
    paddingRight: "48px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  };

  return (
    <>
      {/* Single popup */}
      {modalLaw && !modalLaws && (
        <JustificationModal law={modalLaw} onClose={() => setModalLaw(null)} />
      )}
      {/* Combined popup */}
      {modalLaws && (
        <JustificationModal laws={modalLaws} onClose={() => setModalLaws(null)} />
      )}

      <div className="space-y-6">
        {/* Search & Selection Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1.5 flex items-center gap-2.5">
              <Scale className="text-indigo-600" size={22} />
              Law Section Search (IPC & BNS)
            </h2>
            <p className="text-sm text-slate-500">
              Select an IPC or BNS section to view provisions and case justifications, or combine multiple sections for combined legal precedent analysis.
            </p>
          </div>

          {isLoadingRules ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <Loader className="animate-spin text-indigo-600" size={22} />
              <span className="text-slate-600 font-medium text-sm">Loading law sections database...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* IPC Dropdown */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      IPC
                    </span>
                    Indian Penal Code Section
                  </label>
                  <select
                    value={selectedIpc}
                    onChange={(e) => handleIpcChange(e.target.value)}
                    style={selectStyle}
                    className="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="" style={{ background: "#ffffff", color: "#64748b" }}>
                      — Select IPC Section —
                    </option>
                    {ipcCodes.map((code, idx) => (
                      <option key={`ipc-${code}-${idx}`} value={code} style={{ background: "#ffffff", color: "#0f172a" }}>
                        IPC {code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* BNS Dropdown */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                      BNS
                    </span>
                    Bharatiya Nyaya Sanhita Section
                  </label>
                  <select
                    value={selectedBns}
                    onChange={(e) => handleBnsChange(e.target.value)}
                    style={selectStyle}
                    className="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="" style={{ background: "#ffffff", color: "#64748b" }}>
                      — Select BNS Section —
                    </option>
                    {bnsCodes.map((code, idx) => (
                      <option key={`bns-${code}-${idx}`} value={code} style={{ background: "#ffffff", color: "#0f172a" }}>
                        BNS {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Law Preview */}
              {selectedLaw && (
                <div className="mb-5">
                  <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <BookOpen size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-sm md:text-base mb-1.5">
                          {selectedLaw.Description}
                        </h4>
                        <div className="flex gap-2 text-xs font-semibold">
                          <span className="px-2.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            IPC {selectedLaw.IPC}
                          </span>
                          <span className="px-2.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                            BNS {selectedLaw.BNS}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={addToCombined}
                    disabled={combinedSections.some((r) => r.IPC === selectedLaw.IPC)}
                    className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 text-indigo-700 font-bold text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-indigo-100/60 hover:border-indigo-400 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {combinedSections.some((r) => r.IPC === selectedLaw.IPC) ? (
                      <>
                        <CheckCircle size={16} className="text-emerald-600" />
                        Section already added to combined list
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Add this section to Combined Judgement list
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Combined sections chip list */}
              {combinedSections.length > 0 && (
                <div className="mb-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={16} className="text-amber-600" />
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Combined Sections Queue ({combinedSections.length})
                    </span>
                    {combinedSections.length >= 2 && (
                      <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        Ready for Combined Analysis
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {combinedSections.map((rule, idx) => (
                      <div
                        key={`comb-${rule.IPC}-${rule.BNS}-${idx}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-amber-300 text-amber-900 shadow-2xs"
                      >
                        <span>IPC {rule.IPC} / BNS {rule.BNS}</span>
                        <button
                          onClick={() => removeFromCombined(rule)}
                          className="text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-full p-0.5 transition-colors"
                          title="Remove section"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleGetJustification}
                disabled={!canSearch || isLoadingJustification}
                className="w-full py-3.5 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2.5 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isCombinedMode
                    ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                    : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "white",
                }}
              >
                {isLoadingJustification ? (
                  <>
                    <Loader className="animate-spin" size={18} /> Analysing Case Precedents...
                  </>
                ) : isCombinedMode ? (
                  <>
                    <Layers size={18} /> Get Combined Judgement ({combinedSections.length} Sections)
                  </>
                ) : (
                  <>
                    <Gavel size={18} /> Get Case Justification
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 border border-red-200">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Results Container */}
        {justificationData && !isLoadingJustification && (
          <div className="space-y-6">
            {/* Stats + popup trigger */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="text-indigo-600" />
                  <span className="text-slate-600 text-sm font-medium">
                    Analysis based on <span className="text-slate-900 font-bold">{justificationData.total_cases}</span> case records
                    {justificationData.mode === "combined" && (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Combined Analysis
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (justificationData.mode === "combined") {
                      setModalLaws(combinedSections);
                    } else {
                      setModalLaw(combinedSections[0] || selectedLaw);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-1.5"
                >
                  Open in Animated Popup
                </button>
              </div>

              {/* Section tabs for combined mode */}
              {justificationData.mode === "combined" && (
                <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab("combined")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "combined"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    All Combined
                  </button>
                  {(justificationData.per_section || []).map((sec) => (
                    <button
                      key={sec.label}
                      onClick={() => setActiveTab(sec.label)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === sec.label
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Common Judgements Card */}
            {activeData && (
              <>
                <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 flex items-center gap-2.5 bg-emerald-50/80 border-b border-emerald-100">
                    <CheckCircle size={18} className="text-emerald-600" />
                    <h3 className="text-base font-bold text-emerald-950">Common Judgements</h3>
                    <span className="text-xs text-emerald-700 font-medium">— repeated patterns across cases</span>
                  </div>
                  <div className="p-6 space-y-3 bg-white">
                    {(activeData.common || []).map((item, i) => (
                      <div
                        key={i}
                        className="flex gap-3.5 p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 text-slate-700"
                      >
                        <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {i + 1}
                        </div>
                        <p className="text-sm leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Different Judgements Card */}
                <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 flex items-center gap-2.5 bg-amber-50/80 border-b border-amber-100">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <h3 className="text-base font-bold text-amber-950">Different / Notable Judgements</h3>
                    <span className="text-xs text-amber-700 font-medium">— exceptional legal outcomes</span>
                  </div>
                  <div className="p-6 space-y-3 bg-white">
                    {(activeData.different || []).map((item, i) => (
                      <div
                        key={i}
                        className="flex gap-3.5 p-4 rounded-xl bg-amber-50/30 border border-amber-100 text-slate-700"
                      >
                        <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {i + 1}
                        </div>
                        <p className="text-sm leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conclusion Card */}
                <div className="rounded-2xl border border-rose-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 flex items-center gap-2.5 bg-rose-50/80 border-b border-rose-100">
                    <FileText size={18} className="text-rose-600" />
                    <h3 className="text-base font-bold text-rose-950">Conclusion</h3>
                    <span className="text-xs text-rose-700 font-medium">— legal application summary</span>
                  </div>
                  <div className="p-6 bg-white">
                    <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100">
                      <p className="text-sm md:text-base leading-relaxed text-slate-800 font-normal">
                        {activeData.conclusion}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default LawSearch;
