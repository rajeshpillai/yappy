# Pen Tools: Types, Algorithms & Implementation

This document explains all pen/drawing tools in YappyDraw, their unique characteristics, and implementation details.

---

## 1. Overview: 4 Pen Types

| Tool | Icon | Curve Type | Stroke Width | Best For |
|------|------|------------|--------------|----------|
| **Pencil** | ✏️ Pencil | Quadratic Bézier | Fixed (pressure optional) | Quick sketches |
| **Calligraphy** | 🖊️ PenLine | Quadratic Bézier | Velocity-based variable | Expressive strokes |
| **Fine Liner** | 🖋️ Pen | Quadratic Bézier | Fixed, round caps | Clean lines |
| **Ink Brush** | 🖌️ Brush | Cubic Bézier | Fixed + shadow | Artistic ink |

---

## 2. Toolbar: Grouped Pen Tools

All 4 pens are consolidated into a **single toolbar icon** with a dropdown:

- **Click** → Selects the current pen type (default: Fine Liner)
- **Long press (400ms)** → Opens submenu
- **Right-click** → Opens submenu

The icon changes to reflect the currently selected pen type.

**Implementation**: `src/components/PenToolGroup.tsx`

---

## 3. Pencil Tool

The default freehand drawing tool.

### Algorithm: Incremental Quadratic Bézier
```typescript
// Draw curves between midpoints
for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
}
```

### Features
- **Pen Mode** (opt-in): Distance threshold + RDP simplification
- **Pressure sensitivity**: Varies stroke width 0.5x-1.5x

---

## 4. Calligraphy Pen

Velocity-sensitive pen for expressive, calligraphic strokes.

### Algorithm: Velocity-Based Pressure
```typescript
// Calculate velocity (pixels per millisecond)
const velocity = distance / timeDelta;

// Smooth velocity with filter (0.7 weight)
smoothedVelocity = 0.7 * velocity + 0.3 * lastVelocity;

// Inverse mapping: faster = thinner
velocityPressure = 1.0 / (1 + smoothedVelocity * 2);
```

### Features
- **Faster strokes** → Thinner lines (min 20% width)
- **Slower strokes** → Thicker lines (max 100% width)
- **Velocity smoothing**: Prevents sudden width jumps
- **Pressure blending**: Combines velocity + stylus pressure

### Rendering
Uses filled circles at each point with variable radius, plus a Bézier path for continuity.

---

## 5. Fine Liner Pen

Ultra-smooth lines with consistent width.

### Algorithm: Quadratic Bézier with Midpoints
```typescript
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

for (let i = 1; i < points.length - 2; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
}
```

### Features
- **Round caps and joins**: Professional, uniform look
- **No filtering**: Captures all points for max smoothness
- **Constant width**: No velocity/pressure variation

---

## 6. Ink Brush

Artistic brush with shadow blur for ink effect.

### Algorithm: Cubic Bézier Curves
```typescript
ctx.shadowColor = "rgba(0,0,0,0.3)";
ctx.shadowBlur = strokeWidth * 0.5;

// Cubic Bézier with 2 control points
ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
```

### Features
- **Cubic Bézier**: Smoother than quadratic (4 control points)
- **Shadow blur**: Ink-like bleeding effect
- **Pressure support**: Uses stylus pressure if available

---

## 7. Point Data Structure

All pen types store points with optional pressure and timestamp:

```typescript
type Point = {
    x: number;      // X coordinate (relative to element origin)
    y: number;      // Y coordinate
    p?: number;     // Pressure (0-1)
    t?: number;     // Timestamp (for velocity calculation)
}
```

---

## 8. Implementation Files

| File | Purpose |
|------|---------|
| [PenToolGroup.tsx](file:///home/rajesh/work/yappy/src/components/PenToolGroup.tsx) | Grouped toolbar component |
| [Canvas.tsx](file:///home/rajesh/work/yappy/src/components/Canvas.tsx) | Drawing logic (pointerDown/Move/Up) |
| [renderElement.ts](file:///home/rajesh/work/yappy/src/utils/renderElement.ts) | Rendering for each pen type |
| [pencilOptimizer.ts](file:///home/rajesh/work/yappy/src/utils/pencilOptimizer.ts) | Path generation utilities |
| [appStore.ts](file:///home/rajesh/work/yappy/src/store/appStore.ts) | `selectedPenType` state |
| [types.ts](file:///home/rajesh/work/yappy/src/types.ts) | ElementType includes all pen types |

---

## 9. Future Optimization (TODO)

- [ ] Catmull-Rom splines for even smoother curves
- [ ] Adaptive point sampling based on curvature
- [ ] GPU-accelerated rendering for complex strokes
- [ ] Pressure curve customization (soft/hard/linear)
