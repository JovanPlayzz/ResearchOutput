"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowDownAZ, GripVertical, Hash, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type FolderItem = {
  id: string;
  href: string;
  /** Big text on the folder, e.g. "12-CORE" or "Science". */
  label: string;
  /** Small text under it, e.g. "Adviser: Daniel Cruz". */
  sublabel?: string;
  /** Tiny mono text on the tab, e.g. "GRADE 12". */
  tab?: string;
  /** Used by the "group" sort, e.g. "Grade 12". */
  group?: string;
  count: number;
  countLabel: string;
  extra?: string;
};

type SortKey = "custom" | "name" | "count" | "group";

type DragState = {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offX: number;
  offY: number;
  w: number;
  /** Mouse/pen: true straight away. Touch: true once the finger has held still for a moment. */
  armed: boolean;
  touch: boolean;
  moved: boolean;
};

const DRAG_THRESHOLD = 6;
/** Touch: hold this long without moving to pick a folder up (a plain swipe scrolls instead). */
const HOLD_MS = 240;
const HOLD_SLOP = 10;

/** Where an element sits in the layout, ignoring any slide animation still playing on it. */
function layoutBox(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const t = getComputedStyle(el).transform;
  const m = t && t !== "none" ? new DOMMatrixReadOnly(t) : null;
  const dx = m ? m.m41 : 0;
  const dy = m ? m.m42 : 0;
  return { left: r.left - dx, top: r.top - dy, right: r.right - dx, bottom: r.bottom - dy, offsetX: dx, offsetY: dy };
}

/**
 * A grid of big manila folders. When `reorderAction` is given the folders can be
 * picked up and dragged into a custom order: the held folder lifts and follows the
 * pointer, the others slide out of its way, and the order is saved on drop.
 * Mouse: just drag. Touch: hold for a moment, then drag.
 */
