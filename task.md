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
- [x] Improve selection logic for Pencil and Line tools
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
  - [x] Tool auto-switch after drawing (except Pencil/Eraser)
  - [x] Improved Line/Arrow selection UI (Endpoint handles)

## Phase 10: Mobile & Pen Support
- [x] Migrate Mouse Events to Pointer Events in Canvas <!-- id: 32 -->
- [x] Add touch-action: none to Canvas CSS <!-- id: 33 -->

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
- [ ] Add nested rendering in LayerPanel (indentation, expand/collapse)
- [ ] Implement cascade operations (group visibility/lock affects children)
- [ ] Add drag & drop into/out of groups
- [ ] Add expand/collapse UI controls (▶/▼ arrows)
- [ ] Update rendering to respect group hierarchy
- [ ] Add "Create Group" and "Ungroup" actions
- [ ] File format migration for grouped layers
- [ ] Group icon differentiation in UI (📁 vs layer)

## Phase 12.5: Layer Enhancements (Quick Wins)
- [x] Auto-activate layer on selection (switches active layer to selected element's layer)
- [ ] Multi-select layer movement (move multiple elements to layer at once)
- [ ] Layer keyboard shortcuts (Ctrl+]/[, Alt+1-9, Ctrl+Shift+N)
- [ ] Layer context menu (right-click on layer item)
  - Rename, Duplicate, Delete, Merge Down, Flatten
- [ ] Layer opacity control (affects all elements multiplicatively)
- [ ] Smart layer operations
  - Merge down (combine with layer below)
  - Flatten all (merge all visible layers)
  - Layer from selection (create layer from selected elements)
  - Isolate layer (hide all other layers)
- [ ] Layer thumbnails/previews (50x50px visual indicator)

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
- [ ] Animation (Need to plan)
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
- [ ] Define anchor points for each shape type
- [ ] Add visual anchors on hover
- [ ] Implement snap-to-anchor for connectors

### Phase 22: Essential UX Improvements
- [x] Select All (Ctrl+A)
- [x] Copy/Paste functionality (Ctrl+C, Ctrl+V)
- [x] Implement Font Options for Text elements
- [x]- Phase 22: Advanced Shapes & UX (In Progress)
    - [x] Panel Refactor: Collapsible & Closable Drawers
    - [x] Implement "Zen Mode" (Alt+\) and keyboard shortcuts (Alt+P, Alt+L)
    - [x] Add Menu options for panel visibility
    - [ ] Add Search/Filter for Layers
    - [ ] Implement Polygon tool (Triangles, Pentagons, etc)
    - [ ] Improved Gradient Picker with presets
- [x] Help dialog with keyboard shortcuts (Shift+?)

### Phase 24: Unified Load/Save Experience
- [x] Design/Implement `LoadExportDialog` component
- [x] Consolidate "Open from Workspace/Disk" into Load tab/dialog
- [x] Consolidate "Save to Workspace/Disk/Image" into Save/Export tab/dialog
- [x] Update `Menu.tsx` to launch unified dialogs
- [x] Add tooltips and descriptions for each storage mode

### Phase 23: Templates & Advanced Features
- [ ] Pre-made diagram templates
- [x] Smart connector routing
    - [x] Grid-based A* routing in `routing.ts`
    - [x] Obstacle avoidance for non-linear shapes
    - [x] Integration with Property Panel and Rendering
    - [x] Reactive updates in `Canvas.tsx`
- [ ] Minimap/Navigator for large diagrams
