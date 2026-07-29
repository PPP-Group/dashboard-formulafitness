"use client";

import { RefObject, useEffect, useRef, useState } from "react";

/**
 * Measures an element's content width and keeps it current.
 *
 * Drives the chart from an explicit width rather than recharts'
 * ResponsiveContainer, which adds a layer we don't need here.
 *
 * Two signals, on purpose. ResizeObserver is the accurate one — it catches
 * layout changes that never touch the viewport (sidebar collapsing, a card
 * reflowing). But its callbacks are delivered per frame, so a tab that isn't
 * compositing never gets them. The window `resize` listener is frame-independent
 * and covers the common case of someone dragging the browser window.
 */
export function useElementWidth<T extends HTMLElement>(): [
  RefObject<T | null>,
  number,
] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const padding =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const next = el.getBoundingClientRect().width - padding;
      setWidth((prev) => {
        const rounded = Math.max(0, Math.floor(next));
        // Ignore sub-pixel churn so we don't re-render the chart on noise.
        return Math.abs(rounded - prev) > 1 ? rounded : prev;
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return [ref, width];
}
