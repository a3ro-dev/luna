---
color:
  background:
    default: "#FFF9F9"
    muted: "#FCFBFB"
  surface:
    default: "rgba(255,255,255,0.60)"
    elevated: "rgba(255,255,255,0.80)"
  text:
    primary: "#6D5A60"
    secondary: "#8E7D82"
    faint: "rgba(142,125,130,0.50)"
  accent:
    primary: "#FFB5C0"
    primarySoft: "#FFDDE0"
    honey: "#FBE6B6"
    lavender: "#D6CBE3"
  borders:
    subtle: "rgba(255,221,224,0.40)"
  state:
    focusRing: "rgba(255,181,192,0.30)"
  consistency:
    high: "#34d399"
    moderate: "#fcd34d"
    varied: "#FFB5C0"

typography:
  fonts:
    sans: "System SF stack: -apple-system, BlinkMacSystemFont, SF Pro Text (UI); SF Pro Display for titles"
    serif: "ui-serif (Apple New York), falling back to Instrument Serif; wordmark and display moments only"
  scale:
    xs: "0.625rem"
    sm: "0.75rem"
    base: "0.95rem"
    lg: "1.125rem"
    xl: "1.5rem"
    display: "2.5rem"
  weight:
    light: 300
    normal: 400
    semibold: 600
  letterSpacing:
    wide: "0.25em"
  lineHeight:
    snug: 1.25
    relaxed: 1.6
  features:
    tabularNums: "font-variant-numeric: tabular-nums"

spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  xxl: "3rem"
  section: "4rem"

radii:
  pill: "999px"
  lg: "1.5rem"
  xl: "2.5rem"
  card: "1.5rem"
  phone: "3rem"

shadows:
  soft: "0 4px 12px rgba(255,181,192,0.06)"
  card: "0 20px 40px rgba(255,181,192,0.06)"
  cardHover: "0 24px 48px rgba(255,181,192,0.10)"
  float: "0 30px 60px rgba(255,181,192,0.12)"
  hero: "0 40px 100px rgba(255,181,192,0.20)"
  button: "0 12px 24px rgba(109,90,96,0.20)"
  buttonHover: "0 14px 28px rgba(109,90,96,0.25)"

elevation:
  backgroundBlur: "backdrop-blur-xl"
  glassOpacity: 0.6

motion:
  enter:
    opacity: [0, 1]
    translateY: [12, 0]
    blur: ["6px", "0px"]
    spring:
      type: spring
      duration: 0.45
      bounce: 0
  exit:
    opacity: [1, 0]
    translateY: [0, -8]
    blur: ["0px", "4px"]
    note: "Exits are subtler than enters. Smaller y offset, less blur. The user's focus is moving to what comes next, not what's leaving."
  stagger:
    children: 0.06
    cards: 0.08
    rows: 0.04
  hover:
    lift: "-2px"
    shadowIncrease: true
    duration: 200ms
    easing: ease-out
  active:
    pressScale: "0.98"
    duration: 100ms
  transitions:
    base: "all 200ms ease-out"
    gentle: "all 500ms ease"
    progress: "0.6s cubic-bezier(0.22, 1, 0.36, 1)"
  easing:
    default: "ease-out"
    spring: "[0.22, 1, 0.36, 1]"
  reducedMotion:
    strategy: "opacity-only fade (no y, no blur), disable CSS animations"
    note: "Every animated component checks useReducedMotion() and falls back gracefully"

layout:
  maxWidth:
    content: "64rem"
    settings: "48rem"
  grid:
    gap: "1.25rem"

