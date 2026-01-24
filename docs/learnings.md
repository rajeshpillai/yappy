# Learnings from Yappy Development

This document captures key lessons learned during the development of Yappy, particularly from implementing complex features like the mindmap action toolbar.

## SolidJS Reactivity Patterns

### Critical: Early Returns Break Reactivity

**Problem**: Using early returns (`if condition return null`) in SolidJS components breaks reactivity.

```typescript
// ❌ WRONG - Breaks reactivity
export const Component = () => {
    if (!condition()) return null;
    // Rest of component
};
```

**Solution**: Always use the `Show` component for conditional rendering:

```typescript
// ✅ CORRECT - Maintains reactivity
export const Component = () => {
    return (
        <Show when={condition()}>
            {() => {
                // Component content
            }}
        </Show>
    );
};
```

**Why**: SolidJS's reactive system needs to track dependencies. Early returns prevent the reactive graph from being built correctly, causing the component to not update when dependencies change.

### Use createMemo for Derived State

When you have computed values that depend on reactive sources, wrap them in `createMemo`:

```typescript
const isMindmapNode = createMemo(() => {
    const el = selectedElement();
    if (!el) return false;
    return !!el.parentId || hasChildren() || startTypes.includes(el.type);
});
```

This ensures the computation is cached and only re-runs when dependencies change.

### Critical: Destructuring Breaks Reactivity

**Problem**: Destructuring reactive values captures them at that moment, breaking reactivity.

```typescript
// ❌ WRONG - Captures stale values
const { scale, panX, panY } = store.viewState;
const x = elementX * scale + panX;  // Won't update when viewState changes
```

**Solution**: Access reactive values directly when you need them:

```typescript
// ✅ CORRECT - Stays reactive
const x = () => elementX * store.viewState.scale + store.viewState.panX;
// Then use: x() to get current value
```

**Why**: Destructuring creates local constants with the values at that moment. SolidJS can't track these as dependencies.

### TypeScript vs SolidJS Show Component

**Problem**: TypeScript doesn't like Show component callbacks in strict mode.

```typescript
// ❌ TypeScript error TS2769
<Show when={condition()}>
    {() => <Component />}
</Show>
```

**Solutions** (in order of preference):

1. **Split into separate component** (Best for complex logic):
```typescript
<Show when={condition()}>
    <ChildComponent />
</Show>
```

2. **Use Show with accessor callback** (For reactive element access):
```typescript
<Show when={element()}>
    {(el) => {
        // el() gives you the reactive element
        return <div>{el().name}</div>;
    }}
</Show>
```

3. **Avoid early returns** - they break reactivity anyway

### The Complete Reactivity Solution Pattern

For a component that needs to:
1. Conditionally render based on store state  
2. Track a specific element
3. Calculate position reactively

```typescript
export const FloatingComponent = () => {
    // Use createMemo for condition check
    const shouldShow = createMemo(() => {
        const el = getElement();
        return el && meetsCondition(el);
    });

    return (
        <Show when={shouldShow()}>
            <ContentComponent />
        </Show>
    );
};

const ContentComponent = () => {
    // Track element reactively
    const element = createMemo(() => getElement());
    
    return (
        <Show when={element()}>
            {(el) => {
                // Calculate position reactively - don't destructure!
                const x = () => el().x * store.viewState.scale + store.viewState.panX;
                const y = () => el().y * store.viewState.scale + store.viewState.panY;
                
                return (
                    <div style={{
                        left: `${x()}px`,
                        top: `${y()}px`
                    }}>
                        {/* Content */}
                    </div>
                );
            }}
        </Show>
    );
};
```

**Key Points**:
- `createMemo` for derived/computed state
- `Show` component for conditional rendering 
- Separate component to avoid TypeScript issues
- Accessor callback `{(el) => ...}` to get reactive value
- Function calls `x()` and direct property access `store.viewState.scale` for reactivity


## Floating UI Positioning

### The `fixed` Position Challenge  

When positioning floating UI elements over a zoomable/pannable canvas:

