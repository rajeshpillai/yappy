# Shape Attributes Support

This document lists the supported properties and attributes for each shape type in Yappy.

## Legend
- ✅ : Supported
- ❌ : Not Supported / Not Applicable

## Attribute Matrix

| Attribute | Rectangle | Circle | Diamond | Line / Arrow | Pencil | Text | Image | Description |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Common** | | | | | | | | |
| `x`, `y` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Position (Top-left) |
| `width`, `height` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Dimensions |
| `angle` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Rotation angle (radians) |
| `opacity` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Opacity (0-100) |
| `locked` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Prevent interaction |
| `link` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Hyperlink URL |
| `layerId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Z-index / Layer |
| **Stroke** | | | | | | | | |
| `strokeColor` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Color of the border used for drawing |
| `strokeWidth` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Thickness of the border |
| `strokeStyle` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Solid, Dashed, Dotted |
| **Fill / Background** | | | | | | | | |
| `backgroundColor` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | Background color |
| `fillStyle` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Solid, Hachure, Cross-Hatch (RoughJS) |
| **Style** | | | | | | | | |
| `roughness` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Sketchiness level (0-3) |
| `renderStyle` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Sketch vs Architectural |
| **Line Specific** | | | | | | | | |
| `startArrowhead` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | Arrow, Dot, None |
| `endArrowhead` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | Arrow, Dot, Triangle, None |
| `curveType` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | Straight vs Bezier |
| **Text Specific** | | | | | | | | |
| `text` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | The content content |
| `fontSize` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Font size in pixels |
| `fontFamily` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Font family selection |
| `textAlign` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Left, Center, Right |
| **Other** | | | | | | | | |
| `points` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | Array of points for freehand drawing |
| `src` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Image source URL |


## Property Configuration

The source of truth for these properties is `src/config/properties.ts`. To add support for a property to a new shape, update the `applicableTo` array in that file.

---

# Developer Guide: Adding a New Shape

When adding a new shape to Yappy, you must ensure it supports the following behaviors and attributes to be fully functional.

## Implementation Checklist

1.  **Define Type** (`src/types.ts`):
    - Add the new shape name to the `ElementType` union.

2.  **UI Integration** (`src/components/Toolbar.tsx`):
    - Import an appropriate icon.
    - Add a new entry to the `tools` array with the `type`, `icon`, and `label`.

3.  **Rendering Logic** (`src/utils/renderElement.ts`):
    - Implement the drawing logic in `renderElement`.
    - Use `roughjs` for hand-drawn style or standard canvas context for precise shapes.
    - Ensure it respects `x`, `y`, `width`, `height` and style properties (`strokeColor`, `fillStyle`, etc.).

4.  **Interaction & Selection** (`src/components/Canvas.tsx`):
    - **Creation**: Ensure `handlePointerDown` properly initializes the shape.
    - **Normalization**: If your shape requires positive width/height, add it to the normalization logic in `handlePointerUp`.
    - **Hit Testing**: Update `hitTestElement` to allow clicking/selecting the shape.
        - For boxes: Simple AABB check.
        - For polygons: Point-in-polygon check.
        - For curves: Distance comparison.

5.  **Connectors & Binding** (`src/utils/geometry.ts`):
    - Update `intersectElementWithLine`. This is **CRITICAL** for connectors.
    - It must calculate where a line from point A intersects your shape's boundary.
    - Without this, connectors won't snap to the shape edge.
    - Also update `checkBinding` in `Canvas.tsx` to include your shape type in the eligible list.

6.  **Properties Panel** (`src/config/properties.ts`):
    - Add your shape type to the `applicableTo` arrays for relevant properties (e.g., `backgroundColor`, `fillStyle`, `strokeWidth`).

7.  **Public API** (`src/api.ts`):
    - Add a `create[ShapeName]` helper method to `YappyAPI`.
    - Update the internal `intersect` helper if it uses separate logic from `geometry.ts`.

## Required Behaviors

*   **Move**: Automatic if `hitTestElement` is implemented correctly.
*   **Resize**: Automatic for box-based shapes. For path-based shapes, logic might be needed in `resizeElement`.
*   **Connect**: Requires `intersectElementWithLine` implementation.
*   **Style**: Must respect properties defined in `properties.ts` during rendering.
