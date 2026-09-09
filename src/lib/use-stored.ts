"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A string value remembered in localStorage. The server renders the fallback;
 * the browser swaps in the stored value right after hydration without a mismatch.
 */
export function useStored(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        /* private mode: keep going without persistence */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set] as const;
}
