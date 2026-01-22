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
```

## animateElement()

Animate any numeric or color property:

```javascript
Yappy.animateElement(elementId, targetProperties, config);
```

**Animatable properties:** `x`, `y`, `width`, `height`, `opacity`, `angle`, `strokeWidth`, `roughness`, `strokeColor`, `backgroundColor`

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

## Stopping Animations

```javascript
const animId = Yappy.animateElement(id, { x: 500 }, { duration: 1000 });
Yappy.pauseElementAnimation(animId);
Yappy.resumeElementAnimation(animId);
Yappy.stopElementAnimation(animId);
```
