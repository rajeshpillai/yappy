# Developer Guide: Adding New Shape Types

This document provides a comprehensive blueprint for adding new functional shapes to Yappy using the **Modular Rendering Architecture**.

## 1. Core Definition
**File**: [types.ts](file:///home/rajesh/work/yappy/src/types.ts)
- Add the new type string to the `ElementType` union.
- Example: `| 'myNewShape'`

## 2. Implement the Renderer (The "Strategy")
**Directory**: `src/shapes/renderers/`

Create a new file (e.g., `my-shape-renderer.ts`) that extends `ShapeRenderer`.

```typescript
import { ShapeRenderer } from "../base/shape-renderer";
import { RenderContext } from "../base/types";

export class MyShapeRenderer extends ShapeRenderer {
    // Implement standard RoughJS/Sketch rendering
    renderSketch(rc: any, context: RenderContext): void {
        const { element, options } = context;
        // Example: Draw a custom polygon
        rc.polygon([[element.x, element.y], ...], options);
    }

    // Implement clean Architectural rendering
    renderArchitectural(ctx: CanvasRenderingContext2D, context: RenderContext): void {
        const { element } = context;
        ctx.beginPath();
        ctx.rect(element.x, element.y, element.width, element.height);
        ctx.fill();
        ctx.stroke();
    }
}
```

## 3. Register the Shape
**File**: [register-shapes.ts](file:///home/rajesh/work/yappy/src/shapes/register-shapes.ts)

Import your renderer and add it to the `registerShapes` function:

```typescript
import { MyShapeRenderer } from "./renderers/my-shape-renderer";

export const registerShapes = () => {
    const registry = ShapeRegistry.getInstance();
    // ...
    registry.register('myNewShape', new MyShapeRenderer());
};
```

## 4. Interaction & Canvas Logic (The "How it Acts")
**File**: [Canvas.tsx](file:///home/rajesh/work/yappy/src/components/Canvas.tsx)

### Hit Testing
Add your shape to the list in `hitTestElement`. Most box-based shapes can use the existing collision list:
```typescript
if (['rectangle', ..., 'myNewShape'].includes(el.type)) {
    // Standard bounding box check
}
```

### Double-Click to Edit
Add your type to the `shapeTypes` array inside `handleDoubleClick`. This enables the text editor when the user double-clicks the shape.

## 5. Connectors & Snapping (The "How it Bonds")

### Anchor Points
**File**: [anchorPoints.ts](file:///home/rajesh/work/yappy/src/utils/anchorPoints.ts)
- Add your type to the "Complex Shapes" list in `getAnchorPoints`. 
- This automatically provides 4 cardinal points (Top, Bottom, Left, Right) for connectors to snap to.

### Intersection Fallback
**File**: [geometry.ts](file:///home/rajesh/work/yappy/src/utils/geometry.ts)
- Add your type to the `intersectElementWithLine` fallback list. 

## 6. UI Integration
**File**: `src/components/Toolbar.tsx` or a Tool Group (e.g., `ShapeToolGroup.tsx`)
- Add your tool to the UI list and define an icon.

## 7. Property Panel
**File**: [properties.ts](file:///home/rajesh/work/yappy/src/config/properties.ts)
- Update the `applicableTo` array for relevant properties (color, stroke, opacity, etc.).
