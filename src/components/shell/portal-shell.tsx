"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStored } from "@/lib/use-stored";

const MIN_WIDTH = 200;
const MAX_WIDTH = 380;
const DEFAULT_WIDTH = 248;
const RAIL_WIDTH = 64;

const clamp = (n: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));

/**
 * Two-column layout: a sidebar (folder cover) and the page (paper).
 * The sidebar can be dragged wider or narrower and collapsed to an icon rail;
 * both are remembered on this device. On phones it becomes a drawer.
 */
export function PortalShell({ sidebar, brand, children }: { sidebar: ReactNode; brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [resizing, setResizing] = useState(false);
  const pathname = usePathname();
  const [widthStr, setWidthStr] = useStored("sidebar-width", String(DEFAULT_WIDTH));
  const [collapsedStr, setCollapsedStr] = useStored("sidebar-collapsed", "0");
  const asideRef = useRef<HTMLElement>(null);

  const width = clamp(Number(widthStr) || DEFAULT_WIDTH);
  const collapsed = collapsedStr === "1";
  const toggle = () => setCollapsedStr(collapsed ? "0" : "1");

  // Ctrl+B / ⌘B toggles the sidebar; Escape closes the phone drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setCollapsedStr(collapsedStr === "1" ? "0" : "1");
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsedStr, setCollapsedStr]);

  // No background scrolling while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function onResizeStart(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizing(true);
  }
  function onResizeMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizing) return;
    const left = asideRef.current?.getBoundingClientRect().left ?? 0;
    setWidthStr(String(clamp(Math.round(e.clientX - left))));
  }
  function onResizeEnd() {
    setResizing(false);
  }

  return (
    <div
      className={cn("portal-shell min-h-screen md:grid md:grid-cols-[var(--sidebar-w)_1fr]", !resizing && "portal-shell-animated")}
      style={{ ["--sidebar-w" as string]: `${collapsed ? RAIL_WIDTH : width}px` }}
    >
      {/* Phone top bar */}
      <header className="mobile-bar sticky top-0 z-30 flex items-center justify-between border-b border-line-2 bg-paper-4 px-3 py-2 md:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] border border-line-2 bg-paper-2 active:bg-paper-3"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="portal-sidebar"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar. On phones it is a drawer positioned with left/right rather than transforms,
          which iOS Safari handles more reliably for fixed elements. */}
      <aside
        id="portal-sidebar"
        ref={asideRef}
        data-collapsed={collapsed}
        data-open={open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={cn(
          "sidebar drawer fixed inset-y-0 z-40 w-[min(300px,85vw)] overflow-y-auto border-r border-line-2 bg-paper-4 md:sticky md:top-0 md:left-auto md:h-screen md:w-(--sidebar-w) md:overflow-visible",
          open ? "left-0 shadow-paper-lg" : "-left-[min(300px,85vw)] md:left-auto",
        )}
      >
        {sidebar}

        <button
          type="button"
          onClick={toggle}
          className="absolute -right-3 top-[22px] z-10 hidden h-6 w-6 place-items-center rounded-full border border-line-2 bg-paper-2 text-ink-3 shadow-paper transition-[transform,color] hover:scale-110 hover:text-ink md:grid"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {!collapsed ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            title="Drag to resize"
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
            onDoubleClick={() => setWidthStr(String(DEFAULT_WIDTH))}
            className={cn(
              "absolute inset-y-0 -right-[3px] hidden w-[6px] cursor-col-resize transition-colors md:block",
              resizing ? "bg-accent/50" : "hover:bg-accent/30",
            )}
          />
        ) : null}
      </aside>
      {open ? <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setOpen(false)} /> : null}

      <main className="min-w-0">
        {/* Keyed on the path so each page fades in as you move between folders. */}
        <div key={pathname} className="rise mx-auto w-full max-w-[1120px] px-4 py-5 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
