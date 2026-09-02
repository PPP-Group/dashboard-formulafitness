"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** Panel size, needed up front to decide whether it fits below the icon. */
const PANEL_W = 288;
const PANEL_MAX_H = 260;
const GAP = 8;
/** Keeps the panel off the very edge of the window. */
const MARGIN = 12;
/**
 * Grace period before a hover-out closes the panel. The pointer has to cross
 * the gap between the icon and the panel, and it is nowhere during the
 * crossing — without this the panel closes underneath it every time.
 */
const CLOSE_DELAY_MS = 160;

type Coords = { top: number; left: number; above: boolean };

/**
 * The "what am I looking at" affordance next to a card title.
 *
 * Every number on this dashboard is a definition as much as a value: a booking
 * rate that counts a cohort reads differently from one that divides two totals,
 * and a reply rate that matches the channel reads differently from one that
 * does not. Those definitions used to live only in the repo, where the person
 * reading the number never goes. They live here now.
 *
 * The panel renders in a portal on the body rather than inside the card. Cards
 * are free to clip their own contents — the breakdown card sets overflow-hidden
 * so its table corners stay rounded — and an absolutely positioned panel inside
 * one gets cut off no matter what z-index it carries. Fixed coordinates off the
 * icon's own rect sidestep every ancestor. It flips above the icon when there
 * is no room below, which the last card on the page always hits.
 *
 * Two ways in, because a tip you cannot finish reading is not a tip:
 *
 * - Hover opens it, and it stays open while the pointer is over the icon *or*
 *   the panel, so a longer tip can be scrolled.
 * - Clicking pins it. A pinned tip ignores hover entirely and closes only on an
 *   outside click or Escape, which is also what a touch screen needs.
 */
export function InfoTip({
  title,
  children,
  align = "left",
}: {
  /** Screen-reader label: "About <title>". */
  title: string;
  children: React.ReactNode;
  /** Which edge of the icon the panel lines up with, space permitting. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelClose();
    setOpen(false);
    setPinned(false);
  }, [cancelClose]);

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    const roomBelow = window.innerHeight - r.bottom;
    const above = roomBelow < PANEL_MAX_H && r.top > roomBelow;

    let left = align === "right" ? r.right - PANEL_W : r.left;
    left = Math.min(
      Math.max(left, MARGIN),
      Math.max(MARGIN, window.innerWidth - PANEL_W - MARGIN),
    );

    setCoords({ top: above ? r.top - GAP : r.bottom + GAP, left, above });
  }, [align]);

  // Measured in the handler that opens it, not in an effect: the icon's rect is
  // already there to read, and the panel is never rendered at 0,0 for a frame.
  const show = useCallback(() => {
    cancelClose();
    place();
    setOpen(true);
  }, [cancelClose, place]);

  /** Hover-out. A pinned tip ignores it; otherwise it closes after the grace. */
  const scheduleClose = useCallback(() => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [pinned, cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // The panel lives in a portal, so it is not inside the wrapper. Both have
    // to count as "inside", or dragging the panel's own scrollbar dismisses it.
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    // Fixed coordinates go stale the moment anything moves underneath.
    const onMove = () => place();

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place, close]);

  // No mounted flag needed: the panel only exists once someone opens it, and
  // `open` starts false, so the server and the first client render agree.
  const panel =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: PANEL_W,
              maxHeight: PANEL_MAX_H,
              transform: coords.above ? "translateY(-100%)" : undefined,
            }}
            className={cn(
              "thin-scroll z-[100] overflow-y-auto rounded-xl border border-line bg-surface p-3 text-left",
              "text-xs leading-relaxed font-normal text-ink-soft normal-case",
              "shadow-[0_8px_24px_rgba(15,23,42,0.12)]",
            )}
          >
            {children}
          </div>,
          document.body,
        )
      : null;

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex align-middle"
      onMouseEnter={show}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-label={`About ${title}`}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none font-semibold transition-colors",
          "border-line text-ink-faint hover:border-ink-soft hover:text-ink-soft",
          "focus-visible:ring-2 focus-visible:ring-ink-soft focus-visible:outline-none",
          (open || pinned) && "border-ink-soft text-ink-soft",
        )}
        onClick={(e) => {
          // Never let the click reach a card that is itself clickable.
          e.stopPropagation();
          if (pinned) {
            close();
          } else {
            show();
            setPinned(true);
          }
        }}
        onFocus={show}
        onBlur={scheduleClose}
      >
        i
      </button>
      {panel}
    </span>
  );
}

/**
 * One labelled line inside a tip. Keeps every card explaining the same few
 * things in the same order: what it is, how it is worked out, and what the
 * period and origin filters do to it.
 */
export function TipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="mt-2 block first:mt-0">
      <span className="block text-[10px] font-semibold tracking-wide text-ink-faint uppercase">
        {label}
      </span>
      <span className="block text-ink-soft">{children}</span>
    </span>
  );
}
