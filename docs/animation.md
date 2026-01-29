# Animation System

Yappy includes a powerful animation system for animating element properties with various easing functions and timeline sequencing.

## Quick Start

```javascript
// Create an element
const id = Yappy.createRectangle(100, 100, 100, 100);

// Animate a property
Yappy.animateElement(id, { x: 400 }, { duration: 500, easing: 'easeOutBounce' });
```

## Preset Animations

```javascript
Yappy.fadeIn(id);           // Fade in from 0 opacity
Yappy.fadeOut(id, 500);     // Fade out over 500ms
Yappy.bounce(id);           // Bounce effect
Yappy.pulse(id);            // Scale up and back
Yappy.shake(id);            // Horizontal shake
Yappy.scaleIn(id);          // Scale up from center
Yappy.drawIn(id);           // Organic draw-in reveal
Yappy.drawOut(id);          // Organic draw-out exit
```

## animateElement()

Animate any numeric or color property:

```javascript
Yappy.animateElement(elementId, targetProperties, config);
```

**Animatable properties:** `x`, `y`, `width`, `height`, `opacity`, `angle`, `strokeWidth`, `roughness`, `drawProgress`, `strokeColor`, `backgroundColor`

**Config options:**
| Option | Type | Description |
|--------|------|-------------|
| `duration` | number | Duration in milliseconds (required) |
| `easing` | string | Easing function name |
| `delay` | number | Delay before start (ms) |
| `loop` | boolean | Repeat the animation |
| `loopCount` | number | Number of loops |
| `alternate` | boolean | Ping-pong on loop |
| `onStart` | function | Called when started |
| `onComplete` | function | Called when finished |

## Easing Functions

Available easings: `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInExpo`, `easeOutExpo`, `easeInOutExpo`, `easeOutBounce`, `easeInBounce`, `easeInOutBounce`, `easeOutElastic`, `easeInElastic`, `easeOutBack`, `easeInBack`

## Timeline

Sequence multiple animations:

```javascript
const timeline = Yappy.createTimeline();

timeline
  .add(() => Yappy.animateElement(id1, { x: 200 }, { duration: 300 }))
  .delay(100)
  .add(() => Yappy.animateElement(id2, { x: 300 }, { duration: 300 }))
  .parallel(
    () => Yappy.fadeIn(id3),
    () => Yappy.fadeIn(id4)
  )
  .play();

// Control
timeline.pause();
timeline.stop();
```

## Multiple Elements

Animate multiple elements with stagger:

```javascript
Yappy.animateElements(['id1', 'id2', 'id3'], { opacity: 50 }, { duration: 300 }, 100);
// Each element starts 100ms after the previous
```

## Selective Conflict Resolution

Yappy uses a smart property-based conflict resolution system. Instead of stopping all animations on an element when a new one starts, it only stops animations that affect the **same properties**.

- **Simultaneous Animations**: You can run `Auto Spin` (angle) and `ZoomIn` (x, y, width, height, opacity) at the same time.
- **Automatic Cleanup**: If you start a `SlideIn` (x, y) while a `Move` (x, y) is already running, the `Move` animation will be stopped to prevent property drift, but other animations (like `Spin`) will continue.

## Animation Sequencing

When defining multiple animations for an element in the Animation Panel or via the store, the `trigger` property controls the execution flow:

- `on-load`: Starts immediately when the slide/canvas loads.
- `after-prev`: Waits for the previous animation in the list to finish before starting.
- `with-prev`: Starts simultaneously with the previous animation.

### Sequence Continuity
Animations that are intended to loop infinitely (like a background spin) do **not** block the sequence. If an animation is set to `iterations: "infinite"`, the sequence animator triggers the `after-prev` callback immediately so subsequent animations can run.

## Looping and Iterations

### Finite Iterations
Animations can be configured to run a specific number of times:
- `iterations: 3` will run the animation 3 times and then satisfy its `onComplete` trigger.

### Infinite Loops
Setting `iterations: "infinite"` (or `repeat: -1` in the engine) creates a persistent behavior.
- **Auto-Spin**: Animates one 360° rotation and loops it forever.
- **Performance**: Looping animations are optimized to minimize store updates when the property values haven't changed meaningfully.

## Advanced Control

### Persistence
- `restoreAfter: true`: The element reverts to its pre-animation state once finished.
- `restoreAfter: false`: The element stays at its final animated values (e.g., a "Move" that actually relocates the item).

### Conflict Properties Table
| Animation | Affected Properties |
|-----------|---------------------|
| Move / Slide | `x`, `y` |
| Resize / Zoom | `width`, `height`, `x`, `y` |
| Fade | `opacity` |
| Rotate / Spin | `angle` |
| Morph | `points`, `type` |
| Path | `x`, `y`, `angle` (optional) |

---

## Stopping Animations

```javascript
const animId = Yappy.animateElement(id, { x: 500 }, { duration: 1000 });
Yappy.pauseElementAnimation(animId);
Yappy.resumeElementAnimation(animId);
Yappy.stopElementAnimation(animId);

// Global controls
sequenceAnimator.stopAll(); // Stops all active sequences
animationEngine.stopAll();  // Stops every individual animation engine track
```
