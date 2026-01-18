## Phase 1: Core Foundation
- [x] Update goals.md with Phase 1 requirements <!-- id: 0 -->
- [x] Create implementation plan for Phase 1 <!-- id: 1 -->
- [x] Scaffold SolidJS project <!-- id: 2 -->
- [x] Implement infinite canvas <!-- id: 3 -->
- [x] Implement basic drawing tools (rect, circle, line, arrow, text) <!-- id: 4 -->
- [x] Implement storage abstraction (JSON file based) <!-- id: 5 -->
- [x] Implement shareable links <!-- id: 6 -->
- [x] Verify Phase 1 features <!-- id: 7 -->

## Phase 2: UI Overhaul & Interactions
- [x] Overhaul UI to match Excalidraw design <!-- id: 8 -->
- [x] Refactor CSS to be organized per object <!-- id: 9 -->
- [x] Implement Resize and Rotate handles in Canvas <!-- id: 10 -->
- [x] Create Property Panel sidebar component <!-- id: 11 -->
- [x] Connect Property Panel to selected element state <!-- id: 12 -->
- [x] Improve selection logic for Pen and Line tools
- [x] Fix pencil drawing shift bug

## Phase 6: Viewport & Optimization
- [ ] Implement Viewport Culling (Visible Bounds check) - *Disabled for stability*
- [x] Implement Auto-Scroll when dragging near viewport edges
- [ ] Implement visible bounds check for `draw`
- [x] Fix Scroll Stability (Transform Matrix Reset)
- [x] Implement "Scroll back to content" button

## Phase 3: File Management
- [x] Implement File Open Modal Dialog

## Phase 4: Undo/Redo
- [x] Implement History Stack in appStore
- [x] Record history on modification (draw, move, resize)
- [x] Add Undo/Redo buttons to Menu
- [x] Add Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

## Phase 5: Eraser & Delete
- [x] Implement Delete action in appStore (with history)
- [x] Implement Keyboard Delete (Delete/Backspace)
- [x] Add Eraser Tool to Toolbar
- [x] Implement Eraser interaction (click/drag to delete)
- [x] Implement Pan Tool (Hand)
- [x] Redesign Property Panel (Sidebar with Popovers)

## Phase 7: Text & Resize Enhancements
- [x] Fix Text tool inconsistency (text disappears on blur)
- [x] Implement enhanced color picker (palette, hex, system picker)
- [x] Update src/store/appStore.ts defaults
- [x] Fix text bounding box (measure text width)
- [x] Verify side handle logic for all shapes
- [x] Add side resize handles (top, bottom, left, right)
- [x] Enable non-proportional text resizing
- [x] Ensure Canvas redraws on any property change
- [x] Refactor PropertyPanel.tsx
- [x] Implement text stretching in render (draw)
- [x] Refine property visibility (text exclusions)
- [ ] Fix overlap between Top Bar and Property Panel

## Phase 8: RoughJS Integration
- [x] Install roughjs <!-- id: 21 -->
- [x] Update appStore to generate seeds for elements <!-- id: 22 -->
- [x] Refactor Canvas.tsx to use roughjs for rendering <!-- id: 23 -->
- [x] Verify fill styles (hachure, solid, etc) <!-- id: 24 -->
- [x] Implement 'renderStyle' ('sketch' vs 'architectural') property <!-- id: 25 -->
- [x] Implement dual rendering logic in Canvas.tsx <!-- id: 26 -->
- [x] Configure static build (base path) <!-- id: 27 -->
- [x] Deploy to GitHub Pages (gh-pages branch) <!-- id: 28 -->

## Phase 9: Future Enhancements
- [x] Implement Export to Image (PNG/SVG) <!-- id: 29 -->
- [x] Implement Dark Mode support <!-- id: 30 -->
- [x] Implement Groups (selecting multiple items) <!-- id: 31 -->
- [x] Implement Delete Drawings (UI and Backend)
- [x] Implement Zoom to Fit (Reset View)
- [x] Implement Insert Image (PNG/JPG) <!-- id: 32 -->
- [x] Implement Layers like Procreate / Krita / Figma
  - Layer Panel UI with add, delete, visibility, lock controls
  - Layer-based z-ordering and rendering
  - Backward compatibility with migration for old files
  - Prevention of drawing on hidden/locked layers (with alerts)
  - User confirmation dialog for layer deletion with elements
  - History/undo-redo support for all layer operations
