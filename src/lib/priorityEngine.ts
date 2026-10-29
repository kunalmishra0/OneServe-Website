/**
 * priorityEngine.ts
 * Dual-Factor Priority Escalation Engine for OneServe
 * Computes live priorities client-side or syncs with the Supabase stored procedure
 * Factors:
 *   1. Elapsed Time / SLA breach threshold
 *   2. Reporter Official Tier (Police, Executive, Emergency Responder, etc.)
 */

export type ProfessionTier =
  | "standard"
  | "civic_official"
  | "emergency_responder"
  | "executive_authority";

export type PriorityLevel = "low" | "medium" | "high" | "critical";

export interface PriorityEvaluationResult {
  priorityLevel: PriorityLevel;
  priorityScore: number;
  isEscalated: boolean;
  reason: string;
  badgeLabel?: string;
  badgeColor?: string;
}

export function evaluateComplaintPriority(
  createdAt: string | Date,
  professionTier: ProfessionTier = "standard",
  isOfficialVerified: boolean = false,
  officialDesignation?: string
): PriorityEvaluationResult {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const elapsedHours = Math.max(0, (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));

  let level: PriorityLevel = "low";
  let score = 3.0;
  let reason = "Standard Priority";
  let badgeLabel: string | undefined;
  let badgeColor: string | undefined;

  // Set badge if verified official
  if (isOfficialVerified) {
    if (professionTier === "executive_authority") {
      badgeLabel = officialDesignation || "Executive Authority";
      badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
    } else if (professionTier === "emergency_responder") {
      badgeLabel = officialDesignation || "Emergency Services";
      badgeColor = "bg-rose-100 text-rose-800 border-rose-200";
    } else if (professionTier === "civic_official") {
      badgeLabel = officialDesignation || "Civic Officer";
      badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
    }
  }

  // DUAL-FACTOR RULES:
  if (professionTier === "executive_authority" && isOfficialVerified) {
    if (elapsedHours >= 12) {
      level = "critical";
      score = 9.5;
      reason = `Executive Issue unattended for ${Math.floor(elapsedHours)}h (Critical SLA)`;
    } else {
      level = "high";
      score = 8.0;
      reason = "Reported by Executive Civic Authority (Instant High Priority)";
    }
  } else if (professionTier === "emergency_responder" && isOfficialVerified) {
    if (elapsedHours >= 36) {
      level = "critical";
      score = 9.0;
      reason = `Emergency Responder issue unattended for ${Math.floor(elapsedHours)}h`;
    } else if (elapsedHours >= 18) {
      level = "high";
      score = 7.5;
      reason = `Emergency Responder issue unattended for ${Math.floor(elapsedHours)}h`;
    } else {
      level = "medium";
      score = 5.5;
      reason = "Reported by Emergency Responder / Police Official";
    }
  } else if (professionTier === "civic_official" && isOfficialVerified) {
    if (elapsedHours >= 48) {
      level = "critical";
      score = 8.5;
      reason = `Civic Officer notice pending for ${Math.floor(elapsedHours)}h`;
    } else if (elapsedHours >= 24) {
      level = "high";
      score = 7.0;
      reason = `Civic Officer notice pending for ${Math.floor(elapsedHours)}h`;
    } else {
      level = "medium";
      score = 5.0;
      reason = "Reported by Municipal Public Works Officer";
    }
  } else {
    // Standard Citizen Timeline
    if (elapsedHours >= 72) {
      level = "critical";
      score = 8.5;
      reason = `Unattended for over 72 hours (Critical SLA Breach)`;
    } else if (elapsedHours >= 48) {
      level = "high";
      score = 7.0;
      reason = `Unattended for over 48 hours (High Priority Escalation)`;
    } else if (elapsedHours >= 24) {
      level = "medium";
      score = 5.0;
      reason = `Unattended for over 24 hours (Medium Priority Escalation)`;
    } else {
      level = "low";
      score = 3.0;
      reason = "Recently filed";
    }
  }

  return {
    priorityLevel: level,
    priorityScore: score,
    isEscalated: elapsedHours >= 24 || (isOfficialVerified && professionTier !== "standard"),
    reason,
    badgeLabel,
    badgeColor,
  };
}
