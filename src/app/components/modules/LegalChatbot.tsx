import React, { useState, useEffect } from "react";
import {
  Search,
  Scale,
  BookOpen,
  AlertCircle,
  ChevronDown,
  X,
  Check,
  Loader,
  Gavel,
  Layers,
} from "lucide-react";
import { JustificationModal, LawItem } from "./JustificationModal";

const API_URL =
  (import.meta as any).env?.VITE_LEGAL_API_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  "https://kapooryashas-legal-expert-backend.hf.space";

export const LegalChatbot: React.FC = () => {
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<LawItem[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [justificationLaw, setJustificationLaw] = useState<LawItem | LawItem[] | null>(null);

  // Combined judgement selection
  const [selectedForCombined, setSelectedForCombined] = useState<LawItem[]>([]);
  const [combinedMode, setCombinedMode] = useState<boolean>(false);

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        setError(null);
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/keywords`);
        if (!response.ok) {
          throw new Error("Failed to fetch keywords. Please verify the backend connection.");
        }
        const data = await response.json();
        const rawKeywords: string[] = data.keywords || [];
        setAllKeywords(Array.from(new Set(rawKeywords.filter(Boolean))));
      } catch (err: any) {
        setError(err.message || "Failed to load keywords.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchKeywords();
  }, []);

  const keywordColors = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-purple-600",
    "bg-rose-600",
    "bg-indigo-600",
    "bg-amber-600",
    "bg-pink-600",
    "bg-teal-600",
  ];

  const getKeywordColor = (keyword: string) => {
    const index = allKeywords.indexOf(keyword);
    return keywordColors[(index >= 0 ? index : 0) % keywordColors.length];
  };

  const handleKeywordToggle = (keyword: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword]
    );
  };

  const handleSearch = async () => {
    try {
      setError(null);
      setIsLoading(true);
      setShowResults(true);
      setSelectedForCombined([]);
      const response = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: selectedKeywords }),
      });
      if (!response.ok) throw new Error("Failed to fetch search results.");
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Error running search.");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedKeywords([]);
    setSearchResults([]);
    setShowResults(false);
    setExpandedCategory(null);
    setError(null);
    setSelectedForCombined([]);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const toggleCombinedSelect = (rule: LawItem) => {
    setSelectedForCombined((prev) => {
      const exists = prev.find((r) => r.IPC === rule.IPC && r.BNS === rule.BNS);
      return exists
        ? prev.filter((r) => !(r.IPC === rule.IPC && r.BNS === rule.BNS))
        : [...prev, rule];
    });
  };

  const isSelectedForCombined = (rule: LawItem) =>
    selectedForCombined.some((r) => r.IPC === rule.IPC && r.BNS === rule.BNS);

  const handleOpenCombined = () => {
    if (selectedForCombined.length < 2) return;
    setCombinedMode(true);
    setJustificationLaw(selectedForCombined);
  };

  const groupedResults = searchResults.reduce<Record<string, LawItem[]>>((acc, rule) => {
    const category = (rule.Category && rule.Category[0]) || "General Provisions";
    if (!acc[category]) acc[category] = [];
    acc[category].push(rule);
    return acc;
  }, {});

  return (
    <>
      {/* Justification Modal */}
      {justificationLaw && (
        <JustificationModal
          law={combinedMode ? null : (justificationLaw as LawItem)}
          laws={combinedMode ? (justificationLaw as LawItem[]) : null}
          onClose={() => {
            setJustificationLaw(null);
            setCombinedMode(false);
          }}
        />
      )}

      <div className="space-y-6">
        {/* Keywords Selection Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
              <Search className="mr-3 text-blue-600" size={22} />
              Select Legal Grievance Keywords
            </h2>
            <p className="text-sm text-slate-500">
              Select one or more keywords related to your situation to retrieve matching IPC and BNS sections.
            </p>
          </div>

          <div className="mb-8">
            {isLoading && allKeywords.length === 0 ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                <Loader className="animate-spin text-blue-600" size={18} />
                <span>Loading available keywords...</span>
              </div>
            ) : allKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {allKeywords.map((keyword) => {
                  const selected = selectedKeywords.includes(keyword);
                  return (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => handleKeywordToggle(keyword)}
                      className={`
                        px-5 py-2.5 rounded-xl text-sm md:text-base font-semibold transition-all duration-200
                        ${
                          selected
                            ? `${getKeywordColor(keyword)} text-white shadow-md scale-105`
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-xs"
                        }
                        flex items-center gap-2
                      `}
                    >
                      {selected && <Check size={16} className="flex-shrink-0" />}
                      <span>{keyword}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No keywords found.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleSearch}
              disabled={selectedKeywords.length === 0 || isLoading}
              className="
                bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm
                transition-all duration-200 flex items-center justify-center gap-2
                disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
              "
            >
              {isLoading ? <Loader className="animate-spin" size={18} /> : <Search size={18} />}
              {isLoading ? "Searching Law Sections..." : `Search Legal Sections (${selectedKeywords.length})`}
            </button>

            <button
              onClick={handleReset}
              disabled={selectedKeywords.length === 0 && searchResults.length === 0}
              className="
                bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold text-sm
                transition-all duration-200 flex items-center justify-center gap-2
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              <X size={18} /> Reset Selection
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {showResults && !isLoading && !error && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                  <BookOpen className="text-emerald-600" size={22} />
                  Search Results ({searchResults.length} Sections Found)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Categorized provisions from Indian Penal Code & Bharatiya Nyaya Sanhita
                </p>
              </div>

              {/* Combined Judgement controls */}
              {selectedForCombined.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-600 font-semibold px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                    {selectedForCombined.length} selected
                  </span>
                  {selectedForCombined.length >= 2 && (
                    <button
                      onClick={handleOpenCombined}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                        color: "white",
                      }}
                    >
                      <Layers size={14} />
                      Combined Judgement ({selectedForCombined.length})
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedForCombined([])}
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Selection Tip */}
            {searchResults.length > 0 && selectedForCombined.length === 0 && (
              <div className="p-3 mb-5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-xs flex items-center gap-2 font-medium">
                <Layers size={15} className="text-indigo-600 flex-shrink-0" />
                <span>Tip: Click <strong>Select</strong> on 2 or more law cards to generate a <strong>Combined Judgement</strong> analysis.</span>
              </div>
            )}

            {Object.keys(groupedResults).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedResults).map(([category, rules]) => (
                  <div key={category} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`
                        w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100/80
                        transition-all duration-200
                        ${expandedCategory === category ? "bg-blue-50/70 text-blue-900 border-b border-blue-100" : "text-slate-800"}
                      `}
                    >
                      <h4 className="font-bold text-sm md:text-base flex items-center gap-2">
                        <span>{category}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                          {rules.length}
                        </span>
                      </h4>
                      <ChevronDown
                        className={`transform transition-transform duration-200 ${
                          expandedCategory === category ? "rotate-180 text-blue-600" : "text-slate-400"
                        }`}
                        size={20}
                      />
                    </button>

                    {expandedCategory === category && (
                      <div className="p-4 space-y-3 bg-white">
                        {rules.map((rule, index) => {
                          const selected = isSelectedForCombined(rule);
                          return (
                            <div
                              key={index}
                              className={`p-4 rounded-xl border transition-all duration-200 ${
                                selected
                                  ? "bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-200"
                                  : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <p className="font-bold text-sm md:text-base text-slate-900 mb-2.5">
                                {rule.Description}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                {/* IPC / BNS Labels */}
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                                    <Scale size={13} />
                                    <span>IPC {rule.IPC}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                    <Scale size={13} />
                                    <span>BNS {rule.BNS}</span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleCombinedSelect(rule)}
                                    title={selected ? "Remove from combined" : "Add to combined judgement"}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 active:scale-95 ${
                                      selected
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                        : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                                    }`}
                                  >
                                    {selected ? <Check size={13} /> : <Layers size={13} />}
                                    {selected ? "Selected" : "Select"}
                                  </button>

                                  <button
                                    onClick={() => {
                                      setCombinedMode(false);
                                      setJustificationLaw(rule);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all duration-200 hover:shadow-sm active:scale-95"
                                    style={{
                                      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                                    }}
                                  >
                                    <Gavel size={13} />
                                    Justification
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                <AlertCircle className="mx-auto text-amber-500 h-12 w-12 mb-3" />
                <h4 className="text-base font-bold text-slate-800 mb-1">No matching legal sections found</h4>
                <p className="text-xs text-slate-500">Try selecting a different set of grievance keywords.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default LegalChatbot;
