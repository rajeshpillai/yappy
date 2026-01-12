# Yappy Browser API

Yappy exposes a global API on `window.Yappy` that allows you to programmatically create, manipulate, and connect elements on the canvas. This is useful for generating diagrams from external data, automating tasks, or integrating with other tools.

## Getting Started

Open your browser's developer console (F12) while running Yappy. You can immediately access the API:

```javascript
window.Yappy.createRectangle(100, 100, 200, 150);
```

## Methods

### Creation methods

#### `createRectangle(x, y, width, height, options)`
Creates a rectangle.
- **x, y**: Coordinates of top-left corner.
- **width, height**: Dimensions.
- **options**: Style options (see below).
- **Returns**: `id` (string) of created element.

#### `createDiamond(x, y, width, height, options)`
Creates a diamond (rhombus).

#### `createCircle(x, y, width, height, options)`
Creates a circle/ellipse.

#### `createLine(x1, y1, x2, y2, options)`
Creates a linear line from point 1 to point 2.

#### `createArrow(x1, y1, x2, y2, options)`
Creates an arrow from point 1 to point 2.

#### `createBezier(x1, y1, x2, y2, options)`
Creates a bezier curve (line) from point 1 to point 2.

#### `createText(x, y, text, options)`
Creates a text element.
- **text**: String content.
- **options.fontSize**: font size (default 20).

### Connection Methods

#### `connect(sourceId, targetId, options)`
Connects two existing elements with an arrow or line.
- **sourceId**: ID of start element.
- **targetId**: ID of end element.
- **options**:
  - `type`: 'arrow' (default) or 'line'.
  - `curveType`: 'bezier' (default), 'straight', or 'elbow'.
  - Style options (color, etc).

Example:
```javascript
const id1 = Yappy.createRectangle(100, 100, 100, 50);
const id2 = Yappy.createRectangle(300, 100, 100, 50);
Yappy.connect(id1, id2, { curveType: 'elbow' });
```

### Manipulation Methods

#### `updateElement(id, updates)`
Updates properties of an existing element.
```javascript
Yappy.updateElement(someId, { backgroundColor: 'red', strokeStyle: 'dashed' });
```

#### `deleteElement(id)`
Deletes an element by ID.

#### `clear()`
Clears the entire canvas history and elements.

#### `zoomToFit()`
Adjusts the viewport to fit all elements.

#### `setView(scale, panX, panY)`
Manually sets the viewport view state.

## Types

### ElementOptions
Optional object passed to creation methods.
```typescript
{
    strokeColor?: string;       // e.g. "#000000"
    backgroundColor?: string;   // e.g. "transparent", "#ff0000"
    fillStyle?: 'hachure' | 'solid' | 'cross-hatch';
    strokeWidth?: number;       // default 1
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    opacity?: number;           // 0-100
    roughness?: number;         // 0 (clean) - 2 (sketchy)
    angle?: number;             // radians
    fontFamily?: 1 | 2 | 3;     // 1: Hand, 2: Sans, 3: Mono
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    startArrowhead?: 'arrow' | 'dot' | 'circle' | 'bar' | null;
    endArrowhead?: 'arrow' | 'triangle' | 'dot' | 'circle' | 'bar' | null;
}
```

## State Access
You can read the full application state via:
```javascript
Yappy.state
// Returns: { elements: [...], viewState: {...}, ... }
```
This is a read-only proxy of the SolidJS store.
