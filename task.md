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
- [x] Implement shape connectors (able to link shapes to crete flow chart, data flow like diagrams)

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
- [ ] Snap to objects
  - Snap to edges of other elements
  - Snap to centers of other elements
  - Visual snap guides (dashed lines)
  - Smart distance indicators
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
- [ ] Api based drawing (so that programatically design can be created)
- [ ] Animation (Need to plan)
- [ ] Layer blend modes (multiply, screen, overlay, etc.)
- [ ] Layer effects/filters (blur, brightness, saturation)


