import React, { useState } from "react";
import { Scale, Search, BookOpen } from "lucide-react";
import { LegalChatbot } from "./LegalChatbot";
import { LawSearch } from "./LawSearch";

export function LawAdvisor() {
  const [activeTab, setActiveTab] = useState<"keyword" | "section">("keyword");

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner with requested styling */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 opacity-10 pointer-events-none">
          <Scale size={240} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider mb-3">
              <Scale size={14} /> OneServe Civic Justice Module
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Civic Law & Legal Advisor
            </h1>
            <p className="text-blue-100 text-sm md:text-base max-w-2xl mt-1">
              Intelligent legal guide for Indian Penal Code (IPC) and Bharatiya Nyaya Sanhita (BNS) provisions, case justifications, and combined judgements.
            </p>
          </div>

          {/* Tab buttons to switch between the 2 options */}
          <div className="flex gap-2 bg-blue-950/40 p-1.5 rounded-xl border border-blue-400/20 backdrop-blur-sm self-stretch md:self-auto justify-center">
            <button
              onClick={() => setActiveTab("keyword")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === "keyword"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-blue-200 hover:text-white hover:bg-white/10"
              }`}
            >
              <Search size={16} />
              Keyword Search
            </button>
            <button
              onClick={() => setActiveTab("section")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === "section"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-blue-200 hover:text-white hover:bg-white/10"
              }`}
            >
              <BookOpen size={16} />
              IPC/BNS Section Search
            </button>
          </div>
        </div>
      </div>

      {/* Content based on the selected tab */}
      <main className="transition-all duration-300">
        {activeTab === "keyword" ? <LegalChatbot /> : <LawSearch />}
      </main>
    </div>
  );
}

export default LawAdvisor;
