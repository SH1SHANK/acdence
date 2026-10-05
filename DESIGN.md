# DESIGN.md — Acdence Design System

> **Acdence** is a focused, dark-mode-only academic command center. Every design decision prioritises clarity, information density, and calm productivity over visual novelty.

---

## 1. Design Philosophy & Aesthetic Goals

### Core Principles

| Principle                       | Intent                                                                                                                 |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| **Information over decoration** | Every pixel earns its place. No gradients, no shadows for show, no decorative borders.                                 |
| **Calm urgency**                | Deadlines and cutoffs demand attention without triggering anxiety. Color signals importance; layout signals hierarchy. |
| **Premium restraint**           | Dark surfaces, muted chrome, one accent colour. The interface recedes so academic content comes forward.               |
| **Spatial consistency**         | A tight, predictable spacing scale keeps every section readable at a glance.                                           |
| **Instant orientation**         | A user must know their current week, next deadline, and grade health within 3 seconds of opening the app.              |

### Aesthetic Character

- **Dark, green-neutral charcoal** — not pure black; layered surfaces create depth without harsh contrast
- **Soft sage primary** — calm and restrained; reserved for interactive controls and selected states
- **Monospaced type for numbers** — dates, scores, counts, and clocks always use the system mono stack for optical alignment
- **Micro-typography** — `text-[9px]` to `text-[11px]` labels, `uppercase tracking` for categories and metadata

---

## 2. Color System & Design Tokens

