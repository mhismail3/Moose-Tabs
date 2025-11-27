# Portfolio Site Styling Guide

A comprehensive reference for the design system powering mohsinismail.com. This guide enables any developer or AI agent to understand, replicate, and extend the site's visual language.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Shadows & Borders](#shadows--borders)
6. [Border Radii](#border-radii)
7. [Interactive States](#interactive-states)
8. [Animation & Transitions](#animation--transitions)
9. [Component Patterns](#component-patterns)
10. [Responsive Design](#responsive-design)
11. [Z-Index Scale](#z-index-scale)
12. [File Structure](#file-structure)

---

## Design Philosophy

The site employs a **warm retro-modern aesthetic** characterized by:

- **Warm cream backgrounds** instead of stark whites
- **Solid "retro" shadows** that give depth without blur
- **Crisp borders** with visible ink-colored strokes
- **Serif typography** for an editorial, thoughtful feel
- **Subtle glassmorphism** on floating elements (header, panels)
- **Tactile interactions** - buttons "press in" when clicked

The overall mood is: **sophisticated, personal, slightly nostalgic, but modern**.

---

## Color System

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--cream` | `#f8f3e8` | Page background, warm base |
| `--ink` | `#1f1a14` | Primary text, borders, shadows |
| `--line` | `#e2d7c8` | Subtle borders, dividers |
| `--muted` | `#5b5249` | Secondary text, metadata |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--aero` | `#2c8f7a` | Links, primary accent |
| `--pine` | `#0f7363` | Hover states, active states |
| `--clay` | `#c45b37` | Warnings, reset buttons, focus rings |

### Background Variants

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-white` | `#ffffff` | Button backgrounds, cards |
| `--bg-card` | `#fffefb` | Card interiors, slightly warm white |
| `--panel-bg` | `linear-gradient(120deg, rgba(255,255,255,0.78), rgba(255,255,255,0.94))` | Panel containers |

### Semantic Color Applications

```css
/* Links */
a { color: var(--aero); }
a:hover { color: var(--pine); }

/* Active/Selected state */
.active {
  background: #e0f2f1;
  border-color: var(--pine);
  color: var(--pine);
}

/* Reset/Destructive */
.reset {
  background: #fbe9e7;
  border-color: var(--clay);
  color: var(--clay);
}

/* Text selection */
::selection {
  background: #dfeeea;
  color: var(--ink);
}
```

---

## Typography

### Font Families

| Token | Stack | Usage |
|-------|-------|-------|
| `--font-display` | `'DM Serif Display', serif` | Headings, brand name |
| `--font-body` | `'Newsreader', serif` | Body text, UI elements |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace` | Code blocks |

### Font Size Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | `0.68rem` | Code labels, tiny metadata |
| `--text-sm` | `0.78rem` | Eyebrows, small labels |
| `--text-base` | `0.95rem` | Small button text, tags |
| `--text-md` | `1rem` | Default button text |
| `--text-lg` | `1.1rem` | Emphasized body text |
| `--text-xl` | `1.3rem` | Small headings |
| `--text-2xl` | `1.5rem` | Section headings |
| `--text-3xl` | `clamp(2rem, 5vw, 2.8rem)` | Page titles |
| `--text-4xl` | `clamp(2.4rem, 6vw, 3.4rem)` | Hero titles |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--leading-tight` | `1.1` | Large headings |
| `--leading-snug` | `1.3` | Subheadings, card titles |
| `--leading-normal` | `1.45` | Default text |
| `--leading-relaxed` | `1.6` | Body text (default) |
| `--leading-loose` | `1.65` | Long-form content |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--tracking-tight` | `0.01em` | Headings |
| `--tracking-normal` | `0` | Body text |
| `--tracking-wide` | `0.08em` | Button text |
| `--tracking-wider` | `0.16em` | Eyebrow labels (uppercase) |

### Typography Patterns

```css
/* Headings */
h1, h2, h3, h4 {
  font-family: var(--font-display);
  color: var(--ink);
  margin: 0 0 0.35em;
  letter-spacing: var(--tracking-tight);
}

/* Eyebrow (section label) */
.eyebrow {
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--muted);
}

/* Muted secondary text */
.muted {
  color: var(--muted);
}
```

---

## Spacing & Layout

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-2xs` | `4px` | Minimal spacing |
| `--space-xs` | `6px` | Icon gaps, tight spacing |
| `--space-sm` | `8px` | Button icon gaps |
| `--space-md` | `10px` | Small component gaps |
| `--space-base` | `12px` | Default gap size |
| `--space-lg` | `14px` | Card internal spacing |
| `--space-xl` | `16px` | Section spacing |
| `--space-2xl` | `18px` | Frame gaps (mobile) |
| `--space-3xl` | `22px` | Frame gaps (desktop) |
| `--space-4xl` | `28px` | Large section gaps |

### Layout Constants

| Token | Value | Usage |
|-------|-------|-------|
| `--max-width-content` | `860px` | Content container max-width |
| `--header-height-mobile` | `95px` | Space below fixed header (mobile) |
| `--header-height-desktop` | `105px` | Space below fixed header (desktop) |

### Container Structure

```css
/* Main app container */
.app {
  padding: 18px 14px 64px;  /* mobile */
  padding: 28px 28px 72px;  /* desktop (840px+) */
}

/* Content frame */
.frame {
  max-width: var(--max-width-content);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);    /* mobile */
  gap: var(--space-3xl);    /* desktop */
}
```

---

## Shadows & Borders

### Shadow System

The site uses **solid, offset shadows** (no blur) for a retro/tactile feel:

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-retro-sm` | `2px 2px 0px var(--ink)` | **Standard** for buttons, cards, inputs |
| `--shadow-retro` | `4px 4px 0px var(--ink)` | Reserved (larger variant) |
| `--shadow-retro-lg` | `5px 5px 0px var(--ink)` | Brand mark |
| `--shadow-soft` | `0 12px 30px rgba(31, 26, 20, 0.08)` | Header, floating elements |
| `--shadow-soft-lg` | `0 20px 50px rgba(31, 26, 20, 0.08)` | Panels |
| `--shadow-hover` | `5px 11px 10px rgba(31, 26, 20, 0.7)` | Project cards on hover |

### Shadow Interaction Pattern

```css
/* Standard button shadow behavior */
.btn {
  box-shadow: var(--shadow-retro-sm);  /* 2px 2px */
}
.btn:hover {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px var(--ink);
}
.btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;  /* Fully pressed */
}
```

### Border Style

```css
--border-retro: 1.5px solid var(--ink);
```

Use `--border-retro` for:
- Buttons
- Cards
- Input fields
- Code blocks
- Image containers

---

## Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Buttons, tags, small cards |
| `--radius-md` | `14px` | Dropdown menus, medium elements |
| `--radius-lg` | `22px` | Panels, large containers |
| `--radius-full` | `999px` | Circular elements, pill badges |

---

## Interactive States

### Button States

```css
/* Default state */
.btn {
  background: var(--bg-white);
  border: var(--border-retro);
  box-shadow: var(--shadow-retro-sm);
}

/* Hover - shadow shrinks, element shifts */
.btn:hover {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px var(--ink);
}

/* Active/Pressed - fully depressed */
.btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

/* Disabled */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* Focus (keyboard navigation) */
.btn:focus-visible {
  outline: 2px dashed var(--clay);
  outline-offset: 4px;
}

/* Active/Selected state (toggle on) */
.btn.active {
  background: #e0f2f1;
  border-color: var(--pine);
  color: var(--pine);
}
```

### Link States

```css
a {
  color: var(--aero);
  text-decoration: none;
}

a:hover {
  color: var(--pine);
}

/* Directional link (e.g., "View all →") */
.see-all-link:hover {
  color: var(--aero);
  transform: translateX(4px);
}

/* Back link */
.back-link:hover {
  color: var(--aero);
  transform: translateX(-4px);
}
```

### Touch Hover (Mobile)

For touch devices, use the `touch-hover` class to simulate hover effects on hold:

```css
/* Apply via JavaScript on touchstart with delay */
.project-card.touch-hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-hover);
}
```

---

## Animation & Transitions

### Timing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | General transitions |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful, springy animations |
| `--ease-snap` | `cubic-bezier(0.4, 0, 0.2, 1)` | Quick, snappy interactions |

### Duration Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `0.1s` | Button press, micro-interactions |
| `--duration-normal` | `0.2s` | Default transitions |
| `--duration-slow` | `0.3s` | Panel animations |
| `--duration-slower` | `0.4s` | Complex animations |

### Standard Transition Patterns

```css
/* Button/Interactive element */
transition: transform var(--duration-fast) ease,
            box-shadow var(--duration-fast) ease,
            background-color var(--duration-fast) ease;

/* Menu item stagger animation */
.btn:nth-child(1) { --btn-stagger: 30ms; }
.btn:nth-child(2) { --btn-stagger: 75ms; }
.btn:nth-child(3) { --btn-stagger: 120ms; }
transition-delay: var(--btn-stagger, 0ms);

/* Carousel items */
transition: transform 0.42s var(--ease-out),
            box-shadow 0.42s var(--ease-out);

/* Toast notification */
animation: toast-pop var(--duration-slower) var(--ease-bounce) forwards,
           toast-fade 0.32s ease forwards 1.5s;
```

### Animation Keyframes

```css
/* Toast popup */
@keyframes toast-pop {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(8px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* Lightbox entrance */
@keyframes lightbox-popIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Copy confirmation checkmark */
@keyframes code-checkPop {
  0% {
    transform: scale(0.5) rotate(-10deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.15) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}
```

---

## Component Patterns

### Button (`.btn`)

Standard action button with solid shadow.

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 0.65rem 1rem 0.55rem;  /* Asymmetric for optical balance */
  border: var(--border-retro);
  border-radius: var(--radius-sm);
  background: var(--bg-white);
  box-shadow: var(--shadow-retro-sm);
  font-weight: 600;
  font-size: var(--text-md);
  line-height: 1.0;
}

/* Size: small */
.btn.small {
  padding: 0.45rem 0.8rem 0.35rem;
  font-size: var(--text-base);
}

/* Variants: outline (default), primary, ghost */
```

### Pill (`.pill`)

Tag-style buttons for filters and labels.

```css
.pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0.38rem 0.68rem 0.28rem;
  border: var(--border-retro);
  border-radius: var(--radius-sm);
  background: var(--bg-white);
  box-shadow: 2px 2px 0px rgba(31, 26, 20, 0.15);  /* Lighter shadow */
  font-weight: 600;
  font-size: 0.82rem;
}

/* Variants: active, reset, disabled, icon-btn, project-link-pill */
```

### Panel (`.panel`)

Main content container with glassmorphism.

```css
.panel {
  background: var(--panel-bg);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 1.4rem 1.35rem;
  box-shadow: var(--shadow-soft-lg);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

/* Decorative inner border (dashed) */
.panel::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px dashed rgba(31, 26, 20, 0.04);
  border-radius: calc(var(--radius-lg) - 8px);
  pointer-events: none;
}
```

### Card (`.post-card`, `.project-card`)

Content cards with shadow and hover lift.

```css
.post-card {
  border: 1.5px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 1rem 1.1rem;
  background: var(--bg-card);
  box-shadow: 0 10px 24px rgba(31, 26, 20, 0.08);
}

.project-card {
  border: var(--border-retro);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  box-shadow: var(--shadow-retro-sm);
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-hover);
}
```

### Header (`.top-bar`)

Fixed navigation with glassmorphism.

```css
.top-bar {
  position: fixed;
  top: 18px;
  left: 14px;
  right: 14px;
  max-width: var(--max-width-content);
  margin: 0 auto;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(6px);
  z-index: var(--z-fixed);
}
```

### Carousel (`.carousel-container`)

Horizontal scrolling gallery with active item highlighting.

```css
.carousel-track {
  display: flex;
  gap: var(--space-xl);
  overflow-x: auto;
  scroll-behavior: auto;
  padding: 20px 5vw;
  scrollbar-width: none;
  mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
}

.carousel-item {
  flex: 0 0 auto;
  height: 320px;
  border: var(--border-retro);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-retro-sm);
}

.carousel-item.is-active {
  transform: translateY(-8px) scale(1.01);
  box-shadow: 4px 6px 0px var(--ink);
}
```

### Lightbox (`.lightbox-overlay`)

Full-screen image modal.

```css
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
}

.lightbox-content {
  border: 2px solid var(--ink);
  border-radius: var(--radius-sm);
  background: var(--bg-white);
  padding: var(--space-sm);
  box-shadow: 8px 8px 0px var(--ink);  /* Larger for emphasis */
}

.lightbox-close {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--clay);
  color: var(--bg-white);
  border: 2px solid var(--ink);
  box-shadow: var(--shadow-retro-sm);
}
```

### Toast (`.toast`)

Notification popup.

```css
.toast {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-white);
  border: var(--border-retro);
  padding: 0.34rem 0.72rem 0.26rem;
  border-radius: var(--radius-sm);
  font-size: 0.77rem;
  font-weight: 600;
  box-shadow: 2px 2px 0 rgba(31, 26, 20, 0.15);
  z-index: var(--z-dropdown);
}
```

### Code Block (`.code-block`)

Syntax-highlighted code container.

```css
.code-block {
  border: var(--border-retro);
  border-radius: var(--radius-sm);
  background: var(--bg-white);
  box-shadow: var(--shadow-retro-sm);
  overflow: hidden;
  font-family: var(--font-mono);
}

.code-block-header {
  padding: 6px 10px;
  background: #faf8f5;
  border-bottom: 1px solid var(--line);
}

.code-block-content pre {
  padding: var(--space-xl);
  background: var(--bg-card);
  font-size: 0.82rem;
  line-height: var(--leading-relaxed);
}
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Usage |
|------------|-------|
| `840px` | Desktop/tablet switch (primary) |
| `720px` | Carousel item size reduction |
| `640px` | Small mobile adjustments |
| `380px` | Extra-small mobile (pagination, header) |
| `340px` | Tiny screens |

### Common Responsive Patterns

```css
/* Mobile-first, then desktop */
.app {
  padding: 18px 14px 64px;
}
@media (min-width: 840px) {
  .app {
    padding: 28px 28px 72px;
  }
}

/* Panel padding */
.panel {
  padding: 1.4rem 1.35rem;
}
@media (min-width: 840px) {
  .panel { padding: 1.8rem 1.6rem; }
}
@media (max-width: 640px) {
  .panel { padding: 1.2rem 1.05rem; }
}

/* Portfolio grid columns */
/* JS-controlled: 3 cols > 1080px, 2 cols 720-1080px, 1 col < 720px */

/* Touch-specific scroll snapping */
@media (max-width: 720px) and (hover: none) {
  .carousel-track {
    scroll-snap-type: x mandatory;
  }
  .carousel-item {
    scroll-snap-align: center;
  }
}
```

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | `1` | Default stacking |
| `--z-dropdown` | `10` | Dropdown menus, toasts |
| `--z-sticky` | `20` | Sticky elements |
| `--z-fixed` | `100` | Fixed header |
| `--z-modal` | `1000` | Lightbox overlays |

---

## File Structure

```
src/styles/
├── index.css              # Imports all modules
├── tokens.css             # Design tokens (CSS variables)
├── base.css               # Reset, typography, global styles
├── components/
│   ├── button.css         # .btn variants
│   ├── pill.css           # .pill variants
│   ├── panel.css          # .panel containers
│   ├── header.css         # .top-bar navigation
│   ├── carousel.css       # Image carousel
│   ├── lightbox.css       # Modal overlay
│   ├── code-block.css     # Code display
│   ├── toast.css          # Notifications
│   └── post-card.css      # Blog post cards
└── pages/
    ├── blog.css           # Blog page specifics
    ├── portfolio.css      # Portfolio grid
    ├── project.css        # Project detail page
    └── about.css          # About page
```

---

## Quick Reference Cheatsheet

### Creating a New Button
```jsx
<button className="btn outline small">Label</button>
```

### Creating a Tag/Pill
```jsx
<button className="pill small active">#{tag}</button>
```

### Creating a Panel Section
```jsx
<section className="panel">
  <div className="panel-head">
    <div className="eyebrow">Section Label</div>
    <a className="see-all-link">View all →</a>
  </div>
  {/* content */}
</section>
```

### Creating a Project Card
```jsx
<Link className="project-card">
  <div className="project-media">
    <img src={cover} alt={title} />
    <div className="project-pill">
      <span className="pill-label">{title}</span>
    </div>
  </div>
</Link>
```

### Key Visual Rules

1. **Shadows are solid** - Use `--shadow-retro-sm` (2px 2px 0px), never blurred shadows on interactive elements
2. **Borders are visible** - Always `--border-retro` (1.5px solid ink) on cards and buttons
3. **Press interactions** - Elements translate + shadow shrinks on hover, fully pressed on active
4. **Warm palette** - Never use pure white backgrounds; use `--cream`, `--bg-card`, or `--bg-white`
5. **Serif fonts** - Headlines use `--font-display`, body uses `--font-body`
6. **Focus is dashed** - Keyboard focus uses `2px dashed var(--clay)` outline
7. **Active state is teal** - Selected items use `#e0f2f1` background with `--pine` border/text

---

*Last updated: November 2025*
