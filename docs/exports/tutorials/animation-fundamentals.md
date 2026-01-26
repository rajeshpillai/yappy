# Animation Fundamentals: From Interpolation to Spring Physics

> **A comprehensive guide to the mathematical principles and algorithms that power modern animation systems**

## Introduction

Every animation you see—from simple fades to complex morphing shapes—is built on fundamental mathematical principles. Whether you're using CSS animations, JavaScript libraries like GSAP or Framer Motion, or specialized tools like Manim for mathematical visualizations, the underlying concepts are universal.

This guide breaks down animation from first principles: interpolation, easing functions, timing, and physics-based motion. Once you understand these building blocks, you can create any animation effect in any framework.

---

## Table of Contents

1. [The Core Concept: Interpolation](#1-the-core-concept-interpolation)
2. [Time and Progress](#2-time-and-progress)
3. [Easing Functions](#3-easing-functions)
4. [Color Interpolation](#4-color-interpolation)
5. [Transform Animations](#5-transform-animations)
6. [Spring Physics](#6-spring-physics)
7. [Shape Morphing](#7-shape-morphing)
8. [Entrance and Exit Animations](#8-entrance-and-exit-animations)
9. [Keyframe Systems](#9-keyframe-systems)
10. [Advanced Effects](#10-advanced-effects)

---

## 1. The Core Concept: Interpolation

### What is Interpolation?

**Interpolation** is finding values *between* two known values. This is the heart of all animation.

```
Given:
- Start value (a) = 0
- End value (b) = 100
- Progress (t) = 0.5 (50% through animation)

Interpolated value = a + (b - a) * t
                    = 0 + (100 - 0) * 0.5
                    = 50
```

### Linear Interpolation (Lerp)

The fundamental formula for smooth transition:

```javascript
Pseudocode:
function lerp(start, end, progress):
  return start + (end - start) * progress

Examples:
lerp(0, 100, 0.0)  = 0     // 0% progress
lerp(0, 100, 0.25) = 25    // 25% progress  
lerp(0, 100, 0.5)  = 50    // 50% progress
lerp(0, 100, 1.0)  = 100   // 100% progress
```

**Visual Representation**:
```
Time:     0%      25%     50%     75%    100%
          ├────────┼────────┼────────┼────────┤
Value:    0       25      50      75      100
          ●        ●       ●       ●        ●
```

### Multi-Property Animation

Animate multiple properties simultaneously:

```javascript
Pseudocode:
function animateProperties(element, from, to, progress):
  element.x = lerp(from.x, to.x, progress)
  element.y = lerp(from.y, to.y, progress)
  element.opacity = lerp(from.opacity, to.opacity, progress)
  element.rotation = lerp(from.rotation, to.rotation, progress)

Example:
from = { x: 0, y: 0, opacity: 0, rotation: 0 }
to = { x: 100, y: 200, opacity: 1, rotation: 360 }
progress = 0.5

Result:
element.x = 50
element.y = 100
element.opacity = 0.5
element.rotation = 180
```

### Why This Matters

Every animation library uses interpolation under the hood. When you write:
- CSS: `transition: all 1s linear;`
- GSAP: `gsap.to(element, {x: 100, duration: 1})`
- Framer Motion: `animate={{x: 100}}`

They're all doing: `currentValue = lerp(startValue, endValue, progress)`

---

## 2. Time and Progress

### Converting Time to Progress

Animation engines convert elapsed time into a progress value (0 to 1):

```javascript
Pseudocode:
startTime = getCurrentTime()
duration = 1000  // milliseconds

function updateAnimation():
  currentTime = getCurrentTime()
  elapsedTime = currentTime - startTime
  progress = elapsedTime / duration
  
  // Clamp to [0, 1]
  if progress < 0:
    progress = 0
  if progress > 1:
    progress = 1
    animationComplete = true
  
  // Apply interpolation
  currentValue = lerp(startValue, endValue, progress)
```

**Timeline Visualization**:
```
Time:       0ms     250ms    500ms    750ms   1000ms
            ├────────┼────────┼────────┼────────┤
Progress:   0.0     0.25     0.5      0.75     1.0
```

### Delta Time (Frame-Independent Animation)

For smooth animation regardless of frame rate:

```javascript
Pseudocode:
lastFrameTime = getCurrentTime()

function gameLoop():
  currentTime = getCurrentTime()
  deltaTime = currentTime - lastFrameTime
  lastFrameTime = currentTime
  
  // Update animation by time elapsed
  elapsedTime += deltaTime
  progress = elapsedTime / duration
  
  // Use progress for interpolation
  currentValue = lerp(startValue, endValue, progress)
```

**Why Delta Time Matters**:
```
60 FPS game loop:
  deltaTime ≈ 16.67ms per frame
  After 10 frames: elapsedTime = 166.7ms

30 FPS game loop:
  deltaTime ≈ 33.33ms per frame
  After 5 frames: elapsedTime = 166.65ms

Same elapsed time, different frame counts!
```

### requestAnimationFrame Pattern

The standard web animation loop:

```javascript
Pseudocode (JavaScript-like):
startTime = null

function animate(timestamp):
  if startTime == null:
    startTime = timestamp
  
  elapsedTime = timestamp - startTime
  progress = min(elapsedTime / duration, 1.0)
  
  // Apply eased progress
  easedProgress = easeInOutCubic(progress)
  currentValue = lerp(startValue, endValue, easedProgress)
  
  // Update display
  render(currentValue)
  
  // Continue animation
  if progress < 1.0:
    requestAnimationFrame(animate)

// Start
requestAnimationFrame(animate)
```

---

## 3. Easing Functions

### The Problem with Linear

Linear animation feels mechanical and unnatural. Real-world objects accelerate and decelerate.

```
Linear (boring):
Speed: ━━━━━━━━━━━━━━━━ (constant)

Eased (natural):
Speed: ╱━━━━━━━━━━━━━╲  (accelerate → constant → decelerate)
```

### Easing Function Signature

An easing function transforms linear progress (0 to 1) into eased progress (0 to 1):

```javascript
Pseudocode:
function easeFunction(t):  // t is linear progress [0, 1]
  // Transform t
  return easedT  // still [0, 1] but with different curve
```

### Essential Easing Functions

#### 1. Ease In (Slow Start, Fast End)

```javascript
function easeInQuad(t):
  return t * t

function easeInCubic(t):
  return t * t * t

function easeInQuart(t):
  return t * t * t * t
```

**Visual Curve**:
```
Progress:
1.0 ┤                  ╭─
    │                ╭─
0.5 ┤              ╭─
    │           ╭──
0.0 ┼──────────
    0        0.5      1.0 (time)
    
Slow start → Fast end
```

#### 2. Ease Out (Fast Start, Slow End)

```javascript
function easeOutQuad(t):
  return t * (2 - t)

function easeOutCubic(t):
  return 1 - pow(1 - t, 3)

function easeOutQuart(t):
  return 1 - pow(1 - t, 4)
```

**Visual Curve**:
```
Progress:
1.0 ┼──────────
    │     ╰──╮
0.5 ┤        ╰╮
    │          ╰─╮
0.0 ┤            ╰─
    0        0.5      1.0 (time)
    
Fast start → Slow end
```

#### 3. Ease In-Out (Smooth Both Ends)

```javascript
function easeInOutCubic(t):
  if t < 0.5:
    return 4 * t * t * t
  else:
    return 1 - pow(-2 * t + 2, 3) / 2

function easeInOutQuad(t):
  if t < 0.5:
    return 2 * t * t
  else:
    return 1 - pow(-2 * t + 2, 2) / 2
```

**Visual Curve**:
```
Progress:
1.0 ┤         ╭──────
    │       ╭─
0.5 ┤     ╭─
    │   ╭─
0.0 ┼──
    0        0.5      1.0 (time)
    
Smooth acceleration and deceleration
```

#### 4. Elastic (Bouncy)

```javascript
function easeOutElastic(t):
  c4 = (2 * PI) / 3
  
  if t == 0:
    return 0
  if t == 1:
    return 1
  
  return pow(2, -10 * t) * sin((t * 10 - 0.75) * c4) + 1
```

**Visual Curve**:
```
Progress:
1.2 ┤      ╭╮
1.0 ┤    ╭─╯╰╮╭╮
0.8 ┤   ╱    ╰╯╰──
0.0 ┼──
    0        0.5      1.0 (time)
    
Overshoots then settles
```

#### 5. Bounce (Ball Dropping)

```javascript
function easeOutBounce(t):
  n1 = 7.5625
  d1 = 2.75
  
  if t < 1 / d1:
    return n1 * t * t
  else if t < 2 / d1:
    t -= 1.5 / d1
    return n1 * t * t + 0.75
  else if t < 2.5 / d1:
    t -= 2.25 / d1
    return n1 * t * t + 0.9375
  else:
    t -= 2.625 / d1
    return n1 * t * t + 0.984375
```

**Visual Curve**:
```
Progress:
1.0 ┼─╮  ╭╮╭╮╭──
    │ ╰──╯╰╯╰╯
0.5 ┤
    │
0.0 ┤
    0        0.5      1.0 (time)
    
Multiple bounces settling down
```

### Bezier Curves (Custom Easing)

CSS uses cubic Bezier curves for custom easing:

```javascript
// CSS: cubic-bezier(0.4, 0.0, 0.2, 1)

function cubicBezier(t, p0, p1, p2, p3):
  // Cubic Bezier formula
  u = 1 - t
  return (
    pow(u, 3) * p0 +
    3 * pow(u, 2) * t * p1 +
    3 * u * pow(t, 2) * p2 +
    pow(t, 3) * p3
  )

// For easing, p0=0, p3=1
function customEase(t, x1, y1, x2, y2):
  // Solve for t where bezier.x = t
  // Return bezier.y at that t
  // (Requires iterative solving, simplified here)
  return cubicBezierY(t, 0, y1, y2, 1)
```

### Using Easing Functions

```javascript
Pseudocode:
// Instead of linear:
currentValue = lerp(startValue, endValue, progress)

// Use eased progress:
easedProgress = easeInOutCubic(progress)
currentValue = lerp(startValue, endValue, easedProgress)

Example:
startValue = 0
endValue = 100
progress = 0.5  // Linear 50%

Linear:
  value = lerp(0, 100, 0.5) = 50

Eased (easeInOutCubic):
  easedProgress = easeInOutCubic(0.5) = 0.5  // Happens to be same
  
progress = 0.25:
  Linear: lerp(0, 100, 0.25) = 25
  Eased: lerp(0, 100, easeInOutCubic(0.25)) 
       = lerp(0, 100, 0.125) = 12.5
```

---

## 4. Color Interpolation

### RGB Interpolation

Interpolate each color channel independently:

```javascript
Pseudocode:
function lerpColor(colorA, colorB, progress):
  r = lerp(colorA.r, colorB.r, progress)
  g = lerp(colorA.g, colorB.g, progress)
  b = lerp(colorA.b, colorB.b, progress)
  a = lerp(colorA.a, colorB.a, progress)
  
  return rgba(r, g, b, a)

Example:
from = rgba(255, 0, 0, 1)    // Red
to = rgba(0, 0, 255, 1)      // Blue
progress = 0.5

result:
  r = lerp(255, 0, 0.5) = 127.5
  g = lerp(0, 0, 0.5) = 0
  b = lerp(0, 255, 0.5) = 127.5
  a = lerp(1, 1, 0.5) = 1
  
  = rgba(128, 0, 128, 1)  // Purple
```

**Visual**:
```
Red     →    Purple    →    Blue
█████        █████          █████
(255,0,0)    (128,0,128)    (0,0,255)
```

### HSL Interpolation (Better for Hue)

For more natural color transitions:

```javascript
Pseudocode:
function lerpColorHSL(colorA, colorB, progress):
  // Convert RGB to HSL
  hslA = rgbToHsl(colorA)
  hslB = rgbToHsl(colorB)
  
  // Interpolate in HSL space
  h = lerpHue(hslA.h, hslB.h, progress)  // Special hue lerp
  s = lerp(hslA.s, hslB.s, progress)
  l = lerp(hslA.l, hslB.l, progress)
  
  // Convert back to RGB
  return hslToRgb(h, s, l)

// Hue wraps around 360°
function lerpHue(h1, h2, progress):
  diff = h2 - h1
  
  // Take shorter path around color wheel
  if abs(diff) > 180:
    if diff > 0:
      h1 += 360
    else:
      h2 += 360
  
  result = lerp(h1, h2, progress)
  
  // Wrap to [0, 360)
  return result % 360
```

**Why HSL is Better**:
```
RGB: Red → Blue goes through muddy colors
     (255,0,0) → (128,0,128) → (0,0,255)

HSL: Red → Blue goes through vibrant spectrum
     Hue: 0° → 180° → 360° (through cyan, green, etc.)
```

---

## 5. Transform Animations

### Position (Translation)

Simple X/Y interpolation:

```javascript
Pseudocode:
from = { x: 0, y: 0 }
to = { x: 100, y: 200 }

function animate(progress):
  element.x = lerp(from.x, to.x, progress)
  element.y = lerp(from.y, to.y, progress)
```

### Rotation

Interpolate angles (watch for wrapping):

```javascript
Pseudocode:
function lerpRotation(angleA, angleB, progress):
  // Normalize angles to [0, 360)
  angleA = angleA % 360
  angleB = angleB % 360
  
  // Find shortest path
  diff = angleB - angleA
  
  if diff > 180:
    angleA += 360
  else if diff < -180:
    angleB += 360
  
  return lerp(angleA, angleB, progress) % 360

Example:
from = 350°
to = 10°

Without wrapping:
  lerp(350, 10, 0.5) = 180°  // Wrong! Goes the long way

With wrapping:
  diff = 10 - 350 = -340°
  Since diff < -180: to += 360 → 370°
  lerp(350, 370, 0.5) = 360° = 0°  // Correct!
```

**Visual**:
```
Rotation path:
    0° (North)
    │
350°┤ ↻  ┌─10°
    │   │
    └───┘
    
Shortest path: 350° → 360° → 10° (20° rotation)
Not: 350° → 180° → 10° (340° rotation)
```

### Scale

Interpolate scale factors:

```javascript
Pseudocode:
function animateScale(progress):
  scale = lerp(1.0, 2.0, easeOutElastic(progress))
  
  element.scaleX = scale
  element.scaleY = scale
```

**Bounce Scale Effect**:
```
Scale over time (with elastic easing):
2.0 ┤      ╭╮
    │    ╭─╯╰╮
1.5 ┤   ╱    ╰╮
    │  ╱      ╰╮
1.0 ┼──        ╰─
```

### Combined Transforms

Animate multiple transforms together:

```javascript
Pseudocode:
function animateTransform(progress):
  easedProgress = easeInOutCubic(progress)
  
  x = lerp(0, 100, easedProgress)
  y = lerp(0, 50, easedProgress)
  rotation = lerp(0, 360, easedProgress)
  scale = lerp(0.5, 1.5, easedProgress)
  opacity = lerp(0, 1, easedProgress)
  
  applyTransforms(element, x, y, rotation, scale, opacity)
```

---

## 6. Spring Physics

### What are Springs?

**Spring animations** don't use duration—they use physics! Objects move with *acceleration* and *velocity* until they settle at the target.

```
Traditional easing:
  Position ──────────► Target (arrives at t=duration)

Spring physics:
  Position ~~~○~~~○~~~○~~○~○~●  (oscillates then settles)
  (Velocity and damping determine motion)
```

### Spring Physics Equations

Based on **Hooke's Law** and **damping**:

```javascript
Pseudocode:
// Spring parameters
stiffness = 100      // How "tight" the spring is
damping = 10         // Resistance to motion
mass = 1             // Object mass

// State
position = currentPosition
velocity = 0
target = targetPosition

function updateSpring(deltaTime):
  // Spring force: F = -k * x (Hooke's Law)
  springForce = -stiffness * (position - target)
  
  // Damping force: F = -d * v
  dampingForce = -damping * velocity
  
  // Total force
  force = springForce + dampingForce
  
  // Acceleration: F = ma → a = F/m
  acceleration = force / mass
  
  // Update velocity and position (Euler integration)
  velocity += acceleration * deltaTime
  position += velocity * deltaTime
  
  return position
```

**Step-by-Step Example**:
```
Initial state:
  position = 0
  target = 100
  velocity = 0

Frame 1 (deltaTime = 0.016s):
  springForce = -100 * (0 - 100) = 10000
  dampingForce = -10 * 0 = 0
  acceleration = 10000 / 1 = 10000
  velocity = 0 + 10000 * 0.016 = 160
  position = 0 + 160 * 0.016 = 2.56
  
Frame 2:
  springForce = -100 * (2.56 - 100) = 9744
  dampingForce = -10 * 160 = -1600
  acceleration = (9744 - 1600) / 1 = 8144
  velocity = 160 + 8144 * 0.016 = 290.3
  position = 2.56 + 290.3 * 0.016 = 7.2
  
... continues until velocity ≈ 0 and position ≈ 100
```

### Configurable Spring Feel

Different spring parameters create different feels:

```javascript
// Bouncy spring (low damping)
stiffness = 200
damping = 10
// Result: ~~~○~○~~○~~~○~~~~● (lots of oscillation)

// Gentle spring (high damping)
stiffness = 200
damping = 50
// Result: ╱──────● (smooth settle, little overshoot)

// Slow spring (low stiffness)
stiffness = 50
damping = 10
// Result: ╱~~~~~~~○~~~● (slow approach)

// Snappy spring (high stiffness + high damping)
stiffness = 400
damping = 40
// Result: ╱──● (quick, minimal overshoot)
```

### Critical Damping

The *perfect* damping where there's no oscillation but maximum speed:

```javascript
Pseudocode:
criticalDamping = 2 * sqrt(stiffness * mass)

// Underdamped (damping < critical): Bouncy
// Critically damped (damping = critical): Perfect
// Overdamped (damping > critical): Sluggish
```

**Visual Comparison**:
```
Target = 100

Underdamped:
100 ┤    ╭╮  ╭╮
    │  ╭─╯╰──╯╰──
  0 ┼──
  
Critically Damped:
100 ┤    ╭─────
    │  ╭─
  0 ┼──

Overdamped:
100 ┤        ╭───
    │     ╭──
  0 ┼─────
```

### Presets (Like Framer Motion)

```javascript
// Common spring presets
const springPresets = {
  // Smooth
  gentle: { stiffness: 120, damping: 14 },
  
  // Playful
  wobbly: { stiffness: 180, damping: 12 },
  
  // Fast
  snappy: { stiffness: 400, damping: 30 },
  
  // Slow
  molasses: { stiffness: 80, damping: 20 }
}
```

---

## 7. Shape Morphing

### What is Morphing?

Smoothly transforming one shape into another.

```
Circle → Square:
  ●        ●●        ▄●▄       ▄▄▄       ███
           ●●        ███       ███       ███
                                          
Frames:   0%       25%       50%       75%      100%
```

### SVG Path Morphing

SVG paths can morph if they have the **same number of points**:

```javascript
Pseudocode:
// Two paths with same point count
pathA = "M 50,50 L 100,50 L 100,100 L 50,100 Z"  // Square
pathB = "M 75,25 L 125,75 L 75,125 L 25,75 Z"    // Diamond

// Extract points
pointsA = [[50,50], [100,50], [100,100], [50,100]]
pointsB = [[75,25], [125,75], [75,125], [25,75]]

function morphPath(progress):
  morphedPoints = []
  
  for i in range(pointsA.length):
    x = lerp(pointsA[i].x, pointsB[i].x, progress)
    y = lerp(pointsA[i].y, pointsB[i].y, progress)
    morphedPoints.push([x, y])
  
  return buildPath(morphedPoints)
```

**Point-by-Point Interpolation**:
```
Square (4 points):          Diamond (4 points):
1●──────●2                     ●2
 │      │                     ╱ ╲
 │      │                    ╱   ╲
4●──────●3                 1●     ●3
                             ╲   ╱
                              ╲ ╱
                               ●4

At 50% progress:
Each point is halfway between positions
```

### Point Matching Problem

Different shapes have different point counts:

```
Triangle (3 points) → Square (4 points)
Problem: Can't interpolate 3 points to 4 points directly!

Solution: Add intermediate points
Triangle: A, B, C
Add point: A, B, B', C (now 4 points)

Or use curve subdivision to match point counts
```

### Bézier Curve Morphing

Morph control points of curves:

```javascript
Pseudocode:
// Cubic Bézier: 4 control points
curveA = [P0, P1, P2, P3]
curveB = [Q0, Q1, Q2, Q3]

function morphCurve(progress):
  P0_morphed = lerp(curveA.P0, curveB.Q0, progress)
  P1_morphed = lerp(curveA.P1, curveB.Q1, progress)
  P2_morphed = lerp(curveA.P2, curveB.Q2, progress)
  P3_morphed = lerp(curveA.P3, curveB.Q3, progress)
  
  return cubicBezier(P0_morphed, P1_morphed, P2_morphed, P3_morphed)
```

### Number/Text Morphing

Morph individual digits or letters:

```javascript
Pseudocode:
function morphNumber(from, to, progress):
  current = lerp(from, to, progress)
  
  // Optional: Round to integers for counting effect
  return round(current)

Example:
from = 0
to = 1000
progress = 0.5

result = lerp(0, 1000, 0.5) = 500

// With easing:
easedProgress = easeOutQuad(0.5) = 0.75
result = lerp(0, 1000, 0.75) = 750
```

**Animated Counter**:
```
Frame 0:   0
Frame 1:   42
Frame 2:   156
Frame 3:   398
Frame 4:   721
Frame 5:   942
Frame 6:   1000
```

---

## 8. Entrance and Exit Animations

### Entrance Animations

#### 1. Fade In

```javascript
Pseudocode:
function fadeIn(progress):
  opacity = lerp(0, 1, easeOut(progress))
  element.style.opacity = opacity
```

#### 2. Slide In

```javascript
Pseudocode:
// Slide from left
function slideInLeft(progress):
  x = lerp(-100, 0, easeOutCubic(progress))  // percent
  element.style.transform = `translateX(${x}%)`
  
// Slide from top
function slideInTop(progress):
  y = lerp(-100, 0, easeOutCubic(progress))
  element.style.transform = `translateY(${y}%)`
```

#### 3. Scale In (Pop)

```javascript
Pseudocode:
function scaleIn(progress):
  scale = lerp(0, 1, easeOutBack(progress))
  element.style.transform = `scale(${scale})`

// easeOutBack creates slight overshoot
function easeOutBack(t):
  c1 = 1.70158
  c3 = c1 + 1
  return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2)
```

**Scale with Overshoot**:
```
Scale:
1.1 ┤    ╭╮
1.0 ┤   ╱ ╰──
0.5 ┤  ╱
0.0 ┼──
    0      1.0 (progress)
```

#### 4. Rotate In

```javascript
Pseudocode:
function rotateIn(progress):
  rotation = lerp(180, 0, easeOutCubic(progress))
  opacity = lerp(0, 1, progress)
  
  element.style.transform = `rotate(${rotation}deg)`
  element.style.opacity = opacity
```

#### 5. Blur In

```javascript
Pseudocode:
function blurIn(progress):
  blur = lerp(20, 0, easeOut(progress))  // pixels
  opacity = lerp(0, 1, progress)
  
  element.style.filter = `blur(${blur}px)`
  element.style.opacity = opacity
```

### Exit Animations

Exit animations are typically the *reverse* of entrance:

```javascript
Pseudocode:
// Fade out (reverse of fade in)
function fadeOut(progress):
  opacity = lerp(1, 0, easeIn(progress))
  element.style.opacity = opacity

// Slide out right (reverse of slide in left)
function slideOutRight(progress):
  x = lerp(0, 100, easeInCubic(progress))
  element.style.transform = `translateX(${x}%)`

// Scale out
function scaleOut(progress):
  scale = lerp(1, 0, easeInBack(progress))
  element.style.transform = `scale(${scale})`
```

### Stagger Animations

Animate multiple elements with delay:

```javascript
Pseudocode:
elements = [elem1, elem2, elem3, elem4]
staggerDelay = 100  // ms between each element

function animateStaggered(elapsedTime):
  for i in range(elements.length):
    // Each element starts after delay
    elementStartTime = i * staggerDelay
    elementElapsed = elapsedTime - elementStartTime
    
    if elementElapsed > 0:
      progress = min(elementElapsed / duration, 1.0)
      animateElement(elements[i], progress)
```

**Visual Stagger**:
```
Element 1: ━━━━━━━━━━
Element 2:   ━━━━━━━━━━
Element 3:     ━━━━━━━━━━
Element 4:       ━━━━━━━━━━

Time:      100 200 300 400 500 600 (ms)
```

### Coordinated Entrance

Multiple properties animated together:

```javascript
Pseudocode:
function entranceCombo(progress):
  // Opacity: 0 → 1
  opacity = lerp(0, 1, easeOut(progress))
  
  // Y position: 50px below → 0
  y = lerp(50, 0, easeOutCubic(progress))
  
  // Scale: 0.8 → 1
  scale = lerp(0.8, 1, easeOutBack(progress))
  
  // Blur: 10px → 0px
  blur = lerp(10, 0, easeOut(progress))
  
  element.style.opacity = opacity
  element.style.transform = `translateY(${y}px) scale(${scale})`
  element.style.filter = `blur(${blur}px)`
```

---

## 9. Keyframe Systems

### What are Keyframes?

Define specific values at specific times, interpolate between them.

```
Keyframes:
Time:  0%        30%         70%        100%
       ├─────────┼───────────┼──────────┤
X:     0         100         100        200
Y:     0         0           100        100
       ●─────────●           ●          ●
                  ╲          │
                   ╲         │
                    ╰────────╯
```

### Keyframe Data Structure

```javascript
Pseudocode:
keyframes = [
  { time: 0.0, x: 0, y: 0, scale: 1, opacity: 0 },
  { time: 0.3, x: 100, y: 0, scale: 1.2, opacity: 1 },
  { time: 0.7, x: 100, y: 100, scale: 1, opacity: 1 },
  { time: 1.0, x: 200, y: 100, scale: 1, opacity: 0 }
]
```

### Keyframe Interpolation

Find which keyframes to interpolate between:

```javascript
Pseudocode:
function getValueAtTime(keyframes, property, progress):
  // Find surrounding keyframes
  previousKeyframe = null
  nextKeyframe = null
  
  for i in range(keyframes.length):
    if keyframes[i].time <= progress:
      previousKeyframe = keyframes[i]
    if keyframes[i].time > progress and nextKeyframe == null:
      nextKeyframe = keyframes[i]
      break
  
  // Handle edge cases
  if previousKeyframe == null:
    return keyframes[0][property]
  if nextKeyframe == null:
    return keyframes[keyframes.length - 1][property]
  
  // Calculate local progress between keyframes
  timeRange = nextKeyframe.time - previousKeyframe.time
  localProgress = (progress - previousKeyframe.time) / timeRange
  
  // Interpolate
  startValue = previousKeyframe[property]
  endValue = nextKeyframe[property]
  
  return lerp(startValue, endValue, localProgress)
```

**Example Calculation**:
```
Keyframes:
  [0.0, x=0], [0.3, x=100], [1.0, x=200]

Query: x at progress=0.5

Step 1: Find surrounding keyframes
  previous = [0.3, x=100]
  next = [1.0, x=200]

Step 2: Local progress
  timeRange = 1.0 - 0.3 = 0.7
  localProgress = (0.5 - 0.3) / 0.7 = 0.286

Step 3: Interpolate
  x = lerp(100, 200, 0.286) = 128.6
```

### Per-Keyframe Easing

Each keyframe segment can have its own easing:

```javascript
Pseudocode:
keyframes = [
  { time: 0.0, x: 0, easing: "easeOut" },
  { time: 0.5, x: 100, easing: "easeInOut" },
  { time: 1.0, x: 200, easing: null }
]

function interpolateKeyframe(prev, next, localProgress):
  // Apply easing function for this segment
  easedProgress = applyEasing(localProgress, prev.easing)
  
  return lerp(prev.x, next.x, easedProgress)
```

### CSS Keyframes Translation

CSS `@keyframes` work the same way:

```css
@keyframes slideAndFade {
  0% {
    transform: translateX(0);
    opacity: 0;
  }
  50% {
    transform: translateX(100px);
    opacity: 1;
  }
  100% {
    transform: translateX(200px);
    opacity: 0;
  }
}
```

Corresponds to:
```javascript
keyframes = [
  { time: 0.0, x: 0, opacity: 0 },
  { time: 0.5, x: 100, opacity: 1 },
  { time: 1.0, x: 200, opacity: 0 }
]
```

---

## 10. Advanced Effects

### Shake Animation

Oscillate position with decreasing amplitude:

```javascript
Pseudocode:
function shake(progress, intensity, frequency):
  // Amplitude decreases over time
  amplitude = intensity * (1 - progress)
  
  // Oscillate using sine wave
  offset = amplitude * sin(progress * frequency * 2 * PI)
  
  return offset

Example usage:
function animateShake(progress):
  offset = shake(progress, intensity=10, frequency=4)
  element.x = baseX + offset

// Result:
// ╭╮╭╮
// ╰╯╰╯╮╭╮╭
//     ╰╯╰╯─
```

**Parameters**:
- `intensity`: Maximum shake distance (pixels)
- `frequency`: Number of shakes per animation
- Amplitude decreases: `10 → 8 → 5 → 2 → 0`

### Wave Animation

Create traveling wave effect:

```javascript
Pseudocode:
function wave(x, time, amplitude, wavelength, speed):
  // Sine wave formula
  offset = amplitude * sin((x / wavelength - time * speed) * 2 * PI)
  return offset

// Apply to multiple elements
function animateWave(elements, time):
  for i in range(elements.length):
    x = i * spacing
    offset = wave(x, time, amplitude=20, wavelength=100, speed=2)
    elements[i].y = baseY + offset
```

**Visual Wave**:
```
Frame 1:    ╭─╮   ╭─╮
           ╱   ╰─╯   ╰

Frame 2:  ╭─╮   ╭─╮   
         ╱   ╰─╯   ╰─

Frame 3:╮   ╭─╮   ╭─╮
        ╰─╯   ╰─╯   ╰
```

### Parallax Scrolling

Different layers move at different speeds:

```javascript
Pseudocode:
layers = [
  { element: background, speed: 0.2 },   // Slow
  { element: midground, speed: 0.5 },    // Medium
  { element: foreground, speed: 1.0 }    // Fast (normal)
]

function updateParallax(scrollPosition):
  for layer in layers:
    offset = scrollPosition * layer.speed
    layer.element.y = -offset
```

**Depth Effect**:
```
Scroll distance: 100px

Background:   20px (0.2x) →  feels far
Midground:    50px (0.5x) →  middle depth
Foreground:  100px (1.0x) →  feels close
```

### Elastic Overshoot

Overshoot target then settle:

```javascript
Pseudocode:
function easeOutElastic(t, amplitude=1, period=0.3):
  if t == 0 or t == 1:
    return t
  
  s = period / 4
  return (
    amplitude * 
    pow(2, -10 * t) * 
    sin((t - s) * (2 * PI) / period) + 
    1
  )

Usage:
position = lerp(0, 100, easeOutElastic(progress))

// Result:
//     ╭╮
// ───╱ ╰╮╭╮
//       ╰╯╰──
```

### Inertia / Momentum

Continue motion after input stops:

```javascript
Pseudocode:
velocity = 0
friction = 0.9  // 0-1, higher = less friction

function updateInertia(deltaX, deltaTime):
  // Apply input
  velocity += deltaX / deltaTime
  
  // Apply friction
  velocity *= friction
  
  // Update position
  position += velocity * deltaTime
  
  // Stop when very slow
  if abs(velocity) < 0.1:
    velocity = 0

Visual:
Input stops here ↓
━━━━━━━━━━━━━━━╮
                ╰──╮
                   ╰─╮
                     ╰─  (coasts to stop)
```

### Path Following

Animate along a curve:

```javascript
Pseudocode:
// Define path as series of points
path = [
  {x: 0, y: 0},
  {x: 50, y: 100},
  {x: 150, y: 120},
  {x: 200, y: 50}
]

function getPointOnPath(path, progress):
  // Total segments
  totalSegments = path.length - 1
  
  // Which segment? (0 to totalSegments-1)
  segmentFloat = progress * totalSegments
  segmentIndex = floor(segmentFloat)
  segmentProgress = segmentFloat - segmentIndex
  
  // Clamp to last segment
  if segmentIndex >= totalSegments:
    return path[path.length - 1]
  
  // Interpolate within segment
  start = path[segmentIndex]
  end = path[segmentIndex + 1]
  
  x = lerp(start.x, end.x, segmentProgress)
  y = lerp(start.y, end.y, segmentProgress)
  
  return {x, y}
```

### Orchestration (Sequences)

Run animations in sequence or parallel:

```javascript
Pseudocode:
// Sequential timeline
timeline = [
  { animation: fadeIn, start: 0, duration: 500 },
  { animation: slideIn, start: 500, duration: 800 },
  { animation: scaleUp, start: 1300, duration: 400 }
]

function updateTimeline(elapsedTime):
  for item in timeline:
    if elapsedTime >= item.start:
      animTime = elapsedTime - item.start
      if animTime <= item.duration:
        progress = animTime / item.duration
        item.animation(progress)

// Parallel (all at once)
function updateParallel(progress):
  fadeIn(progress)
  slideIn(progress)
  scaleUp(progress)
```

---

## Real-World Application: Building an Animation Engine

### Minimal Animation System

```javascript
Pseudocode:
class Animation:
  constructor(element, from, to, duration, easing):
    this.element = element
    this.from = from
    this.to = to
    this.duration = duration
    this.easing = easing
    this.startTime = null
    this.isRunning = false
  
  start():
    this.startTime = getCurrentTime()
    this.isRunning = true
    this.update()
  
  update():
    if not this.isRunning:
      return
    
    currentTime = getCurrentTime()
    elapsedTime = currentTime - this.startTime
    progress = min(elapsedTime / this.duration, 1.0)
    
    // Apply easing
    easedProgress = this.easing(progress)
    
    // Interpolate all properties
    for property in this.from:
      currentValue = lerp(
        this.from[property],
        this.to[property],
        easedProgress
      )
      this.element[property] = currentValue
    
    // Continue or complete
    if progress < 1.0:
      requestAnimationFrame(() => this.update())
    else:
      this.onComplete()
  
  onComplete():
    this.isRunning = false

// Usage:
animation = new Animation(
  element,
  { x: 0, y: 0, opacity: 0 },
  { x: 100, y: 50, opacity: 1 },
  duration = 1000,
  easing = easeInOutCubic
)
animation.start()
```

### Composable Animation Library

Like GSAP or Framer Motion:

```javascript
Pseudocode:
// Simple API
animate(element, {
  x: 100,
  y: 200,
  rotation: 360,
  scale: 1.5
}, {
  duration: 1000,
  easing: "easeInOutCubic",
  onComplete: () => console.log("Done!")
})

// Spring animation
animateSpring(element, {
  x: 100,
  y: 200
}, {
  stiffness: 200,
  damping: 20
})

// Keyframes
animateKeyframes(element, [
  { time: 0, x: 0, y: 0 },
  { time: 0.5, x: 100, y: 0, easing: "easeOut" },
  { time: 1, x: 100, y: 100, easing: "easeIn" }
], {
  duration: 2000
})

// Timeline (sequence)
timeline = createTimeline()
timeline.add(fadeIn(element1), 0)        // Start at 0ms
timeline.add(slideIn(element2), 500)     // Start at 500ms
timeline.add(scaleUp(element3), 800)     // Start at 800ms
timeline.play()
```

---

## Animation Principles (The "Illusion of Life")

These principles from Disney animation apply to UI animation:

### 1. **Ease In / Ease Out**
Objects don't move at constant speed—they accelerate and decelerate.

### 2. **Anticipation**
A small motion in the opposite direction before the main action:
```javascript
// Button click: slight shrink before growing
scale: 1.0 → 0.95 → 1.2 → 1.0
```

### 3. **Follow Through**
Parts continue moving after the main motion stops (like hair or clothing):
```javascript
// Element stops, but shadow continues briefly
```

### 4. **Overshoot and Settle**
Briefly exceed the target, then settle back:
```javascript
easeOutBack // Built-in overshoot
```

### 5. **Squash and Stretch**
Objects deform during motion to appear more alive:
```javascript
// Ball bouncing
scaleY: 1 → 0.7 → 1.3 → 1 (squash → stretch → normal)
```

---

## Performance Considerations

### Hardware-Accelerated Properties

These properties use GPU, animate smoothly at 60fps:
- `transform` (translate, rotate, scale)
- `opacity`

Avoid animating:
- `width`, `height` (causes layout recalculation)
- `left`, `top` (use `transform: translate()` instead)

### RequestAnimationFrame

Always use for smooth animations:
```javascript
// Good
function animate():
  update()
  requestAnimationFrame(animate)

// Bad (janky)
setInterval(update, 16)  // Not synced to display refresh
```

### Throttling/Debouncing

Prevent too many animation triggers:
```javascript
Pseudocode:
lastCallTime = 0
throttleMs = 100

function throttledAnimate():
  currentTime = getCurrentTime()
  if currentTime - lastCallTime < throttleMs:
    return  // Ignore this call
  
  lastCallTime = currentTime
  performAnimation()
```

---

## Conclusion

Animation is fundamentally about **interpolation** + **timing** + **easing**. Every animation library—CSS Animations, GSAP, Framer Motion, Manim—implements these core concepts.

**Key Takeaways**:
1. `lerp(start, end, progress)` is the foundation of all animation
2. Easing functions make motion feel natural
3. Spring physics provides organic, physics-based motion
4. Keyframes let you define complex multi-stage animations
5. Understanding these fundamentals lets you build animations in any framework

**Further Study**:
- Experiment with different easing curves
- Try implementing a simple spring physics system
- Build a keyframe animation engine
- Study animations you love and reverse-engineer their math

Happy animating! 🎬✨
