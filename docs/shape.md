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
