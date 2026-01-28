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

## Phase 6: Viewport & Optimization
- [ ] Implement Viewport Culling (Visible Bounds check) - *Disabled for stability*
- [x] Implement Auto-Scroll when dragging near viewport edges
- [ ] Implement visible bounds check for `draw`
- [x] Fix Scroll Stability (Transform Matrix Reset)
- [x] Implement "Scroll back to content" button

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
  - History/undo-redo support for all layer operations
- [x] Implement Shape Connectors (Link shapes for flowcharts/diagrams)
  - [x] Magnetic snapping to shape boundaries
  - [x] Improved Line/Arrow selection UI (Endpoint handles)

## Phase 10: Mobile & Pen Support
- [x] Migrate Mouse Events to Pointer Events in Canvas <!-- id: 32 -->
- [x] Add touch-action: none to Canvas CSS <!-- id: 33 -->
- [x] Multiple pen types (Fine Liner, Ink Brush, Marker)
- [x] Pen rendering optimization (Visibility fix & high-frequency redraws)
- [x] Implement "Highlighter" rendering style for marker (transparency, chisel tip)

## Phase 11: UI Refinements
- [x] Refactor Main Menu (Burger Menu handling Open/Save/Export) <!-- id: 34 -->
- [x] Refactor Save Flow (Remove persistent input, Add Save As Dialog, Show Title) <!-- id: 35 -->
- [x] Implement Local File Support (Save/Load JSON from Disk) <!-- id: 36 -->
- [x] Fix Canvas Background Color Persistence and UI
- [x] Implement Welcome Screen with Hints (floating arrows)

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