components:
  cards:
    radius: "rounded-3xl"
    border: "border border-white/60"
    background: "bg-white/50"
    shadow: "shadow-[0_20px_40px_rgba(255,181,192,0.06)]"
    hover: "translateY(-2px) + shadow increase, 200ms ease-out"
    active: "translateY(0) + shadow decrease, 100ms"
    willChange: "will-change-transform on interactive cards"
  buttons:
    primary:
      background: "bg-[#6D5A60]"
      text: "text-white"
      radius: "rounded-full"
      shadow: "shadow-[0_12px_24px_rgba(109,90,96,0.2)]"
      hover: "bg-[#8E7D82]"
      active: "shadow decrease"
    outline:
      border: "border border-[#FFDDE0]/60"
      text: "text-[#6D5A60]"
      hover: "bg-[#FFF5F7]"
    size:
      label: "text-[10px] font-semibold uppercase tracking-widest"
      height: "h-12"
  inputs:
    background: "bg-[#FFF9F9]"
    border: "border border-[#FFDDE0]/40"
    radius: "rounded-2xl"
    focus: "ring-2 ring-[#FFB5C0]/30 border-[#FFB5C0]/50"
  nav:
    style: "pill-shaped rounded-full links"
    active: "bg-[#6D5A60] text-white (current page)"
    inactive: "border border-[#FFDDE0]/60 text-[#6D5A60] hover:bg-[#FFF5F7]"
    hover: "150ms ease-out, subtle shadow increase"
  toggle:
    track: "h-7 w-12 rounded-full"
    on: "bg-[#D6CBE3]"
    off: "bg-[#FFDDE0]/60"
    thumb: "h-6 w-6 rounded-full bg-white shadow-sm, translate-x-[20px] when on, 200ms transition"
  labels:
    style: "text-[10px] font-semibold uppercase tracking-widest"
    color: "text-[#FFB5C0] (primary), text-[#D6CBE3] (secondary), text-[#FBE6B6] (tertiary)"
  emptyStates:
    note: "Every empty state needs: what will appear here, why it matters, how to get started, visual interest. No blank space."
  consistencyIndicator:
    high: "emerald dot + bar"
    moderate: "amber dot + bar"
    varied: "rose dot + bar"

bans:
  - "Side-stripe borders (border-left/right > 1px as colored accent)"
  - "Gradient text (background-clip: text with gradient)"
  - "Glassmorphism as decoration (translucent .material is reserved for bars, sheets and overlays that float over scrolling content, as on iOS)"
  - "Hero-metric template (big number, small label, gradient)"
  - "Identical card grids (same-sized cards repeated endlessly)"
  - "Modal as first thought (exhaust inline alternatives first)"
  - "Decorative motion that doesn't convey state"
  - "Display fonts in UI labels, buttons, or data"
  - "Generic emojis as UI elements (the sparkle orb is the only brand emoji)"
  - "Ad hoc animation timings (use the presets in src/lib/motion.ts: smooth, snappy, bouncy; bouncy only for moments of delight)"
---

# Design overview

## Direction: Apple-grade calm (September 2026)

Luna should feel like a first-party Apple app: intentionally premium, soothing and quiet. Concretely:

- **Type.** The platform's own UI face (SF Pro on Apple devices) for everything functional. Large titles are SF Pro Display, bold, tight tracking (34px, -0.026em), collapsing into a compact translucent bar on scroll (`src/components/apple/LargeTitle.tsx`). Apple's New York serif (`font-serif`) is kept for the Luna wordmark and a few emotional display moments.
- **Surfaces.** Inset grouped lists (`GroupedSection` / `GroupedRow`) on a tinted background, like Settings and Health: rounded surfaces, hairline separators inset to the label, 44px rows, chevrons for navigation. Cards use the soft `--shadow-card` instead of borders.
- **Materials.** Bars, sheets and overlays that float over content use `.material` (translucent, saturate + blur). It turns solid when the user enables Reduce Transparency.
- **Colour.** Each plan keeps its hue; `--tint` is the plan's iOS tint colour for links, selected states and primary text accents. `--label-secondary` and `--label-tertiary` give a subtle hierarchy that still meets 4.5:1.
- **Controls.** Segmented controls (`Segmented`) for mode switches, bottom sheets (`Sheet`) for short focused tasks on phones, and an iOS tab bar with filled-when-selected icons.
- **Motion.** Springs only, from `src/lib/motion.ts`: `smooth` for most state changes, `snappy` for small feedback, `bouncy` only for moments of delight such as a logged period. Product surfaces do not choreograph page loads; the landing page may.
- **Night.** A soft dark mode, never black: each plan has a night palette (Free deep plum, Premium indigo, Premium+ espresso) with pastel accents, and grouped cells a step lighter than the page. It follows the device by default; Settings and the front page offer System / Light / Dark (`src/lib/theme/mode.ts`, stored locally, applied before first paint). App pages go dark through the `.tier-app` tokens under `html.dark`; the landing and legal pages through their `--landing-*` block. Every colour is a token; `src/lib/theme/__tests__/contrast.test.ts` holds every text token to 4.5:1 on bg, surface and tint in both modes. Cards trade drop shadows for a faint top highlight at night.

