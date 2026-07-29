"use client";

import { useEffect, useState } from "react";
import { Bot, Gauge, LayoutDashboard, ListFilter, Table2 } from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "trend", label: "Trend", icon: Gauge },
  { id: "funnel", label: "Stage Volume", icon: ListFilter },
  { id: "ai", label: "AI Conversations", icon: Bot },
  { id: "breakdown", label: "Breakdown", icon: Table2 },
];

export function Logo({ size = 36 }: { size?: number }) {
  // The official artwork is white-on-transparent, so it needs the brand navy
  // behind it to be visible on a light surface.
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{ background: brand.navy, width: size, height: size }}
    >
      {brand.logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoSrc}
          alt=""
          width={size * 0.56}
          height={size * 0.65}
          style={{ width: size * 0.56, height: "auto" }}
        />
      ) : (
        <span className="text-xs font-bold text-white">{brand.monogram}</span>
      )}
    </span>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -60% 0px" },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col border-r border-line bg-surface",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">
            {brand.name}
          </span>
          <span className="block truncate text-[11px] text-ink-muted">
            {brand.tagline}
          </span>
        </span>
      </div>

      <nav className="flex-1 px-3 pb-4">
        <p className="px-2 pb-2 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
          Dashboard
        </p>
        <ul className="space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-brand-soft font-medium text-brand-dark"
                      : "text-ink-soft hover:bg-canvas hover:text-ink",
                  )}
                >
                  <Icon size={17} strokeWidth={1.9} />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-5">
        <div className="rounded-xl border border-line bg-canvas p-3.5">
          <p className="text-xs font-semibold text-ink">Live from GoHighLevel</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
            Collected hourly by n8n, stored in Supabase, refreshed here every
            minute.
          </p>
        </div>
      </div>
    </aside>
  );
}
