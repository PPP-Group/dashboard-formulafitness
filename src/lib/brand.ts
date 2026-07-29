/**
 * Brand tokens, lifted from the official Formula Fitness site
 * (lp-formulafitness.vercel.app) — same hexes their design system uses.
 *
 * Chart colors below are NOT hand-picked: they were run through the dataviz
 * validator (OKLab CVD separation, lightness band, chroma floor, contrast vs.
 * the white card surface). Re-run it before changing any of them.
 */
export const brand = {
  name: "Formula Fitness",
  tagline: "Los Alamitos, CA",
  monogram: "FF",

  /** Official logo — white artwork, so it needs a dark tile behind it. */
  logoSrc: "/formula-fitness-logo.svg",

  /** Their brand blue. */
  primary: "#467ff7",
  primaryDark: "#2f6adf",
  primaryLight: "#6f9ffa",
  primarySoft: "#eff4ff",

  /** Their secondary — the navy the logo sits on. */
  navy: "#182340",
} as const;

/**
 * Categorical slots for the trend chart. Fixed order — assign in sequence,
 * never cycle, never reorder. Slot 1 is the brand blue; slots 2–5 come from the
 * validated default hues, because the Formula Fitness palette is single-hue and
 * cannot supply five distinguishable identities on its own.
 *
 * Validated (light, surface #ffffff): worst adjacent CVD ΔE 9.1, worst
 * normal-vision ΔE 19.6. Three slots sit below 3:1 contrast — the relief is the
 * always-present legend, direct end labels, and the breakdown table.
 */
export const SERIES_SLOTS = [
  "#467ff7", // 1 — brand blue
  "#eb6834", // 2 — orange
  "#1baf7a", // 3 — aqua
  "#eda100", // 4 — yellow
  "#e87ba4", // 5 — magenta
] as const;

/**
 * Ordinal ramp for the funnel — stage order is meaning, so it takes one hue in
 * monotone lightness steps rather than five identities. Every step is an
 * official Formula Fitness blue. Validated with --ordinal: monotone L, adjacent
 * ΔL ≥ 0.06, light end 2.62:1 on white.
 */
export const FUNNEL_RAMP = [
  "#6f9ffa",
  "#467ff7",
  "#2f6adf",
  "#2252c9",
] as const;

/** Chart chrome and ink. Every text value clears WCAG AA on white. */
export const viz = {
  surface: "#ffffff",
  canvas: "#f4f7fc",
  grid: "#eef2f7",
  axis: "#e2e8f0",
  /** Axis/tick labels — 4.57:1, AA for small text. */
  muted: "#71767f",
  /** De-emphasised bars in the emphasis chart. */
  recessive: "#9ba8c5",
  /** Meter track. */
  track: "#eaeff8",
  /** Delta cues — darkened from their #22c55e/#ef4444, which fail as text. */
  up: "#15803d", // 5.02:1
  down: "#b91c1c", // 6.47:1
} as const;
