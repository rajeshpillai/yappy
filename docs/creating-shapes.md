# Developer Guide: Adding New Shape Types

This document provides a comprehensive, step-by-step blueprint for adding new functional shapes to Yappy. The architecture is modular, separating the **data definition**, **rendering logic**, **geometry calculation**, and **user interaction**.

## 1. Type Definition
**File**: `src/types.ts`

First, define the unique identifier for your shape.
- Add the new type string to the `ElementType` union.

```typescript
export type ElementType =
    | 'rectangle' | 'circle' // ... existing types
    | 'myNewShape';          // <--- Add this
```

## 2. Geometry definition
**File**: `src/utils/shape-geometry.ts`

Define how your shape "looks" mathematically. This is used by renderers to draw the shape and by the hit-testing logic.

Find the `getShapeGeometry` function and add a `case` for your new type. You must return a `ShapeGeometry` object.

**Common Geometry Types:**
- **Points** (Polygon/Polyline):
  ```typescript
  case 'myNewShape':
      return {
          type: 'points',
          points: [ {x:0, y:0}, {x:w, y:0}, ... ] // Coordinates relative to center (-w/2, -h/2)
      };
  ```
- **Path** (SVG Path data):
  ```typescript
  case 'myComplexShape':
      return {
          type: 'path',
          path: `M ${x} ${y} ...` // SVG path string
      };
  ```
- **Multi** (Composite shapes):
  ```typescript
  case 'myCompositeShape':
      return {
          type: 'multi',
          shapes: [
              { type: 'rect', ... },
              { type: 'path', ... }
          ]
      };
  ```

> **Important**: Coordinates in `shape-geometry.ts` are usually calculated relative to the element's top-left `(x, y)` (which is actually initialized as `-width/2, -height/2` variables in that function for convenience). Ensure your math respects the `w` (width) and `h` (height) of the element.

## 3. Renderer Implementation
**Directory**: `src/shapes/renderers/`

Decide which renderer your shape should use.

### Option A: Reuse an Existing Renderer (Recommended)
Most shapes fit into existing categories. You don't need a new file, just register it (Step 4).

| Renderer Classification | Description | Examples |
| :--- | :--- | :--- |
| **PolygonRenderer** | Simple, closed geometric shapes defined by points. | Triangle, Hexagon, Octagon |
| **SpecialtyShapeRenderer** | Complex illustrative shapes (paths, composite). | Cloud, Heart, Arrows, Capsule |
| **SketchnoteRenderer** | Hand-drawn style icons/symbols. | Lightbulb, Signpost, Wavy Divider |
| **FlowchartRenderer** | Standard flowchart symbols. | Database, Document |
| **InfraRenderer** | AWS/Cloud infrastructure icons. | Server, Lambda, Firewall |
| **ContainerRenderer** | Shapes that contain others. | MobilePhone, BrowserWindow |

### Option B: Create a New Renderer
If your shape requires unique rendering logic (e.g., dynamic text flowing, complex animations, or image processing), create a new file (e.g., `src/shapes/renderers/my-custom-renderer.ts`) extending `ShapeRenderer`.

```typescript
import { ShapeRenderer } from "../base/shape-renderer";

export class MyCustomRenderer extends ShapeRenderer {
    // Implement renderSketch (RoughJS) and renderArchitectural (Canvas API)
    // See src/shapes/base/shape-renderer.ts for the interface
}
```

## 4. Registration
**File**: `src/shapes/register-shapes.ts`

You must register your shape type with the `ShapeRegistry` so the application knows which renderer to use.

```typescript
// Import the renderer
import { SpecialtyShapeRenderer } from "./renderers/specialty-shape-renderer";

export function registerShapes() {
    // ... existing registrations
    
    // Example: Registering with an existing renderer
    const specialtyRenderer = new SpecialtyShapeRenderer();
    shapeRegistry.register('myNewShape', specialtyRenderer); 
}
```

## 5. Anchor Points (Connections)
**File**: `src/utils/anchor-points.ts`

Define where arrows/lines can attach to your shape.
- Locate `getAnchorPoints`.
- Add your shape type to the appropriate `if/else` block.
- Most shapes can simply be added to the "Complex Shapes" list (around line 108), which automatically assigns **4 cardinal anchor points** (Top, Right, Bottom, Left).

```typescript
} else if (..., element.type === 'myNewShape') {
    // Uses standard 4-point cardinal anchors
```

## 6. UI Integration
**File**: `src/components/shape-tool-group.tsx` (or other Tool Groups)

To make your shape accessible to the user, add it to the toolbar.

1.  **Import Icon**: Import a suitable icon from `lucide-solid` or another library.
2.  **Add to List**: Add an entry to the `shapeTools` array.

```typescript
const shapeTools = [
    // ...
    { type: 'myNewShape', icon: MyIcon, label: 'My New Shape' },
];
```

## 7. Canvas Interactions (Optional)
**File**: `src/components/canvas.tsx`

- **Default Styles**: If your shape needs specific default colors (like Sticky Notes being yellow), modify the creation logic inside `handlePointerDown` (look for `// Apply specific defaults`).
- **Resizing**: Most shapes handle resizing automatically via generic logic. If your shape needs aspect-ratio locking or special handle behavior, update the `handlePointerMove` resizing logic.

---

## Cheat Sheet: Current Shapes

| Category | Shapes |
| :--- | :--- |
| **Basic** | Rectangle, Circle, Diamond, Text, Image, StickyNote |
| **Polygons** | Triangle, Hexagon, Octagon, Parallelogram, Trapezoid, Pentagon, Septagon |
| **Specialty** | Cloud, Heart, Star, Burst, Callout, SpeechBubble, Ribbon, Capsule, Cross, Checkmark, Arrows (Left/Right/Up/Down), Brackets |
| **Flowchart** | Database, Document, PredefinedProcess, InternalStorage |
| **Sketchnote** | StarPerson, Lightbulb, Signpost, BurstBlob, Scroll, WavyDivider, DoubleBanner |
| **Infra** | Server, LoadBalancer, Firewall, User, MessageQueue, Lambda, Router |
| **Containers** | BrowserWindow, MobilePhone |
| **Wireframe** | Browser, GhostButton, InputField |
