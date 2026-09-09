export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * DAY);
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function fmtDate(d: Date | null | undefined, style: "short" | "long" | "month" | "weekday" = "short") {
  if (!d) return "";
  switch (style) {
    case "long":
      return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    case "month":
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "weekday":
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    default:
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
}

export function fmtTime(d: Date | null | undefined) {
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "";
  return `${fmtDate(d, "weekday")} · ${fmtTime(d)}`;
}

/** Formats a Date for an <input type="datetime-local"> value. */
export function toInputDateTime(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toInputDate(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return fmtDate(d);
}

export type DueState = "none" | "overdue" | "today" | "soon" | "later";

export function dueInfo(dueAt: Date | null | undefined, now = new Date()): { state: DueState; label: string } {
  if (!dueAt) return { state: "none", label: "No due date" };
  const today = startOfDay(now);
  const due = startOfDay(dueAt);
  const days = Math.round((due.getTime() - today.getTime()) / DAY);
  if (dueAt.getTime() < now.getTime() && days <= 0) {
    if (days === 0) return { state: "overdue", label: `Was due today, ${fmtTime(dueAt)}` };
    const n = Math.abs(days);
    return { state: "overdue", label: `Overdue by ${n} day${n === 1 ? "" : "s"}` };
  }
  if (days === 0) return { state: "today", label: `Due today, ${fmtTime(dueAt)}` };
  if (days === 1) return { state: "soon", label: `Due tomorrow, ${fmtTime(dueAt)}` };
  if (days <= 3) return { state: "soon", label: `Due in ${days} days` };
  return { state: "later", label: `Due ${fmtDate(dueAt, "weekday")}` };
}

export function percent(score: number | null | undefined, points: number) {
  if (score == null || points <= 0) return null;
  return Math.round((score / points) * 1000) / 10;
}

export function gradeLetter(pct: number | null) {
  if (pct == null) return "—";
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

export function gradeTone(pct: number | null): "good" | "ok" | "warn" | "bad" | "muted" {
  if (pct == null) return "muted";
  if (pct >= 85) return "good";
  if (pct >= 75) return "ok";
  if (pct >= 60) return "warn";
  return "bad";
}

export function pluralize(n: number, word: string, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`;
}

export function truncate(s: string, max = 140) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
