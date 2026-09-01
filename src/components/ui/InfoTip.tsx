"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The "what am I looking at" affordance next to a card title.
 *
 * Every number on this dashboard is a definition as much as a value: a booking
 * rate that counts a cohort reads differently from one that divides two totals,
 * and a reply rate that matches the channel reads differently from one that
 * does not. Those definitions used to live only in the repo, where the person
 * reading the number never goes. They live here now.
 *
 * Opens on hover for a mouse and on focus or click for a keyboard, because
 * hover alone is unreachable without one. Escape closes it.
 */
export function InfoTip({
  title,
  children,
  align = "left",
}: {
  /** Screen-reader label: "About <title>". */
  title: string;
  children: React.ReactNode;
  /** Which edge the panel is pinned to, so it never runs off a narrow card. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // A click anywhere else dismisses it, so a tapped tip on a touch screen
    // does not stay stuck open with no obvious way to close it.
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
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
          open && "border-ink-soft text-ink-soft",
        )}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>

      {open ? (
        <span
          id={panelId}
          role="tooltip"
          className={cn(
            "absolute top-6 z-50 w-72 rounded-xl border border-line bg-surface p-3 text-left",
            "text-xs leading-relaxed font-normal text-ink-soft normal-case",
            "shadow-[0_8px_24px_rgba(15,23,42,0.12)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}

/**
 * One labelled line inside a tip. Keeps every card explaining the same four
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