1. **Use `position: fixed`** for the floating element
2. **Calculate viewport coordinates** from canvas coordinates:
   ```typescript
   const x = (el.x + el.width / 2) * scale + panX;
   const y = (el.y - 60) * scale + panY;
   ```
3. **Avoid `transform: translate(-50%, -100%)`** initially - it can cause visibility issues. Get basic positioning working first, then add transforms if needed.

### Debugging Visibility Issues

When a component isn't visible:

1. **Start simple**: Use a fixed position (e.g., `top: 100px, left: 100px`) to verify the component renders at all
2. **High contrast styling**: Use bright borders (`border: 2px solid #3b82f6`) for debugging
3. **Console logging**: Add logs to verify reactive values are updating
4. **Check z-index**: Ensure the element is above canvas content (z-index: 10000)

## Component Integration Patterns

### Rendering Location Matters

**Root-level rendering** (`App.tsx`) is more reliable than canvas-level for floating UI:

```typescript
// In App.tsx
return (
    <div>
        <Canvas />
        <MindmapActionToolbar />  {/* Rendered at root */}
        <Toast />
    </div>
);
```

**Why**: Avoids issues with canvas transformations, clipping, and ensures consistent z-index stacking.

## Mobile vs Desktop UX Decisions

### Bottom Sheet vs Floating Toolbar

**Bottom Sheet Approach**:
- ✅ Native mobile pattern
- ✅ Large touch targets
- ❌ Detection issues (`window.innerWidth`)
- ❌ More complex state management
- ❌ Visibility problems

**Floating Toolbar Approach** (Chosen):
- ✅ Works on desktop AND mobile
- ✅ Simpler implementation
- ✅ Always visible when needed
- ✅ Consistent cross-platform
- ⚠️ Requires careful positioning

**Lesson**: Simpler, universal solutions often work better than platform-specific ones.

## Iterative Development Process

### The Toolbar Implementation Journey

**The Goal**: Create a floating toolbar that appears above selected mindmap nodes, providing quick access to actions.

**Iteration 1: Bottom Sheet** ❌
- Tried mobile-only bottom sheet with screen width detection
- **Failure**: Visibility issues, not appearing at all
- **Learning**: Mobile-specific detection (`window.innerWidth < 1024`) is unreliable

**Iteration 2: Floating Toolbar in Canvas.tsx** ❌  
- Added toolbar as child of Canvas component
- **Failure**: Z-index conflicts, positioning issues with canvas transforms
- **Learning**: Floating UI should NOT be child of transformed containers

**Iteration 3: App.tsx with Transform** ❌
- Moved to App.tsx root level
- Used `transform: translate(-50%, -100%)` to center/position
- **Failure**: Toolbar completely disappeared
- **Learning**: Transforms can cause unexpected visibility issues - debug without them first

**Iteration 4: Simple Fixed Position** ✅ (Partially)
- Removed transform, used simple `position: fixed`
- Initially positioned at `100px, 100px` for debugging
- **Success**: Toolbar finally visible!
- **Problem**: Didn't move with selected element

**Iteration 5: Calculated Position with Early Return** ❌
- Added position calculation: `(el.x + el.width/2) * scale + panX`  
- Used early return: `if (!condition) return null`
- **Failure**: Toolbar stopped appearing completely
- **Learning**: Early returns break SolidJS reactivity

**Iteration 6: Show Component with Callback** ❌
- Replaced early return with `<Show when={...}>{() => {...}}</Show>`
- **Failure**: TypeScript error TS2769 on build
- **Learning**: TypeScript doesn't like Show component callback syntax in strict mode

**Iteration 7: Separate Component** ✅ (Partially)
- Split into `MindmapActionToolbar` and `ToolbarContent`
- `<Show>` renders `<ToolbarContent />` as child component
- **Success**: Builds and appears!
- **Problem**: Operations worked on selected element, but toolbar stayed at first selected position