The sections below describe the earlier soft-glass language. Where they conflict with this direction, this direction wins.

Luna is soft, airy, and calming. The UI leans into blush and warm neutrals with gentle contrast -- never harsh white or black. Surfaces feel like frosted glass on a pale background, with subtle shadows and large rounded corners. Typography is delicate but readable: a serif display for emotion, a light sans-serif for body.

The interface is spacious. Slow, gentle rhythm in spacing and hierarchy. The palette is mostly muted pinks and dusty mauves, with honey and lavender as soft accent highlights. Shadows are light and diffused. They add depth without heaviness.

Buttons and inputs are rounded and tactile. The overall tone is caring and supportive, with copy that feels human and warm. The product should feel like a quiet personal space, not a dashboard.

## Motion philosophy

Motion conveys state, not decoration. Every animation answers "what changed?" rather than "look at this." Jakub Krehel got this right: the best animation goes unnoticed. If users comment on the animation itself, it's too much.

Enter animations use opacity + translateY + blur for a materializing effect. Exit animations are always subtler than enters. Spring transitions with bounce: 0 for a professional feel. Staggered children create natural reading rhythm. Hover lifts and active presses give tactile feedback without being playful.

The breathing animation on today's calendar cell and the shimmer on the "Ask Luna" button are the only decorative motions, and they earn their place: drawing attention to the current day and the primary action.

Reduced motion is not an afterthought. Every animated component checks `prefers-reduced-motion` and falls back to opacity-only transitions with CSS animations disabled.

## Color strategy

Restrained. One accent (rose #FFB5C0) for labels, state indicators, and primary actions only. Honey and lavender support secondary categories (ovulation, follicular phase). Mauve (#6D5A60) carries buttons and headings. Neutral tint goes toward the brand hue, never pure gray.

## Plan layouts

Free uses blush neutrals and puts the calendar first. Premium uses a lavender tint, a dashboard navigation rail, a persistent chat-session rail, and settings section links. Premium+ uses warm parchment and honey, with a split dashboard, a cycle-context panel beside chat on wide screens, and two-column settings. On small screens, supporting panels stack or move behind an explicit control. All three layouts expose the same cycle records, forecasts, chat tools, and settings.

Plan color tokens live in `.tier-app` in `src/app/globals.css`. Shared controls use those tokens so focus, text contrast, and active states remain consistent within each layout. Estimated calendar dates retain dashed outlines in every palette to distinguish them from logged dates. Reduced-motion preferences suppress repeated animation and preserve content order.

## Typography

System SF Pro for UI, labels, buttons and data; SF Pro Display for large titles. Serif (Apple New York via ui-serif, Instrument Serif as fallback) for the wordmark and emotional display moments only. One family per role, no mixing within a single element. Scale ratio is tight (1.125-1.2) for product UI consistency. Tabular nums for any numerical data that aligns.

## Shadows over borders

In light mode, prefer multi-layer box-shadows over solid borders where surfaces overlap varied backgrounds. Borders work for cards on cream backgrounds and in dark mode. Shadows transition smoothly on hover; borders don't.
