# Bug Fixes Log

## 2026-01-31

### 7. Preset animations (shakeX, shakeY, bounce, pulse) ignore "Loop Infinitely" checkbox

**Files modified:** `src/utils/animation/element-animator.ts`, `src/utils/animation/sequence-animator.ts`

**Observation:** Adding two animations to a rectangle (shakeX and autoSpin) with "Loop Infinitely" enabled on both resulted in only autoSpin looping. shakeX always stopped after one cycle.

**Root cause:** Four preset functions hardcoded their own loop parameters and ignored `config.loop` / `config.loopCount` passed from the animation panel:
- `shakeX` / `shakeY` hardcoded `loopCount: 4`
- `bounce` / `pulse` used chained two-step animations that never passed through the loop config

Other presets (`fadeIn`, `slideIn`, `zoomIn`, `revolve`) worked because they used `...config` spread, passing loop settings through to the animation engine.

**Resolution:**
- `shakeX` / `shakeY`: When `config.loop === true`, use `loopCount: Infinity` instead of 4
- `bounce` / `pulse`: When `config.loop === true`, recursively restart their multi-step cycle after each completion
- Infinite loop handling moved to `sequence-animator.ts` `runStep()`: when `anim.repeat === -1`, pass a no-op `onComplete` and let the sequence handle unblocking

---

### 8. Infinite animation as last/only in sequence stops immediately

**File modified:** `src/utils/animation/sequence-animator.ts`

**Observation:** Adding a single animation with "Loop Infinitely" enabled caused it to stop after one iteration. The same happened when an infinite animation was the last in a multi-animation sequence.

**Root cause:** Infinite animations used `setTimeout(() => onComplete(), 0)` to unblock the sequence. When the animation was last (or only), this triggered `onAllComplete()`, which called `stopAllElementAnimations()` — killing the animation that was supposed to loop forever. This also created a race condition: if the user clicked Stop before the `setTimeout` fired, the deferred callback would create orphaned animations that ran forever with no way to stop them.

**Resolution:**
- Removed `setTimeout(onComplete)` pattern from all preset functions
- `runStep()` now checks `isInfiniteLoop` (`anim.repeat === -1`) and passes a no-op `onComplete` to the animation engine. The sequence stays active until the user clicks Stop.
- Infinite animations block `after-prev` successors (the animation never finishes, so "after" never comes). Use `with-prev` trigger for concurrent playback.
- Added guard `if (!this.activeSequences.has(elementId)) return` at the top of `runStep()` and `onAllComplete()` to prevent race conditions from deferred callbacks.

---

### 9. Animation engine tick loop and console noise after stopping preview

**Files modified:** `src/components/canvas.tsx`, `src/utils/animation/element-animator.ts`, `src/shapes/base/shape-renderer.ts`, `src/utils/animation/slide-build-manager.ts`

**Observation:** After stopping an animation preview, `console.log` output continued in the browser console. Off-screen elements with continuous animations also produced per-frame log noise.

**Root cause:** Debug `console.log` statements were left in per-frame code paths:
- `[Canvas] draw()` in `canvas.tsx` — fired every frame
- `[Morph] Starting morph` and `[Morph] Progress` in `element-animator.ts` — fired per-frame during morph
- `[renderCustomPoints]` debug logs in `shape-renderer.ts` — fired per-frame during rendering
- `[BuildManager]` initialization logs in `slide-build-manager.ts`

**Resolution:** Removed all debug `console.log` statements from per-frame code paths.

---

### 10. Off-screen elements with continuous animations cause unnecessary per-frame computation on infinite canvas

**File modified:** `src/components/canvas.tsx`

**Observation:** On an infinite canvas with one on-screen element and one off-screen element with continuous animation (auto-spin), the animation engine kept computing states for the off-screen element every frame, even though it was nowhere near the viewport.

**Root cause:** The `elementsToAnimate` filter in `draw()` only applied spatial culling for slide documents (checking elements against the active slide bounds). For infinite canvas mode (`docType !== 'slides'`), it passed all `store.elements` to `calculateAllAnimatedStates()` with no viewport filtering.

**Resolution:**
- Moved viewport bounds calculation (`viewportBounds`, `bufferX`, `bufferY`) to before the animation state computation so it can be reused for both animation culling and render culling
- Added an `else` branch for infinite canvas that applies AABB viewport culling with a 10% buffer — the same test used by the render pass
- Orbit center elements are still included even if off-screen (same dependency-aware pattern as the slide culling branch)
- Removed the duplicate viewport bounds calculation that previously existed further down in the render section

---

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

---

### 5. Animations after spinning stop working / infinite spin never stops

**File modified:** `src/utils/animation/sequence-animator.ts`

**Observation:** When an element had multiple animations in its sequence (e.g., spin followed by fade or bounce), animations after a spinning animation would either not run correctly or the element would continue spinning indefinitely after the preview ended.

**Root cause (infinite spin leak):** `animateAutoSpin` with `iterations === Infinity` called `onComplete()` immediately via `setTimeout` to unblock the sequence, but the actual spin animation continued running in the animation engine indefinitely. When the sequence completed, `onAllComplete` cleaned up sequence state (`activeSequences`, `isPreviewing`) but did NOT stop the still-running spin animation. Result: the element kept spinning after preview ended, and state restoration was immediately overwritten by the running spin on the next frame.

**Root cause (multi-iteration snap):** For finite iterations > 1, the code used `loop: true, loopCount: N` with per-loop duration. Each loop iteration re-interpolated from `startAngle` to `startAngle + 2π`. At each loop boundary, progress jumped from 1 back to 0, causing a visible angle snap-back instead of smooth continuous rotation.

**Resolution (infinite spin):** Added `stopAllElementAnimations(elementId)` at the top of `onAllComplete` to ensure any still-running animations (including infinite spins) are stopped before cleanup and state restoration.

**Resolution (multi-iteration snap):** Replaced the loop-based approach with a single continuous animation from `startAngle` to `startAngle + (2π × iterations)`. A 3-iteration spin now smoothly rotates 1080° in one animation instead of three 360° loops with snaps between them.

---

### 6. Master layer elements invisible when drawn on non-first slides

**Files modified:** `src/components/canvas.tsx`, `src/utils/slide-utils.ts`

**Observation:** Adding elements to a slide master layer worked correctly in some drawings but not others. Elements placed on the master layer while viewing certain slides would become invisible on all slides.

**Root cause:** The rendering projection for master layer elements did `renderedEl.x += activeSlide.spatialPosition.x`, assuming all master elements are stored relative to coordinate (0,0). However, elements are stored in world coordinates — if a user draws on a master layer while viewing slide 3 (spatial position 4000,0), the element is stored at e.g. (4100, 100). The projection then produces `4100 + 4000 = 8100`, placing the element far off-screen. Master layers only worked correctly when elements were drawn while slide 1 (position 0,0) was active.

**Resolution:**
- Added `projectMasterPosition()` utility in `slide-utils.ts` that determines which slide an element was originally placed on (by checking which slide's spatial region contains the element's center), computes the element's local offset within that slide, then re-projects to the target slide
- Updated the main rendering loop to use `projectMasterPosition()` instead of blind `+= sX/sY`
- Updated all 5 hit-test locations to apply the same projection, so master layer elements are selectable at their rendered position
- Updated thumbnail rendering to project master layer elements correctly
