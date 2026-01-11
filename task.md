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




