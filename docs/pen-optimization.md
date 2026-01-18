# Pen Tools: Types, Algorithms & Implementation

This document explains all pen/drawing tools in YappyDraw, their unique characteristics, and implementation details.

---

## 1. Overview: 2 Pen Types

| Tool | Icon | Curve Type | Stroke Width | Best For |
|------|------|------------|--------------|----------|
| **Fine Liner** | 🖋️ Pen | Quadratic Bézier | Fixed, round caps | Clean lines |
| **Ink Brush** | 🖌️ Brush | Cubic Bézier | Fixed + shadow | Artistic ink |

---

## 2. Toolbar: Grouped Pen Tools

All current pen tools are consolidated into a **single toolbar icon** with a dropdown:

- **Click** → Selects the current pen type (default: Fine Liner)
- **Long press (400ms)** → Opens submenu
- **Right-click** → Opens submenu

The icon changes to reflect the currently selected pen type.

**Implementation**: `src/components/PenToolGroup.tsx`

---

## 3. Fine Liner Pen

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

## 4. Ink Brush

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

## 5. Point Data Structure

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

## 6. Implementation Files

| File | Purpose |
|------|---------|
| [PenToolGroup.tsx](file:///home/rajesh/work/yappy/src/components/PenToolGroup.tsx) | Grouped toolbar component |
| [Canvas.tsx](file:///home/rajesh/work/yappy/src/components/Canvas.tsx) | Drawing logic (pointerDown/Move/Up) |
| [renderElement.ts](file:///home/rajesh/work/yappy/src/utils/renderElement.ts) | Rendering for each pen type |
| [appStore.ts](file:///home/rajesh/work/yappy/src/store/appStore.ts) | `selectedPenType` state |
| [types.ts](file:///home/rajesh/work/yappy/src/types.ts) | ElementType includes all pen types |

---

## 7. Real-time Visibility Optimization

A key challenge with pen tools is that their final dimensions (`width`, `height`) are often 0 while being drawn, as they only get normalized after the pointer is released.

### Viewport Culling Bypass
To ensure pen strokes are visible *during* drawing, we bypass the viewport culling logic for the element currently being drawn:

```typescript
// src/components/Canvas.tsx
const layerElements = store.elements.filter(el => {
    // ...
    // Always render the element currently being drawn
    if (el.id === currentId) return true;
    // ...
});
```

### Explicit Redraws
We also trigger explicit redraws during high-frequency pointer move events for pen tools:

```typescript
if (isDrawing || isDragging) {
    requestAnimationFrame(draw);
}
```

---

## 8. Future Optimization (TODO)

- [ ] Catmull-Rom splines for even smoother curves
- [ ] Adaptive point sampling based on curvature
- [ ] GPU-accelerated rendering for complex strokes
- [ ] Pressure curve customization (soft/hard/linear)
