# Developer Guide: Adding New Shape Types

This document provides a comprehensive blueprint for adding new functional shapes to Yappy. Follow these steps to ensure full integration with rendering, resizing, connectors, and property panels.

## 1. Core Definition
**File**: [types.ts](file:///d:/work/rajesh/yappy/src/types.ts)
- Add the new type string to the `ElementType` union.
- Example: `| 'myNewShape'`

## 2. Rendering Logic (The "How it Looks")
**File**: [renderElement.ts](file:///d:/work/rajesh/yappy/src/utils/renderElement.ts)

### Algorithms for Polygons
If your shape is a polygon, define its points relative to `el.x`, `el.y`, `el.width`, and `el.height`.

- **Trapezoid Example**:
  ```typescript
  const offset = el.width * 0.2;
  const points = [
      [el.x + offset, el.y],
      [el.x + el.width - offset, el.y],
      [el.x + el.width, el.y + el.height],
      [el.x, el.y + el.height]
  ];
  ```

- **Regular Polygons (Pentagon/Septagon)**:
  ```typescript
  for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
      points.push([
          cx + rx * Math.cos(angle),
          cy + ry * Math.sin(angle)
      ]);
  }
  ```

### Implementation Steps
1. Add an `else if (el.type === 'myNewShape')` block.
2. Implement **Architectural Style**: Use native `ctx` methods (`beginPath`, `moveTo`, `lineTo`, `stroke`, `fill`).
3. Implement **Sketch Style**: Use `rc.polygon(points, options)` or `rc.path(path, options)` for the hand-drawn look.
4. **Container Text**: Scroll to the end of `renderElement.ts` and add your type to the `containerText` rendering check to enable labels inside the shape.

## 3. Interaction & Canvas Logic (The "How it Acts")
**File**: [Canvas.tsx](file:///d:/work/rajesh/yappy/src/components/Canvas.tsx)

### Hit Testing
Add your shape to the list in `hitTestElement`. Most box-based shapes can use the existing collision list:
```typescript
if (['rectangle', ..., 'myNewShape'].includes(el.type)) {
    // Standard bounding box check
}
```

### Double-Click to Edit
Add your type to the `shapeTypes` array inside `handleDoubleClick`. This enables the text editor when the user double-clicks the shape.

### Normalization & Tool Reset
In `handlePointerUp`, update two critical lists:
1. **Normalization**: Add to the list that flips negative width/height (needed if drawing right-to-left).
2. **Tool Reset**: Add to the list that resets the `selectedTool` to `'selection'` after drawing.

## 4. Connectors & Snapping (The "How it Bonds")

### Anchor Points
**File**: [anchorPoints.ts](file:///d:/work/rajesh/yappy/src/utils/anchorPoints.ts)
- Add your type to the "Complex Shapes" list in `getAnchorPoints`. 
- This automatically provides 4 cardinal points (Top, Bottom, Left, Right) for connectors to snap to.

### Intersection Fallback
**File**: [geometry.ts](file:///d:/work/rajesh/yappy/src/utils/geometry.ts)
- Add your type to the `intersectElementWithLine` fallback list. 
- This allows arrows to "bind" to the edge of your shape using a bounding box approximation.

## 5. UI Integration
**File**: `src/components/Toolbar.tsx` or a Tool Group (e.g., `ShapeToolGroup.tsx`)
- Add your tool to the UI list.
- Define a custom SVG icon or use a library like `lucide-solid`.
- Ensure selecting the tool calls `setSelectedTool` and `setSelectedShapeType` (if applicable).

## 6. Property Panel
**File**: [properties.ts](file:///d:/work/rajesh/yappy/src/config/properties.ts)
- Update the `applicableTo` array for relevant properties:
    - `renderStyle`: To toggle between Sketch/Architectural.
    - `strokeColor`, `strokeWidth`, `strokeStyle`.
    - `backgroundColor`, `fillStyle`, `opacity`.
    - `fontSize`, `fontWeight`, `textAlign` (for the internal label).
    - `constrained`: To lock aspect ratio during resize.

## 7. Verification Checklist

### Basic Functionality
- [ ] **Creation**: Can I draw the shape on the canvas via the toolbar?
- [ ] **Normalization**: Does it flip correctly if I drag in the opposite direction (negative width/height)?
- [ ] **Text Editing**: Does double-clicking open the text editor? Does text wrap correctly?

### Geometry & Transforms
- [ ] **Resizing**: 
    - [ ] Do all 8 handles (corners + sides) work correctly?
    - [ ] Does **Shift + Resize** maintain the aspect ratio?
    - [ ] If `constrained` property is on, does it maintain aspect ratio without Shift?
- [ ] **Rotation**:
    - [ ] Does the rotation handle appear and work?
    - [ ] Is hit-testing accurate while the shape is rotated?
    - [ ] Does the bounding box selection highlight rotate with the element?

### Connections & Snapping
- [ ] **Anchor Points**:
    - [ ] Do blue anchor dots appear when hovering with a line/arrow tool?
    - [ ] Are they correctly positioned at the cardinal points (N, S, E, W)?
- [ ] **Binding**:
    - [ ] Does a line/arrow head "stick" to the shape's edge?
    - [ ] If I move the shape, do the connected arrows follow?
    - [ ] If I rotate the shape, do the connections remain stable?

### UI & Styling
- [ ] **Property Panel**: 
    - [ ] Can I change the color, fill style, and stroke settings?
    - [ ] Does the **Architectural vs Sketch** toggle work as expected?
- [ ] **Minimap**: Does it appear correctly in the Navigator overview? (Automatic if `renderElement` is used).