**Iteration 8: createMemo for Element** ✅ (Partially)
- Used `createMemo(() => getElement())` to track selection
- **Success**: Operations now update to current selection
- **Problem**: Position still didn't move

**Iteration 9: Reactive Position Calculation** ✅ **SUCCESS!**
- **Key Insight**: Destructuring `store.viewState` captured stale values
- Changed from:
  ```typescript
  const { scale, panX } = store.viewState;  // ❌ Stale
  const x = el.x * scale + panX;
  ```
- To:
  ```typescript
  const x = () => el().x * store.viewState.scale + store.viewState.panX;  // ✅ Reactive
  ```
- **Success**: Everything works! Toolbar:
  - Appears when selecting mindmap node
  - Moves to currently selected element
  - Operations apply to correct element  
  - Updates on every selection change

**Total Time**: ~3 hours of debugging and iterations

**Key Insight**: Sometimes you need to try multiple approaches to find what works. Don't be afraid to pivot when something isn't working.

### Critical Lessons from Toolbar Struggle

1. **Debug visibility first, features second**
   - Get something showing with fixed position before making it smart
   - Use bright colors and borders for debugging

2. **Never destructure reactive state**
   - Always access store properties directly: `store.viewState.scale`
   - Not: `const { scale } = store.viewState`

3. **Avoid early returns in SolidJS**
   - Use `Show` component instead
   - For complex conditions, use `createMemo` + `Show`

4. **TypeScript strict mode requires component splitting**
   - Don't fight TypeScript with Show callbacks
   - Split into parent (condition check) + child (rendering) components

5. **Root-level rendering for floating UI**
   - Render at App.tsx level, not inside transformed containers
   - Prevents z-index and transform issues

6. **Test incrementally**
   - Each change should be testable
   - Don't combine multiple fixes at once


### Debugging Strategy

1. **Isolate the problem**: Is it positioning? Visibility? Reactivity?
2. **Simplify**: Remove complexity until it works, then add back incrementally
3. **Add logging**: Console logs help verify assumptions
4. **Test frequently**: Make small changes and test immediately

## Store Integration Best Practices

### Reusing Existing Actions

When building new UI for existing features:

```typescript
// ✅ Reuse store actions
onClick={() => addChildNode(el.id)}

// ❌ Don't duplicate logic
onClick={() => {
    // Reimplementing addChildNode logic here
}}
```

**Benefits**:
- Consistency across UI
- Single source of truth
- Easier maintenance
- Undo/redo works automatically

## CSS Architecture

### Keep Styles Simple Initially

Start with minimal, high-contrast styles:

```css
.toolbar {
    position: fixed;
    background: white;
    border: 2px solid #3b82f6;  /* Bright, visible border */
    z-index: 10000;
}
```

Add fancy effects (glassmorphism, animations, transforms) AFTER basic functionality works.

### Responsive Touch Targets

```css
.btn {
    width: 36px;
    height: 36px;
}

@media (max-width: 768px) {
    .btn {
        width: 44px;  /* Larger for touch */
        height: 44px;
    }
}
```

Minimum touch target size should be 44px × 44px for mobile.

## Type Safety in SolidJS

### The `!` Non-null Assertion

Use cautiously after proper checks:

```typescript
// ✅ Safe - checked in Show condition
<Show when={isMindmapNode()}>
    {() => {
        const el = selectedElement()!;  // Safe here
        // ...
    }}
</Show>
```

The `Show` component's callback guarantees `selectedElement()` exists because `isMindmapNode()` already verified it.

## Performance Considerations

### Memo vs Signal

- **`createSignal`**: For values that change frequently and trigger updates
- **`createMemo`**: For derived values that should be cached

```typescript
// Signal for user input
const [isOpen, setIsOpen] = createSignal(false);

// Memo for computed state
const isMindmapNode = createMemo(() => /* ... */);
```

## Lessons on User Feedback

### Iterate Based on Real Usage

1. Bottom sheet wasn't visible → User feedback
2. Switched to floating toolbar → User confirmed visibility
3. Positioned to right → User requested above
4. Above with early returns → User reported it disappeared
5. Final solution with Show → ✅ Working

