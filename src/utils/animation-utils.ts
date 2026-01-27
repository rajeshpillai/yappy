import type { DrawingElement } from '../types';


export interface AnimatedTransform {
    x: number;
    y: number;
    angle: number;
    opacity: number;
}

/**
 * Calculates the animated state of an element for a given time.
 * Handles nested dependencies (orbits) via recursion with cycle detection.
 * Respects Presentation Mode: returns static state if not in presentation mode.
 */
export const calculateAnimatedState = (
    el: DrawingElement,
    time: number,
    elementMap: Map<string, DrawingElement>,
    cache: Map<string, AnimatedTransform>,
    visited: Set<string> = new Set()
): AnimatedTransform => {
    // 0. Mode Check: REMOVED to allow static layout in Design Mode
    // We want orbits to calculate their position (spread out) even if time is stopped.
    // The "Animation Ticker" being stopped in Design Mode ensures they don't move.


    // 1. Check Cache
    if (cache.has(el.id)) {
        return cache.get(el.id)!;
    }

    // 2. Cycle Detection
    if (visited.has(el.id)) {
        // Break cycle: return static state
        return { x: el.x, y: el.y, angle: el.angle || 0, opacity: el.opacity || 100 };
    }
    visited.add(el.id);

    // 3. Start with static state
    let derivedX = el.x;
    let derivedY = el.y;
    let derivedAngle = el.angle || 0;

    // 4. Handle Orbit (Dependency)
    if (el.orbitEnabled && el.orbitCenterId && el.orbitRadius !== undefined && el.orbitSpeed !== undefined) {
        const centerEl = elementMap.get(el.orbitCenterId);
        if (centerEl) {
            // Recursively get the center element's animated state
            const centerState = calculateAnimatedState(centerEl, time, elementMap, cache, visited);

            const cx = centerState.x + centerEl.width / 2;
            const cy = centerState.y + centerEl.height / 2;

            // Speed factor: 1 speed = 1 radian per second
            const t = time * 0.001 * el.orbitSpeed;

            const orbX = cx + el.orbitRadius * Math.cos(t);
            const orbY = cy + el.orbitRadius * Math.sin(t);

            derivedX = orbX - el.width / 2;
            derivedY = orbY - el.height / 2;
        }
    }

    // 5. Handle Spin (Independent)
    if (el.spinEnabled && el.spinSpeed !== undefined) {
        const t = time * 0.001 * el.spinSpeed;
        derivedAngle += t * Math.PI * 2;
    }

    const state = { x: derivedX, y: derivedY, angle: derivedAngle, opacity: el.opacity || 100 };

    // 6. Cache Result
    cache.set(el.id, state);
    visited.delete(el.id); // Valid recursion finished, remove from stack

    return state;
};

/**
 * Batch calculates animated states for all elements provided.
 */
export const calculateAllAnimatedStates = (
    elements: DrawingElement[],
    time: number
): Map<string, AnimatedTransform> => {
    const elementMap = new Map<string, DrawingElement>();
    elements.forEach(el => elementMap.set(el.id, el));

    const cache = new Map<string, AnimatedTransform>();
    const visited = new Set<string>();

    elements.forEach(el => {
        calculateAnimatedState(el, time, elementMap, cache, visited);
    });

    return cache;
};
