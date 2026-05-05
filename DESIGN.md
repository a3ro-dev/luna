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
    serif: "Instrument Serif"
    sans: "DM Sans"
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
  - "Glassmorphism as default decoration"
  - "Hero-metric template (big number, small label, gradient)"
  - "Identical card grids (same-sized cards repeated endlessly)"
  - "Modal as first thought (exhaust inline alternatives first)"
  - "Decorative motion that doesn't convey state"
  - "Display fonts in UI labels, buttons, or data"
  - "Generic emojis as UI elements (the ✨ orb is the only brand emoji)"
  - "Bounce animations in product UI (bounce: 0 always)"
---

# Design Overview

Luna is soft, airy, and calming. The UI leans into blush and warm neutrals with gentle contrast, never harsh white or black. Surfaces feel like frosted glass on a pale background, with subtle shadows and large rounded corners. Typography is delicate but readable, with a serif display for emotion and a light sans-serif for body.

The interface is spacious with slow, gentle rhythm in spacing and hierarchy. The palette is primarily muted pinks and dusty mauves, with honey and lavender used as soft accent highlights. Shadows are light and diffused, creating depth without heaviness.

Buttons and inputs are rounded and tactile. The overall tone is caring and supportive, with copy that feels human and warm. The product should feel like a quiet, beautiful personal space rather than a dashboard.

## Motion Philosophy

Motion conveys state, not decoration. Every animation answers the question "what changed?" not "look at this." Inspired by Jakub Krehel's production polish: the best animation goes unnoticed. If users comment on the animation itself, it's too much.

Enter animations use opacity + translateY + blur to create a "materializing" effect. Exit animations are always subtler than enters. Spring transitions with bounce: 0 for professional feel. Staggered children create natural reading rhythm. Hover lifts and active presses provide tactile feedback without being playful.

The breathing animation on today's calendar cell and the shimmer on the "Ask Luna" button are the only decorative motions, and they serve a purpose: drawing attention to the current day and the primary action.

Reduced motion is not an afterthought. Every animated component checks `prefers-reduced-motion` and falls back to opacity-only transitions with CSS animations disabled.

## Color Strategy

Restrained. One accent (rose #FFB5C0) used for labels, state indicators, and primary actions only. Honey and lavender are supporting accents for secondary categories (ovulation, follicular phase). The mauve (#6D5A60) carries buttons and headings. Neutral tint is toward the brand hue, never pure gray.

## Typography

Serif (Instrument Serif) for headings and emotional moments. Sans (DM Sans) for body, labels, buttons, and data. One family per role, no mixing within a single element. Scale ratio is tight (1.125-1.2) for product UI consistency. Tabular nums for any numerical data that aligns.

## Shadows over Borders

In light mode, prefer multi-layer box-shadows over solid borders where surfaces overlap varied backgrounds. Borders are acceptable for cards on cream backgrounds and in dark mode. Shadows transition smoothly on hover; borders don't.