**Insight**: User testing is essential. What seems logical in code might not work in practice.

## Common Pitfalls

### ❌ Things That Didn't Work

1. **Complex transforms on first try**: Start simple, add complexity later
2. **Platform-specific detection**: `window.innerWidth < 1024` caused issues  
3. **Early returns in SolidJS**: Breaks reactivity - ALWAYS use Show component
4. **Destructuring reactive state**: `const { x } = store.state` captures stale values
5. **Show component callbacks**: TypeScript strict mode errors - use separate components
6. **Calculating position before element exists**: Always check existence first
7. **Canvas-level rendering for floating UI**: Root-level is more reliable
8. **Assuming position will update automatically**: Must access store properties directly for reactivity

### ✅ Things That Worked Well

1. **High-contrast debugging styles**: Made issues immediately visible
2. **Console logging during development**: Verified assumptions quickly 
3. **Incremental testing**: Small changes, frequent verification
4. **Using Show component**: Proper reactive conditional rendering
5. **Reusing store actions**: Consistency and maintainability

## Architecture Decisions

### Why App.tsx for Floating UI?

Rendering floating UI at the application root provides:
- Predictable z-index stacking
- No interference from canvas transforms
- Consistent positioning calculations
- Easier to reason about

### Why Icon-Only Toolbar?

- **Compact**: Doesn't obscure content
- **Language-agnostic**: No localization needed
- **Fast to scan**: Visual recognition is quick
- **Scalable**: Works on mobile and desktop

## Future Considerations

### Potential Improvements

1. **Dynamic toolbar width calculation**: Currently hardcoded offset (90px)
2. **Smart positioning**: Reposition if toolbar goes off-screen
3. **Accessibility**: Keyboard navigation, ARIA labels
4. **Animations**: Smooth entrance/exit transitions
5. **Customization**: User preference for toolbar position

### Scaling Lessons

As features grow:
- Keep components focused and single-purpose
- Document gotchas and solutions (like this file!)
- Test on actual devices, not just emulators
- Get user feedback early and often

---

## Quick Reference

### SolidJS Conditional Rendering
```typescript
<Show when={condition()}>
    {() => <Component />}
</Show>
```

### Fixed Position Calculation
```typescript
// ❌ WRONG - Destructuring breaks reactivity
const { scale, panX } = store.viewState;
const x = elementX * scale + panX;

// ✅ CORRECT - Access directly for reactivity  
const x = () => elementX * store.viewState.scale + store.viewState.panX;
const y = () => elementY * store.viewState.scale + store.viewState.panY;

// Use with: <div style={{left: `${x()}px`, top: `${y()}px`}} />
```

### Reactive Computed Values
```typescript
const value = createMemo(() => computeFromStore());
```

### Reactive Element Tracking
```typescript
const element = createMemo(() => {
    if (store.selection.length !== 1) return null;
    return store.elements.find(e => e.id === store.selection[0]);
});

// Use in Show with accessor
<Show when={element()}>
    {(el) => <div>{el().name}</div>}
</Show>
```

### Debug First, Optimize Later
```css
/* Start with this */
border: 2px solid red;
background: white;

/* Add this after it works */
backdrop-filter: blur(8px);
box-shadow: 0 4px 12px rgba(0,0,0,0.1);
```

---

## Performance Optimization: RoughJS Instance Management

### Critical: Reuse RoughJS Canvas Instances

**Problem**: Creating a new `rough.canvas()` instance for every layer on every render frame causes severe garbage collection pressure and memory leaks.

```typescript
// ❌ WRONG - Creates 300 instances/second with 5 layers at 60 FPS
sortedLayers.forEach(layer => {
    const rc = rough.canvas(canvasRef);  // NEW INSTANCE EVERY ITERATION!
    layerElements.forEach(el => {
        renderElement(rc, ctx, el, isDarkMode, layerOpacity);
    });
});
```

**Solution**: Create the RoughJS instance once per render frame and reuse it across all layers:

