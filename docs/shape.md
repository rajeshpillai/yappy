# Shape & Tool Documentation

This document describes the supported properties, attributes, and implementation details for all elements in Yappy.

## Legend
- ✅ : Supported
- ❌ : Not Supported / Not Applicable
- 🛠 : Partial Support / Indirect (e.g., via bounding box)

## Attribute Matrix: Standard Shapes

| Attribute | Rect / Box | Circle | Diamond | Triangle | Polygons¹ | Text | Image | Description |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `x`, `y` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Position (Top-left) |
| `width`, `height` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Dimensions |
| `angle` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Rotation angle (radians) |
| `opacity` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Opacity (0-100) |
| `strokeColor` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Border color |
| `strokeWidth` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Border thickness |
| `backgroundColor`| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Fill color |
| `fillStyle` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Solid, Hachure, Hatch |
| `roughness` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Sloppiness (RoughJS) |
| `roundness` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | Rounded corners toggle |
| `containerText` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Internal label content |
| `shadowEnabled` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Drop shadow toggle |
| `gradientStart` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Linear/Radial start color |
| `gradientDirection`| ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Gradient Angle |

> ¹ **Polygons** include: Hexagon, Octagon, Star, Cloud, Heart, Arrow (Left/Right/Up/Down), Capsule, Sticky Note, Speech Bubble, Database, Document, etc.

## Attribute Matrix: Linear & Pen Tools

| Attribute | Line / Arrow | Bezier | Fineliner | Ink Brush | Marker | Description |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `points` | ✅ | ✅ | ✅ | ✅ | ✅ | Coordinate array |
| `curveType` | ✅ | ✅ | ❌ | ❌ | ❌ | Straight vs Curved |
| `startArrowhead` | ✅ | ❌ | ❌ | ❌ | ❌ | Start decoration |
| `endArrowhead` | ✅ | ❌ | ❌ | ❌ | ❌ | End decoration |
| `pressureEnabled`| ❌ | ❌ | ✅ | ✅ | ❌ | Variable thickness |
| `strokeWidth` | ✅ | ✅ | ✅ | ✅ | ✅ | Base thickness |
| `globalAlpha` | ✅ | ✅ | ✅ | ✅ | ✅ (0.5) | Rendering alpha |
| `blending` | solid | solid | solid | soft | multiply | Composite mode |

---

# Developer Guide: Creating New Elements

## 1. Creating a Standard Shape (Strategy Pattern)

Yappy uses a modular rendering system based on the Strategy pattern. To add a new shape:

1.  **Define Type**: Add value to `ElementType` in `src/types.ts`.
2.  **Create Renderer**: Create a new class in `src/shapes/renderers/` extending `ShapeRenderer`.
    - Implement `renderSketch` (RoughJS) and `renderArchitectural` (Native Canvas).
3.  **Register Renderer**: Add the new renderer to `ShapeRegistry` in `src/shapes/register-shapes.ts`.
4.  **UI Integration**:
    - Add to `tools` in `src/components/ShapeToolGroup.tsx`.
    - Add icon to `src/components/Toolbar.tsx`.
5.  **Properties**: Update `src/config/properties.ts` and `src/utils/element-transforms.ts`.
6.  **Hit Testing**: Add to `hitTestElement` in `src/components/Canvas.tsx`.
7.  **Intersections**: Update `intersectElementWithLine` in `src/utils/geometry.ts`.
8.  **Normalization**: Add type to `handlePointerUp` in `Canvas.tsx`.

## 2. Creating a Drawing Tool (Pen/Marker)

Drawing tools are point-based and captured in real-time.

1.  **Define Type**: Add to `ElementType` in `src/types.ts`.
2.  **UI Integration**: Add to `penTools` in `src/components/PenToolGroup.tsx`.
3.  **Interaction Flow** (`src/components/Canvas.tsx`):
    - **Pointer Down**: Initialize `points: [{ x: 0, y: 0, t: Date.now() }]`.
    - **Pointer Move**: Append relative coordinates to `points`. Capture `e.pressure` if supported.
    - **Pointer Up**: Call `normalizePencil` to calculate the minimal bounding box and offset points.
4.  **Rendering**:
    - Use `ctx.beginPath()` for raw canvas performance or `perfect-freehand` for smooth strokes.
    - **Marker Specific**: Use `ctx.globalAlpha` and `ctx.globalCompositeOperation = 'multiply'` for highlighter effects.
5.  **Minimap Support**: Ensure the new pen type is included in the Minimap's draw loop. Since Minimap uses `renderElement`, adding logic there is usually sufficient.

## 3. Key Features to Remember

*   **Dark Mode**: Always use `getStrokeColor(el.strokeColor, theme)` in the renderer.
*   **Rotation**: Ensure your `hitTest` and `render` logic accounts for `el.angle`.
*   **Performance**: For complex paths, use `ctx.save()` and `ctx.restore()` sparingly.
*   **Z-Index**: Elements are rendered in the order they appear in `store.elements`.
*   **Binding**: If you want other elements to "stick" to yours, you **must** implement the intersection logic in `geometry.ts`.
*   **Minimap Consistency**: New elements must utilize `renderElement` to ensure they are visible in the Navigator. If the element has unique reactive properties, update the `track()` function in `Minimap.tsx`.
