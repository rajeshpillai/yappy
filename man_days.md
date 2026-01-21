# Development Effort Estimation: Yappy (Bottom-Up Analysis)

**Date**: January 21, 2026
**Scope**: Build "from scratch" to current feature parity (Phase 1-51).
**Basis**: Analysis of ~24k LOC, 50+ tracked phases, and core graphics engine complexity.

## Executive Summary
**Total Estimate**: **110 - 150 Man-Days**
**Actual Spent**: 40 Hours  
To replicate the current state of Yappy (Infinite Canvas, Vector Engine, Layer System, extensive Shape Library), a single Senior Frontend Engineer with specific experience in Canvas/WebGL/SVG interaction models would require approximately **5-7 months** of dedicated work.

This estimate assumes a high standard of quality (unit tests, undo/redo support for all actions, responsive UI) matching the current codebase.

---

## Detailed Breakdown

### 1. Core Engine & Infrastructure (20 Days)
The "invisible" work required before drawing a single rectangle.
- **Infinite Canvas System (5d)**:
    - Viewport logic (Pan/Zoom).
    - Coordinate transformations (Screen Space ↔ World Space).
    - High-DPI support and resize observers.
- **RoughJS/Graphics Pipeline (3d)**:
    - Integrating RoughJS for the "sketchnote" aesthetic.
    - Seed generation and deterministic rendering.
    - Canvas rendering loop requestAnimationFrame optimization.
- **State Fundamentals (7d)**:
    - Immutable state structure (SolidJS Stores).
    - Robust Undo/Redo History Stack (handling 50+ action types).
    - Persistence (LocalStorage & JSON File I/O).
- **Project Scaffold (5d)**:
    - TypeScript config, Build pipeline (Vite), Linters.
    - Type system definition (`DrawingElement`, unions, extensive interfaces).

### 2. Basic Drawing & Manipulation (25 Days)
- **Primary Toolset (5d)**:
    - Logic to create Rectangles, Circles, Triangles, Lines, Arrows.
    - Geometry calculations for each shape.
- **Selection Engine (5d)**:
    - Hit testing (point-in-polygon, ray casting).
    - Drag-selection box (AABB intersection).
    - Multi-selection state management.
- **Transform System 2.0 (10d)**:
    - 8-handle resize logic (corner/edge cases).
    - Constrained resizing (Shift key) & aspect ratio locks.
    - Rotation math (rotating points around an arbitrary center).
    - Translating (moving) multiple items simultaneously.
- **Mouse/Touch Handling (5d)**:
    - Normalizing pointer events (Mouse/Touch/Pen) for cross-device support.

### 3. Advanced Interaction Engine (35 Days)
High-complexity spatial algorithms that distinguish this from a basic whiteboard.
- **Object Snapping & Smart Guides (10d)**:
    - Calculating snap candidates in real-time (O(n) checks).
    - Rendering visual guide lines and distance labels.
    - Magnetic threshold logic.
- **Connectors & Routing (10d)**:
    - Binding connectors to shapes (by ID).
    - Edge intersection math (finding where a line hits a rect/circle/diamond).
    - Routing algorithms (avoiding overlap, elbow joints).
- **Anchor Point System (7d)**:
    - Defining connection points for every shape type.
    - Calculating anchor positions on rotated shapes.
    - "Magnet" UI interaction when dragging connections.
- **Mindmap & Grouping (8d)**:
    - Hierarchical data structure (parent/child relationships).
    - Recursive selection and movement logic.
    - Collapsible subtrees.

### 4. Specialized Tooling (25 Days)
- **Pen & Tablet Support (7d)**:
    - Capturing raw pointer events.
    - Smoothing algorithms (Catmull-Rom or Perfect-Freehand).
    - Pressure sensitivity simulation.
- **Text Editor (8d)**:
    - WYSIWYG editing on canvas (hidden textarea overlay).
    - Text measurement and wrapping logic.
    - Container auto-resizing based on text content.
- **Complex Rendering (10d)**:
    - `renderElement.ts` implementation (~120KB file).
    - Handling 50+ shape variants.
    - Gradient engines, Shadow rendering, Fill styles (Hachure, Dots, Solid).

### 5. UI/UX Polish (25 Days)
- **Properties Panel (7d)**:
    - Context-aware side panel (updates based on selection).
    - Color pickers, sliders, toggle groups.
- **Layer Panel (8d)**:
    - Tree view implementation.
    - Drag & drop reordering.
    - Locking, Visibility, Opacity inheritance.
- **Actions & Shortcuts (5d)**:
    - Command Palette impl.
    - Keyboard shortcut registry (Ctrl+Z, Ctrl+G, etc.).
    - Context Menus (Right-click).
- **Templates & Theming (5d)**:
    - Theme engine (Light/Dark mode mapping).
    - Template instantiation logic.

### 6. QA, Optimization & hardening (20 Days)
- **Performance Tuning**: Viewport culling, debouncing render loops.
- **Unit Tests**: Coverage for core geometry logic (`geometry.ts`, `alignment.ts`).
- **Edge Case Handling**: e.g., "Undo buffer limit", "Zero-width shape prevention", "Corrupt file recovery".
