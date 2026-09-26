/** Local calendar days between `date` and `now` (0 = today). NaN for invalid dates. */
export function daysAgo(date: Date, now: Date = new Date()): number {
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  // Rounded so 23- and 25-hour DST days still count as one day
  return Math.round((midnight(now) - midnight(date)) / 86_400_000);
}

export const SESSION_GROUPS = ["Today", "Yesterday", "Previous 7 days", "Earlier"] as const;
export type SessionGroup = (typeof SESSION_GROUPS)[number];

/** Notes-style list section for a chat's last activity. */
export function sessionGroup(iso: string, now?: Date): SessionGroup {
  const days = daysAgo(new Date(iso), now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  return "Earlier";
}

/** "Today", "Yesterday", a weekday within the week, otherwise "Sep 12" (with the year when it isn't this one). */
export function dayLabel(date: Date, now: Date = new Date()): string {
  const days = daysAgo(date, now);
  if (Number.isNaN(days)) return "";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function timeLabel(date: Date): string {
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
