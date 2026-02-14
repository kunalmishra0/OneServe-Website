import { Newspaper, ExternalLink } from "lucide-react";

const schemes = [
  {
    id: 1,
    title: "Pradhan Mantri Awas Yojana (Urban)",
    description:
      "Affordable housing for the urban poor with a target of building 20 million affordable houses by 31 March 2022.",
    eligibility:
      "Lower Income Group (LIG) and Economically Weaker Section (EWS)",
    link: "https://pmaymis.gov.in/",
  },
  {
    id: 2,
    title: "Swachh Bharat Mission (Urban)",
    description:
      "A nationwide campaign in India for the period 2014 to 2019 that aims to clean up the streets, roads and infrastructure of India's cities, towns, and rural areas.",
    eligibility: "All Urban Local Bodies",
    link: "https://sbmurban.org/",
  },
  {
    id: 3,
    title: "Smart Cities Mission",
    description:
      "An urban renewal and retrofitting program by the Government of India with the mission to develop 100 smart cities across the country making them citizen friendly and sustainable.",
    eligibility: "Selected Cities",
    link: "https://smartcities.gov.in/",
  },
  {
    id: 4,
    title: "AMRUT (Atal Mission for Rejuvenation and Urban Transformation)",
    description:
      "Focuses on establishing infrastructure that could ensure adequate robust sewage networks and water supply for urban transformation.",
    eligibility: "Cities with population > 1 Lakh",
    link: "https://amrut.gov.in/",
  },
];

export function SchemesPage() {
  return (
    <div className="p-6 md:p-8 min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Newspaper className="text-blue-600" />
          Government Schemes
        </h1>
        <p className="text-gray-500 mb-8">
          Stay updated with the latest government initiatives and schemes
          beneficial for you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {scheme.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4 flex-1">
                {scheme.description}
              </p>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Eligibility
                  </span>
                  <p className="text-sm text-gray-700 font-medium">
                    {scheme.eligibility}
                  </p>
                </div>

                <a
                  href={scheme.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                >
                  Learn More <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
            <Newspaper size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 text-sm">
              Did you know?
            </h4>
            <p className="text-blue-800 text-sm mt-1">
              You can apply for most of these schemes directly through the
              common service centers (CSCs) or their respective online portals.
              Keep your Aadhaar card and income certificate handy!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
