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

### Sequence Continuity and Infinite Animations

An animation with **Loop Infinitely** enabled (`repeat: -1`) **blocks** `after-prev` successors. Since the animation never finishes, "after previous" never comes, and subsequent animations in the sequence will not start.

To run animations **concurrently** with an infinite animation, set the successor's trigger to **`with-prev`** instead of `after-prev`. The `with-prev` lookahead fires before the main animation, so both start together.

**Examples:**

| Sequence | Behavior |
|----------|----------|
| pulse (infinite) → shakeX (after-prev) | Only pulse runs. shakeX never starts. |
| shakeX (finite) → pulse (infinite) | shakeX plays, finishes, then pulse loops forever. |
| shakeX (infinite) → autoSpin (with-prev) | Both start simultaneously and loop forever. |

When all remaining animations in a sequence are infinite, the sequence stays active until the user clicks **Stop**. The `stopSequence` / `stopAll` methods handle full cleanup.

## Looping and Iterations

### Finite Iterations
Animations can be configured to run a specific number of times:
- `iterations: 3` will run the animation 3 times and then satisfy its `onComplete` trigger.

### Infinite Loops (Loop Infinitely checkbox)
Setting `repeat: -1` via the **Loop Infinitely** checkbox creates a persistent looping behavior. How each animation type handles this:
- **shakeX / shakeY**: Oscillates with `loopCount: Infinity` (instead of the default 4 oscillations).
- **bounce / pulse**: Recursively restarts their multi-step animation cycle after each completion.
- **Auto-Spin**: Rotates one full 360° and loops it via the engine's native loop mechanism.
- **Simple presets** (fadeIn, slideIn, zoomIn, etc.): Loop natively via `config.loop` passed through to the animation engine.

### Auto-Spin Iterations dropdown
Auto-Spin has a separate **Iterations** dropdown (`iterations: "infinite"` or `1`/`2`/`3`/`5`). This is independent of the Loop Infinitely checkbox and controls how many full rotations the spin performs.

## Advanced Control

### Restore State After Finish
- `restoreAfter: true`: The element reverts to its pre-animation state once the animation finishes.
- `restoreAfter: false`: The element stays at its final animated values (e.g., a "Move" that actually relocates the item).
- For **infinite animations**, `restoreAfter` has no effect during playback (the animation never "finishes"). State is restored when the user clicks Stop if the sequence-level restore applies.
- **Persistence**: `restoreAfter` is stored as part of the animation JSON and is correctly serialized/deserialized through save/load. No special handling is needed -- standard `JSON.stringify`/`JSON.parse` preserves the boolean value.

### Conflict Properties Table
| Animation | Affected Properties |
|-----------|---------------------|
| Move / Slide | `x`, `y` |
| Resize / Zoom | `width`, `height`, `x`, `y` |
| Fade | `opacity` |
| Rotate / Spin | `angle` |
| Morph | `points`, `type` |
| Path | `x`, `y`, `angle` (optional) |

## Performance Optimization

### Spatial Animation Culling
Yappy is optimized for large projects with many slides. To maintain a high frame rate (FPS), the engine uses **Spatial Culling**:
- **Slide Filtering**: Continuous animations (like Spins and Orbits) are only calculated for elements on the currently active slide.
- **Dependency Awareness**: If an element orbits a center that is technically off-slide, the engine automatically includes the required dependencies to ensure animation stability.
- **Buffer Zone**: A 200px spatial buffer is maintained around the active slide to ensure smooth transitions and prevent visible pop-in.

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
