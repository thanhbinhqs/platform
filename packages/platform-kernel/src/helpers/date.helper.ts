/**
 * Format a Date to ISO string for API responses.
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Check if a date is in the past.
 */
export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Add days to a date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate duration in ms between two dates.
 */
export function durationMs(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}
