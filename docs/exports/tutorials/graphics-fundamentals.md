# Graphics System Fundamentals: Core Algorithms Explained

> **A comprehensive guide to the mathematical foundations and algorithms that power interactive drawing applications**

## Introduction

Every modern drawing application—from simple sketching tools to professional CAD software—is built on the same fundamental principles. The calculations for resize handles, anchor points, snap-to-grid, and hit detection are universal concepts that transcend programming languages.

This guide breaks down these core algorithms into clear, digestible explanations with visual diagrams and step-by-step math. Once you understand these concepts, you can build graphics systems in any language you choose.

---

## Table of Contents

1. [Coordinate Systems](#1-coordinate-systems)
2. [Bounding Boxes](#2-bounding-boxes)
3. [Rotation Transformations](#3-rotation-transformations)
4. [Resize Handles](#4-resize-handles)
5. [Anchor Points](#5-anchor-points)
6. [Snapping Algorithms](#6-snapping-algorithms)
7. [Hit Detection](#7-hit-detection)
8. [Connector Binding](#8-connector-binding)
9. [Pan and Zoom](#9-pan-and-zoom)
10. [Smart Spacing Guides](smart-spacing.md)
11. [Advanced Topics](#10-advanced-topics)

---

## 1. Coordinate Systems

### Understanding Canvas Space

Every graphics system works with a 2D coordinate plane. The foundation is understanding where (0, 0) is and how coordinates relate to what you see on screen.

```
Canvas Coordinate System:
┌────────────────────────► X (increases right)
│
│  (0,0)      (100,0)
│    ●──────────●
│    │          │
│    │  Shape   │
│    │          │
│    ●──────────●
│  (0,100)   (100,100)
│
▼
Y (increases down)
```

**Key Concept**: In most canvas systems, Y increases *downward*, unlike traditional math where Y increases upward.

### World Space vs. Screen Space

When you add **pan** (moving the view) and **zoom** (scaling), you need two coordinate systems:

1. **World Space**: Where elements actually exist (unchanging)
2. **Screen Space**: What you see (affected by pan/zoom)

```
Conversion Formula:
screenX = (worldX * zoom) + panX
screenY = (worldY * zoom) + panY

Inverse (screen to world):
worldX = (screenX - panX) / zoom
worldY = (screenY - panY) / zoom
```

**Example**:
```
Element at world position (100, 100)
Zoom = 2 (200% zoom)
Pan = (50, 25)

Screen position:
screenX = (100 * 2) + 50 = 250
screenY = (100 * 2) + 25 = 225
```

**Why This Matters**: When a user clicks at screen position (250, 225), you convert it back to world space (100, 100) to know which element they clicked.

---

## 2. Bounding Boxes

### Definition

A **bounding box** is the smallest rectangle that completely contains a shape. Most graphics systems represent elements with:
- `x`: Left edge position
- `y`: Top edge position  
- `width`: Horizontal size
- `height`: Vertical size

```
Bounding Box:
    x=50, y=100
    ●─────────────────┐
    │                 │
    │   Element       │ height=60
    │                 │
    └─────────────────●
                      width=120
```

### Center Point Calculation

Many operations (rotation, scaling) use the **center** of a shape:

```javascript
Pseudocode:
centerX = x + (width / 2)
centerY = y + (height / 2)
```

**Example**:
```
Rectangle: x=50, y=100, width=120, height=60
Center: (50 + 120/2, 100 + 60/2) = (110, 130)
```

### Edge Coordinates

Useful for snapping and alignment:

```javascript
Pseudocode:
left   = x
right  = x + width
top    = y
bottom = y + height
```

---

## 3. Rotation Transformations

### The Rotation Formula

To rotate a point around another point (usually the center):

```javascript
Given:
- Point to rotate: (px, py)
- Center of rotation: (cx, cy)
- Angle in radians: θ

Step 1: Translate to origin
dx = px - cx
dy = py - cy

Step 2: Rotate
rotatedX = dx * cos(θ) - dy * sin(θ)
rotatedY = dx * sin(θ) + dy * cos(θ)

Step 3: Translate back
finalX = rotatedX + cx
finalY = rotatedY + cy
```

**Visual Example** (45° rotation):
```
Before:               After:
    ●                    ╱●
    │                  ╱
    │                ╱
    ○ ← center      ○
```

### Degrees to Radians

Most programming languages use **radians** for trigonometry:

```javascript
radians = degrees * (π / 180)
degrees = radians * (180 / π)
```

**Common Angles**:
- 0° = 0 radians
- 90° = π/2 radians
- 180° = π radians
- 270° = 3π/2 radians
- 360° = 2π radians

### Rotating Shapes

When rotating a rectangle, you need to rotate **all four corners** around the center:

```javascript
Pseudocode:
corners = [
  (x, y),                    // top-left
  (x + width, y),            // top-right
  (x, y + height),           // bottom-left
  (x + width, y + height)    // bottom-right
]

for each corner in corners:
  rotatedCorner = rotatePoint(corner, center, angle)
```

---

## 4. Resize Handles

### The 8-Handle System

Professional drawing tools use **8 resize handles**: 4 corners + 4 edges.

```
Resize Handles:
    NW      N       NE
     ●──────●──────●
     │             │
   W ●    shape    ● E
     │             │
     ●──────●──────●
    SW      S       SE
```

### Handle Positions

Calculate handle positions from bounding box:

```javascript
Pseudocode:
// Corners
NW = (x, y)
NE = (x + width, y)
SW = (x, y + height)
SE = (x + width, y + height)

// Edges (midpoints)
N = (x + width/2, y)
E = (x + width, y + height/2)
S = (x + width/2, y + height)
W = (x, y + height/2)
```

### Resize Logic

When dragging a handle, update position and size:

```javascript
Pseudocode for dragging SE (bottom-right) handle:

newWidth = mouseX - x
newHeight = mouseY - y

// Constrain to minimum size
if (newWidth < minWidth):
  newWidth = minWidth
if (newHeight < minHeight):
  newHeight = minHeight

width = newWidth
height = newHeight
```

### Constrained Resize (Shift Key)

To maintain aspect ratio:

```javascript
Pseudocode:
aspectRatio = originalWidth / originalHeight

if (shiftKeyPressed):
  // Determine which dimension to constrain
  if (abs(deltaX) > abs(deltaY)):
    newWidth = mouseX - x
    newHeight = newWidth / aspectRatio
  else:
    newHeight = mouseY - y
    newWidth = newHeight * aspectRatio
```

### Opposite Corner Anchoring

When resizing from NW (top-left), the SE (bottom-right) corner stays fixed:

```javascript
Pseudocode for NW handle:

// SE corner position (anchor)
anchorX = x + width
anchorY = y + height

// New dimensions
newWidth = anchorX - mouseX
newHeight = anchorY - mouseY

// Update position (top-left moves)
x = mouseX
y = mouseY
width = newWidth
height = newHeight
```

---

## 5. Anchor Points

### What Are Anchor Points?

**Anchor points** are specific locations on a shape where connections snap for precision. Think of them as magnets for line endpoints.

### Rectangle Anchors (8 points)

```
Rectangle with 8 anchor points:

    ●───────●───────●
    │               │
    ●               ●
    │               │
    ●───────●───────●

Positions:
- 4 corners
- 4 edge midpoints
```

**Calculation**:
```javascript
Pseudocode:
centerX = x + width/2
centerY = y + height/2

anchors = [
  // Corners
  (x, y),                     // top-left
  (x + width, y),             // top-right
  (x, y + height),            // bottom-left
  (x + width, y + height),    // bottom-right
  
  // Edges  
  (centerX, y),               // top
  (x + width, centerY),       // right
  (centerX, y + height),      // bottom
  (x, centerY)                // left
]
```

### Circle/Ellipse Anchors (4 points)

Circles use **cardinal directions** (N, E, S, W):

```
Circle with 4 anchor points:

        ●
        
    ●   ○   ●
        
        ●
```

**Calculation**:
```javascript
Pseudocode:
centerX = x + width/2
centerY = y + height/2
radiusX = width/2
radiusY = height/2

anchors = [
  (centerX, centerY - radiusY),  // top
  (centerX + radiusX, centerY),  // right
  (centerX, centerY + radiusY),  // bottom
  (centerX - radiusX, centerY)   // left
]
```

### Diamond Anchors (4 points)

Diamonds have anchors at their **4 vertices**:

```
Diamond with 4 anchor points:

       ●
      ╱ ╲
     ╱   ╲
    ●     ●
     ╲   ╱
      ╲ ╱
       ●
```

**Calculation**:
```javascript
Pseudocode:
centerX = x + width/2
centerY = y + height/2
halfWidth = width/2
halfHeight = height/2

anchors = [
  (centerX, y),                    // top
  (x + width, centerY),            // right
  (centerX, y + height),           // bottom
  (x, centerY)                     // left
]
```

### Anchors with Rotation

When a shape is rotated, anchors must rotate too:

```javascript
Pseudocode:
for each anchor in anchors:
  rotatedAnchor = rotatePoint(anchor, shapeCenter, rotationAngle)
```

---

## 6. Snapping Algorithms

### Snap-to-Grid

The simplest snapping: align coordinates to a grid.

```javascript
Pseudocode:
gridSize = 20  // pixels

function snapToGrid(value):
  return round(value / gridSize) * gridSize

// Example:
x = 137
snappedX = snapToGrid(137) = round(137/20) * 20 = 7 * 20 = 140
```

**Visual**:
```
Grid (20px):
│   │   │   │   │
│   │   │   │   │
├───┼───┼───┼───┤
│   │   │   │   │
│   │   ● ← position (137, 65)
│   │   │ ↓ snaps to (140, 60)
├───┼───┼●──┼───┤
```

### Snap-to-Objects (Smart Guides)

Align with nearby elements' edges and centers.

```javascript
Pseudocode:
threshold = 10  // snap within 10 pixels

function findSnapTarget(movingElement, otherElements):
  bestSnap = null
  closestDistance = threshold
  
  for each element in otherElements:
    // Check alignment with edges and center
    targets = [
      element.left,
      element.right,
      element.centerX,
      element.top,
      element.bottom,
      element.centerY
    ]
    
    for each target in targets:
      distance = abs(movingElement.edge - target)
      
      if distance < closestDistance:
        closestDistance = distance
        bestSnap = target
  
  return bestSnap
```

**Visual Example**:
```
Element A:          Element B (being moved):
┌────────┐                    
│        │          ┌────────┐ ← centerY
│    A   │ ← centerY│        │   alignment
│        │          │   B    │   detected!
└────────┘          │        │
                    └────────┘
                    
Guide appears when within threshold:
┌────────┐    ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ← magenta guide line
│        │    
│    A   │    ┌────────┐
│        │    │   B    │
└────────┘    └────────┘
```

### Snap-to-Anchor

Snap line endpoints to specific anchor points:

```javascript
Pseudocode:
anchorThreshold = 15  // pixels

function findClosestAnchor(shape, point):
  anchors = getAnchorPoints(shape)
  closestAnchor = null
  minDistance = anchorThreshold
  
  for each anchor in anchors:
    dx = anchor.x - point.x
    dy = anchor.y - point.y
    distance = sqrt(dx*dx + dy*dy)
    
    if distance < minDistance:
      minDistance = distance
      closestAnchor = anchor
  
  return closestAnchor
```

### Distance Calculation

The **Euclidean distance** formula is fundamental to snapping:

```javascript
distance = √((x₂ - x₁)² + (y₂ - y₁)²)

Pseudocode:
function distance(point1, point2):
  dx = point2.x - point1.x
  dy = point2.y - point1.y
  return sqrt(dx*dx + dy*dy)
```

---

## 7. Hit Detection

### Point-in-Rectangle

Is a click inside a rectangle?

```javascript
Pseudocode:
function pointInRectangle(point, rect):
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
```

### Point-in-Circle

Is a click inside a circle/ellipse?

```javascript
Pseudocode:
function pointInEllipse(point, ellipse):
  centerX = ellipse.x + ellipse.width/2
  centerY = ellipse.y + ellipse.height/2
  radiusX = ellipse.width/2
  radiusY = ellipse.height/2
  
  // Normalize to unit circle
  dx = (point.x - centerX) / radiusX
  dy = (point.y - centerY) / radiusY
  
  // Check if inside (distance from center < 1)
  return (dx*dx + dy*dy) <= 1
```

**Why This Works**:
```
Ellipse equation:
(x - cx)²   (y - cy)²
─────────  + ─────────  = 1  (on the ellipse)
   rx²          ry²

< 1 means inside
> 1 means outside
```

### Point-in-Diamond

Diamond hit detection uses Manhattan distance:

```javascript
Pseudocode:
function pointInDiamond(point, diamond):
  centerX = diamond.x + diamond.width/2
  centerY = diamond.y + diamond.height/2
  
  // Distance from center (normalized)
  dx = abs(point.x - centerX) / (diamond.width/2)
  dy = abs(point.y - centerY) / (diamond.height/2)
  
  // Manhattan distance on normalized diamond
  return (dx + dy) <= 1
```

**Visual**:
```
Diamond boundaries:
       ●
      ╱│╲
     ╱ │ ╲
    ●──○──●  ← (dx + dy) = 1
     ╲ │ ╱
      ╲│╱
       ●
       
Inside: (dx + dy) < 1
Outside: (dx + dy) > 1
```

### Point-in-Rotated-Rectangle

For rotated shapes, **inverse rotate** the point:

```javascript
Pseudocode:
function pointInRotatedRectangle(point, rect, angle):
  centerX = rect.x + rect.width/2
  centerY = rect.y + rect.height/2
  
  // Rotate point by -angle (inverse rotation)
  unrotatedPoint = rotatePoint(point, center, -angle)
  
  // Now check with normal rectangle
  return pointInRectangle(unrotatedPoint, rect)
```

**Why This Works**: Instead of rotating the rectangle, we rotate the point in the opposite direction. Now the rectangle is "upright" in this new coordinate system.

---

## 8. Connector Binding

### The Problem

When drawing a line from one shape to another, where exactly does it connect?

### Edge Intersection

Find where a line from shape center to target point intersects the shape edge.

**For Rectangles**:
```javascript
Pseudocode:
function intersectRectangle(rect, targetPoint):
  centerX = rect.x + rect.width/2
  centerY = rect.y + rect.height/2
  
  // Direction from center to target
  dx = targetPoint.x - centerX
  dy = targetPoint.y - centerY
  
  // Find intersection with rectangle edges
  // Using parametric line: P = center + t * (dx, dy)
  
  // Find smallest t where line hits edge
  t_values = []
  
  // Left edge: x = rect.x
  if dx != 0:
    t = (rect.x - centerX) / dx
    if t > 0: t_values.append(t)
  
  // Right edge: x = rect.x + rect.width  
  if dx != 0:
    t = (rect.x + rect.width - centerX) / dx
    if t > 0: t_values.append(t)
  
  // Top edge: y = rect.y
  if dy != 0:
    t = (rect.y - centerY) / dy
    if t > 0: t_values.append(t)
  
  // Bottom edge: y = rect.y + rect.height
  if dy != 0:
    t = (rect.y + rect.height - centerY) / dy
    if t > 0: t_values.append(t)
  
  // Smallest positive t gives intersection
  t = min(t_values)
  
  return (centerX + t*dx, centerY + t*dy)
```

**Visual**:
```
Target point outside:
            ●  ← target (100, 50)
           ╱
          ╱
    ┌────●─────┐
    │    │  ○  │  ← center (50, 75)
    │    │     │
    └──────────┘
         ↑
    intersection point
```

**For Circles**:
```javascript
Pseudocode:
function intersectCircle(circle, targetPoint):
  centerX = circle.x + circle.width/2
  centerY = circle.y + circle.height/2
  radiusX = circle.width/2
  radiusY = circle.height/2
  
  // Direction (normalized)
  dx = targetPoint.x - centerX
  dy = targetPoint.y - centerY
  
  // For ellipse, normalize by radii
  // Find t where: (t*dx/rx)² + (t*dy/ry)² = 1
  
  A = (dx*dx)/(radiusX*radiusX) + (dy*dy)/(radiusY*radiusY)
  t = 1 / sqrt(A)
  
  return (centerX + t*dx, centerY + t*dy)
```

### Binding with Gap

Often you want the line to end slightly before the shape (a gap):

```javascript
Pseudocode:
function intersectWithGap(shape, targetPoint, gap):
  intersectionPoint = intersectShape(shape, targetPoint)
  
  // Move back along the line by 'gap' pixels
  dx = intersectionPoint.x - targetPoint.x
  dy = intersectionPoint.y - targetPoint.y
  distance = sqrt(dx*dx + dy*dy)
  
  if distance > gap:
    // Unit vector pointing to target
    ux = dx / distance
    uy = dy / distance
    
    // Move back by gap
    gappedX = intersectionPoint.x - ux * gap
    gappedY = intersectionPoint.y - uy * gap
    
    return (gappedX, gappedY)
  
  return intersectionPoint
```

**Visual**:
```
Without gap:        With gap (5px):
┌────────┐         ┌────────┐
│        ●──────   │      ● ────
│        │         │      ↑ 5px gap
└────────┘         └────────┘
```

---

## 9. Pan and Zoom

### Pan (Translation)

Moving the entire view:

```javascript
Pseudocode:
// On mouse drag:
deltaX = currentMouseX - previousMouseX
deltaY = currentMouseY - previousMouseY

panX += deltaX
panY += deltaY
```

### Zoom (Scaling)

Zooming in/out:

```javascript
Pseudocode:
// On mouse wheel:
zoomFactor = 1.1  // 10% zoom per scroll

if scrollingUp:
  scale *= zoomFactor
else:
  scale /= zoomFactor

// Constrain zoom levels
scale = clamp(scale, minZoom, maxZoom)
```

### Zoom to Point

The tricky part: zoom while keeping a specific point fixed (usually mouse position).

```javascript
Pseudocode:
function zoomToPoint(mouseScreenX, mouseScreenY, newScale):
  // Convert mouse to world coordinates (before zoom)
  worldX = (mouseScreenX - panX) / oldScale
  worldY = (mouseScreenY - panY) / oldScale
  
  // Update scale
  scale = newScale
  
  // Recalculate pan so world point stays under mouse
  panX = mouseScreenX - worldX * newScale
  panY = mouseScreenY - worldY * newScale
```

**Why This Works**: By converting the mouse position to world coordinates before changing scale, then adjusting pan to keep that world point under the mouse, the zoom appears to center on the cursor.

**Visual**:
```
Before zoom:          After zoom to cursor:
     ╔══════════╗          ╔═════════════════╗
     ║          ║          ║                 ║
     ║    ●─────║─────     ║       ●─────────║────
     ║    ↑cursor         ║       ↑cursor   ║
     ╚══════════╝          ╚═════════════════╝
           
The cursor stays over the same world point!
```

---

## 10. Advanced Topics

### Bézier Curves

For smooth curved lines, use cubic Bézier curves:

```javascript
Pseudocode:
// 4 control points: start, control1, control2, end
function bezierPoint(t, p0, p1, p2, p3):
  // t ranges from 0 to 1
  u = 1 - t
  
  // Cubic Bézier formula
  x = u³*p0.x + 3*u²*t*p1.x + 3*u*t²*p2.x + t³*p3.x
  y = u³*p0.y + 3*u²*t*p1.y + 3*u*t²*p2.y + t³*p3.y
  
  return (x, y)

// Generate curve points:
points = []
for t from 0 to 1 step 0.01:
  points.append(bezierPoint(t, start, ctrl1, ctrl2, end))
```

### Path Finding (Smart Routing)

For connectors that avoid obstacles:

```javascript
Pseudocode (A* algorithm simplified):
function findPath(start, end, obstacles):
  // Create grid
  grid = createGrid(bounds, cellSize)
  
  // Mark obstacle cells
  for each obstacle in obstacles:
    markCellsOccupied(grid, obstacle)
  
  // A* search
  openSet = [start]
  cameFrom = {}
  gScore = {start: 0}
  fScore = {start: heuristic(start, end)}
  
  while openSet not empty:
    current = node in openSet with lowest fScore
    
    if current == end:
      return reconstructPath(cameFrom, current)
    
    remove current from openSet
    
    for each neighbor of current:
      if neighbor is obstacle: continue
      
      tentative_gScore = gScore[current] + distance(current, neighbor)
      
      if tentative_gScore < gScore[neighbor]:
        cameFrom[neighbor] = current
        gScore[neighbor] = tentative_gScore
        fScore[neighbor] = gScore  [neighbor] + heuristic(neighbor, end)
        
        if neighbor not in openSet:
          add neighbor to openSet
  
  return null  // No path found

function heuristic(a, b):
  // Manhattan distance for grid
  return abs(a.x - b.x) + abs(a.y - b.y)
```

### Multi-Touch Gestures

For pinch-to-zoom and two-finger pan:

```javascript
Pseudocode:
function handleTouches(touch1, touch2):
  // Calculate center point between fingers
  centerX = (touch1.x + touch2.x) / 2
  centerY = (touch1.y + touch2.y) / 2
  
  // Calculate distance between fingers
  dx = touch2.x - touch1.x
  dy = touch2.y - touch1.y
  currentDistance = sqrt(dx*dx + dy*dy)
  
  if previousDistance exists:
    // Pinch zoom
    scaleChange = currentDistance / previousDistance
    zoomToPoint(centerX, centerY, scale * scaleChange)
    
    // Two-finger pan
    panDeltaX = centerX - previousCenterX
    panDeltaY = centerY - previousCenterY
    panX += panDeltaX
    panY += panDeltaY
  
  previousDistance = currentDistance
  previousCenterX = centerX
  previousCenterY = centerY
```

### Undo/Redo

Implement with a history stack:

```javascript
Pseudocode:
history = []
currentIndex = -1

function addToHistory(state):
  // Remove any redo history
  history = history[0..currentIndex+1]
  
  // Add new state
  history.append(deepCopy(state))
  currentIndex = history.length - 1
  
  // Limit history size
  if history.length > maxHistorySize:
    history.shift()  // Remove oldest
    currentIndex -= 1

function undo():
  if currentIndex > 0:
    currentIndex -= 1
    restoreState(history[currentIndex])

function redo():
  if currentIndex < history.length - 1:
    currentIndex += 1
    restoreState(history[currentIndex])
```

---

## Putting It All Together

### A Simple Drawing App in Pseudocode

```javascript
// State
elements = []
selectedTool = 'rectangle'
isDrawing = false
currentElement = null
pan = {x: 0, y: 0}
scale = 1

// Main drawing loop
function draw():
  clearCanvas()
  
  // Apply pan and zoom
  applyTransform(pan, scale)
  
  // Draw grid
  if gridEnabled:
    drawGrid()
  
  // Draw all elements
  for each element in elements:
    drawElement(element)
  
  // Draw resize handles for selected elements
  for each element in selectedElements:
    drawResizeHandles(element)
  
  resetTransform()

// Mouse down
function onMouseDown(screenX, screenY):
  // Convert to world coordinates
  worldX = (screenX - pan.x) / scale
  worldY = (screenY - pan.y) / scale
  
  if selectedTool == 'selection':
    // Hit test
    clickedElement = findElementAt(worldX, worldY)
    if clickedElement:
      select(clickedElement)
    else:
      clearSelection()
  
  else:
    // Start creating new element
    isDrawing = true
    currentElement = {
      type: selectedTool,
      x: worldX,
      y: worldY,
      width: 0,
      height: 0
    }
    elements.append(currentElement)

// Mouse move
function onMouseMove(screenX, screenY):
  worldX = (screenX - pan.x) / scale
  worldY = (screenY - pan.y) / scale
  
  if isDrawing and currentElement:
    // Update size
    currentElement.width = worldX - currentElement.x
    currentElement.height = worldY - currentElement.y
    
    // Snap if enabled
    if snapToGrid:
      currentElement.width = snapToGrid(currentElement.width)
      currentElement.height = snapToGrid(currentElement.height)
    
    redraw()

// Mouse up
function onMouseUp():
  if isDrawing:
    isDrawing = false
    addToHistory(elements)
    currentElement = null
```

---

## Key Takeaways

### Core Math You Need

1. **Distance Formula**: `√((x₂-x₁)² + (y₂-y₁)²)` - Used everywhere
2. **Rotation**: `(x', y') = (x·cos(θ) - y·sin(θ), x·sin(θ) + y·cos(θ))`
3. **Point-in-Shape**: Different for each shape type
4. **Bézier Curves**: For smooth paths
5. **Coordinate Transforms**: World ↔ Screen conversions

### Algorithm Patterns

1. **Iterate and Test**: Most algorithms loop through elements checking conditions
2. **Early Exit**: Return as soon as you find what you need
3. **Caching**: Store expensive calculations (e.g., anchor points)
4. **Thresholds**: Use small distances for "close enough" (snapping, hit testing)
5. **Inverse Operations**: Rotate the point instead of the shape (simpler)

### Design Principles

1. **Separation of Concerns**: Keep calculation logic separate from rendering
2. **Coordinate Systems**: Always be clear about world vs. screen space
3. **Immutability**: Consider making state changes explicit (for undo/redo)
4. **Progressive Enhancement**: Basic features first, then add anchors, snapping, etc.
5. **User Feedback**: Visual cues (guides, hover states) make tools feel responsive

---

## Going Further

### Recommended Reading

- **"Computer Graphics: Principles and Practice"** - Comprehensive graphics bible
- **"Real-Time Collision Detection"** - Advanced hit testing algorithms
- **"Game Programming Patterns"** - Design patterns for interactive systems
- **"Mathematics for 3D Game Programming"** - Goes deep on transforms and geometry

### Practice Projects

1. **Build a Grid System**: Start with snap-to-grid
2. **Add Shapes**: Rectangle, circle, line
3. **Implement Selection**: Click to select, drag to move
4. **Add Resize**: 8-handle system
5. **Rotation**: Rotate shapes with mouse
6. **Connections**: Line connector tool with snapping
7. **Pan/Zoom**: Make infinite canvas
8. **Undo/Redo**: History management

### Language-Specific Resources

While these algorithms work in any language, here are good starting points:

- **JavaScript/Canvas**: MDN Canvas Tutorial
- **Python/Pygame**: Pygame documentation
- **Rust/ggez**: Game engine with 2D primitives
- **C#/Unity**: Built-in 2D tools with editor
- **Java/Processing**: Great for learning graphics

---

## Conclusion

The algorithms behind drawing applications are surprisingly universal. Whether you're building a simple sketching tool or a professional CAD system, you'll use the same mathematical foundations:

- Coordinate systems and transforms
- Bounding boxes and centers
- Rotation via trigonometry
- Distance calculations for snapping
- Hit detection for interaction
- Bezier curves for smooth paths

Once you understand these concepts, the programming language becomes just syntax. The hard part—the *thinking*—is the same everywhere.

Start simple, add features incrementally, and soon you'll have built your own graphics system from scratch.

---

**Happy Building! 🎨**

*This document is based on real implementations from the Yappy drawing application. All code examples are pseudocode designed to be readable in any programming language.*
