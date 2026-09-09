"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

/** Day and minute of the current moment, at minute precision so renders stay stable. */
function snapshot() {
  const d = new Date();
  return d.getDay() * 10_000 + d.getHours() * 60 + d.getMinutes();
}

/**
 * A red line across today's timetable column at the current time.
 * Renders nothing on the server, then appears once the browser knows the time.
 */
export function NowLine({ day, rangeStart, rangeEnd, hourPx, pad }: { day: number; rangeStart: number; rangeEnd: number; hourPx: number; pad: number }) {
  const snap = useSyncExternalStore(subscribe, snapshot, () => -1);
  if (snap < 0) return null;
  const today = Math.floor(snap / 10_000);
  const minute = snap % 10_000;
  if (today !== day || minute < rangeStart || minute > rangeEnd) return null;
  const top = pad + ((minute - rangeStart) / 60) * hourPx;
  return <div className="now-line" style={{ top }} aria-hidden title="Now" />;
}
