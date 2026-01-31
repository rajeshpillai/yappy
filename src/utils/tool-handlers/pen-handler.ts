/**
 * Pen Handler
 * Handles pen/freehand tool point buffering and throttled store updates.
 * Extracted from canvas.tsx handlePointerMove/Up.
 */

import type { PointerState } from '../pointer-state';
import type { PointerHelpers } from '../pointer-helpers';

// ─── Pointer Move: Buffer pen points ─────────────────────────────────

export function penOnMove(
    e: PointerEvent,
    pState: PointerState,
    helpers: PointerHelpers,
    PEN_UPDATE_THROTTLE_MS: number
): void {
    const { x: ex, y: ey } = helpers.getWorldCoordinates(e.clientX, e.clientY);
    const px = ex - pState.startX;
    const py = ey - pState.startY;

    // Buffer points locally for performance
    pState.penPointsBuffer.push(px, py);

    const now = Date.now();
    // Throttle store updates but ensure smooth visual feedback
    if (now - pState.lastPenUpdateTime >= PEN_UPDATE_THROTTLE_MS) {
        pState.lastPenUpdateTime = now;
        helpers.flushPenPoints();
    } else if (!pState.penUpdatePending) {
        // Schedule a flush if not already pending
        pState.penUpdatePending = true;
        requestAnimationFrame(() => {
            pState.penUpdatePending = false;
            helpers.flushPenPoints();
        });
    }
}
