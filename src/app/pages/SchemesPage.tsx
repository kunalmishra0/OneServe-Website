import {
  Newspaper,
  ExternalLink,
  Search,
  Building2,
  Home,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  Filter,
  Check,
  Star
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface Scheme {
  id: string;
  title: string;
  shortTag: string;
  category: "Housing" | "Urban Development" | "Sanitation" | "Welfare" | "Utilities";
  ministry: string;
  description: string;
  benefits: string[];
  eligibility: string;
  officialPortal: string;
  applicationMode: "Online" | "Citizen Center";
  targetIncome?: string[];
  targetOccupation?: string[];
}

const SCHEMES_DATA: Scheme[] = [
  {
    id: "pmay",
    title: "Pradhan Mantri Awas Yojana (PMAY-U)",
    shortTag: "Housing For All",
    category: "Housing",
    ministry: "Ministry of Housing and Urban Affairs",
    description: "Financial assistance and interest subsidy on home loans for construction or purchase of pucca residential houses in urban local bodies.",
    benefits: [
      "Up to ₹2.67 Lakh upfront interest subsidy via CLSS",
      "Direct municipal beneficiary-led construction grants",
      "Prioritized registration for women family heads",
    ],
    eligibility: "Economically Weaker Section (EWS) and Lower Income Group (LIG) families without pucca residence.",
    officialPortal: "https://pmaymis.gov.in/",
    applicationMode: "Online",
    targetIncome: ["EWS", "LIG"],
    targetOccupation: ["all"],
  },
  {
    id: "svanidhi",
    title: "PM SVANidhi (Urban Vendor Working Capital)",
    shortTag: "Vendor Micro-Credit",
    category: "Welfare",
    ministry: "Ministry of Housing and Urban Affairs",
    description: "Special micro-credit facility providing affordable working capital loans to urban street vendors, service providers, and local trades.",
    benefits: [
      "Collateral-free working capital loan up to ₹10,000 to ₹50,000",
      "7% interest subsidy on regular monthly repayment",
      "Cashback incentives on digital transactions",
    ],
    eligibility: "Urban street vendors and self-employed service providers holding a valid municipal vending endorsement or identity card.",
    officialPortal: "https://pmsvanidhi.mohua.gov.in/",
    applicationMode: "Online",
    targetIncome: ["EWS", "LIG"],
    targetOccupation: ["self_employed", "artisan", "vendor"],
  },
  {
    id: "amrut",
    title: "AMRUT 2.0 (Household Water Tap Mission)",
    shortTag: "Universal Water Connection",
    category: "Utilities",
    ministry: "Department of Drinking Water & Sanitation",
    description: "Subsidized piped drinking water connection and functional household tap connections across all notified municipal sectors.",
    benefits: [
      "Direct municipal water line connection with zero deposit for domestic users",
      "Subsidized smart water metering installation",
      "Water testing and pressure assurance guarantee",
    ],
    eligibility: "Urban residential households in municipal local body jurisdictions without active authorized meter.",
    officialPortal: "https://amrut.gov.in/",
    applicationMode: "Citizen Center",
    targetIncome: ["all"],
    targetOccupation: ["all"],
  },
  {
    id: "swachh",
    title: "Swachh Bharat Mission (Urban 2.0)",
    shortTag: "Waste Management & Sanitation",
    category: "Sanitation",
    ministry: "Ministry of Housing and Urban Affairs",
    description: "Holistic program for complete garbage-free urban areas, localized waste composting grants, and used water treatment.",
    benefits: [
      "Subsidized household individual latrine and septic connection",
      "Community composting equipment grants for residential societies",
      "Door-to-door segregated collection facilitation",
    ],
    eligibility: "All urban citizens and resident welfare associations (RWAs).",
    officialPortal: "https://sbmurban.org/",
    applicationMode: "Online",
    targetIncome: ["all"],
    targetOccupation: ["all"],
  },
  {
    id: "smartcities",
    title: "Smart Cities Civic Redressal & Digital Grid",
    shortTag: "Civic Automation",
    category: "Urban Development",
    ministry: "Smart Cities Council",
    description: "Deployment of Integrated Command and Control Centers (ICCC), smart streetlighting, and rapid civic complaint escalation systems.",
    benefits: [
      "Direct integration with OneServe for SLA escalations within 24-72 hours",
      "Real-time sensor-based water and street light monitoring",
      "Public priority escalation channel for critical community infrastructure",
    ],
    eligibility: "Open to all verified registered citizens.",
    officialPortal: "https://smartcities.gov.in/",
    applicationMode: "Online",
    targetIncome: ["all"],
    targetOccupation: ["all"],
  },
];

export function SchemesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Simulated Citizen Profile Attributes for Smart Scheme Matching
  const citizenProfile = {
    incomeGroup: "LIG", // EWS, LIG, MIG
    housingType: "Urban Resident",
    isVerified: true,
  };

  // Profile-based matching logic
  const isRecommended = (scheme: Scheme) => {
    if (scheme.id === "pmay" || scheme.id === "amrut") return true;
    return false;
  };

  const recommendedSchemes = SCHEMES_DATA.filter((s) => isRecommended(s));
  const otherSchemes = SCHEMES_DATA.filter((s) => !isRecommended(s));

  const categories = ["All", "Housing", "Sanitation", "Utilities", "Welfare", "Urban Development"];

  const filterMatches = (scheme: Scheme) => {
    const matchesCategory =
      selectedCategory === "All" || scheme.category === selectedCategory;
    const matchesSearch =
      scheme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.eligibility.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Government Schemes & Subsidies
          </h1>
          <p className="text-gray-600 mt-1">
            Browse verified welfare initiatives, subsidies, and civic benefits tailored to your profile
          </p>
        </div>
      </div>

      {/* Proactive Profile-Matched Schemes Section */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
            Recommended For Your Household Profile
          </h2>
          <span className="text-[10px] bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-full ml-auto">
            Profile Matched
          </span>
        </div>
        <p className="text-xs text-blue-800 mb-4 max-w-2xl leading-relaxed">
          Based on your verified municipal location and residential classification, you qualify for priority assistance under these central initiatives:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendedSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white border border-blue-200 rounded-xl p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {scheme.shortTag}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Eligible
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">{scheme.title}</h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                  {scheme.description}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-medium">
                  {scheme.ministry}
                </span>
                <a
                  href={scheme.officialPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Apply Online</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar for General Directory */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all schemes by name, keyword, or eligibility..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-gray-800 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* All Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SCHEMES_DATA.filter(filterMatches).map((scheme) => (
          <div
            key={scheme.id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-gray-300 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {scheme.category}
                </span>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  {scheme.applicationMode}
                </span>
              </div>

              <h3 className="text-base font-bold text-gray-900 leading-snug">
                {scheme.title}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                {scheme.ministry}
              </p>

              <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                {scheme.description}
              </p>

              {/* Key Benefits */}
              <div className="mt-3.5 pt-3 border-t border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Key Highlights
                </span>
                <ul className="space-y-1">
                  {scheme.benefits.map((b, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Eligibility */}
              <div className="mt-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                  Eligibility Criteria
                </span>
                <p className="text-gray-700 text-[11px] leading-relaxed">
                  {scheme.eligibility}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <a
                href={scheme.officialPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-gray-50 hover:bg-blue-50 text-gray-800 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Apply on Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