## Phase 12.5: Layer Enhancements (Quick Wins)
- [x] Auto-activate layer on selection (switches active layer to selected element's layer)
- [ ] Multi-select layer movement (move multiple elements to layer at once)
- [ ] Layer keyboard shortcuts (Ctrl+]/[, Alt+1-9, Ctrl+Shift+N)
- [x] Layer context menu (right-click on layer item)
  - Rename, Duplicate, Delete, [ ] Merge Down, [ ] Flatten
- [x] Layer opacity control (affects all elements multiplicatively)
- [ ] Smart layer operations
  - Merge down (combine with layer below)
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

## Phase 14: Snap to Grid & Guides
- [x] Canvas context menu (right-click/double-click)
  - Toggle grid visibility
  - Select all, Reset view
- [x] Grid system
  - Configurable grid size (default 20px)
  - Optimized rendering (only visible lines)
- [x] Snap to grid functionality
  - [x] Snap while drawing new elements
  - [x] Snap while moving/resizing elements
  - [x] Configurable snap threshold (using grid size)
- [x] Snap to objects
  - [x] Snap to edges of other elements
  - [x] Snap to center of other elements
  - [x] Automated tests (snapping.spec.ts)
- [ ] Rulers (optional)
  - Horizontal and vertical rulers
  - Ruler units (px, cm, in)
- [ ] Guides (optional)
  - Drag from rulers to create guides
  - Snap elements to guides
  - Guide color customization

- [x] Implement Cloud Infrastructure Elements
  - [x] Add new `ElementType`s: `server`, `loadBalancer`, `firewall`, `user`, `messageQueue`, `lambda`, `router`, `browser`
  - [x] Create `InfraToolGroup` UI component
  - [x] Add `InfraToolGroup` to main Toolbar
  - [x] Implement RoughJS rendering for all new elements
  - [x] Add support for both Sketch and Architectural styles
  - [x] Enable Text-Inside-Shape (containerText) for all new elements
  - [x] Verify selection, hit testing, and connector binding
  - [x] Fix: Switch to selection tool after drawing an infra element

## Phase 57: Technical & DFD Shapes
- [x] Implement DFD & State Machine shapes <!-- id: 101 -->
  - [x] `dfdProcess`, `dfdDataStore`, `isometricCube`, `cylinder`
  - [x] `stateStart`, `stateEnd`, `stateSync`, `activationBar`, `externalEntity`
- [x] Enable double-click text editing for all technical shapes
- [x] Fix hit detection for technical shapes
- [x] Update developer documentation (`docs/creating-shapes.md`)


## Phase 15: New Shapes & Documentation
- [x] Implement Diamond Shape (Decision Box)
  - [x] Toolbar integration
  - [x] Property panel support
  - [x] Connector binding support
- [x] Update Documentation
  - [x] `docs/shape.md`: Shape Attribute Matrix & Developer Guide
  - [x] `docs/api.md`: Added `createDiamond`
  - [x] `docs/layers.md`: Technical details on Layering & Rendering

## Phase 16: Alignment Tools
- [x] Implement Alignment & Distribution Tools
  - [x] Logic: `src/utils/alignment.ts`
  - [x] UI: PropertyPanel integration
  - [x] Tests: `tests/alignment.spec.ts` verified

## Phase 17: Bug Fixes
- [x] Fix Grid Mode Selection Sync
  - [x] Investigate `Canvas.tsx` rendering and hit testing
  - [x] Verify fix

## Phase 18: Minor Fixes
- [x] Fix Locked Functionality
  - [x] Investigate locked layer/element behavior
  - [x] Verify fix
- [x] Fix Image Visibility on Load
- [x] Close dialogs with Esc key
  - [x] Investigate image loading/rendering
  - [x] Verify fix
- [x] Fix Tool Property Isolation (Pen properties leaking to other shapes)


## Phase 19: Text Inside Shapes
- [x] Design & Planning
  - [x] Define how text should be positioned within shapes
  - [x] Plan double-click to edit interaction
- [x] Implementation
  - [x] Add `containerText` property to shape elements
  - [x] Handle text wrapping and alignment
- [x] Testing & Verification
  - [x] Fixed browser context menu on double-click
  - [x] Added Escape key to discard changes

## Phase 19b: Labels on Lines/Arrows
- [x] Basic Implementation (Middle-aligned)
  - [x] Enable containerText for line/arrow types
  - [x] Add text editing on double-click
  - [x] Property panel integration
- [/] Advanced Features
  - [x] Label position controls (start/middle/end)
  - [ ] Follow line rotation

## Phase 19c: Copy/Paste
- [x] Implementation
  - [x] Add clipboard state management
  - [x] Add copy/paste keyboard shortcuts (Ctrl+C, Ctrl+V)
  - [x] Update help dialog
- [x] Testing

## Phase 19d: Quick Wins
- [x] Implementation
  - [x] Ctrl+D - Duplicate
  - [x] Ctrl+A - Select All
  - [x] Undo/Redo UI indicators (Fixed reactivity and styling)

## Phase 20: Grouping Elements
- [x] Implementation
  - [x] Add `groupSelected` and `ungroupSelected` to store
  - [x] Add group/ungroup buttons to Toolbar
  - [x] Add group/ungroup keyboard shortcuts
  - [x] Update help dialog
- [x] Testing

## Phase 21: Connection Points/Anchors
- [x] Define anchor points for each shape type
  - [x] Rectangles: 8 anchors (4 edges + 4 corners)
  - [x] Circles: 8 anchors (4 quadrants + 4 diagonals)
  - [x] Diamonds: 4 anchors (vertices)
- [x] Add visual anchors on hover
  - [x] Blue dots appear during line/arrow drawing
  - [x] Anchors highlight when within snap distance
- [x] Implement snap-to-anchor for connectors
  - [x] 15px snap threshold
  - [x] Supports rotated shapes

## Phase 22: Essential UX Improvements
- [x] Select All (Ctrl+A)
- [x] Copy/Paste functionality (Ctrl+C, Ctrl+V)
- [x] Implement Font Options for Text elements
- [x]- Phase 22: Advanced Shapes & UX (In Progress)
    - [x] Panel Refactor: Collapsible & Closable Drawers
    - [x] Improved Gradient Picker with visual editor
- [x] Help dialog with keyboard shortcuts (Shift+?)

## Phase 22.5: Advanced Resizing
- [x] Group Resizing (with proportion constraint via Shift)
- [x] Individual Constrained Resizing (Property + Shift)
- [x] Multi-selection handles implementation

## Phase 23: Templates & Advanced Features
- [x] Pre-made diagram templates
  - [x] Extensible template system architecture
  - [x] Flowchart template (Basic flowchart with decision points)
  - [x] Mindmap template (Hierarchical structure with branches)
  - [x] Network diagram template (Infrastructure topology with servers and firewall)

## Technical Lessons: Templates & Connections
- **Bidirectional Bindings**: Essential for stable connections. Arrows need `startBinding`/`endBinding` AND shapes need `boundElements`.
- **CSS Reliability**: Avoid undefined theme variables (`--bg-primary` vs `--bg-panel`). Use explicit contrast fallbacks to prevent "invisible text" bugs in dialogs.
- **Template Schema**: Templates are static objects; they lack the runtime safety of `api.ts` helpers. Always include all `DrawingElement` properties to prevent rendering glitches.
- **Minimap Fidelity**: Always utilize `renderElement` for the Minimap to ensure 1:1 visual parity with the main canvas. Any new `ElementType` must be verified in the Minimap, and its reactive properties (width, points, etc.) must be added to the `track()` loop in `Minimap.tsx` to enable real-time updates.
- [x] Element property normalization
  - [x] Added `normalizeElement()` function in migration.ts
  - [x] Prevents runtime errors from missing properties
- [x] Smart connector routing
    - [x] Grid-based A* routing in `routing.ts`
    - [x] Reactive updates in `Canvas.tsx`
- [x] Minimap/Navigator for large diagrams
  - [x] Small overview showing full diagram
  - [x] Toggle visibility (Alt+M)

## Phase 25: Keyboard Shortcuts & Productivity
- [x] Tool shortcuts (R=rectangle, C=circle, T=text, L=line, etc.)
- [ ] Layer navigation (Alt+1-9 for quick layer switching)
- [ ] Quick style toggles (cycle fill styles, stroke styles)
- [x] Nudge selected elements (Arrow keys for precise positioning)

## Phase 26: Command Palette & Search
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
- [x] **System Design & Cloud Infrastructure**
  - [x] Server/Host (3D Box/Rack Unit)
  - [x] Queue/Topic (Segmented Cylinder)
  - [x] Firewall (Brick Wall/Shield)
  - [x] User/Actor (Silhouette)
- [x] **UI/UX Wireframing**
  - [x] Device Frames (Mobile, Tablet, Browser Window)
  - [x] UI Primitives (Search Bar, Toggle Switch, Slider)
  - [x] Image Placeholder (Cross Box)
- [x] **Mindmapping & Visual Communication**
  - [x] Conversation Bubbles (Round/Square variations)
  - [x] Burst/Star (Explosion for focus)
  - [x] Ribbon/Banner (Titles)
  - [x] Resizable Brackets (Grouping)
- [x] **Geometric & Mathematical Shapes**
  - [x] Trapezoid
  - [x] Right-Angle Triangle
  - [x] Pentagon
  - [x] Septagon (Completing the basic set)

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

## Phase 27: Advanced Custom Drawing Features
- [ ] Add customizable shape libraries (user-defined shapes and import/export options)
- [ ] Implement parametric shapes with adjustable properties (e.g., rounded rectangles, stars)
- [x] Introduce smart shapes that dynamically resize based on content (e.g., flowchart shapes) <!-- id: 100 -->
- [ ] Add interactive widgets (sliders, toggles, input fields) for diagrams
- [ ] Enable data-driven shapes that bind to external data sources (e.g., JSON, APIs)
- [ ] Support text on paths (e.g., curved or custom paths)
- [ ] Add advanced text effects (shadows, gradients, outlines)
- [ ] Implement snapping to midpoints, intersections, and custom anchor points
- [x] Add advanced connectors with customizable styles (e.g., curved lines, arrowheads)
  - [x] Implement relationship markers: Triangle (Inheritance), Diamond (Aggregation), Filled Diamond (Composition), Crow's Foot (ER)
  - [x] Support dashed/dotted line styles for all connectors
  - [x] Architectural and Sketch mode support for all markers
  - Note: Connectors already support line types such as dashed and dotted.
- [ ] Introduce smart routing for connectors (e.g., orthogonal routing, A* pathfinding)
- [x] Add animation support for elements (e.g., transitions, blinking, movement)
  - [x] Persistent animations: Spin (self-rotation) and Orbit (revolution around center)
  - [x] Synchronized global animation clock for smooth rendering
- [ ] Implement layer blend modes (e.g., multiply, screen, overlay)
- [ ] Add layer thumbnails/previews for better navigation
- [ ] Enable rulers and draggable guides for precise alignment
- [ ] Add advanced resizing options (e.g., constrained resizing, multi-selection handles)
- [ ] Implement voice commands for tool actions (e.g., "Draw a rectangle here")
- [ ] Add advanced export options (e.g., export specific layers, animated GIFs/videos)
- [ ] Integrate with third-party tools (e.g., Figma, Notion, Google Docs)
- [ ] Implement AI-powered auto-suggestions for shapes, connectors, and layouts
- [ ] Add error detection for diagram issues (e.g., disconnected connectors, overlapping shapes)
- [ ] Introduce specialized tools for mind mapping, storyboarding, and wireframing

---

## Phase 36: Sketchnote Essentials Pack (Level 1)
- [x] Implement `Star Person` (Universal functional character)
- [x] Implement `Scroll Container` (For lists and summaries)
- [x] Implement `Wavy Divider` (Organic topic separator)
- [x] Implement `Double-Fold Banner` (Main headings)

### Phase 35: Productivity & Auto-resize
**Goal**: Enhance drawing efficiency with keyboard shortcuts, canvas textures, and smart auto-resizing.

- [x] **Productivity Shortcuts**
  - [x] `Alt + 1-9`: Switch active layers
  - [x] `S`: Cycle stroke style (Solid, Dashed, Dotted)
  - [x] `F`: Cycle fill style (Hachure, Solid, Zigzag, etc.)
  - [x] `\`, `H`, `M`, `P`: Toggle Minimap, Help, Canvas Panels, Zenith mode
- [x] **Canvas Customization**
  - [x] Background Textures (Dots, Grid, Graph, Paper)
  - [x] Minimap sync with background color
- [x] **Auto-Resizing Shapes (Level 2)**
  - [x] `autoResize` attribute for elements
  - [x] Dynamic width/height adjustment based on `containerText`
  - [x] Reactive resizing on property changes (font size, style, weight)
  - [x] Shape-specific inscribed area math for circles and diamonds

## Phase 36.5: Sketchnote Essentials Pack (Level 2)
- [x] Implement `Lightbulb` (Idea/Insight)
- [x] Implement `Signpost` (Decision/Direction)
- [x] Implement `Jagged Burst` (Impact/Warning)
  - [x] Fix: Made burst jaggedness deterministic to prevent animation jitter

## Phase 37: Wireframing Essentials (Level 2)
- [x] Implement `Browser Window` (Container for web pages)
- [x] Implement `Mobile Phone Group` (Container for app screens)
- [x] Implement `Ghost Button` (Interactive UI element)
- [x] Implement `Input Field` (Form element with label support)

## Phase 38: Hierarchical Mindmap Support
- [x] Extend data model with `parentId` and `isCollapsed`
- [x] Support Subtree Movement (Parent moves descendants by default)
- [x] Implement `Alt` key override for independent parent movement
- [x] Implement Hierarchical Visibility (Collapsed subtrees hidden from canvas)
- [x] Add Mindmap Toggle Handles (+/-) for collapsible nodes
- [x] Implement Keyboard Shortcuts (`Tab` for Child, `Enter` for Sibling, `Space` for Toggle)
- [x] Add Hierarchy Management to Context Menu (Clear Parent, Make Child)
- [x] Ensure connectors correctly follow hierarchical visibility 

## Phase 39: Mindmap Polish & Connectivity
- [x] Implement hierarchical movement (descendants follow parent)
- [x] Default connectors to Bezier for cleaner visuals
- [x] Fix mindmap persistence (preserve hierarchy on save/load)
- [x] Implement dynamic anchor switching (horizontal & vertical)

## Phase 40: Mindmap Expansion
- [x] Add "Add Child" and "Add Sibling" commands to context menu
- [x] Implement style inheritance for children/siblings
- [x] Add dynamic vertical spacing for siblings
- [x] Create technical documentation [docs/mindmap.md]

## Phase 41: Organic Mindmap Shapes
- [x] Implement **Organic Branch** tool (Tapered, hand-drawn look)
- [x] Ensure branches behave as functional Bezier connectors
- [x] Implement Text-on-Path rendering for branches
- [x] Fix connectivity and binding for specialized branch shapes

## Phase 42: Transform Shape Feature
- [x] Implement Transform Shape context menu
  - [x] Create `elementTransforms.ts` utility with `changeElementType` function
  - [x] Add Transform Shape submenu below Hierarchy in context menu
  - [x] Restrict transformations to like-for-like families (connectors ↔ connectors, shapes ↔ shapes)
- [x] Icon-based menu with tooltips
  - [x] Replace text labels with visual icons (→, ─, ⤴, 🌿, □, ○, etc.)
  - [x] Add tooltip support to MenuItem interface
  - [x] Implement 3-column grid layout for compact display
- [x] Curve style options for connectors
  - [x] Add "Change Curve Style" submenu for line/arrow elements
  - [x] Support straight, bezier, and elbow routing
  - [x] Create curve type icon mapping (─, ⤴, └─)
- [x] UX improvements
  - [x] Immediate visual updates on transformation
  - [x] Scrollable menu with max-height: 80vh
  - [x] Fixed positioning for submenus to prevent clipping

## Phase 43: Batch Transform (Multi-Selection)
- [x] Batch connector transformation
  - [x] Enable Transform Shape menu for multi-selection of connectors
  - [x] Transform all selected connectors to chosen type (line/arrow/bezier/organicBranch)
  - [x] Preserve individual connector properties (bindings, positions, text)
  - [x] Support Change Curve Style for multiple connectors simultaneously
- [x] Batch shape transformation
  - [x] Enable Transform Shape menu for multi-selection of shapes
  - [x] Transform all selected shapes to chosen type
  - [x] Preserve individual shape properties (position, size, text, styles)
  - [x] Handle mixed selections (filter by type family)
- [x] UX enhancements
  - [x] Show count in menu label (e.g., "Transform 5 Shapes")
  - [ ] Confirm dialog for large batch operations (>10 items) <!-- Skipped for now, low priority -->
  - [x] Undo/redo support for batch transformations


## Phase 44: Structural Typography (Block Text)
- [x] Implement Alphabet Recipe Registry (A-Z)
  - [x] Define strokes for straight letters
  - [x] Define strokes for curved letters (Bezier support)
- [x] Implement `generateBlockText` engine
  - [x] Parsing and layout logic (kerning, spacing)
  - [x] Element instantiation (Lines/Beziers)
  - [x] Automatic grouping of generated text
- [x] UI Integration
  - [x] Add "Block Text" tool to toolbar
  - [x] Input dialog for text entry
- [x] Verification
  - [x] Verify legibility and styling capabilities
- [x] Improve group selection with bounding box hit detection

## Phase 45: Advanced Shape Styling
- [x] **Parametric Star Shapes**
  - [x] Add `starPoints` property to DrawingElement (range: 3-12, default: 5)
  - [x] Update star rendering logic to be parametric
  - [x] Add slider control in PropertyPanel
  - [x] Test with different point counts
- [x] **Inner Radius for Rectangles/Shapes**
  - [x] Add `innerRadius` property (0-100% of shape size)
  - [x] Implement rounded inner corners rendering
  - [x] Add double-border support (`drawInnerBorder`, `innerBorderDistance`, `innerBorderColor`)
  - [x] Property panel controls
- [x] **Rough Paint Brush (Texture Fill)**
  - [x] Research RoughJS texture fill capabilities
  - [x] Implement custom watercolor/patches fill style (implemented as Advanced Fills: Zigzag, Dots, etc)
  - [x] Add as new fillStyle option: 'watercolor' or 'patches' (Advanced Fill Styles)
  - [x] Performance optimization for large shapes
  - [x] Property panel integration

## Phase 46: Group & Ungroup
- [x] Implement `groupSelected` logic in store
- [x] Implement `ungroupSelected` logic in store
- [x] Add Group/Ungroup to Context Menu (Ctrl+G / Ctrl+Shift+G)
- [x] Verify grouping logic with selection box

## Phase 47: Alignment & Distribution
- [x] **Property Panel Controls**
  - [x] Add Alignment Row (Left, Center, Right, Top, Middle, Bottom)
  - [x] Add Distribution Row (Horizontal, Vertical)
  - [x] Show controls only when `selection.length > 1`
- [x] **Store Logic**
  - [x] `calculateAlignment` utility
  - [x] `calculateDistribution` utility
  - [x] `alignSelectedElements` store action
  - [x] `distributeSelectedElements` store action
- [x] **Verification**
  - [x] Verify alignment works on UI click
  - [x] Verify distribution works on UI click

## Phase 48: Export Selection
- [x] Modify `exportToPng` to support `onlySelected`
- [x] Modify `exportToSvg` to support `onlySelected`
- [x] Add "Export Selection Only" toggle to `ExportDialog`
- [x] Auto-enable toggle when selection > 0
- [x] Add "Export PNG/SVG" to Context Menu for quick selection export

## Phase 49: Advanced Fill & Stability
- [x] Implement custom deterministic renderer for 'dots' fill to prevent randomization on redraw
- [x] Fix: Ensure 'seed' is never 0/undefined to prevent RoughJS instability
- [x] Add "Fill Density" property to DrawingElement
- [x] Add "Fill Density" slider to Properties Panel (Generic support for dots, hachure, etc.)
- [x] Integrate Fill Density with RoughJS hachureGap
- [x] Integrate Fill Density with Custom Dots renderer

## Phase 50: Visual Depth & Polish
- [x] **Global Texture Overlays**
  - [x] Implement CSS-based noise/grain overlay
  - [x] Add "Canvas Texture" control to global settings (Paper, Noise, Grid)
- [x] **Drop Shadows**
  - [x] Add shadow properties to `DrawingElement` (color, blur, offset)
  - [x] Implement shadow rendering in `renderElement` (Architectural: standard ctx shadow)
  - [x] Implement shadow rendering for Sketch mode (Duplicate shape offset method used where applicable, mostly architectural focus)
  - [x] Add Shadow controls to Property Panel
- [x] **Gradient Fills (Architectural)**
  - [x] Add gradient support to `fillStyle`
  - [x] Implement linear and radial gradient renderer (local coordinates)
  - [x] Support Custom Shapes via `shapeGeometry.ts`

## Phase 51: Text Styling
- [x] Text color property of shapes can be customized with color picker
- [x] Implement independent text background/highlight color
- [x] Precision highlights (padding, radius, alignment fixes)

## Phase 52: Advanced Connectivity (Recommendations)
- [ ] **Smart Orthogonal Routing**
  - [ ] Implement A* pathfinding for "Elbow" connectors
  - [ ] Auto-route around obstacles (shapes)
  - [ ] Minimize line crossings and bends
- [ ] **Connector Styling**
  - [ ] Customizable arrowheads (start/middle/end)
  - [ ] Dashed/Dotted style toggle in quick-action menu

## Phase 53: Structural Performance (Recommendations)
- [ ] **Spatial Indexing**
  - [ ] Integrate `rbush` for R-Tree spatial lookups
  - [ ] Optimize hit-testing for 1000+ elements
  - [ ] Optimize viewport culling with R-Tree

## Phase 54: Mindmap Intelligence (Recommendations)
- [x] **Auto-Layout Engine**
  - [x] "Tidy Up" button to balance tree structure (Context Menu integration)
  - [x] Configurable horizontal/vertical spacing (Hardcoded defaults with subtree balancing)
  - [x] Support for multiple root nodes (Radial support)

## Phase 55: Advanced Mindmap UX & Aesthetics (Recommendations)
- [ ] **Semantic Branch Styling**
  - [ ] Auto-coloring: unique colors for primary branches and descendants
  - [ ] Tapered connections: line thickness decreases with hierarchy depth
  - [ ] Depth-based fading for distant nodes
- [ ] **Navigation-First UX**
  - [ ] Arrow Key Navigation through hierarchy (Up/Down for siblings, Left/Right for parent/child)
  - [ ] Focus Mode (`F`): isolate and highlight the selected branch
  - [ ] Markdown to Mindmap: paste bulleted lists to generate trees

## Phase 56: Multi-Slide Presentations & Animations
- [x] **Multi-Slide Support** (Different from layers - each slide is a new canvas)
  - [x] Implement slide data structure (array of canvases with metadata)
  - [x] Add slide navigation UI (sidebar with thumbnails)
  - [x] Add/delete/reorder slides functionality
  - [x] Slide-specific settings (background, grid, etc.)
  - [x] Export presentation as multi-page PDF or image sequence
  - [x] Slide transitions and navigation during presentation mode
  - [x] Note: Layers work on same canvas; slides are completely separate canvases
- [x] **Micro-Motion Explainer Animations**
  - [x] Element-level animation support (fade in/out, slide, scale)
  - [x] Timeline editor for animation sequences (Implemented engine-level)
  - [x] Keyframe animation system (Implemented as presets)
  - [x] Path-based motion (some presets use this)
  - [x] Easing functions for smooth transitions
  - [x] Animation playback controls (play, pause, scrub)
- [ ] **UI/Diagram Motion Graphics**
  - [x] State transitions between diagram states (Auto-Animate / State Morphing) <!-- id: 102 -->
  - [ ] Highlight/emphasis animations for specific elements
  - [ ] Progressive reveal animations (build diagrams step-by-step)
  - [ ] Connector animation (drawing lines with animation)
  - [ ] Group choreography (coordinate multiple element animations)
- [ ] **Product/System Design Animations**
  - [ ] Flow animations (show data/user flow through system)
  - [ ] Process animation (step-by-step workflow visualization)
  - [ ] Data visualization animations (charts, graphs updating)
  - [x] Interaction simulations (showing user interactions)
  - [x] Export as MP4/WebM/GIF for social media sharing
  - [ ] Use cases: LinkedIn posts, Twitter threads, portfolio pieces


  ## IMP
  - [x] Check reactivity of property panel (Fixed: added `renderStyle` tracking)
  - [x] Right properties for shapes (Implemented: removed Roundness/Corner Style from circles)
  - [x] Implement Element ID Editing (Rename & Update References)
  - [ ] Implement UML Class/Structured shapes (Planned: Template-based vs Structured)
  - [ ] Orthogonal/Elbow routing refinements
 
## Phase 60: Advanced Animation & Interaction
- [ ] **Data Flow Animations (Piping Effect)**
    - [ ] Implement animated "pulses" or dots moving along arrow/line paths
    - [ ] Configurable pulse speed, color, and frequency
    - [ ] Use case: showing data transmission or packet flow in technical diagrams
- [ ] **Master Timeline UI**
    - [ ] Create a bottom panel for orchestration
    - [ ] Drag-and-drop start times and durations for all element animations
    - [ ] Preview full scene choreography
- [ ] **Follow-Path Animations**
    - [ ] Allow elements to follow any Bezier curve or hand-drawn path
    - [ ] Auto-rotation of the element to follow the path's tangent
- [ ] **Interaction Triggers**
    - [ ] **On Hover**: Pulse, scale, or color change when the mouse enters an element
    - [ ] **On Click**: Trigger a different animation sequence from the current one
    - [ ] **Collision/Proximity**: Trigger animations when elements get close to each other
- [x] **Auto-Animate (State Morphing)** <!-- id: 102 -->
    - [x] Implement "Magic Move" transitions between two saved diagram states or slides
    - [x] Smoothly interpolate position, size, and color of elements with the same ID

## Phase 61: Advanced Workflow & Presentation
- [ ] **AI Text-to-Diagram**
    - [ ] Prompt-based diagram generation (Mindmaps, Flowcharts, Architecture)
    - [ ] Logic for scaffolding elements from natural language
- [x] **Presentation Laser Pointer & Ink Overlays**
    - [x] Reactive laser pointer tool that leaves temporary trails
    - [x] Temporary "Ink" that fades after 2-3 seconds for live highlighting
- [ ] **Personal Symbol Library**
    - [ ] Ability to save the current selection as a reusable "Symbol"
    - [ ] A dedicated "Symbols" panel for drag-and-drop reuse
 

## Phase 62: Animation System Enhancement (Anime.js-Level Features)
**Goal**: Elevate the animation engine to match anime.js capabilities for professional-grade motion graphics and interactive diagrams.

### **Priority 1: Must-Have for Cool Effects** ⭐⭐⭐
- [ ] **Stagger Animations**
  - [ ] Add stagger support to `animateElements()` function
  - [ ] Support delay patterns: linear, exponential, function-based
  - [ ] Example: `animateElements([...], { stagger: 100 })` // 100ms between each
  - [ ] Use case: Cascade/ripple effects, sequential reveals

- [x] **Spring Physics Easing**
  - [x] Implement spring-based animation (tension, friction, mass parameters)
  - [x] Add `easeSpring()` to animation-types.ts easing library
  - [x] Add `createSpring()` function generator for custom spring parameters
  - [x] Export from animation public API (index.ts)
  - [x] Example: `easing: 'easeSpring'` or `easing: createSpring(170, 26, 1, 0)`
  - [x] Use case: Natural, organic motion (bounce, elastic, rubbery effects)

- [ ] **Loop/Repeat/Direction Controls**
  - [ ] Add `loop`, `repeat`, `direction` to AnimationConfig
  - [ ] Support values: `loop: true`, `repeat: 3`, `direction: 'alternate'`
  - [ ] Implement in animation-engine.ts
  - [ ] Use case: Continuous animations, ping-pong effects, attention seekers

- [ ] **Relative Value Operators**
  - [ ] Support `+=`, `-=`, `*=` operators for numeric properties
  - [ ] Example: `animateElement(id, { x: '+=100', angle: '*=2' })`
  - [ ] Parse and resolve operators in element-animator.ts
  - [ ] Use case: Incremental animations, compound transformations

### **Priority 2: Advanced Effects** ⭐⭐
- [ ] **Path Following Animations**
  - [ ] Add `translateX: path('x')`, `translateY: path('y')` support
  - [ ] Parse SVG path data for coordinate extraction
  - [ ] Add automatic rotation based on path tangent
  - [ ] Use case: Elements moving along custom curves

- [ ] **Function-Based Values**
  - [ ] Support per-element value calculation: `(el, index) => value`
  - [ ] Apply to all animatable properties
  - [ ] Example: `translateX: (el, i) => 50 + (i * 50)` // Different per element
  - [ ] Use case: Custom positioning patterns, data-driven animations

- [ ] **Property-Specific Easing**
  - [ ] Allow different easings per property in single animation
  - [ ] Syntax: `{ x: { value: 100, easing: 'easeOutBounce' }, opacity: { value: 0, easing: 'linear' } }`
  - [ ] Refactor AnimationConfig to support property-level configs
  - [ ] Use case: Complex multi-property animations

### **Priority 3: Nice-to-Have** ⭐
- [ ] **SVG Path Morphing**
  - [ ] Interpolate between different SVG path shapes
  - [ ] Add morphing support for `d` attribute
  - [ ] Use flubber or custom interpolation library
  - [ ] Use case: Shape transformations, logo animations

- [ ] **Timeline Labels/Waypoints**
  - [ ] Add named waypoints to Timeline: `.add({ ... }, 'label1')`
  - [ ] Support relative positioning: `'label1+=500'`
  - [ ] Enable timeline seeking to labels
  - [ ] Use case: Complex multi-stage sequences

- [ ] **Rich Callback System**
  - [ ] Add callbacks: `begin`, `update`, `complete`, `loopBegin`, `loopComplete`
  - [ ] Pass animation object with progress/time info to all callbacks
  - [ ] Enable callback-driven effects and synchronization
  - [ ] Use case: Coordinated UI updates, sound sync

### **Documentation & Testing**
- [ ] Add examples to `docs/animation.md` showcasing new features
- [ ] Create animated demos in templates (stagger, spring, path following)
- [ ] Write E2E tests for advanced animation features
- [ ] Performance benchmarks for complex animations (100+ elements)

### **Files to Modify**
- `src/utils/animation/animation-types.ts` (spring easing, types)
- `src/utils/animation/element-animator.ts` (stagger, relative values, function values)
- `src/utils/animation/animation-engine.ts` (loop/repeat/direction)
- `src/utils/animation/timeline.ts` (labels/waypoints)
- `src/types.ts` (animation property types)

---

 ** Current
 - [X] - Implementing custom font size for elements
 - [X] - Canvas Document Type not getting saved (Fixed: version-aware defaults in loadDocument)
 - [X] - Laser pointer lagging (Fixed: mutable arrays, throttling, RAF deduplication)
 - [X] - Pen/Ink tools lagging (Fixed: local point buffer, throttled store updates)



## Phase 63: Universal PropertyPanel & Slide UX Improvements
**Status**: ✅ Complete
**Branch**: feat/slides-transition

- [x] **Universal PropertyPanel for Slides**
  - [x] Add 'slide' as 5th target type (alongside element, multi, canvas, defaults)
  - [x] Show slide properties when in slide mode with no selection
  - [x] Slide transition controls (type, duration, easing)
  - [x] Slide background color property
  - [x] SlideActions component with Preview button
  - [x] Panel header shows "Slide X" for slide context
- [x] **Property Filtering Fix**
  - [x] Slides/canvas require explicit `applicableTo` array inclusion
  - [x] No longer inherit from `applicableTo: 'all'`
  - [x] Fixed: Text Highlight, Drop Shadow no longer appear for slides
- [x] **Escape Key Fixes**
  - [x] help-dialog.tsx - Escape closes dialog
  - [x] export-dialog.tsx - Escape closes dialog
  - [x] load-export-dialog.tsx - Escape closes dialog
  - [x] slide-transition-picker.tsx - Escape closes picker
- [x] **Visual Slide Frame Indicators**
  - [x] Dashed blue borders for slide boundaries in infinite canvas mode
  - [x] Slide number labels at top-left of each frame
  - [x] Only shown when `slides.length > 1` (not for fresh infinite canvas)

## Phase 64: Pen Property Customization
**Status**: ✅ Complete
- [x] Implement configurable **Smoothing** (0-20) for all pen tools (fineliner, inkbrush, marker)
- [x] Implement configurable **Tapering** for Ink Brush
- [x] Implement configurable **Speed Sensitivity** for Ink Brush
- [x] Update `FreehandRenderer` with moving-average point smoothing engine
- [x] Update `PropertyPanel` with specialized pen controls

**Files Modified**:
- `src/types.ts` - Added smoothing, taperAmount, velocitySensitivity
- `src/config/properties.ts` - Added pen property definitions
- `src/store/app-store.ts` - Set default pen style values
- `src/shapes/renderers/freehand-renderer.ts` - Implemented smoothing and dynamic tapering logic

---


## Phase 67: Draggable UI Components
- [x] Implement dragging logic for Toolbar, Menu, and Actions
- [x] Add visual drag handles and hover states
- [x] Ensure interaction stability after dragging

## Phase 68: Fix Toolbar Centering
- [x] Resolve centering conflict in `toolbar.css`
- [x] Verify initial state alignment

 ## Active Branches
 - main (before slides)
 - dev
 - feat/slides-canvas -> Slides implementation
 - feat/slides-transition -> Complete (merged to dev)

## Phase 69: Stability & Logic Refinements
- [x] **Property Panel Race Condition Fix**
  - [x] Implement target-ID validation in `handleChange`
  - [x] Prevent stale component events from overwriting new selections
- [x] **Keyboard Shortcut Restoration**
  - [x] Fix regression in `App.tsx` global keydown handler
  - [x] Restore Ctrl+C, Ctrl+V, Ctrl+D, Ctrl+S functionality

## Phase 70: UML Shapes Expansion
- [x] Implement 8 new UML shapes <!-- id: 110 -->
  - [x] `umlComponent`: Rectangle with side tabs
  - [x] `umlState`: Rounded rectangle with name/actions sections
  - [x] `umlLifeline`: Object box with dashed vertical line
  - [x] `umlFragment`: Container with operator tab (alt/opt/loop)
  - [x] `umlSignalSend`, `umlSignalReceive`
  - [x] `umlProvidedInterface`, `umlRequiredInterface`
- [x] Support multiple text sections for `umlState` and `umlFragment`
- [x] Updated Property Panel for UML-specific attributes (actions, guards)
- [x] Fixed `Component` name collision in toolbar
- [x] Verified Architectural and Sketch rendering modes

## Phase 71: Canvas Performance Optimizations
- [x] Implement Map-based O(1) lookups in render loop <!-- id: 120 -->
- [x] Optimize `isElementHiddenByHierarchy` for large trees
- [x] Implement singleton text measurement context
- [x] Refactor specialized renderers to avoid redundant canvas creation
- [x] Enhance hit-testing performance for interactions

## Phase 72: File Compression
- [x] Save as GZIP compressed `.yappy` files
- [x] Support automatic decompression on load
- [x] Maintain legacy `.json` support
- [x] Server-side storage support (binary/.yappy)
- [x] "Save as JSON" export option

---

## Phase 73: Slide Feature Enhancements (Assessed)
### Presentation & Delivery
- [ ] **Speaker Notes** — Add a per-slide notes field visible only to the presenter.
- [ ] **Presenter View** — Separate window/display showing current slide, next slide thumbnail, notes, and timer.
- [ ] **Auto-advance Timer** — Allow slides to auto-advance after a configurable duration.
- [x] **Click-through / Build Animations** — Sequence element visibility (Foundation exists in State Morphing).
- [x] **Pointer/Annotation Improvements** — Laser pointer and temporary ink overlays.

### Slide Management
- [/] **Drag-and-Drop Reordering** — Visual reordering in navigator (`reorderSlides` exists in store).
- [x] **Slide Duplication** — Quick duplicate of an existing slide with all its content.
- [x] **Build Animations & Sequencing** — Advanced triggers (On-Click, After Previous, With Previous) for professional presentations.
- [x] **Draggable Slide Toolbar** — Floating, draggable toolbar with Play, Animation Preview, and Share controls.
- [ ] **Slide Layouts / Templates** — Pre-designed slide layouts (Title, Content, etc.).
- [ ] **Slide Overview / Grid View** — Zoomed-out grid for easy navigation and reordering.
- [ ] **Slide Search** — Find text content across all slides.

### Visual & Styling
- [x] **Rich Slide Backgrounds** — Support gradient backgrounds or images (`updateSlideBackground` exists).
- [ ] **Slide Master / Theme System** — Define a master slide with common elements (logo, footer).
- [x] **Automatic Slide Numbers/Footer** — Slide number implemented in Navigator.
- [ ] **Aspect Ratio Options** — Support 16:9, 4:3, and custom aspect ratios.

### Navigation & Interactivity
- [ ] **Slide Hyperlinks** — Click on an element to jump to a specific slide.
- [ ] **Table of Contents / Outline View** — Auto-generated from slide names.
- [x] **Keyboard Shortcut Overlay** — Show available shortcuts (toggled with `Shift+?`).

### Import & Export
- [ ] **PPTX Import** — Import existing PowerPoint files as slides.
- [ ] **PDF Import** — Import PDF pages as slide backgrounds or images.
- [ ] **HTML/Web Export** — Export as a self-contained HTML presentation (like reveal.js).
- [ ] **Shareable Presentation Link** — Generate a read-only presentation URL.
---

## Phase 74: Reliable Shortcuts & Mobile Refinements
- [x] Fix `Ctrl+O` and `Ctrl+S` shortcuts (browser-independent handling)
- [x] Reassign Laser Pointer to `Shift+P` (resolve browser conflict with Alt+P)
- [x] Make `FileOpenDialog`, `SaveDialog`, and `HelpDialog` mobile-friendly (responsive CSS)
- [x] Fix Slide Control Toolbar and Utility Toolbar visibility & z-index issues
- [x] Restore "Slide Toolbar" toggle in main menu for presentation mode
- [x] Fix App Title transform centering logic

## Phase 75: Animation Continuity & Priority Shortcuts
- [x] Fix Animation Toolbar (Play/Pause/Stop reactive state)
- [x] Fix Continuous Motion (Spin/Orbit) in Preview mode
- [x] Ensure Pause correctly stops ALL animations using `effectiveTime`
- [x] Prioritize Ctrl shortcuts (O/S/Z/Y/etc.) over input focus in `app.tsx`
- [x] Implement P3 Wide-Gamut Color Picker with Drag & Drop support
- [x] Add mobile-friendly "tap-to-apply" fallback for color selection
- [x] Implement Advanced OKLCH P3 Color Picker (Triangle & Gamut Visualization)




## Phase 61: UI Refresh & Fixes
- [x] **Welcome Screen Overhaul**
  - [x] Implemented hand-drawn style with RoughJS
  - [x] Added interactive hints/arrows to UI elements
  - [x] Refactored to use internal rendering API
- [x] **UI Enhancements**
  - [x] Added "View" menu for toggling Slide Panel & Toolbar
  - [x] Implemented Collapsible Sidebar logic
  - [x] Reorganized Main Menu (New Infinite Drawing / Presentation at top)
- [x] **Critical Fixes**
  - [x] Fixed Global Shortcuts (Ctrl+S, Ctrl+O) failing in Bubble Phase
  - [x] Fixed File Open Dialog keyboard navigation (Focus management)
  - [x] Fixed App Crash (Missing handleBeforeUnload)
  - [x] Fixed P3 Color Picker positioning (off-screen)
- [x] **Shortcut Updates**
  - [x] Changed Open to `Ctrl+Alt+O` to avoid browser conflict
  - [x] Changed Save to `Ctrl+Alt+S` to avoid browser conflict
  - [x] Updated Help Dialog and Welcome Screen
- [x] **Cleanup**
  - [x] Removed "Share" button (Client-side only)
- [x] **Animation Fixes**
  - [x] Fixed Auto-Spin preview failing when no other animations exist
  - [x] Fixed Global/Panel Play buttons for continuous animations (forced ticker)
- [x] **Deploy Fixes**
  - [x] Resolved unused 'e' parameter in App.tsx
  - [x] Removed unused 'Share2' import in Menu.tsx
- [x] **Text Scaling**
  - [x] Locked aspect ratio for text resize by default (prevents font stretching)
  - [x] Added Shift+Drag shortcut to unlock aspect ratio for text
  - [x] Updated Help Dialog with new resize shortcut
