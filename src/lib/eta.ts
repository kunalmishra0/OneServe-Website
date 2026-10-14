import { supabase } from "./supabase";
import { getDistanceKm, getRoadDistanceKm } from "./geo";


export interface ETAResult {
  estimatedDate: Date;
  formatted: string;
  confidence: "high" | "medium" | "low";
  breakdown: {
    avgCompletionMinutes: number;
    queueDelayMinutes: number;
    travelOffsetMinutes: number;
  };
}

const BUSINESS_START = 9; // 9 AM
const BUSINESS_END = 18; // 6 PM
const AVG_SPEED_KMH = 25;
const DEFAULT_TASK_MINUTES = 120; // 2 hours default

/**
 * Calculates a realistic ETA for a complaint resolution.
 * Factors in:
 * 1. Worker's historical average resolution time.
 * 2. Number of tasks currently in the worker's queue.
 * 3. Travel time from worker's location to the target.
 * 4. Business hours (9 AM - 6 PM) and skipping Sundays.
 */
export async function calculateETA(
  workerId: string,
  targetLat: number,
  targetLon: number,
  workerLat?: number,
  workerLon?: number
): Promise<ETAResult> {
  // 1. Fetch worker performance data (avg time to resolve)
  const { data: performanceData } = await supabase
    .from("completed_complaints")
    .select("time_to_resolve_minutes")
    .eq("worker_id", workerId)
    .order('completed_at', { ascending: false })
    .limit(10);

  let avgCompletionMinutes = DEFAULT_TASK_MINUTES;
  let confidence: "high" | "medium" | "low" = "low";

  if (performanceData && performanceData.length > 0) {
    const validTimes = performanceData.filter(d => d.time_to_resolve_minutes !== null);
    if (validTimes.length > 0) {
      const total = validTimes.reduce((acc, curr) => acc + curr.time_to_resolve_minutes!, 0);
      avgCompletionMinutes = total / validTimes.length;
      confidence = validTimes.length >= 5 ? "high" : "medium";
    }
  }

  // 2. Fetch current queue depth (tasks assigned but not resolved)
  const { count: queueDepth } = await supabase
    .from("processed_complaints")
    .select("*", { count: "exact", head: true })
    .eq("staff_id", workerId)
    .in("complaint_status", ["verified", "in_progress", "pending_review"]);

  const queueDelayMinutes = (queueDepth || 0) * avgCompletionMinutes;

  // 3. Travel time calculation
  let travelOffsetMinutes = 0;
  if (workerLat && workerLon) {
    const distance = await getRoadDistanceKm(workerLat, workerLon, targetLat, targetLon);
    travelOffsetMinutes = (distance / AVG_SPEED_KMH) * 60;
  } else {

    // If worker location unknown, add a flat 30 min buffer for travel
    travelOffsetMinutes = 30;
  }

  // 4. Calculate final date respecting business hours
  let estimatedDate = new Date();
  let totalMinutesNeeded = queueDelayMinutes + travelOffsetMinutes;

  // Small buffer (15 mins) to account for startup/overhead
  totalMinutesNeeded += 15;

  // Add minutes while respecting business hours
  let safetyCounter = 0;
  while (totalMinutesNeeded > 0 && safetyCounter < 100) {
    safetyCounter++;
    const currentHour = estimatedDate.getHours();
    const currentMinutes = estimatedDate.getMinutes();
    const dayOfWeek = estimatedDate.getDay(); // 0 = Sunday
    
    // If it's Sunday, move to Monday 9 AM
    if (dayOfWeek === 0) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
      estimatedDate.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    // If it's after business hours, move to next business day start
    if (currentHour >= BUSINESS_END) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
      estimatedDate.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }
    
    // If it's before business hours, move to today's start
    if (currentHour < BUSINESS_START) {
      estimatedDate.setHours(BUSINESS_START, 0, 0, 0);
      continue;
    }

    // How many minutes left in today's business day?
    const minutesLeftToday = (BUSINESS_END - currentHour) * 60 - currentMinutes;
    const minutesToAdd = Math.min(totalMinutesNeeded, minutesLeftToday);
    
    estimatedDate.setMinutes(estimatedDate.getMinutes() + minutesToAdd);
    totalMinutesNeeded -= minutesToAdd;
    
    // If we filled the day but still need more time, move to next day
    if (totalMinutesNeeded > 0 && minutesToAdd === minutesLeftToday) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
      estimatedDate.setHours(BUSINESS_START, 0, 0, 0);
    }
  }

  // Round to nearest 30 minutes for a "human" feel
  const minutes = estimatedDate.getMinutes();
  const roundedMinutes = Math.round(minutes / 30) * 30;
  estimatedDate.setMinutes(roundedMinutes);
  estimatedDate.setSeconds(0);
  estimatedDate.setMilliseconds(0);

  const formatted = estimatedDate.toLocaleString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return {
    estimatedDate,
    formatted,
    confidence,
    breakdown: {
      avgCompletionMinutes: Math.round(avgCompletionMinutes),
      queueDelayMinutes: Math.round(queueDelayMinutes),
      travelOffsetMinutes: Math.round(travelOffsetMinutes)
    }
  };
}
