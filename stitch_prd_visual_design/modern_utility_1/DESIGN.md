---
name: Modern Utility
colors:
  surface: '#f9f9fa'
  surface-dim: '#dadadb'
  surface-bright: '#f9f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeef'
  surface-container-high: '#e8e8e9'
  surface-container-highest: '#e2e2e3'
  on-surface: '#1a1c1d'
  on-surface-variant: '#434656'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004dea'
  primary: '#0041c8'
  on-primary: '#ffffff'
  primary-container: '#0055ff'
  on-primary-container: '#e3e6ff'
  inverse-primary: '#b6c4ff'
  secondary: '#5f5e5f'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfe0'
  on-secondary-container: '#636263'
  tertiary: '#972500'
  on-tertiary: '#ffffff'
  tertiary-container: '#c13301'
  on-tertiary-container: '#ffe1d9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b3'
  secondary-fixed: '#e5e2e3'
  secondary-fixed-dim: '#c8c6c7'
  on-secondary-fixed: '#1b1b1c'
  on-secondary-fixed-variant: '#474647'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb5a0'
  on-tertiary-fixed: '#3b0900'
  on-tertiary-fixed-variant: '#872100'
  background: '#f9f9fa'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e3'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  error-text:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  stack-xl: 48px
  auth-container-width: 400px
  gutter: 20px
---

## Brand & Style

The design system focuses on high-utility, low-friction interfaces with a "Modern Utility" aesthetic. It targets professional users who value efficiency and clarity. The style is a hybrid of **Minimalism** and **High-Contrast**, utilizing stark whites, deep blacks, and a singular functional accent color to drive user action.

The emotional response should be one of confidence and focus. By stripping away decorative shadows and complex gradients, the UI directs all attention toward the task at hand—specifically optimized for streamlined workflows like "email-only" authentication.

## Colors

This design system utilizes a high-contrast light mode palette.
- **Action Blue (Primary):** Used exclusively for primary actions and interactive states to signal "utility."
- **Deep Onyx (Secondary):** Used for typography and iconography to ensure maximum legibility.
- **Soft Slate (Neutral):** Provides subtle background differentiation for input fields and containers.
- **Signal Red (Error):** Reserved for validation states and critical alerts.

## Typography

The system uses **Hanken Grotesk** for headlines to provide a sharp, contemporary edge, while **Inter** is used for all functional text to maintain a systematic and utilitarian feel. Labels are consistently uppercase and bold to differentiate them from user input. Error states use a specific weight of Inter to ensure visibility without appearing aggressive.

## Layout & Spacing

For authentication screens, the design system employs a **Fixed Centered Layout**. The content is housed in a 400px container centered both vertically and horizontally on the viewport. 

The vertical rhythm follows a strict stacking scale:
- **4px/8px**: Space between labels, inputs, and error messages.
- **24px**: Space between different form fields.
- **48px**: Space between the headline and the start of the form.

## Elevation & Depth

This system avoids traditional ambient shadows in favor of **Low-contrast outlines** and **Tonal layers**.
- **Surface Level 0**: Pure white background (#FFFFFF).
- **Surface Level 1**: Subtle neutral backgrounds for input fields (#F4F4F5).
- **Interactive Level**: High-contrast borders (1px solid #1A1A1B) appear only on focus to indicate an active "Utility" state. 

Depth is communicated through stroke weight rather than blur, maintaining the crispness required for high-utility interfaces.

## Shapes

The shape language is **Soft** but disciplined. A 0.25rem (4px) corner radius is applied to buttons and input fields. This slight rounding prevents the UI from feeling "hostile" or overly "Brutalist" while maintaining a professional, structured appearance. Larger containers like the auth card may use `rounded-lg` (8px) for a subtle containment feel.

## Components

### Input Fields
- **Container**: Light neutral background (#F4F4F5) with a 1px stroke.
- **Default State**: Stroke is transparent or ultra-light gray.
- **Focus State**: Stroke becomes 2px Action Blue (#0055FF) with no shadow.
- **Error State**: Stroke becomes 2px Signal Red (#D91010). The error text appears immediately below the input in the same color.
- **Labels**: Positioned above the field, using `label-bold` tokens in Deep Onyx.

### Buttons
- **Primary (Action Blue)**: Solid #0055FF fill with white text. High-contrast and center-aligned.
- **State Changes**: On hover, the blue darkens slightly; on active/click, the button scales down to 98%.
- **Loading State**: The text is replaced by a simple, high-contrast spinner; the button remains Action Blue but at 70% opacity.

### Auth Card
- A centered container with minimal padding (32px or 40px). 
- No heavy shadows; use a 1px subtle border to define the card against the background if necessary, or rely on whitespace for a "borderless" minimal look.

### Micro-Components
- **Success Toast**: Used after the "email-only" link is sent. A flat, solid Deep Onyx bar with white text, positioned at the bottom center.