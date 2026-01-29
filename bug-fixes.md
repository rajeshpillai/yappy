# Bug Fixes Log

## 2026-01-29

### 1. "Scroll back to content" and "Zoom to Fit" broken in Slide documents

**Files modified:** `src/components/canvas.tsx`, `src/components/menu.tsx`

**Observation:** After panning away from a slide in design mode, clicking "Scroll back to content" or "Zoom to Fit" did not restore focus to the active slide. The same features worked correctly in Infinite Canvas mode.

**Root cause:** Three functions used `store.elements` (all elements across all slides) to compute content bounds, instead of using the active slide's spatial region:
- `showScrollBack` detection effect checked if any element from any slide was in the viewport
- `handleScrollBack()` centered the viewport on the bounding box of all elements, landing between slides
- Context menu "Zoom to Fit" and menu bar "Reset View" called `zoomToFit()` (fits all elements) instead of `zoomToFitSlide()` (fits the active slide)

**Resolution:**
- `showScrollBack` now checks visibility of the active slide's `spatialPosition` + `dimensions` bounds in slide mode
- `handleScrollBack()` delegates to `zoomToFitSlide()` in slide mode
- Context menu "Zoom to Fit" and menu "Reset View" dispatch `zoomToFitSlide()` when `docType === 'slides'`

---

### 2. Slide transitions all produce the same visual effect

**File modified:** `src/utils/animation/slide-transition-manager.ts`

**Observation:** Selecting different slide transition types (slide-left, slide-right, slide-up, slide-down, zoom-in, zoom-out) resulted in nearly identical animations during presentation mode.

**Root cause (directional slides):** The pan offset for slide-left/right/up/down was hardcoded to 200 pixels. Slides are positioned ~2000+ units apart spatially, making a 200px offset negligible. All four directions produced the same generic pan between spatial positions.

**Root cause (zoom):** The zoom transitions used a two-phase split at `progress < 0.5`, applying the easing function to full progress then doubling it. This caused values to exceed 1.0 in the first half and created a visible discontinuity at the midpoint. Both zoom-in and zoom-out looked similar.

**Resolution (directional slides):** Replaced the fixed 200px offset with full viewport width/height offsets. Each direction now clearly animates the new slide entering from the correct screen edge:
- `slide-left` — enters from the right edge
- `slide-right` — enters from the left edge
- `slide-up` — enters from the bottom edge
- `slide-down` — enters from the top edge
- Going backward automatically reverses the direction

**Resolution (zoom):** Replaced the broken two-phase animation with a single-phase smooth interpolation. Pan is computed mathematically from scale to keep the slide perfectly centered throughout:
- `zoom-in` — starts at 15% of target scale, grows into view
- `zoom-out` — starts at 300% of target scale, shrinks to fit

---

### 3. Slide navigator panel does not scroll to active slide

**File modified:** `src/components/slide-navigator.tsx`

**Observation:** When navigating slides via keyboard, toolbar buttons, or other means, the slide navigator sidebar did not scroll to keep the active slide thumbnail visible.

**Resolution:** Added a `createEffect` watching `store.activeSlideIndex` that calls `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` on the active slide's thumbnail wrapper. Uses `block: 'nearest'` so it only scrolls when the active thumbnail is out of view.

---

### 4. Slide toolbar missing navigation controls

**File modified:** `src/components/slide-control-toolbar.tsx`

**Observation:** The slide control toolbar only had "Play Presentation" and "Preview Animations" buttons. There was no way to navigate between slides directly from the toolbar.

**Resolution:** Added a navigation group between the drag handle and the action buttons:
- Previous/Next slide buttons (chevron icons) with disabled state at bounds
- A small text input showing the current slide number (1-based) with `/ N` total count
- Input supports typing a number + Enter to jump to any slide, Escape to cancel
- Keyboard events stop propagation to prevent canvas shortcut interference
- Visual separator between navigation and action groups
- `ToolbarButton` component updated to support a `disabled` prop with appropriate styling
