/**
 * POST EVENT Trial Mode - allows users to test creating public events before signing up
 */

const TRIAL_KEY = "accredit_post_event_trial";

export interface PostEventTrialData {
  title: string;
  host_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  description: string;
  guest_count_range: string;
  event_type: string;
  category?: string;
  ticket_price?: number;
  pass_packages?: any[];
  lineup?: any[];
  created_at: string;
}

/**
 * Save trial event data to localStorage
 */
export function saveTrialEvent(eventData: Partial<PostEventTrialData>): void {
  const trialData: PostEventTrialData = {
    title: eventData.title || "",
    host_name: eventData.host_name || "",
    event_date: eventData.event_date || "",
    event_time: eventData.event_time || "",
    venue: eventData.venue || "",
    description: eventData.description || "",
    guest_count_range: eventData.guest_count_range || "1-100",
    event_type: eventData.event_type || "concert",
    category: eventData.category,
    ticket_price: eventData.ticket_price,
    pass_packages: eventData.pass_packages,
    lineup: eventData.lineup,
    created_at: new Date().toISOString(),
  };

  localStorage.setItem(TRIAL_KEY, JSON.stringify(trialData));
}

/**
 * Get saved trial event data
 */
export function getTrialEvent(): PostEventTrialData | null {
  const saved = localStorage.getItem(TRIAL_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

/**
 * Clear trial event data
 */
export function clearTrialEvent(): void {
  localStorage.removeItem(TRIAL_KEY);
}

/**
 * Check if trial event exists
 */
export function hasTrialEvent(): boolean {
  return localStorage.getItem(TRIAL_KEY) !== null;
}