- [x] Implement Shape Connectors (Link shapes for flowcharts/diagrams)
  - [x] Magnetic snapping to shape boundaries
  - [x] Visual feedback (amber dot/box)
  - [x] Tool auto-switch after drawing (except Pen/Eraser)
  - [x] Improved Line/Arrow selection UI (Endpoint handles)

## Phase 10: Mobile & Pen Support
- [x] Migrate Mouse Events to Pointer Events in Canvas <!-- id: 32 -->
- [x] Add touch-action: none to Canvas CSS <!-- id: 33 -->
- [x] Multiple pen types (Fine Liner, Ink Brush)
- [x] Pen rendering optimization (Visibility fix & high-frequency redraws)

## Phase 11: UI Refinements
- [x] Refactor Main Menu (Burger Menu handling Open/Save/Export) <!-- id: 34 -->
- [x] Refactor Save Flow (Remove persistent input, Add Save As Dialog, Show Title) <!-- id: 35 -->
- [x] Implement Local File Support (Save/Load JSON from Disk) <!-- id: 36 -->
- [x] Fix Canvas Background Color Persistence and UI

## Phase 12: Layer System (feat-layer branch)
- [x] Core layer infrastructure (types, store, rendering)
- [x] LayerPanel component with full controls
- [x] File compatibility and migration utilities
- [x] Drawing validation (prevent hidden/locked layer drawing)
- [x] Improved layer deletion UX with user choice
- [x] Layer name editing (double-click and long-press for mobile)
- [x] Drag & drop layer reordering
- [ ] Layer context menu (right-click)
- [x] Duplicate layer function
- [x] Move elements between layers UI (in PropertyPanel)

## Phase 13: Layer Grouping (Future)
- [ ] Update Layer type to support hierarchy (parentId, isGroup, expanded)
- [ ] Implement group creation/deletion in store
- [x] Add nested rendering in LayerPanel (indentation, expand/collapse)
- [x] Implement cascade operations (group visibility/lock affects children)
- [x] Add drag & drop into/out of groups
- [x] Add expand/collapse UI controls (▶/▼ arrows)
- [x] Update rendering to respect group hierarchy
- [x] Add "Create Group" and "Ungroup" actions
- [x] File format migration for grouped layers
- [x] Group icon differentiation in UI (📁 vs layer)

