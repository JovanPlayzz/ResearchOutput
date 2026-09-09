/** Helpers for weekly timetable slots (day 0–6, minutes from midnight). */

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const SCHOOL_DAYS = [1, 2, 3, 4, 5];

export function fmtMinutes(min: number) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "8:00–9:00 AM", or "11:30 AM–1:00 PM" when the suffix changes. */
export function fmtRange(startMin: number, endMin: number) {
  const a = fmtMinutes(startMin);
  const b = fmtMinutes(endMin);
  const sameSuffix = a.slice(-2) === b.slice(-2);
  return sameSuffix ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
}

/** "08:00" → 480. Returns null for bad input. */
export function parseTime(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** 480 → "08:00", for <input type="time"> values. */
export function toTimeInput(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export type SlotLike = { day: number; startMin: number; endMin: number };

export function slotsOverlap(a: SlotLike, b: SlotLike) {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * Summarise a class's slots in one line, grouping days that share a time:
 * "Mon · Wed · Fri 8:00–9:00 AM · Tue 1:00–2:00 PM"
 */
export function describeSlots(slots: Array<SlotLike & { room?: string | null }>) {
  if (slots.length === 0) return "";
  const groups = new Map<string, { days: number[]; startMin: number; endMin: number; room: string | null }>();
  for (const s of [...slots].sort((x, y) => x.day - y.day || x.startMin - y.startMin)) {
    const key = `${s.startMin}-${s.endMin}-${s.room ?? ""}`;
    const g = groups.get(key) ?? { days: [], startMin: s.startMin, endMin: s.endMin, room: s.room ?? null };
    g.days.push(s.day);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => `${g.days.map((d) => DAY_SHORT[d]).join(" · ")} ${fmtRange(g.startMin, g.endMin)}${g.room ? ` (${g.room})` : ""}`)
    .join(" · ");
}

export function sortSlots<T extends SlotLike>(slots: T[]) {
  return [...slots].sort((a, b) => a.day - b.day || a.startMin - b.startMin);
}