All tokens are defined in [`src/index.css`](file:///Users/shashankmergu/Documents/antigravity/adventurous-babbage/src/index.css) as CSS custom properties under `:root, .dark`.

### Surface Layers (dark-to-light depth ordering)

| Token          |    Hex    | Usage                                                    |
| :------------- | :-------: | :------------------------------------------------------- |
| `--background` | `#101413` | Page canvas, body fill                                   |
| `--card`       | `#171d1a` | Card surfaces, sheet backgrounds, popovers               |
| `--muted`      | `#1d2521` | Muted section backgrounds (hover targets, inactive tabs) |
| `--secondary`  | `#252d29` | Secondary interactive elements                           |
| `--border`     | `#39443d` | Dividers, card borders, input outlines                   |
| `--input`      | `#303a34` | Input field backgrounds                                  |

### Foreground & Text

| Token                    |    Hex    | Usage                                |
| :----------------------- | :-------: | :----------------------------------- |
| `--foreground`           | `#e8ece6` | Primary body text                    |
| `--card-foreground`      | `#e8ece6` | Text on card surfaces                |
| `--muted-foreground`     | `#a5b0a8` | Secondary labels, metadata, captions |
| `--secondary-foreground` | `#e3e9e3` | Text on secondary elements           |
| `--accent-foreground`    | `#e8ece6` | Text on accent surfaces              |

### Accent & Brand

| Token                  |    Hex    | Usage                                                    |
| :--------------------- | :-------: | :------------------------------------------------------- |
| `--primary`            | `#93ad94` | Buttons, rings, today indicators, selected state borders |
| `--primary-foreground` | `#111713` | Text on primary buttons                                  |
| `--ring`               | `#a9c2a8` | Focus rings, interactive outlines                        |
| `--destructive`        | `#d77d76` | Reset actions, errors, irreversible cutoffs              |
| `--success`            | `#83aaa0` | Completed work and satisfied requirements                |
| `--warning`            | `#d8a86e` | Exams, pending requirements, and caution states          |

### Tailwind Theme Mapping

All CSS tokens are forwarded into Tailwind's `@theme inline` so they're usable as utility classes (e.g. `bg-background`, `text-primary`, `border-border`).

### Event Categorisation Colors

Applied via semantic Tailwind tokens across the date strip, month calendar, agenda sheet, and day-detail dialog:

| Event Type                      | Border                  | Background          | Text                    |
| :------------------------------ | :---------------------- | :------------------ | :---------------------- |
| Hard cutoff / eligibility close | `border-destructive/40` | `bg-destructive/10` | `text-destructive`      |
| Exam / Viva                     | `border-warning/40`     | `bg-warning/10`     | `text-warning`          |
| All other scheduled events      | `border-border/70`      | `bg-muted/30`       | `text-muted-foreground` |

---

## 3. Typography System

### Font Families

| Role                         | Family                                                 | Source                      |
| :--------------------------- | :----------------------------------------------------- | :-------------------------- |
| Heading                      | `Manrope`, `Inter`, sans-serif                         | Google Fonts / System stack |
| Sans (body text)             | `Inter`, -apple-system, BlinkMacSystemFont, sans-serif | Google Fonts / System stack |
| Mono (numbers, dates, codes) | `Source Code Pro`, ui-monospace, SFMono-Regular, Menlo | Google Fonts / System stack |

### Font Feature Settings

Body text uses OpenType features for improved legibility:

```
font-feature-settings: "cv02", "cv03", "cv04", "cv11";
font-optical-sizing: auto;
line-height: 1.45;
```

### Type Scale

| Class               |   Size   | Usage                                                      |
| :------------------ | :------: | :--------------------------------------------------------- |
| `text-[9px]`        |   9 px   | Icon labels, TODAY badge, smallest metadata                |
| `text-[10px]`       |  10 px   | Date strip headers, event count labels, monogram subtitles |
| `text-[11px]`       |  11 px   | Calendar weekday headers, card compact text, LCP element   |
| `text-xs`           |  12 px   | Badge text, button labels (sm), form helper text           |
| `text-sm`           |  14 px   | Card body, day numbers, default UI text                    |
| `text-base`         |  16 px   | Header brand name (sm+)                                    |
| `text-lg / text-xl` | 18–20 px | Section headings, sheet titles                             |
| `text-2xl+`         |  24 px+  | Key metrics (grade display, score counters)                |

### Text Wrapping

- Headings (`h1`–`h6`): `text-wrap: balance` — prevents orphaned single words
- Paragraphs (`p`): `text-wrap: pretty` — reduces awkward final-line breaks

### Monospaced Numbers

Any score, count, percentage, date, or timestamp uses `font-mono tabular-nums` to ensure vertical alignment in lists and grids.

---

## 4. Spacing, Layout & Grid

### Spacing Scale

Acdence uses Tailwind's default 4 px base scale. Common usage patterns:

| Scale            |    px    | Common Use                               |
| :--------------- | :------: | :--------------------------------------- |
| `gap-1`          |   4 px   | Dense event pill lists, micro gaps       |
| `gap-2`          |   8 px   | Card internal element gaps               |
| `gap-3`          |  12 px   | Section sub-items                        |
| `gap-4`          |  16 px   | Card-to-card spacing                     |
| `gap-5`          |  20 px   | Section-level gaps                       |
| `gap-6`          |  24 px   | Major layout blocks                      |
| `px-4` / `px-6`  | 16/24 px | Horizontal page gutter (mobile / tablet) |
| `px-8` / `px-10` | 32/40 px | Large screen gutters                     |

### Page Layout

```
┌─────────────────────────────────────────────────┐
│  AppHeader (sticky, h-14 / h-15)                │
├─────────────────────────────────────────────────┤
│  main content                                   │
│  ├─ DateStrip (7-day horizontal scroll)         │
│  ├─ AtAGlanceSection (3-zone urgency bar)       │
│  ├─ CourseGrid (responsive card grid)           │
│  ├─ ProjectSummaryCard (lazy, if enrolled)      │
│  └─ AcademicCalendarSection (lazy, 12-col grid) │
└─────────────────────────────────────────────────┘
```

### Responsive Grid

```
Mobile  (<lg): single column stack
lg+          : 12-column grid — calendar uses col-span-7 (month view) + col-span-5 (event sidebar)
xl+          : col-span-8 (month view) + col-span-4 (sidebar)
```

### Border Radius Scale

| Token          |  Value  | Usage                                    |
| :------------- | :-----: | :--------------------------------------- |
| `--radius-sm`  | 0.3 rem | Chips, badges, tiny interactive elements |
| `--radius-md`  | 0.4 rem | Inputs, small buttons                    |
| `--radius-lg`  | 0.5 rem | Cards, default button rounding           |
| `--radius-xl`  | 0.7 rem | Sheets, modals, large cards              |
| `--radius-4xl` | 1.3 rem | Pill badges, avatars                     |

---

## 5. Component Patterns

### Cards

- Background: `bg-card/40` to `bg-card/60` (semi-transparent to allow subtle depth layering)
- Border: `border border-border/60`
- Border radius: `rounded-xl`
- Hover states: `hover:bg-muted/30 hover:border-border`
- Selected states: `ring-1 ring-primary border-primary bg-primary/10`

### Buttons

Three main variants used throughout:

| Variant       | Appearance                                          | Use Case                           |
| :------------ | :-------------------------------------------------- | :--------------------------------- |
| `default`     | `bg-primary text-primary-foreground`                | Primary actions                    |
| `outline`     | `border-border/60 bg-card/40 text-muted-foreground` | Header actions, secondary triggers |
| `ghost`       | Transparent, hover fills `bg-muted/30`              | Navigation, week nav arrows        |
| `destructive` | `bg-destructive text-white`                         | Irreversible actions               |

### Badges

- Compact: `text-[10px] px-1.5 py-0 h-4` for sidebar counts
- Status badges: colored `bg-*/10 text-*-300 border border-*/30` for eligibility status
- Variant `secondary`: used for task counts in menu items

### Sheets (Side Panels)

- Slide in from `side="right"`
- Full viewport height
- `SheetHeader` with `SheetTitle` + `SheetDescription`
- `Tabs` component for multi-section content (e.g. CourseDetailSheet, ProjectHubSheet)
- Internal padding: `p-4` to `p-6`

### Dialogs

| Dialog             | Trigger               | Purpose                         |
| :----------------- | :-------------------- | :------------------------------ |
| CommandMenuDialog  | `⌘K` / Search button  | Spotlight-style navigation      |
| DataBackupDialog   | More menu → Backup    | JSON export/import              |
| ResetConfirmDialog | More menu → Reset     | Destructive action confirmation |
| DayDetailDialog    | Date strip cell click | Day event detail overlay        |

### Form Inputs

- `bg-input border-border/60 rounded-md`
- `focus-visible:ring-2 ring-primary` via global `:focus-visible` rule
- `placeholder:text-muted-foreground/50`

---

## 6. Accessibility Standards

Acdence achieves **Lighthouse Accessibility: 100/100**.

### Requirements

- **WCAG 2.1 AA** minimum contrast ratios enforced:
  - Normal text: ≥ 4.5:1
  - Large text / UI components: ≥ 3:1
- **`--primary` (#93ad94) on `--background` (#101413)**: 7.48:1 ✅
- **`--muted-foreground` (#a5b0a8) on `--card` (#171d1a)**: 7.64:1 ✅
- **`--primary-foreground` (#111713) on `--primary` (#93ad94)**: 7.48:1 ✅
- **`--destructive` (#d77d76) on `--card` with `bg-destructive/10`**: 5.01:1 ✅
- **`--success` (#83aaa0) on `--card` with `bg-success/10`**: 5.70:1 ✅
- **`--warning` (#d8a86e) on `--card` with `bg-warning/10`**: 6.64:1 ✅

The destructive button hover uses a 15% tint to preserve 4.65:1 contrast. Ratios are computed from the rendered sRGB pairs.

### Patterns

- Decorative icons and monogram logos use `aria-hidden="true"`
- Accessible names derived from visible text (no `aria-label` overrides that diverge from visible content)
- Event preview pills inside date buttons use `aria-hidden="true"` — the button's accessible name comes from its text content
- `prefers-reduced-motion`: all animations collapse to `0.01ms duration, 1 iteration`
- Focus ring: `outline-2 outline-offset-2 outline-primary` via `:focus-visible`
- Text selection: `bg-primary/30 text-white`

---

## 7. Motion & Animation Principles

### Philosophy

Motion is functional, not decorative. Transitions communicate state changes; they do not entertain.

### Durations

| Interaction          |        Duration         | Easing                      |
| :------------------- | :---------------------: | :-------------------------- |
| Color / border hover |         150 ms          | ease-in-out                 |
| Opacity changes      |         150 ms          | ease-in-out                 |
| Sheet open/close     |         300 ms          | ease-in-out (Radix default) |
| Dialog appear        |         200 ms          | ease-out                    |
| Live clock update    | Instant (no transition) | —                           |

### `prefers-reduced-motion`

All `animation-duration`, `transition-duration`, and `scroll-behavior` are overridden to `0.01ms` for users who prefer reduced motion. This is a global rule in [`src/index.css`](file:///Users/shashankmergu/Documents/antigravity/adventurous-babbage/src/index.css).

---

## 8. Responsive Strategy

Acdence is designed mobile-first with progressive enhancement.

| Breakpoint    |   Width   | Key Changes                                                                            |
| :------------ | :-------: | :------------------------------------------------------------------------------------- |
| Base (mobile) | < 640 px  | Single column, compact header (h-14), clock hidden, mono text smaller                  |
| `sm`          | ≥ 640 px  | Header height increases to h-15, live clock appears, 'More' label shows, font steps up |
| `md`          | ≥ 768 px  | 'Search' text label appears on command button                                          |
| `lg`          | ≥ 1024 px | 12-column grid activates, calendar section splits (7+5 cols)                           |
| `xl`          | ≥ 1280 px | Max horizontal gutters applied (`px-10`)                                               |

### DateStrip

Uses `min-w-[720px]` inner container with `overflow-x-auto` — scrollable on mobile, full-width on desktop.

### Calendar Grid

Uses `min-w-[320px]` inner container — scrollable container on narrow screens.

---

## 9. Icon System

Icon library: **Lucide React** (`lucide-react` v1.47+)

### Usage Conventions

| Size Class |  px   | Context                           |
| :--------- | :---: | :-------------------------------- |
| `size-3.5` | 14 px | Inline text icons (search field)  |
| `size-4`   | 16 px | Standard menu icons, button icons |
| `size-5`   | 20 px | Section heading icons, card icons |

Icons are always rendered with `shrink-0` to prevent squishing in flex containers.

Color follows context:

- `text-primary` — navigational icons, active states
- `text-muted-foreground` — secondary/neutral icons
- `text-foreground/80` — prominent interactive icons
- `text-destructive` — reset/danger icons

### Key Icons Used

| Icon                      | Usage                   |
| :------------------------ | :---------------------- |
| `Search`                  | Command palette trigger |
| `MoreHorizontal`          | Overflow menu           |
| `Calendar`                | Academic calendar       |
| `BookOpen`                | Documents               |
| `CheckSquare`             | Tasks                   |
| `RotateCcw`               | Reset                   |
| `FolderDown` / `FolderUp` | Export / Import         |
| `GitBranch` / `GitCommit` | GitHub project tracking |
| `Sparkles`                | Next recommended action |
| `Clock`                   | Countdown / timing      |
| `Award`                   | Grade / score results   |
| `Milestone`               | Project stages          |