## Phase 12.5: Layer Enhancements (Quick Wins)
- [x] Auto-activate layer on selection (switches active layer to selected element's layer)
- [ ] Multi-select layer movement (move multiple elements to layer at once)
- [ ] Layer keyboard shortcuts (Ctrl+]/[, Alt+1-9, Ctrl+Shift+N)
- [x] Layer context menu (right-click on layer item)
  - Rename, Duplicate, Delete, [ ] Merge Down, [ ] Flatten
- [x] Layer opacity control (affects all elements multiplicatively)
- [ ] Smart layer operations
  - Merge down (combine with layer below)
  - Flatten all (merge all visible layers)
  - Layer from selection (create layer from selected elements)
  - Isolate layer (hide all other layers)
- [ ] Layer thumbnails/previews (50x50px visual indicator)

## Phase 12.6: Layer Properties Panel
- [x] **Layer Opacity** (0-100%, affects all elements multiplicatively)
- [x] **Layer Background** (Transparent or Solid Color)
  - Renders as full-layer rectangle behind elements
  - Use cases: section backgrounds, annotation overlays, storyboarding
- [x] **Layer Color Tag** (organizational preset colors: Red, Orange, Yellow, Green, Blue, Purple)
- [ ] **Layer Blend Mode** (Normal, Multiply, Screen, Overlay, Darken, Lighten)
  - Requires Canvas composite operations
- [ ] **Where to Show**:
  - PropertyPanel when no elements selected
  - Or dedicated section in LayerPanel

## Phase 14: Snap to Grid & Guides
- [x] Canvas context menu (right-click/double-click)
  - Toggle grid visibility
  - Toggle snap to grid
  - Select all, Reset view
- [x] Grid system
  - Configurable grid size (default 20px)
  - Visual grid overlay (toggleable)
  - Grid color and opacity settings
  - Optimized rendering (only visible lines)
- [x] Snap to grid functionality
  - [x] Snap while drawing new elements
  - [x] Snap while moving elements
  - [x] Snap while resizing elements
  - [x] Configurable snap threshold (using grid size)
- [x] Snap to objects
  - [x] Snap to edges of other elements
  - [x] Snap to centers of other elements
  - [x] Visual snap guides (dashed lines)
  - [x] Automated tests (snapping.spec.ts)
- [ ] Rulers (optional)
  - Horizontal and vertical rulers
  - Show coordinates on hover
  - Ruler units (px, cm, in)
- [ ] Guides (optional)
  - Drag from rulers to create guides
  - Snap to guides
  - Lock/unlock guides
  - Guide color customization

## Nice to have
- [x] Api based drawing (so that programatically design can be created)
  - [x] Basic shape creation (Rect, Circle, Text, Line)
  - [x] Programmatic connections (Yappy.connect)
  - [x] Viewport control (zoomToFit)
- [ ] Animation (Future Feature - Planning Required)
  - [ ] **Phase 1: Core Animation Engine**
    - [ ] Add `animations` array to appStore
    - [ ] Keyframe system (property + value + time + easing)
    - [ ] Animation loop with requestAnimationFrame & delta time
    - [ ] Easing functions (ease-in, ease-out, elastic, bounce, spring)
  - [ ] **Phase 2: Element-Level Animation**
    - [ ] Animate properties: x, y, opacity, rotation, scale, strokeColor, strokeWidth
    - [ ] Sequence animations (trigger after previous completes)
    - [ ] Entrance/Exit effects (fade, slide, scale, flip)
  - [ ] **Phase 3: UI Components**
    - [ ] Timeline Panel (visual keyframe editor)
    - [ ] Property Panel animate button
    - [ ] Preview controls (Play/Pause/Stop/Scrub)
  - [ ] **Phase 4: Export Options**
    - [ ] Export to GIF
    - [ ] Export to MP4/WebM
    - [ ] Export to Lottie JSON (for web interactivity)
  - [ ] **Open Questions**
    - [ ] Primary use case: Presentations vs Walkthroughs vs Full Timeline Editor?
    - [ ] Element-level vs Scene-based animations?
    - [ ] Export priority: Video (GIF/MP4) vs Interactive (Lottie/CSS)?
  - [ ] **Reference**: See `docs/animation-fundamentals.md` for algorithms
- [ ] Layer blend modes (multiply, screen, overlay, etc.)
- [ ] Layer effects/filters (blur, brightness, saturation)
- [x] Fix Line/Arrow interaction (resize/move) in Canvas <!-- id: bug-fix-line -->
- [x] Implement Bezier/Curved Connectors <!-- id: feat-bezier-connectors -->
  - [x] Update types to support `curve` property for lines/arrows
  - [x] Implement Bezier curve calculation (rendering) using RoughJS
  - [x] Update hit testing for curves
  - [x] Add controls to toggle between Straight/Curved lines

- [x] Implement Start/End Arrowheads <!-- id: feat-arrowheads -->
  - [x] Implement `drawArrowhead` helper
  - [x] Update straight line rendering to start/end heads
  - [x] Update bezier rendering to support start/end heads
  - [x] Add dedicated Bezier tool to toolbar <!-- id: feat-bezier-tool -->
- [x] Implement image compression/resizing on upload <!-- id: feat-image-compression -->
- [ ] Advanced RoughJS Sketch Controls
  - [ ] Roughness slider (control how "sketchy" shapes look, 0-10)
  - [ ] Bowing control (make lines more curved/wavy, 0-10)
  - [ ] Additional fill patterns (cross-hatch, dots, zigzag, dashed)
  - [ ] Hachure angle control (rotate fill pattern direction)
  - [ ] Fill density controls (fillWeight, hachureGap)
  - [ ] Stroke variations (strokeLineDash patterns, dashOffset)
  - [ ] Curve controls (curveFitting, curveTightness)
  - [ ] Advanced options (simplification, preserveVertices)

## Phase 15: New Shapes & Documentation
- [x] Implement Diamond Shape (Decision Box)
  - [x] Toolbar integration
  - [x] Rendering logic (RoughJS)
  - [x] Interaction / Hit Testing
  - [x] Property support (Fill, Stroke, Style)
  - [x] Connector binding support
- [x] Update Documentation
  - [x] `docs/shape.md`: Shape Attribute Matrix & Developer Guide
  - [x] `docs/api.md`: Added `createDiamond`

### Phase 16: Alignment Tools
- [x] Implement Alignment & Distribution Tools
  - [x] Logic: `src/utils/alignment.ts`
  - [x] Store Actions: `src/store/appStore.ts`
  - [x] UI: `src/components/PropertyPanel.tsx` (Icons & Conditional Display)
  - [x] API: `setSelected` method added
  - [x] Tests: `tests/alignment.spec.ts` verified


### Phase 17: Bug Fixes
- [x] Fix Grid Mode Selection Sync
  - [x] Investigate `Canvas.tsx` rendering and hit testing
  - [x] Removed redundant transform after grid drawing
  - [x] Verify fix

### Phase 18: Minor Fixes
- [x] Fix Locked Functionality
  - [x] Investigate locked layer/element behavior
  - [x] Fix locked element interaction (check both element and layer)
  - [x] Verify fix
- [x] Fix Image Visibility on Load
- [x] Close dialogs with Esc key
  - [x] Investigate image loading/rendering
  - [x] Added callback mechanism to trigger redraw on image load
  - [x] Verify fix


## Feature Roadmap (Prioritized)

### Phase 19: Text Inside Shapes
- [x] Design & Planning
  - [x] Define how text should be positioned within shapes
  - [x] Determine auto-sizing behavior
  - [x] Plan double-click to edit interaction
- [x] Implementation
  - [x] Add `containerText` property to shape elements
  - [x] Implement text rendering inside shapes
  - [x] Add double-click to edit text
  - [x] Handle text wrapping and alignment
- [x] Testing & Verification
  - [x] Fixed browser context menu on double-click
  - [x] Added Escape key to discard changes


### Phase 19b: Labels on Lines/Arrows
- [x] Basic Implementation (Middle-aligned)
  - [x] Enable containerText for line/arrow types
  - [x] Render text at line midpoint
  - [x] Add double-click to edit
  - [x] Property panel integration
- [/] Advanced Features
  - [x] Label position controls (start/middle/end)
  - [ ] Above/below line placement
  - [ ] Follow line rotation


### Phase 19c: Copy/Paste
- [x] Implementation
  - [x] Add clipboard state management
  - [x] Implement Ctrl+C to copy selected elements
  - [x] Implement Ctrl+V to paste with offset
  - [x] Update help dialog
- [x] Testing


### Phase 19d: Quick Wins
- [x] Implementation
  - [x] Ctrl+D - Duplicate
  - [x] Ctrl+X - Cut
  - [x] Bring to Front / Send to Back
  - [x] Undo/Redo UI indicators (Fixed reactivity and styling)






### Phase 20: Grouping Elements
- [x] Implementation
  - [x] Add `groupSelected` and `ungroupSelected` to store
  - [x] Implement `Ctrl+G` and `Ctrl+Shift+G` shortcuts
  - [x] Update canvas selection logic to expand to outermost group
  - [x] Update double-click logic to handle grouped elements
  - [x] Update help dialog
- [x] Testing

### Phase 21: Connection Points/Anchors
- [x] Define anchor points for each shape type
  - [x] Rectangles: 8 anchors (4 edges + 4 corners)
  - [x] Circles: 4 anchors (cardinal points)
  - [x] Diamonds: 4 anchors (vertices)
- [x] Add visual anchors on hover
  - [x] Blue dots appear during line/arrow drawing
  - [x] Anchors highlight when within snap distance
- [x] Implement snap-to-anchor for connectors
  - [x] 15px snap threshold
  - [x] Falls back to edge intersection if no anchor nearby
  - [x] Supports rotated shapes

### Phase 22: Essential UX Improvements
- [x] Select All (Ctrl+A)
- [x] Copy/Paste functionality (Ctrl+C, Ctrl+V)
- [x] Implement Font Options for Text elements
- [x]- Phase 22: Advanced Shapes & UX (In Progress)
    - [x] Panel Refactor: Collapsible & Closable Drawers
    - [x] Implement "Zen Mode" (Alt+\) and keyboard shortcuts (Alt+P, Alt+L)
    - [x] Add Menu options for panel visibility
    - [ ] Add Search/Filter for Layers
    - [x] Implement Polygon tool (Completed in Phase 31)
    - [ ] Improved Gradient Picker with presets
- [x] Help dialog with keyboard shortcuts (Shift+?)

### Phase 22.5: Advanced Resizing
- [x] Group Resizing (with proportion constraint via Shift)
- [x] Individual Constrained Resizing (Property + Shift)
- [x] Multi-selection handles implementation


### Phase 23: Templates & Advanced Features
- [x] Pre-made diagram templates
  - [x] Extensible template system architecture
    - [x] Template type definitions (`src/types/templateTypes.ts`)
    - [x] Template registry with category management (`src/templates/registry.ts`)
    - [x] Template browser UI component (`src/components/TemplateBrowser.tsx`)
    - [x] Integration with Menu and appStore
  - [x] Architecture templates (System Design & Yappy Meta)
    - [x] Massive spacing for infinite canvas
    - [x] Bidirectional logical connections (bindings)
    - [x] UI visibility and readability fixes
  - [x] Flowchart template (Basic flowchart with decision logic)
  - [x] Mind map template (Radial structure with 4 branches)
  - [x] Wireframe template (Website layout with header, sidebar, content, footer)
  - [x] Org chart template (Company hierarchy with CEO and department heads)
  - [x] Network diagram template (Infrastructure topology with servers and firewall)

### Technical Lessons: Templates & Connections
- **Bidirectional Bindings**: Essential for stable connections. Arrows need `startBinding`/`endBinding` AND shapes need `boundElements`.
- **CSS Reliability**: Avoid undefined theme variables (`--bg-primary` vs `--bg-panel`). Use explicit contrast fallbacks to prevent "invisible text" bugs in dialogs.
- **Template Schema**: Templates are static objects; they lack the runtime safety of `api.ts` helpers. Always include all `DrawingElement` properties to prevent rendering glitches.
- [x] Element property normalization
  - [x] Added `normalizeElement()` function in migration.ts
  - [x] Automatic defaults for all required properties
  - [x] Prevents runtime errors from missing properties
- [x] Smart connector routing
    - [x] Grid-based A* routing in `routing.ts`
    - [x] Obstacle avoidance for non-linear shapes
    - [x] Integration with Property Panel and Rendering
    - [x] Reactive updates in `Canvas.tsx`
- [x] Minimap/Navigator for large diagrams
  - [x] Small overview showing full diagram
  - [x] Draggable viewport indicator
  - [x] Click to jump to location
  - [x] Toggle visibility (Alt+M)


### Phase 25: Keyboard Shortcuts & Productivity
- [x] Tool shortcuts (R=rectangle, C=circle, T=text, L=line, etc.)
- [ ] Layer navigation (Alt+1-9 for quick layer switching)
- [ ] Quick style toggles (cycle fill styles, stroke styles)
- [x] Nudge selected elements (Arrow keys for precise positioning)

### Phase 26: Command Palette & Search
- [x] Command Palette (Cmd+K / Ctrl+K)
  - [x] Search actions (group, align, distribute, etc.)
  - [x] Search layers by name
  - [x] Tool switching via search
- [x] E2E Tests (`tests/productivity_features.spec.ts`)

### Phase 27: Advanced Layer Features
- [x] Layer opacity control (affects all elements)
- [x] Layer context menu (right-click)
  - [x] Rename, Duplicate, Delete
  - [x] Merge down
  - [x] Flatten all
  - [x] Isolate layer (hide all others)
- [x] E2E Tests (`tests/productivity_features.spec.ts`)

### Phase 28: Smart Spacing Guides
- [x] Implementation
  - [x] Logic: `src/utils/spacing.ts` (Gap calculation)
  - [x] Integration: `src/components/Canvas.tsx` (State & Rendering)
  - [x] Visuals: Arrows and Distance Labels
- [x] Documentation: `docs/smart-spacing.md`
- [x] Testing

### Phase 29: Object Context Menu
- [x] Implement right-click context menu for selected objects
- [x] Specific menu items and shortcuts:
  - [x] Cut (Ctrl+X)
  - [x] Copy (Ctrl+C)
  - [x] Paste (Ctrl+V)
  - [ ] Copy to clipboard as PNG (Shift+Alt+C)
  - [ ] Copy to clipboard as SVG
  - [x] Copy styles (Ctrl+Alt+C)
  - [x] Paste styles (Ctrl+Alt+V)
  - [ ] Add to library
  - [x] Send backward (Ctrl+[)
  - [x] Bring forward (Ctrl+])
  - [x] Send to back (Ctrl+Shift+[)
  - [x] Bring to front (Ctrl+Shift+])
  - [x] Flip horizontal (Shift+H)
  - [x] Flip vertical (Shift+V)
  - [ ] Add link (Ctrl+K)
  - [ ] Copy link to object
  - [x] Duplicate (Ctrl+D)
  - [x] Lock (Ctrl+Shift+L)
  - [x] Delete (Delete)
  - [x] **FIXED**: Flip Horizontal/Vertical for single straight lines (implicit geometry converted to explicit points).


### Phase 30: Performance Optimization (Large Sketches 1000+)
- [x] **Priority 1: Immediate Wins** (1 hour, supports 500-700 elements)
  - [x] Viewport Culling
    - [x] Add viewport bounds calculation in `Canvas.tsx`
    - [x] Filter elements by visibility before rendering
    - [x] Expected gain: 80-95% fewer elements rendered when zoomed
  - [x] Fix RoughJS Instance Recreation
    - [x] Move `rough.canvas()` outside element loop
    - [x] Reuse single instance across all renders
    - [x] Expected gain: 10-20% faster rendering
  - [x] Debounce Smart Snapping
    - [x] Throttle `getSnappingGuides` to 60 FPS max
    - [x] Prevent execution on every mouse move event
    - [x] Expected gain: 50-70% reduction in drag lag
- [ ] **Priority 2: Structural Improvements** (supports 1000+ elements)
  - [ ] Spatial Indexing (rbush library)
    - [ ] Install and integrate rbush for element lookup
    - [ ] Build spatial index on element changes
    - [ ] Use for hit testing (O(n) → O(log n))
    - [ ] Use for snap candidate filtering
  - [ ] Limit Smart Snapping Scope
    - [ ] Only check elements within 200px radius
    - [ ] Filter candidates using spatial index
    - [ ] Expected gain: O(n²) → O(k²) where k << n
  - [ ] Dirty Region Tracking
    - [ ] Track which elements changed since last render
    - [ ] Only redraw affected regions for small changes
    - [ ] Full redraw only when >10% of elements changed
- [ ] **Priority 3: Advanced Optimizations** (future)
  - [ ] Offscreen Canvas Layer Caching
  - [ ] Web Workers for calculations
  - [ ] Canvas Virtualization (tile-based rendering)
- [ ] **Verification**
  - [ ] Add performance monitoring (frame time logging)
  - [ ] Test with 100, 500, 1000, 5000 elements
  - [ ] Target: 60 FPS with 1000 elements, 30+ FPS with 5000

---

### Phase 31: New Predefined Shape Tools
**Status**: ✅ Complete  
**Goal**: Expand drawing primitives with additional predefined shapes

**Implemented**:
- [x] Add 16 new shape types to type system (including Capsule, Sticky Note, Callout)
- [x] Implement rendering for all new shapes (sketch + architectural styles)
  - Triangle, Hexagon, Octagon, Parallelogram
  - Star, Cloud, Heart
  - Cross (X), Checkmark (✓)
  - Directional Arrows (Left, Right, Up, Down)
  - **Mindmap Specific**: Capsule, Sticky Note, Callout
- [x] Add hit detection for selection and movement
- [x] Add geometry intersection logic for connector binding
- [x] Add anchor points for connector snapping
- [x] Create ShapeToolGroup component with dropdown menu
- [x] Implement icon-only grid layout (3 columns) for clean UI
- [x] Add property panel support for all new shapes
- [x] Fix tool auto-reset to selection after drawing

**Features**:
- All shapes support rotation, styling, fills, and container text
- Shapes grouped in dropdown menu to reduce toolbar clutter
- Shows currently selected shape with dropdown indicator
- Tooltips for all shapes in dropdown menu

**Files Modified**: 8 files, ~1000 lines
- `types.ts`, `renderElement.ts`, `geometry.ts`, `anchorPoints.ts`
- `Canvas.tsx`, `Toolbar.tsx`, `properties.ts`
- New: `ShapeToolGroup.tsx`, `PenToolGroup.css`

---

### Phase 32: Specialized Shape Libraries
**Goal**: Expand the shape library with domain-specific primitives for professional workflows.

- [x] **Flowchart & Business Logic (BPMN)**
  - [x] Database (Cylinder)
  - [x] Document (Wavy Rectangle)
  - [x] Predefined Process (Rectangle with side bars)
  - [x] Internal Storage (Memory/Cache icon)
- [ ] **System Design & Cloud Infrastructure**
  - [ ] Server/Host (3D Box/Rack Unit)
  - [ ] Queue/Topic (Segmented Cylinder)
  - [ ] Firewall (Brick Wall/Shield)
  - [ ] User/Actor (Silhouette)
- [ ] **UI/UX Wireframing**
  - [ ] Device Frames (Mobile, Tablet, Browser Window)
  - [ ] UI Primitives (Search Bar, Toggle Switch, Slider)
  - [ ] Image Placeholder (Cross Box)
- [x] **Mindmapping & Visual Communication**
  - [x] Conversation Bubbles (Round/Square variations)
  - [x] Burst/Star (Explosion for focus)
  - [x] Ribbon/Banner (Titles)
  - [x] Resizable Brackets (Grouping)
- [ ] **Geometric & Mathematical**
  - [ ] Trapezoid
  - [ ] Right-Angle Triangle
  - [ ] Pentagon/Septagon (Completing set)

---

### Phase 33: Interactive Connectors (draw.io style)
**Goal**: Improve the connection workflow with visual connector handles for quick, intuitive diagram creation.

- [x] **Source Connection Fix**
  - [x] Check for startBinding at line/arrow creation time
  - [x] Snap start point to nearby shapes automatically
- [x] **Interactive Connector Handles**
  - [x] Show green "+" handles at anchor points when shape is selected
  - [x] Click & drag from handle to create arrow with auto-binding
  - [x] Auto-select created arrow after drawing
  - [x] Handle detection in getHandleAtPosition
- [ ] **Future Enhancements**
  - [ ] Show connector handles on hover (with modifier key)
  - [ ] Elbow/orthogonal connector routing
  - [ ] Custom anchor point positioning

---

### Phase 34: Mobile UX Improvements
**Goal**: Improve the mobile experience with better toolbar and panel accessibility.

- [x] **Toolbar Scrolling**
  - [x] Horizontal scroll on narrow screens
  - [x] Hidden scrollbar for clean UX
  - [x] Touch-friendly swipe gestures
- [x] **Property Panel Access**
  - [x] Floating settings button in bottom-right corner
  - [x] Click to toggle property panel visibility
  - [x] Blue highlight when panel is open
  - [x] Always accessible without scrolling

- [x] **Connector UX**
  - [x] Offset handles from shape for easier touch access
  - [x] Larger touch targets (12px visual, 18px offset)
  - [x] Hover animation (scale & glow) for better feedback
