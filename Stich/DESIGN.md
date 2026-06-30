---
name: TerraSight Intelligence
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
  on-surface-variant: '#3d4a3f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6d7a6e'
  outline-variant: '#bccabc'
  surface-tint: '#006d37'
  primary: '#006d37'
  on-primary: '#ffffff'
  primary-container: '#27ae60'
  on-primary-container: '#00391a'
  inverse-primary: '#61de8a'
  secondary: '#2f6388'
  on-secondary: '#ffffff'
  secondary-container: '#a3d4fe'
  on-secondary-container: '#275c81'
  tertiary: '#944a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#e57d21'
  on-tertiary-container: '#4f2500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7efba4'
  primary-fixed-dim: '#61de8a'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#cbe6ff'
  secondary-fixed-dim: '#9bccf6'
  on-secondary-fixed: '#001e30'
  on-secondary-fixed-variant: '#0e4b6e'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
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
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  headline-md-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-edge: 24px
---

## Brand & Style

This design system is engineered for environmental GIS professionals, researchers, and government stakeholders who require high-density data clarity without sacrificing modern aesthetics. The brand personality is **authoritative, ecological, and precise**. It avoids the "utilitarian gray" of legacy GIS software in favor of a clean, light-filled environment that reduces cognitive load during long sessions of spatial analysis.

The visual style is a hybrid of **Modern Corporate** and **Soft Minimalism**. It utilizes a light-themed interface with subtle depth layering to distinguish between map viewports, data panels, and navigation controls. The emotional response should be one of confidence and environmental stewardship—feeling more like a premium modern SaaS tool than a rigid database application.

## Colors

The palette is anchored by a high-clarity background of `Neutral #F8FAFC`, ensuring that data-rich maps and charts remain the focal point. 

- **Primary (Emerald Green):** Used for "Active" states, positive environmental metrics, and primary action buttons. It signifies growth and ecological health.
- **Secondary (Deep Ocean Blue):** Used for navigation sidebars, header elements, and water-related data layers. It provides a grounding, professional weight to the interface.
- **Tertiary (Earthy Ochre/Orange):** Reserved for alerts, specific land-use categories, or secondary data trends that require visual distinction from the primary green/blue axis.
- **Semantic Colors:** Success (Emerald), Warning (Amber), and Danger (Rose) should follow standard accessibility ratios against the white surface.

## Typography

The design system utilizes **Hanken Grotesk** across all levels to maintain a clean, geometric, yet highly legible appearance. 

The hierarchy is structured to support "Data-First" layouts. **Labels** are frequently used in uppercase with slight letter spacing for metadata and table headers. **Headlines** utilize a tighter letter spacing and heavier weights to provide clear section anchoring. For mobile views, display and headline sizes are aggressively scaled down to preserve screen real estate for map-centric workflows.

## Layout & Spacing

The layout follows a **Hybrid Fluid-Fixed Grid**. 
- **Sidebar:** Fixed at 240px for desktop, collapsible to 64px (icons only).
- **Main Viewport:** Fluid, typically dominated by the GIS map container.
- **Data Panels:** Modular "widgets" that adhere to a 12-column grid on desktop, stacking vertically on mobile.

The spacing rhythm is based on a **4px baseline**. Most components (cards, inputs) use `md` (16px) for internal padding to maintain a breathable feel. For high-density data tables, the spacing may drop to `sm` (8px) to maximize information density.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Soft Shadows**.

1.  **Level 0 (Background):** `Neutral #F8FAFC`. This is the canvas for the entire application.
2.  **Level 1 (Cards/Panels):** White `#FFFFFF` surfaces with a very soft, diffused shadow (`0px 4px 12px rgba(0,0,0,0.03)`) and a 1px border of `#E2E8F0`.
3.  **Level 2 (Overlays/Modals):** Map controls and floating tooltips use a slightly more pronounced shadow to indicate they sit "above" the map surface.
4.  **Interactive States:** Hovering over a card or list item should trigger a subtle lift (increasing shadow spread) or a faint tint of the primary color.

## Shapes

The design system uses **Rounded** geometry (`0.5rem` or `8px` base radius). This strikes a balance between professional precision and modern friendliness. 

- **Cards and Main Containers:** Use `rounded-lg` (16px) to create a distinct frame for data visualization groups.
- **Buttons and Input Fields:** Use the base `8px` radius.
- **Status Tags/Chips:** May utilize the `rounded-xl` (24px) setting to create a "pill" look that differentiates them from square action buttons.

## Components

### Buttons
- **Primary:** Solid Emerald Green with white text. No gradient.
- **Secondary:** White background with Deep Ocean Blue border and text.
- **Ghost:** No background/border, using text color of the parent context.

### Integrated Cards
Cards are the primary container for data viz. They must include a `title-lg` header and a subtle bottom border separating the header from the content. Backgrounds are strictly white.

### Inputs & Selects
Use a light gray background (`#F1F5F9`) with a 1px border that turns Emerald Green on focus. Labels should sit above the input field in `label-md`.

### Data Visualizations
Charts should use a high-contrast palette:
- **Primary Series:** Emerald Green.
- **Comparison Series:** Deep Ocean Blue.
- **Target/Reference Lines:** Neutral Gray dashed lines.

### Flat Icon Style
Icons should be 20px (within a 24px box), stroke-based (1.5px weight), and use the secondary blue color for navigational items and the primary green for "success/active" environmental indicators.