export function FolderGrid({
  items,
  reorderAction,
  defaultSort,
  groupLabel = "Group",
  emptyText = "Nothing here yet.",
}: {
  items: FolderItem[];
  reorderAction?: (ids: string[]) => Promise<void>;
  defaultSort?: SortKey;
  groupLabel?: string;
  emptyText?: string;
}) {
  const sortable = Boolean(reorderAction);
  const [sort, setSort] = useState<SortKey>(defaultSort ?? (sortable ? "custom" : "name"));
  const [order, setOrder] = useState<string[]>(() => items.map((i) => i.id));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [saveTick, setSaveTick] = useState(0);
  const savedTick = useRef(0);
  const suppressClick = useRef(false);
  const nodes = useRef(new Map<string, HTMLLIElement>());
  // Source of truth while dragging: pointer moves can arrive faster than React re-renders.
  const liveOrder = useRef<string[]>([]);
  const lastRects = useRef(new Map<string, { left: number; top: number }>());
  const [, startTransition] = useTransition();

  // Keep the custom order in sync when items are added or removed on the server.
  const orderedIds = useMemo(() => {
    const known = new Set(items.map((i) => i.id));
    const kept = order.filter((id) => known.has(id));
    const missing = items.map((i) => i.id).filter((id) => !kept.includes(id));
    return [...kept, ...missing];
  }, [items, order]);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const sorted = useMemo(() => {
    const list = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
    if (sort === "name") return [...list].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    if (sort === "count") return [...list].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    if (sort === "group")
      return [...list].sort(
        (a, b) => (a.group ?? "").localeCompare(b.group ?? "", undefined, { numeric: true }) || a.label.localeCompare(b.label, undefined, { numeric: true }),
      );
    return list;
  }, [orderedIds, byId, sort]);

  const canDrag = sortable && sort === "custom";

  // Save after a drop, once React has committed the final order.
  useEffect(() => {
    if (saveTick === savedTick.current || !reorderAction) return;
    savedTick.current = saveTick;
    const ids = orderedIds;
    startTransition(() => reorderAction(ids));
  }, [saveTick, orderedIds, reorderAction, startTransition]);

  // FLIP: whenever a folder's spot changes, slide it there from where it was.
  useLayoutEffect(() => {
    const next = new Map<string, { left: number; top: number }>();
    for (const [id, el] of nodes.current) {
      const box = layoutBox(el);
      const pos = { left: box.left + window.scrollX, top: box.top + window.scrollY };
      const prev = lastRects.current.get(id);
      if (prev && id !== drag?.id && (Math.abs(prev.left - pos.left) > 1 || Math.abs(prev.top - pos.top) > 1)) {
        // Start from where it is on screen right now (old spot plus any slide still in flight), end at its new spot.
        const dx = prev.left + box.offsetX - pos.left;
        const dy = prev.top + box.offsetY - pos.top;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
          duration: 280,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
      }
      next.set(id, pos);
    }
    lastRects.current = next;
  });

  // Pointer tracking lives on window: reordering moves the held <li> in the DOM,
  // which would drop pointer capture mid-drag.
  const dragRef = useRef<DragState | null>(null);
  const stopListening = useRef<(() => void) | null>(null);
  useEffect(() => () => stopListening.current?.(), []);

  function onPointerDown(e: ReactPointerEvent<HTMLLIElement>, id: string) {
    if (!canDrag || e.button !== 0 || dragRef.current) return;
    const el = nodes.current.get(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const touch = e.pointerType === "touch";
    liveOrder.current = orderedIds;
    const state: DragState = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      offX: e.clientX - r.left,
      offY: e.clientY - r.top,
      w: r.width,
      armed: !touch,
      touch,
      moved: false,
    };
    dragRef.current = state;
    if (!touch) setDrag(state);

    let holdTimer: number | null = null;
    const update = (next: DragState) => {
      dragRef.current = next;
      setDrag(next);
    };
    const cleanup = () => {
      if (holdTimer !== null) window.clearTimeout(holdTimer);
      stopListening.current?.();
    };

    if (touch) {
      // Hold still for a moment to pick the folder up. Moving first means "scroll".
      holdTimer = window.setTimeout(() => {
        const d = dragRef.current;
        if (!d || d.id !== id) return;
        update({ ...d, armed: true });
        try {
          navigator.vibrate?.(12);
        } catch {
          /* not supported */
        }
      }, HOLD_MS);
    }

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
      if (!d.armed) {
        if (dist > HOLD_SLOP) {
          // A swipe before the hold finished: let the page scroll.
          cleanup();
          dragRef.current = null;
          setDrag(null);
        }
        return;
      }
      const moved = d.moved || dist > DRAG_THRESHOLD;
      if (!moved) return;
      ev.preventDefault();

      let overId: string | null = null;
      for (const [otherId, node] of nodes.current) {
        if (otherId === d.id) continue;
        const b = layoutBox(node);
        if (ev.clientX >= b.left && ev.clientX <= b.right && ev.clientY >= b.top && ev.clientY <= b.bottom) {
          overId = otherId;
          break;
        }
      }
      if (overId !== null) {
        const current = liveOrder.current;
        // Index of the hovered folder before removing the held one: this lands the held folder
        // before it when dragging left and after it when dragging right.
        const to = current.indexOf(overId);
        const next = current.filter((x) => x !== d.id);
        next.splice(to, 0, d.id);
        if (next.join() !== current.join()) {
          liveOrder.current = next;
          setOrder(next);
        }
      }
      update({ ...d, x: ev.clientX, y: ev.clientY, moved: true });
    };
    // Non-passive so it can stop the page scrolling under a picked-up folder (touch only).
    const onTouchMove = (ev: TouchEvent) => {
      if (dragRef.current?.armed) ev.preventDefault();
    };
    const onEnd = () => {
      cleanup();
      const d = dragRef.current;
      dragRef.current = null;
      if (d?.moved || (d?.armed && d.touch)) {
        // The click that follows a drag (or a long press) must not open the folder.
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
      }
      if (d?.moved) setSaveTick((t) => t + 1);
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    stopListening.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      stopListening.current = null;
    };
  }

  if (items.length === 0) return <p className="text-sm text-ink-3">{emptyText}</p>;

  const groups = sort === "group" ? [...new Set(sorted.map((i) => i.group ?? "Other"))] : [null];
  const showGhost = Boolean(drag && (drag.moved || (drag.touch && drag.armed)));
  const dragItem = showGhost && drag ? byId.get(drag.id) : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em]">Sort</span>
        <div className="inline-flex overflow-hidden rounded-[5px] border border-line-2 bg-paper-2">
          {sortable ? (
            <SortButton active={sort === "custom"} onClick={() => setSort("custom")} icon={<GripVertical size={13} />}>
              Custom
            </SortButton>
          ) : null}
          <SortButton active={sort === "name"} onClick={() => setSort("name")} icon={<ArrowDownAZ size={13} />}>
            Name
          </SortButton>
          {items.some((i) => i.group) ? (
            <SortButton active={sort === "group"} onClick={() => setSort("group")} icon={<Layers size={13} />}>
              {groupLabel}
            </SortButton>
          ) : null}
          <SortButton active={sort === "count"} onClick={() => setSort("count")} icon={<Hash size={13} />}>
            Size
          </SortButton>
        </div>
        {canDrag ? (
          <span className="ml-1">
            <span className="hidden sm:inline">Pick up a folder and drop it where you want it.</span>
            <span className="sm:hidden">Hold a folder, then drag it.</span>
          </span>
        ) : null}
      </div>

      {groups.map((g) => {
        const list = g === null ? sorted : sorted.filter((i) => (i.group ?? "Other") === g);
        return (
          <div key={g ?? "all"} className="mb-6 last:mb-0">
            {g !== null ? <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{g}</h3> : null}
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4">
              {list.map((item, i) => {
                const isPlaceholder = showGhost && drag?.id === item.id;
                return (
                  <li
                    key={item.id}
                    data-id={item.id}
                    ref={(el) => {
                      if (el) nodes.current.set(item.id, el);
                      else nodes.current.delete(item.id);
                    }}
                    onPointerDown={(e) => onPointerDown(e, item.id)}
                    onContextMenu={(e) => {
                      if (dragRef.current) e.preventDefault();
                    }}
                    style={canDrag ? { touchAction: "manipulation" } : undefined}
                    className={cn("select-none transition-opacity", canDrag && "cursor-grab active:cursor-grabbing", isPlaceholder && "opacity-25 saturate-50")}
                  >
                    <Folder item={item} showGrip={canDrag} delay={i * 30} onClick={(e) => suppressClick.current && e.preventDefault()} />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {dragItem && drag
        ? createPortal(
            // Drawn on <body> so no ancestor transform can shift it away from the cursor;
            // it scales and tilts around the exact point that was grabbed.
            <div
              className="pointer-events-none fixed left-0 top-0 z-[100]"
              style={{ transform: `translate(${drag.x - drag.offX}px, ${drag.y - drag.offY}px)`, width: drag.w }}
              aria-hidden
            >
              <div className="folder-lifted" style={{ transformOrigin: `${drag.offX}px ${drag.offY}px` }}>
                <Folder item={dragItem} animate={false} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function SortButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 border-r border-line-2 px-2.5 text-[12.5px] transition-colors last:border-r-0",
        active ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-3",
      )}
      aria-pressed={active}
    >
      {icon}
      {children}
    </button>
  );
}

/** One big manila folder. */
export function Folder({
  item,
  showGrip = false,
  delay = 0,
  animate = true,
  onClick,
}: {
  item: FolderItem;
  showGrip?: boolean;
  delay?: number;
  animate?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={item.href}
      className={cn("folder group block", animate && "rise")}
      style={animate ? { animationDelay: `${delay}ms` } : undefined}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span className="folder-back" />
      {item.tab ? <span className="folder-tab-label">{item.tab}</span> : null}
      <span className="folder-paper" />
      <span className="folder-front">
        <span className="block truncate font-display text-[1.2rem] leading-tight text-ink group-hover:underline group-hover:underline-offset-4 sm:text-[1.35rem]">{item.label}</span>
        {item.sublabel ? <span className="mt-0.5 block truncate text-[12px] text-ink-2">{item.sublabel}</span> : null}
        <span className="mt-auto flex items-end justify-between gap-2">
          <span className="truncate text-[11px] text-ink-3">{item.extra}</span>
          <span className="shrink-0 rounded-full border border-line-2 bg-paper-2 px-2 py-px font-mono text-[11px] text-ink-2">
            {item.count} {item.countLabel}
          </span>
        </span>
      </span>
      {showGrip ? (
        <span data-grip className="folder-grip" aria-hidden>
          <GripVertical size={14} />
        </span>
      ) : null}
    </Link>
  );
}