```typescript
// ✅ CORRECT - Creates 60 instances/second at 60 FPS
const rc = rough.canvas(canvasRef);  // ONCE per render frame

sortedLayers.forEach(layer => {
    layerElements.forEach(el => {
        renderElement(rc, ctx, el, isDarkMode, layerOpacity);
    });
});
```

**Impact**:
- **Before**: 5 layers × 60 FPS = 300 new instances/second
- **After**: 1 × 60 FPS = 60 new instances/second
- **Reduction**: 80% fewer object allocations, significantly reduced GC pressure

**Why**: RoughJS canvas instances are expensive to create. Creating them in tight loops causes unnecessary memory allocation and forces frequent garbage collection, leading to frame drops and stuttering. Reusing a single instance per frame eliminates this overhead while maintaining the same visual output.

**Location**: [canvas.tsx:322-323](src/components/canvas.tsx#L322-L323)

---

## SVG Icon Rendering Issues

### Critical: Explicit SVG Styling for Icon Visibility

**Problem**: SVG icons from libraries like lucide-solid may not render properly in certain contexts (dropdowns, overlays, absolute positioned elements) without explicit styling.

```css
/* ❌ WRONG - Icons may not appear */
.button {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #374151;
}
/* No explicit SVG styling */
```

**Solution**: Always add explicit SVG styling to ensure icons inherit proper display and color properties:

```css
/* ✅ CORRECT - Ensures icons are visible */
.button {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #374151;
}

.button svg {
    display: block;          /* Prevent inline spacing issues */
    stroke: currentColor;    /* Inherit parent color */
    fill: none;             /* For stroke-based icons */
    pointer-events: none;   /* Prevent SVG from blocking clicks */
}
```

**Why This Happens**:
- SVG elements have default `display: inline` which can cause alignment issues
- `currentColor` may not inherit properly without explicit `stroke` declaration
- Pointer events on SVG can interfere with button click handlers
- Absolutely positioned containers may not inherit styles correctly

**Common Symptoms**:
- Icons visible in main UI but invisible in dropdowns
- Icons show in light mode but not dark mode (or vice versa)
- Icon hitbox blocking button clicks
- Inconsistent icon sizes across similar components

**Best Practice**: Add SVG styling to all button/icon container classes:
```css
.toolbar-btn svg,
.layout-btn svg,
.menu-item svg {
    display: block;
    stroke: currentColor;
    fill: none;
    pointer-events: none;
}
```

**Location**: [mindmap-action-toolbar.css:63-68, 130-137](src/components/mindmap-action-toolbar.css)

---

## TypeScript Type Constraints in Store State

### Critical: Union Types Must Include All Valid Values

**Problem**: When adding new element types to a tool group, forgetting to update the corresponding union type in the store breaks tool selection.

```typescript
// ❌ WRONG - Missing new types causes runtime failures
type AppState = {
    selectedTechnicalType: 'dfdProcess' | 'dfdDataStore' | 'isometricCube' | 'cylinder';
    // Added 5 new shapes but forgot to update this type!
}

// Component tries to set 'stateStart' but TypeScript prevents it
setSelectedTechnicalType('stateStart');  // Type error or silent failure
```

**Solution**: Always update union types when adding new variants:

```typescript
// ✅ CORRECT - All valid values included
type AppState = {
    selectedTechnicalType: 
        | 'dfdProcess' 
        | 'dfdDataStore' 
        | 'isometricCube' 
        | 'cylinder'
        | 'stateStart'      // New
        | 'stateEnd'        // New
        | 'stateSync'       // New
        | 'activationBar'   // New
        | 'externalEntity'; // New
}
```

**Why This Breaks**: TypeScript's type checking prevents assignment of values not in the union. If the store action has a type constraint, setting an unlisted value will either:
1. Fail at compile time (if strict)
2. Silently fail at runtime (if type is cast with `as any`)
3. Cause the UI component to malfunction

**Debugging Tip**: If a tool group dropdown stops working after adding new tools, check the store's type definition for the selection state.

**Location**: This issue occurred in `src/store/app-store.ts` when implementing technical shapes.

---

## SVG Path Coordinate Systems

### Critical: Understand Centered vs Absolute Coordinates

**Problem**: SVG path definitions must use the correct coordinate system. Mixing centered (0,0 at shape center) with absolute coordinates causes shapes to render incorrectly or not at all.

```typescript
// ❌ WRONG - Inconsistent coordinate usage
case 'heart':
    // Uses 0 for center but mh (a variable) for bottom
    return { type: 'path', path: `M 0 ${y + h * 0.3} ... ${mh} ...` };

case 'ribbon':
    // References undefined variable mh instead of calculating y + h/2
    return { type: 'path', path: `... L ${x + w} ${mh} ...` };
```

**Solution**: Understand your coordinate system and use it consistently:

```typescript
// ✅ CORRECT - Consistent centered coordinate system
// In shape-geometry.ts, all shapes use:
const x = -mw;  // mw = width / 2
const y = -mh;  // mh = height / 2
// So (0, 0) is the center of the shape

case 'heart':
    // Bottom point should be y + h (not mh which is y + h/2)
    return { type: 'path', path: `M ${0} ${y + h * 0.3} ... ${0} ${y + h} ...` };

case 'ribbon':
    // Middle point should be calculated as y + h/2
    return { type: 'path', path: `... L ${x + w} ${y + h / 2} ...` };
```

**Key Insight**: 
- `mh` and `mw` are **half** the dimensions, used to center the coordinate system
- `x = -mw` and `y = -mh` set the top-left corner
- Center point is `(0, 0)`
- Bottom-right is `(x + w, y + h)` which equals `(mw, mh)`

**Common Mistakes**:
1. Using `mh` when you mean `y + h` (full height vs half height)
2. Mixing absolute screen coordinates with shape-relative coordinates
3. Forgetting that `x` and `y` are negative offsets from center

**Debugging**: If a shape doesn't appear:
1. Check if path coordinates are using the right reference point
2. Verify all variables (like `mh`) are defined and used correctly
3. Test with simple absolute values first, then convert to relative

---

## Summary: The Most Important Lessons

1. **Never use early returns in SolidJS** - Use `Show` component
2. **Never destructure reactive state** - Access properties directly
3. **Use createMemo for derived state** - Cache computed values
4. **Debug with fixed positioning first** - Get it visible before making it smart
5. **Split components for TypeScript** - Avoid Show callback errors
6. **Render floating UI at app root** - Avoid transform/z-index issues
7. **Test incrementally** - Small changes, frequent testing
8. **User feedback is invaluable** - What works in code may not work in practice
9. **Update union types when adding variants** - TypeScript constraints must match runtime values
10. **Understand coordinate systems** - SVG paths need consistent reference points

---

## Document Type Persistence Bug Fix

### Problem: docType Not Saved/Loaded Correctly

**Symptom**: When loading a saved document, the canvas type (infinite vs slides) would always default to 'infinite', ignoring the saved value.

**Root Cause**: Multiple issues in the document versioning system:

1. **Version detection bug**: `isSlideDocument()` only checked for `version === 3`, missing v4 documents
2. **Default fallback bug**: `loadDocument()` defaulted to `'infinite'` for all documents with missing `docType`
3. **Version-unaware defaults**: v3 documents (which are inherently slide-based) were defaulting to 'infinite'

**The Fix**:

```typescript
// ❌ WRONG - Only checks v3
export const isSlideDocument = (data: any): data is SlideDocument => {
    return data && data.version === 3 && Array.isArray(data.slides);
};

// ❌ WRONG - Defaults to 'infinite' for all missing docType
const loadedDocType = doc.metadata?.docType || 'infinite';
```

```typescript
// ✅ CORRECT - Checks v3 and v4
export const isSlideDocument = (data: any): data is SlideDocument => {
    return data && (data.version === 3 || data.version === 4) && Array.isArray(data.slides);
};

// ✅ CORRECT - Version-aware defaults
const loadedDocType = doc.metadata?.docType || (doc.version >= 3 ? 'slides' : 'infinite');
```

**Key Insight**: When adding new document versions, ensure:
1. All version checks include the new version
2. Default values are appropriate for each version's context
3. v3+ documents are slide-based by design, so default to 'slides'
4. v1/v2 legacy documents predate slides, so default to 'infinite'

**Files Modified**:
- `src/utils/migration.ts` - Fixed `isSlideDocument()` to recognize v4
- `src/store/app-store.ts` - Fixed `loadDocument()` defaults

---

## Performance: Laser Pointer Optimization

### Problem: Laggy, Stuttering Laser Trail

**Symptoms**:
- Laser pointer trail would stutter and lag behind cursor
- Frame drops during drawing
- High memory usage during long drawing sessions

**Root Causes**:

1. **Reactive signal overhead**: Using `createSignal` for high-frequency updates
2. **Array spread on every mouse move**: `[...prev, newPoint]` creates new arrays constantly
3. **RAF stacking**: Multiple `requestAnimationFrame(draw)` calls accumulating
4. **Per-segment shadow blur**: Expensive canvas operations on each segment
5. **Decay logic triggering redraws**: Filtering inside `draw()` triggered reactive updates

**The Fix**:

```typescript
// ❌ WRONG - Reactive signal + array spread + RAF stacking
const [laserTrail, setLaserTrail] = createSignal<Point[]>([]);

// In mousemove:
setLaserTrail(prev => [...prev.slice(-50), { x, y, timestamp: Date.now() }]);
requestAnimationFrame(draw);  // Can stack up!

// In draw():
const filtered = laserTrail().filter(p => now - p.timestamp < DECAY);
if (filtered.length !== laserTrail().length) {
    setLaserTrail(filtered);  // Triggers another redraw!
}
```

```typescript
// ✅ CORRECT - Mutable array + throttling + RAF deduplication
let laserTrailData: Point[] = [];
let laserRafPending = false;
let lastLaserUpdateTime = 0;
const LASER_THROTTLE_MS = 8;  // ~120fps

// In mousemove:
const now = Date.now();
if (now - lastLaserUpdateTime >= LASER_THROTTLE_MS) {
    lastLaserUpdateTime = now;
    if (laserTrailData.length >= MAX_POINTS) laserTrailData.shift();
    laserTrailData.push({ x, y, timestamp: now });

    if (!laserRafPending) {
        laserRafPending = true;
        requestAnimationFrame(() => {
            laserRafPending = false;
            draw();
        });
    }
}

// In draw() - filter in place:
let writeIdx = 0;
for (let i = 0; i < laserTrailData.length; i++) {
    if (now - laserTrailData[i].timestamp < DECAY) {
        laserTrailData[writeIdx++] = laserTrailData[i];
    }
}
laserTrailData.length = writeIdx;
```

**Rendering Optimization**:
```typescript
// ❌ WRONG - Per-segment shadow + individual strokes
for (let i = 0; i < trail.length - 1; i++) {
    ctx.beginPath();
    ctx.shadowBlur = 10 * opacity;  // Expensive!
    ctx.stroke();  // Many draw calls
}

// ✅ CORRECT - Single shadow + batched strokes by opacity band
ctx.shadowBlur = 8;  // Once
const band = Math.ceil(opacity * 5);
if (band !== currentBand) {
    ctx.stroke();  // Finish previous batch
    ctx.beginPath();
    currentBand = band;
}
ctx.lineTo(p2.x, p2.y);  // Accumulate
```

**Performance Gains**:
- 80%+ reduction in object allocations
- No RAF stacking (single pending request)
- 5x fewer `stroke()` calls via batching
- Eliminated reactive feedback loop

**Files Modified**: `src/components/canvas.tsx`

---

## Performance: Pen/Ink Tool Optimization

### Problem: Laggy Drawing for All Pen Tools

**Symptoms**:
- Fineliner, inkbrush, marker, and ink overlay tools would lag
- Visible delay between cursor and stroke
- High CPU usage during drawing

**Root Causes**:

1. **Element lookup on every mouse move**: `store.elements.find(e => e.id === currentId)`
2. **Array spread on every point**: `[...el.points, px, py]`
3. **Store update on every mouse event**: Reactive overhead at 100+ events/second

**The Fix**:

```typescript
// ❌ WRONG - Find + spread + update on every mouse move
if (store.selectedTool === 'fineliner') {
    const el = store.elements.find(e => e.id === currentId);  // O(n) lookup
    const newPoints = [...(el.points as number[]), px, py];   // New array
    updateElement(currentId, { points: newPoints }, false);   // Store update
}
```

```typescript
// ✅ CORRECT - Local buffer + throttled flush
let penPointsBuffer: number[] = [];
let lastPenUpdateTime = 0;
const PEN_UPDATE_THROTTLE_MS = 16;  // ~60fps

const flushPenPoints = () => {
    if (!currentId || penPointsBuffer.length === 0) return;
    const el = store.elements.find(e => e.id === currentId);
    if (el && el.points) {
        const newPoints = [...el.points, ...penPointsBuffer];
        updateElement(currentId, { points: newPoints }, false);
        penPointsBuffer = [];
    }
};

// In mousemove:
if (isPenTool(store.selectedTool)) {
    penPointsBuffer.push(px, py);  // Local accumulation

    const now = Date.now();
    if (now - lastPenUpdateTime >= PEN_UPDATE_THROTTLE_MS) {
        lastPenUpdateTime = now;
        flushPenPoints();
    } else if (!penUpdatePending) {
        penUpdatePending = true;
        requestAnimationFrame(() => {
            penUpdatePending = false;
            flushPenPoints();
        });
    }
}

// On pointerup - flush remaining points:
flushPenPoints();
```

**Key Points**:
1. Buffer points locally (mutable array, no allocations)
2. Throttle store updates to ~60fps
3. Always flush on pointer up before normalization
4. Clear buffer when starting a new stroke

**Performance Gains**:
- Reduced store updates from 100+/s to ~60/s
- Eliminated per-move array allocations
- Smoother visual feedback with RAF scheduling

**Files Modified**: `src/components/canvas.tsx`

---

## Summary: High-Frequency Input Optimization Pattern

When handling high-frequency input (mouse/touch events at 100+ Hz):

### 1. Avoid Reactive State for Transient Data
```typescript
// ❌ Signal for every update
const [trail, setTrail] = createSignal([]);

// ✅ Mutable array for transient data
let trailData: Point[] = [];
```

### 2. Throttle Updates
```typescript
const THROTTLE_MS = 16;  // ~60fps
let lastUpdate = 0;

if (Date.now() - lastUpdate >= THROTTLE_MS) {
    lastUpdate = Date.now();
    // Perform update
}
```

### 3. Prevent RAF Stacking
```typescript
let rafPending = false;

if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
        rafPending = false;
        // Render
    });
}
```

### 4. Buffer and Batch
```typescript
let buffer: number[] = [];

// Accumulate locally
buffer.push(x, y);

// Flush periodically or on completion
const flush = () => {
    if (buffer.length === 0) return;
    commitToStore(buffer);
    buffer = [];
};
```

### 5. Filter In-Place
```typescript
// ❌ Creates new array
const filtered = arr.filter(condition);

// ✅ Filter in place
let writeIdx = 0;
for (let i = 0; i < arr.length; i++) {
    if (condition(arr[i])) arr[writeIdx++] = arr[i];
}
arr.length = writeIdx;
```

### 6. Batch Canvas Operations
```typescript
// ❌ Many draw calls
for (const segment of segments) {
    ctx.beginPath();
    ctx.stroke();
}

// ✅ Batch by similar state
ctx.beginPath();
for (const segment of segments) {
    ctx.lineTo(segment.x, segment.y);
}
ctx.stroke();
```
