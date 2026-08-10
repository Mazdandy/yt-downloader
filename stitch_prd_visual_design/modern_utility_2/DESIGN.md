---
name: Modern Utility
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#00628d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007cb1'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  youtube-red: '#ff0000'
  tiktok-magenta: '#ff0050'
  tiktok-cyan: '#00f2ea'
  instagram-gradient-start: '#405de6'
  instagram-gradient-end: '#c13584'
  success-green: '#22c55e'
  error-red: '#ef4444'
  warning-amber: '#f59e0b'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target-min: 48px
  container-margin: 1rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style

The design system is built on the **Modern Utility** movement—a fusion of **Corporate Modern** reliability and **Minimalist** efficiency. It is designed for high-velocity interactions where the interface recedes to prioritize user content and technical performance.

### Brand Personality
- **Fast:** Zero-friction workflows and immediate visual feedback.
- **Reliable:** Robust UI patterns that feel unbreakable and predictable.
- **Trustworthy:** A clean, professional aesthetic that avoids the "cluttered" look of traditional downloader tools.

### Visual Style
The system utilizes a high-contrast, light-mode default palette to ensure maximum legibility under various lighting conditions. It employs subtle elevation for depth and large, intentional touch targets to accommodate mobile-first usage. Brand identity is reinforced through the "Vibrant Indigo" primary color, while secondary actions utilize a grounded "Slate Gray."

## Colors

The color strategy uses **Vibrant Indigo** for all primary conversion points and active states. **Slate Gray** is reserved for utility controls, secondary navigation, and borders.

### Platform Accents
To provide instant recognition without overwhelming the "Modern Utility" aesthetic, platform-specific colors (YouTube Red, TikTok Cyan/Magenta) are used only as **micro-accents** (e.g., a 2px top-border on a card, or a small icon glyph).

### Semantic States
- **Fetching:** Uses a pulsing Tertiary Blue.
- **Downloading:** Uses a Primary Indigo progress bar.
- **Success:** Transition to Success Green with a haptic-like visual pop.
- **Error:** Uses Error Red with clear, high-contrast text for recovery instructions.

## Typography

The typography system relies on **Inter** to deliver a neutral, highly legible experience. 

### Hierarchy & Readability
- **High Contrast:** All primary text uses a near-black slate (#0f172a) on white backgrounds to ensure accessibility.
- **Tight Leading:** Headlines use tighter line spacing and negative letter-spacing for a "sturdy" feel.
- **Functional Labels:** Use `label-md` for buttons and quality selectors to ensure text remains clear even at small sizes.

## Layout & Spacing

This design system uses a **Fluid Grid** model optimized for mobile-first constraints. 

### Spacing Principles
- **Touch-First:** A minimum tap target of 48px is strictly enforced for all interactive elements, particularly the URL input and quality selection chips.
- **The 8px Square:** All spacing and margins are derived from an 8px base unit.
- **Safe Zones:** Content is inset by a 1rem (16px) margin on mobile to prevent edge-clashing on modern curved displays.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and subtle **Ambient Shadows**.

- **Level 0 (Surface):** Light gray background (#f8fafc) for the app body.
- **Level 1 (Card):** White background (#ffffff) with a soft, 4% opacity shadow for primary content blocks (e.g., Video Preview).
- **Level 2 (Active/Modal):** White background with a 12% opacity shadow and 16px blur to indicate focus or quality selection overlays.
- **Low-Contrast Outlines:** Buttons and inputs use a 1px border (#e2e8f0) to define boundaries without adding visual weight.

## Shapes

The shape language is **Rounded**, reflecting a modern, approachable tool while maintaining professional structure.

- **Primary Elements:** Buttons and Input fields use a 0.5rem (8px) corner radius.
- **Selection Chips:** Use a full "Pill" radius for quality selection to distinguish them from action buttons.
- **Containers:** Large cards and modals use 1rem (16px) for a softer, more integrated look.

## Components

### URL Input
Large, centered text field with a 1px border that thickens and changes to Primary Indigo on focus. Includes a "Paste" button inside the trailing edge of the field for one-tap utility.

### Action Buttons
Primary buttons use a solid Indigo background with white text. Secondary buttons use a Slate Gray outline. All buttons maintain a 48px height.

### Quality Selection Chips
Radio-style chips arranged in a horizontal scroll or grid. Each chip displays the resolution (e.g., "1080p") and the estimated file size (e.g., "42 MB") in a smaller `label-sm` font.

### Progress Bars
A continuous 8px track with a Primary Indigo fill. During "Fetching," the track shows a CSS shimmer/pulse effect. During "Downloading," it shows a percentage-based linear fill.

### Status Indicators
- **Fetching:** Circular spinner + "Analyzing URL..." text.
- **Downloading:** Progress bar + speed (MB/s) + "Remaining Time."
- **Success:** Large checkmark icon + "Save to Gallery" CTA.