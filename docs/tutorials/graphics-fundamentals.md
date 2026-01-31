# Graphics System Fundamentals: Core Algorithms Explained

> **A comprehensive guide to the mathematical foundations and algorithms that power interactive drawing applications — written for absolute beginners.**

## Introduction

Every modern drawing application — from simple sketching tools to professional CAD software — is built on the same fundamental principles. The calculations for resize handles, anchor points, snap-to-grid, and hit detection are universal concepts that transcend programming languages.

This guide starts from zero: what a pixel is, what a canvas is, how colors work, and how a drawing loop runs. Then it builds up to the core algorithms. No prior graphics programming experience is assumed. If you know basic arithmetic, you can follow along.

---

## Table of Contents

**Part I: The Basics**
1. [What is a Pixel?](#1-what-is-a-pixel)
2. [What is a Canvas?](#2-what-is-a-canvas)
3. [The Render Loop](#3-the-render-loop)
4. [Colors and Transparency](#4-colors-and-transparency)
5. [Canvas State Machine](#5-canvas-state-machine)
6. [Event Handling (User Input)](#6-event-handling-user-input)
7. [Drawing Order (Z-Index)](#7-drawing-order-z-index)

**Part II: Core Concepts**
8. [Coordinate Systems](#8-coordinate-systems)
9. [Bounding Boxes](#9-bounding-boxes)
10. [Trigonometry for Graphics](#10-trigonometry-for-graphics)
11. [Rotation Transformations](#11-rotation-transformations)

**Part III: Interaction Algorithms**
12. [Resize Handles](#12-resize-handles)
13. [Anchor Points](#13-anchor-points)
14. [Snapping Algorithms](#14-snapping-algorithms)
15. [Hit Detection](#15-hit-detection)
16. [Connector Binding](#16-connector-binding)
17. [Pan and Zoom](#17-pan-and-zoom)

**Part IV: Advanced Topics**
18. [Smart Spacing Guides](smart-spacing.md)
19. [Advanced Topics](#19-advanced-topics)

**Appendix**
- [Putting It All Together](#putting-it-all-together)
- [Key Takeaways](#key-takeaways)
- [Going Further](#going-further)

---

# Part I: The Basics

---

## 1. What is a Pixel?

A **pixel** (short for "picture element") is the smallest dot your screen can display. Your screen is a grid of these tiny dots.

```
A 6x4 pixel grid (zoomed in):

┌───┬───┬───┬───┬───┬───┐
│   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┤
│   │   │ ■ │ ■ │   │   │
├───┼───┼───┼───┼───┼───┤
│   │   │ ■ │ ■ │   │   │
├───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │
└───┴───┴───┴───┴───┴───┘

The four dark squares (■) form a tiny 2x2 shape.
At normal screen size, each square is about 0.3mm — invisible to the naked eye.
```

**Screen resolution** tells you how many pixels your screen has. A 1920x1080 screen has 1,920 columns and 1,080 rows = 2,073,600 pixels total.

**Device Pixel Ratio (DPR)**: Modern high-DPI screens (like Retina displays) pack 2x or 3x more physical pixels per logical pixel. A "1 pixel" line on a Retina screen actually uses 4 physical pixels (2x2). Graphics apps need to account for this to look crisp:

```
Standard screen (DPR = 1):     Retina screen (DPR = 2):
┌───┐                          ┌──┬──┐
│ 1 │  ← 1 logical pixel       │  │  │ ← 1 logical pixel
└───┘                          ├──┼──┤    but 4 physical pixels
                               │  │  │
                               └──┴──┘

To handle this:
canvasWidth  = displayWidth  * devicePixelRatio
canvasHeight = displayHeight * devicePixelRatio
```

---

## 2. What is a Canvas?

Think of a **canvas** as a blank piece of paper inside your browser. You can draw shapes, lines, text, and images on it using code.

### Immediate Mode vs. Retained Mode

There are two fundamentally different ways graphics systems work:

**Immediate mode** (what HTML Canvas uses): You give drawing *commands* and pixels appear. The canvas has no memory of what you drew — it's just pixels on a bitmap. If you want to move a rectangle, you have to erase everything and redraw it in the new position.

```
Analogy: Painting on paper with actual paint.
- You paint a red circle
- The paper now has red pixels — it doesn't know "there's a circle"
- To move the circle, you have to repaint the whole paper
```

**Retained mode** (what SVG/DOM uses): You create *objects* that the system remembers. You say "here's a rectangle at (10, 20)" and the system keeps track of it. To move it, you just change its position property.

```
Analogy: Sticking magnetic shapes on a whiteboard.
- Each shape is a separate object
- You can grab and move any shape independently
- The system redraws automatically
```

HTML Canvas is immediate mode — and this guide focuses on that approach because it gives you the most control and best performance for complex graphics.

### The Canvas Element

In a web browser, a canvas is an HTML element:

```html
<canvas id="myCanvas" width="800" height="600"></canvas>
```

You draw on it using the **2D rendering context**:

```javascript
Pseudocode:
canvas = getCanvasElement("myCanvas")
ctx = canvas.getContext("2d")      // "ctx" = the drawing context

// Now you can draw!
ctx.fillStyle = "red"              // Set the color
ctx.fillRect(10, 20, 100, 50)     // Draw a filled rectangle
```

The context (`ctx`) is your paintbrush. Every drawing operation goes through it.

### Common Drawing Operations

```javascript
Pseudocode:
// Filled rectangle
ctx.fillStyle = "blue"
ctx.fillRect(x, y, width, height)

// Outlined rectangle
ctx.strokeStyle = "black"
ctx.lineWidth = 2
ctx.strokeRect(x, y, width, height)

// Line
ctx.beginPath()
ctx.moveTo(x1, y1)        // Pick up the pen
ctx.lineTo(x2, y2)        // Draw to this point
ctx.stroke()               // Actually render the line

// Circle (arc from 0 to 2π radians = full circle)
ctx.beginPath()
ctx.arc(centerX, centerY, radius, 0, 2 * PI)
ctx.fill()

// Text
ctx.font = "24px Arial"
ctx.fillText("Hello", x, y)

// Clear everything (erase the canvas)
ctx.clearRect(0, 0, canvas.width, canvas.height)
```

---

## 3. The Render Loop

This is the single most important concept in graphics programming.

### The Problem

Since canvas is immediate mode, it has no memory. If you move a shape, the old pixels are still there. You need to:
1. Erase the whole canvas
2. Redraw everything in the new positions
3. Do this fast enough that it looks smooth

### What 60 FPS Means

Your screen refreshes 60 times per second (60 FPS = 60 frames per second). That means you have **16.7 milliseconds** to draw each frame. If your drawing code is slower than that, the animation looks choppy (stutters/jank).

```
Time →
│ Frame 1 │ Frame 2 │ Frame 3 │ Frame 4 │
│  16.7ms  │  16.7ms  │  16.7ms  │  16.7ms  │
│ clear    │ clear    │ clear    │ clear    │
│ draw all │ draw all │ draw all │ draw all │
│ shapes   │ shapes   │ shapes   │ shapes   │

At 60fps, the user sees smooth motion.
```

### The requestAnimationFrame Loop

Instead of using `setTimeout` or `setInterval` (which are imprecise), browsers provide `requestAnimationFrame` — it calls your function right before the next screen refresh:

```javascript
Pseudocode:
function renderLoop():
  // Step 1: Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Step 2: Draw everything
  for each element in elements:
    drawElement(ctx, element)

  // Step 3: Ask the browser to call us again next frame
  requestAnimationFrame(renderLoop)

// Start the loop
requestAnimationFrame(renderLoop)
```

**Why This Works**: The browser calls `renderLoop` ~60 times per second. Each time, we wipe the canvas clean and redraw every element. Because it happens so fast, the human eye perceives smooth, continuous motion.

### When to Redraw

Drawing everything 60 times per second even when nothing changed is wasteful. A common optimization is **dirty flag rendering**:

```javascript
Pseudocode:
needsRedraw = true    // Start with initial draw

function renderLoop():
  if needsRedraw:
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawAllElements()
    needsRedraw = false

  requestAnimationFrame(renderLoop)

// When something changes:
function onMouseMove():
  updateElementPosition()
  needsRedraw = true     // Mark canvas as needing a redraw
```

---

## 4. Colors and Transparency

### How Computers Represent Color

Every color on screen is made of three components: **Red**, **Green**, and **Blue** (RGB). Each ranges from 0 (none) to 255 (full intensity).

```
Mixing RGB:
Red   = (255,   0,   0)    ■ Pure red
Green = (  0, 255,   0)    ■ Pure green
Blue  = (  0,   0, 255)    ■ Pure blue
White = (255, 255, 255)    □ All colors at full
Black = (  0,   0,   0)    ■ No light at all
Yellow= (255, 255,   0)    ■ Red + Green
Purple= (128,   0, 128)    ■ Half red + Half blue
```

### Color Formats

Graphics code uses several formats for the same colors:

**Hex format** (`#RRGGBB`): Each pair of characters is a number in base-16 (hexadecimal), ranging from 00 (0) to FF (255).
```
#FF0000 = Red    (FF=255 red, 00=0 green, 00=0 blue)
#00FF00 = Green
#0000FF = Blue
#FFFFFF = White
#000000 = Black
#808080 = Gray   (128, 128, 128 — halfway for all three)
```

**Shorthand hex** (`#RGB`): Each character is doubled. `#F00` = `#FF0000`.

**RGB function**: `rgb(255, 0, 0)` = red.

**RGBA function**: Adds **alpha** (transparency). `rgba(255, 0, 0, 0.5)` = 50% transparent red.

### Transparency (Alpha)

Alpha controls how see-through a color is:
- `1.0` (or `255`) = fully opaque (solid)
- `0.5` (or `128`) = 50% transparent (semi-transparent)
- `0.0` (or `0`) = fully transparent (invisible)

```
Alpha blending visualized:

Background:  ████████████████  (white)
Shape:       ████████          (red, alpha=1.0)
Result:      ████████████████  (solid red over white)

Background:  ████████████████  (white)
Shape:       ░░░░░░░░          (red, alpha=0.5)
Result:      ████████████████  (pinkish — red blended with white)

Formula: resultColor = shapeColor * alpha + backgroundColor * (1 - alpha)
```

### Using Colors in Canvas

```javascript
Pseudocode:
// Solid colors
ctx.fillStyle = "#FF0000"           // Hex
ctx.fillStyle = "rgb(255, 0, 0)"    // RGB
ctx.fillStyle = "red"               // Named color

// With transparency
ctx.fillStyle = "rgba(255, 0, 0, 0.5)"   // 50% transparent red
ctx.globalAlpha = 0.5                      // Makes EVERYTHING 50% transparent
```

---

## 5. Canvas State Machine

The canvas context (`ctx`) works like a **state machine**. You set properties (color, line width, transform), and they stay in effect for every draw call until you change them.

### The Problem

```javascript
Pseudocode:
ctx.fillStyle = "red"
ctx.globalAlpha = 0.5
ctx.translate(100, 100)
drawShapeA()                // Red, 50% transparent, shifted right

// Oh no — now EVERYTHING after this is also red, 50% transparent, and shifted!
drawShapeB()                // This is also affected!
drawShapeC()                // This too!
```

### The Solution: save() and restore()

`ctx.save()` takes a snapshot of all current settings. `ctx.restore()` reverts to that snapshot.

```javascript
Pseudocode:
ctx.save()                  // Snapshot current state
  ctx.fillStyle = "red"
  ctx.globalAlpha = 0.5
  ctx.translate(100, 100)
  drawShapeA()              // Red, 50% transparent, shifted
ctx.restore()               // Revert to snapshot

drawShapeB()                // Normal! Unaffected by Shape A's settings
```

Think of it like a stack of papers:
```
save()    → push a copy of current settings onto the stack
restore() → pop the top copy off the stack and apply it

Stack visualization:
                    ┌─────────────────┐
save() →            │ fill=red        │  ← pushed
                    │ alpha=0.5       │
                    │ translate(100,0)│
                    ├─────────────────┤
                    │ fill=black      │  ← original
                    │ alpha=1.0       │
                    │ translate(0,0)  │
                    └─────────────────┘

restore() →         ┌─────────────────┐
                    │ fill=black      │  ← back to original
                    │ alpha=1.0       │
                    │ translate(0,0)  │
                    └─────────────────┘
```

**Critical rule**: Every `save()` must have a matching `restore()`. Forgetting a `restore()` causes state leaks — one shape's color/transform bleeds into the next.

### What Gets Saved

`save()`/`restore()` preserves:
- Fill and stroke colors
- Line width, cap, join
- Font settings
- Global alpha (transparency)
- Transform matrix (translate, rotate, scale)
- Clipping region
- Shadow settings
- Composite operation (blend mode)

---

## 6. Event Handling (User Input)

To make a drawing app interactive, you need to respond to mouse clicks, movement, and keyboard input.

### Mouse Events

The browser fires events when the user interacts with the canvas:

```javascript
Pseudocode:
canvas.on("mousedown", function(event):
  // User pressed the mouse button
  x = event.clientX - canvas.left    // Mouse X relative to canvas
  y = event.clientY - canvas.top     // Mouse Y relative to canvas
  startDrawing(x, y)
)

canvas.on("mousemove", function(event):
  // User moved the mouse (fires continuously)
  x = event.clientX - canvas.left
  y = event.clientY - canvas.top
  if isDrawing:
    updateShape(x, y)
    redraw()
)

canvas.on("mouseup", function(event):
  // User released the mouse button
  stopDrawing()
)
```

### The Event Flow for Drawing

```
User presses mouse button
        │
        ▼
   mousedown fires
   → Record start position
   → Set isDrawing = true
        │
        ▼ (user drags)
   mousemove fires (many times)
   → Calculate new width/height
   → Redraw canvas
        │
        ▼
   mouseup fires
   → Set isDrawing = false
   → Finalize shape
   → Save to history (for undo)
```

### Keyboard Events

```javascript
Pseudocode:
window.on("keydown", function(event):
  if event.key == "Delete":
    deleteSelectedElements()

  if event.key == "z" and event.ctrlKey:
    undo()

  if event.key == "z" and event.ctrlKey and event.shiftKey:
    redo()

  if event.shiftKey:
    enableConstrainedMode()    // e.g., perfect squares, straight lines
)
```

### Pointer Events (Modern)

Modern apps use **pointer events** instead of separate mouse/touch events. They handle mouse, touch, and stylus uniformly:

```javascript
Pseudocode:
// Works for mouse, finger, AND stylus pen
canvas.on("pointerdown", function(event):
  x = event.clientX
  y = event.clientY
  pressure = event.pressure    // 0.0 to 1.0 (pen pressure)
  startDrawing(x, y, pressure)
)
```

---

## 7. Drawing Order (Z-Index)

Canvas draws things in order, like laying cards on a table. Things drawn **later** appear **on top**.

```
Draw order:
1. Background (drawn first — behind everything)
2. Grid lines
3. Shape A (drawn second)
4. Shape B (drawn third — on top of A if they overlap)
5. Selection handles (drawn last — always on top)

Visual result:
┌──────────────┐
│  ┌────────┐  │  ← Shape B is on top
│  │ B      │  │     because it was drawn after A
│  │   ┌────┤  │
│  └───│ A  │  │  ← Shape A is partially hidden
│      │    │  │
│      └────┘  │
└──────────────┘
```

### Controlling Z-Order

To change which element appears on top, change the order in your elements array:

```javascript
Pseudocode:
elements = [shapeA, shapeB, shapeC]   // C is on top

function bringToFront(element):
  remove element from array
  append element to end of array       // Now it's drawn last = on top

function sendToBack(element):
  remove element from array
  insert element at beginning           // Now it's drawn first = behind everything
```

### Layer Systems

Professional apps group elements into **layers** — like transparent sheets stacked on top of each other:

```
Layer stack:
┌─────────────────┐  ← Layer 3: "Annotations" (on top)
│   text labels    │
├─────────────────┤  ← Layer 2: "Shapes"
│   rectangles     │
│   circles        │
├─────────────────┤  ← Layer 1: "Background" (at bottom)
│   grid           │
│   background     │
└─────────────────┘

Drawing order: Layer 1 first, then 2, then 3.
Each layer can be hidden, locked, or have its own opacity.
```

---

# Part II: Core Concepts

---

## 8. Coordinate Systems

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

**Key Concept**: In most canvas systems, Y increases *downward*, unlike traditional math where Y increases upward. This is because screens draw from the top-left corner, line by line, like reading a book.

### World Space vs. Screen Space

When you add **pan** (moving the view) and **zoom** (scaling), you need two coordinate systems:

1. **World Space**: Where elements actually exist (unchanging positions)
2. **Screen Space**: What you see on screen (affected by pan/zoom)

Think of it like a map app: the real city (world space) doesn't change, but you can scroll and zoom the map view (screen space).

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

## 9. Bounding Boxes

### Definition

A **bounding box** is the smallest rectangle that completely contains a shape. Even a circle or a star has a rectangular bounding box around it. Most graphics systems represent elements with:
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

Even complex shapes use a bounding box:
    ┌─────────────┐
    │     ★       │  ← The star's bounding box
    │   ★   ★     │     is a simple rectangle
    │ ★   ★   ★   │
    │   ★   ★     │
    │     ★       │
    └─────────────┘
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

## 10. Trigonometry for Graphics

If "sin" and "cos" make you nervous, this section will fix that. You only need to understand one picture.

### The Unit Circle

Imagine a clock with a hand of length 1. The tip of the hand traces a circle:

```
          90° (π/2)
            ●
           ╱│╲
         ╱  │  ╲
       ╱    │    ╲
180° ●──────○──────● 0° (start here)
(π)    ╲    │    ╱
         ╲  │  ╱
           ╲│╱
            ●
          270° (3π/2)

The hand starts pointing right (0°) and rotates counter-clockwise.
```

At any angle θ, the tip of the hand is at position:
- **x = cos(θ)** — how far right/left the tip is
- **y = sin(θ)** — how far up/down the tip is

```
Some key values:

Angle │  cos(θ)  │  sin(θ)  │ Position of tip
──────┼──────────┼──────────┼─────────────────
  0°  │    1     │    0     │ Right
 90°  │    0     │    1     │ Top*
180°  │   -1     │    0     │ Left
270°  │    0     │   -1     │ Bottom*

* Remember: in canvas, Y is flipped, so sin(90°) actually points down
```

**That's it.** `cos` gives you the X component and `sin` gives you the Y component of a direction. Every use of sin/cos in this entire guide is just this idea applied differently.

### Radians vs Degrees

Degrees are human-friendly (0° to 360°). Radians are math-friendly. Programming languages use radians.

One full circle = 360° = 2π radians (about 6.28 radians).

```javascript
Conversion:
radians = degrees * (π / 180)
degrees = radians * (180 / π)
```

**Common Angles**:
- 0° = 0 radians
- 45° = π/4 radians (≈ 0.785)
- 90° = π/2 radians (≈ 1.571)
- 180° = π radians (≈ 3.14)
- 360° = 2π radians (≈ 6.28)

### Practical Uses in Graphics

**Use 1: Finding a point on a circle's edge**
```javascript
// Point at angle θ on a circle of radius r, centered at (cx, cy):
pointX = cx + r * cos(θ)
pointY = cy + r * sin(θ)
```

**Use 2: Finding the angle between two points**
```javascript
// Angle from point A to point B:
angle = atan2(B.y - A.y, B.x - A.x)
// atan2 handles all quadrants correctly (unlike atan)
```

**Use 3: Finding the distance between two points**
```javascript
// The Pythagorean theorem — the most-used formula in graphics:
distance = sqrt((x2 - x1)² + (y2 - y1)²)
```

---

## 11. Rotation Transformations

### Why Rotation Needs Three Steps

You might think rotating is simple — just apply the rotation formula. But there's a catch: **rotation always happens around the origin (0, 0)**. If your shape isn't at the origin, it will swing in a wide arc instead of spinning in place.

The fix is three steps: move the center to the origin, rotate, then move back.

```
Step 1: Move center to origin    Step 2: Rotate       Step 3: Move back

    ●                             ╱●                       ╱●
    │                           ╱                        ╱
    │                         ╱                        ╱
    ○ center ──→ move ──→    ○ (origin)  ──→         ○ center
              to origin       rotate here            back to original position
```

### The Rotation Formula

```javascript
Given:
- Point to rotate: (px, py)
- Center of rotation: (cx, cy)
- Angle in radians: θ

Step 1: Translate to origin
dx = px - cx
dy = py - cy

Step 2: Apply rotation (this is just the unit circle idea!)
rotatedX = dx * cos(θ) - dy * sin(θ)
rotatedY = dx * sin(θ) + dy * cos(θ)

Step 3: Translate back
finalX = rotatedX + cx
finalY = rotatedY + cy
```

**Why cos and sin?** Remember the unit circle: cos gives the X component and sin gives the Y component of a rotated direction. The formula above is combining the X and Y contributions of the original point's position after rotation.

**Visual Example** (45° rotation):
```
Before:               After:
    ●                    ╱●
    │                  ╱
    │                ╱
    ○ ← center      ○
```

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

# Part III: Interaction Algorithms

---

## 12. Resize Handles

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

## 13. Anchor Points

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

## 14. Snapping Algorithms

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

**Why This Works**: Dividing by grid size gives you "how many grid cells away." Rounding snaps to the nearest whole cell. Multiplying back converts to pixels.

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

The **Euclidean distance** formula is fundamental to snapping (and almost everything in graphics):

```javascript
distance = sqrt((x2 - x1)² + (y2 - y1)²)

Pseudocode:
function distance(point1, point2):
  dx = point2.x - point1.x
  dy = point2.y - point1.y
  return sqrt(dx*dx + dy*dy)
```

**Why This Works**: It's the Pythagorean theorem. The horizontal distance (dx) and vertical distance (dy) form a right triangle. The distance formula gives you the hypotenuse — the straight-line distance.

```
point1 ●─────────── dx ───────────┐
       │                          │
       │                          │ dy
       │                          │
       │         distance         │
       └──────────────────────────● point2

distance² = dx² + dy²
distance  = sqrt(dx² + dy²)
```

---

## 15. Hit Detection

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

**Why This Works**: A point is inside a rectangle if it's to the right of the left edge, to the left of the right edge, below the top edge, and above the bottom edge. All four conditions must be true simultaneously.

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

By dividing dx by radiusX and dy by radiusY, we "squash" the ellipse into
a circle of radius 1 (a "unit circle"). Then we just check: is the point
less than 1 unit from the center?
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

Why "Manhattan distance"? Imagine walking on a grid (like Manhattan streets).
You can only go horizontal or vertical — no diagonals. The total blocks walked
(|dx| + |dy|) is the Manhattan distance. A diamond is the set of all points
within a certain Manhattan distance from the center.
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

  // Now check with normal rectangle test
  return pointInRectangle(unrotatedPoint, rect)
```

**Why This Works**: Instead of rotating the rectangle (which is complicated — it's no longer axis-aligned), we rotate the *click point* in the opposite direction. In this new "unrotated" frame, the rectangle is upright again, and we can use the simple rectangle test.

---

## 16. Connector Binding

### The Problem

When drawing a line from one shape to another, where exactly does it connect? You don't want the line to start from the shape's center — you want it to start from the edge.

```
Bad (line from center):       Good (line from edge):
┌────────┐                    ┌────────┐
│    ○───────────●            │        ●─────────●
│        │                    │        │
└────────┘                    └────────┘

The line should start where it exits the shape,
not from the middle.
```

### The Idea: Shoot a Ray

Imagine standing at the center of the shape and looking toward the target point. Walk in that direction until you hit the wall (edge). That's where the connector starts.

This is called **ray-edge intersection**: find where a ray from the center hits the shape boundary.

### Edge Intersection for Rectangles

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
  // t=0 is center, t=1 is target. We need the smallest t > 0
  // where the line crosses an edge.

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

  // Smallest positive t gives the first edge we hit
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
    (this is where the connector line starts)
```

### Edge Intersection for Circles

```javascript
Pseudocode:
function intersectCircle(circle, targetPoint):
  centerX = circle.x + circle.width/2
  centerY = circle.y + circle.height/2
  radiusX = circle.width/2
  radiusY = circle.height/2

  // Direction to target
  dx = targetPoint.x - centerX
  dy = targetPoint.y - centerY

  // For ellipse, find t where: (t*dx/rx)² + (t*dy/ry)² = 1
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

## 17. Pan and Zoom

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

# Part IV: Advanced Topics

---

## 19. Advanced Topics

### Bezier Curves

For smooth curved lines, use cubic Bezier curves:

```javascript
Pseudocode:
// 4 control points: start, control1, control2, end
function bezierPoint(t, p0, p1, p2, p3):
  // t ranges from 0 to 1
  u = 1 - t

  // Cubic Bezier formula
  x = u³*p0.x + 3*u²*t*p1.x + 3*u*t²*p2.x + t³*p3.x
  y = u³*p0.y + 3*u²*t*p1.y + 3*u*t²*p2.y + t³*p3.y

  return (x, y)

// Generate curve points:
points = []
for t from 0 to 1 step 0.01:
  points.append(bezierPoint(t, start, ctrl1, ctrl2, end))
```

**How to think about it**: A Bezier curve is like a rubber band. The start and end points are fixed. The control points are like magnets that pull the rubber band toward them, creating the curve shape.

```
Control points and the curve they create:

  ctrl1 ●
        │╲
        │  ╲  ← curve is "pulled" toward control points
        │    ╲
start ●─────────────────── ● end
                        ╱
                      ╱
                    ╱│
                 ● ctrl2
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
  // Remove any redo history (everything after current position)
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

```
Visual of the history stack:

                    currentIndex
                         ↓
history: [ state0, state1, state2 ]

After undo():       ↓
history: [ state0, state1, state2 ]

After new action:              ↓
history: [ state0, state1, state3 ]
                               ↑ state2 was discarded (no redo past this)
```

### Bonus: Path Finding (A* Algorithm)

> This is an advanced topic. Feel free to skip it and come back later.

For connectors that automatically route around obstacles (like in flowchart tools), you need a pathfinding algorithm. A* is the most common choice:

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
        fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, end)

        if neighbor not in openSet:
          add neighbor to openSet

  return null  // No path found

function heuristic(a, b):
  // Manhattan distance for grid
  return abs(a.x - b.x) + abs(a.y - b.y)
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

// Main drawing loop (runs ~60 times per second)
function draw():
  clearCanvas()

  // Apply pan and zoom
  applyTransform(pan, scale)

  // Draw grid (behind everything)
  if gridEnabled:
    drawGrid()

  // Draw all elements (in order — later = on top)
  for each element in elements:
    drawElement(element)

  // Draw resize handles for selected elements (always on top)
  for each element in selectedElements:
    drawResizeHandles(element)

  resetTransform()

// Mouse down
function onMouseDown(screenX, screenY):
  // Convert to world coordinates (screen → world)
  worldX = (screenX - pan.x) / scale
  worldY = (screenY - pan.y) / scale

  if selectedTool == 'selection':
    // Hit test — check elements in reverse order (top first)
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

1. **Distance Formula**: `sqrt((x2-x1)² + (y2-y1)²)` — Used everywhere
2. **Rotation**: `(x', y') = (x*cos(θ) - y*sin(θ), x*sin(θ) + y*cos(θ))`
3. **Point-in-Shape**: Different for each shape type
4. **Bezier Curves**: For smooth paths
5. **Coordinate Transforms**: World <-> Screen conversions

### Algorithm Patterns

1. **Iterate and Test**: Most algorithms loop through elements checking conditions
2. **Early Exit**: Return as soon as you find what you need
3. **Caching**: Store expensive calculations (e.g., anchor points, drawables)
4. **Thresholds**: Use small distances for "close enough" (snapping, hit testing)
5. **Inverse Operations**: Rotate the point instead of the shape (simpler)

### Design Principles

1. **Separation of Concerns**: Keep calculation logic separate from rendering
2. **Coordinate Systems**: Always be clear about world vs. screen space
3. **Save/Restore**: Always restore canvas state after transforming it
4. **Immutability**: Consider making state changes explicit (for undo/redo)
5. **Progressive Enhancement**: Basic features first, then add anchors, snapping, etc.
6. **User Feedback**: Visual cues (guides, hover states) make tools feel responsive

---

## Going Further

### Recommended Reading

- **"Computer Graphics: Principles and Practice"** — Comprehensive graphics bible
- **"Real-Time Collision Detection"** — Advanced hit testing algorithms
- **"Game Programming Patterns"** — Design patterns for interactive systems
- **"Mathematics for 3D Game Programming"** — Goes deep on transforms and geometry
- **MDN Canvas Tutorial** — Best free web resource for HTML Canvas

### Practice Projects

Build these in order — each one builds on the previous:

1. **Draw a static shape** — Just render a rectangle on canvas
2. **Add a render loop** — Clear and redraw every frame
3. **Handle mouse input** — Click to place shapes
4. **Implement drag to draw** — Mouse down → drag → mouse up creates shapes
5. **Add selection** — Click to select, show resize handles
6. **Implement resize** — Drag handles to resize shapes
7. **Add snapping** — Snap to grid, then snap to other objects
8. **Pan and Zoom** — Make an infinite canvas
9. **Add rotation** — Rotate shapes with a handle
10. **Connections** — Line connector tool with anchor snapping
11. **Undo/Redo** — History management
12. **Layers** — Group elements into orderable layers

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

- Pixels and the canvas as a drawing surface
- The render loop: clear, draw, repeat
- Coordinate systems and transforms
- Bounding boxes and centers
- Rotation via trigonometry
- Distance calculations for snapping
- Hit detection for interaction
- Bezier curves for smooth paths

Once you understand these concepts, the programming language becomes just syntax. The hard part — the *thinking* — is the same everywhere.

Start simple, add features incrementally, and soon you'll have built your own graphics system from scratch.

---

*This document is based on real implementations from the Yappy drawing application. All code examples are pseudocode designed to be readable in any programming language.*
