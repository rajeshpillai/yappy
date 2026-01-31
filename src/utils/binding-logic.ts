/**
 * Binding & Connector Logic
 * Handles line-to-shape binding detection, line point routing,
 * and bound line geometry updates when connected shapes move.
 */

import type { DrawingElement } from '../types';
import { findClosestAnchor, getAnchorPoints } from './anchor-points';
import { intersectElementWithLine } from './geometry';
import { calculateSmartElbowRoute } from './routing';

/**
 * Find which shape element (if any) is near a given point, suitable for binding a line endpoint.
 * Returns the target element, snap point, and anchor position.
 */
export function checkBinding(
    x: number,
    y: number,
    excludeId: string,
    elements: DrawingElement[],
    scale: number,
    activeLayerId: string,
    canInteract: (el: DrawingElement) => boolean
): { element: DrawingElement; snapPoint: { x: number; y: number }; position: string } | null {
    const threshold = 40 / scale;
    const anchorSnapThreshold = 25 / scale;
    let bindingHit = null;

    for (const target of elements) {
        if (target.id === excludeId) continue;
        if (!canInteract(target)) continue;
        // Skip connectors as targets, but allow unbound polylines (they act as shapes)
        const isPolylineShape = target.type === 'line' && target.curveType === 'elbow' && !target.startBinding && !target.endBinding;
        if ((target.type === 'line' || target.type === 'arrow' || target.type === 'bezier' || target.type === 'organicBranch') && !isPolylineShape) continue;
        if (target.layerId !== activeLayerId) continue;

        let isHit = false;

        if (target.type === 'text' || target.type === 'image' || target.type === 'rectangle') {
            if (x >= target.x - threshold && x <= target.x + target.width + threshold &&
                y >= target.y - threshold && y <= target.y + target.height + threshold) {
                isHit = true;
            }
        } else if (target.type === 'circle') {
            const cx = target.x + target.width / 2;
            const cy = target.y + target.height / 2;
            const rx = target.width / 2 + threshold;
            const ry = target.height / 2 + threshold;
            if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) {
                isHit = true;
            }
        } else {
            if (x >= target.x - threshold && x <= target.x + target.width + threshold &&
                y >= target.y - threshold && y <= target.y + target.height + threshold) {
                isHit = true;
            }
        }

        if (isHit) {
            bindingHit = target;
            break;
        }
    }

    if (bindingHit) {
        // Try anchor snap first
        const closestAnchor = findClosestAnchor(bindingHit, { x, y }, anchorSnapThreshold);
        if (closestAnchor) {
            return { element: bindingHit, snapPoint: { x: closestAnchor.x, y: closestAnchor.y }, position: closestAnchor.position };
        }

        // Fallback to edge intersection logic
        const snapPoint = intersectElementWithLine(bindingHit, { x, y }, 5);
        if (snapPoint) {
            return { element: bindingHit, snapPoint, position: 'edge' };
        }
    }
    return null;
}

/**
 * Recalculate routing points for a line element (elbow routing or simple start/end).
 * Returns updated points array or undefined if no update needed.
 */
export function refreshLinePoints(
    line: DrawingElement,
    elements: DrawingElement[],
    overrideStartX?: number,
    overrideStartY?: number,
    overrideEndX?: number,
    overrideEndY?: number
): { x: number; y: number }[] | number[] | undefined {
    const sx = overrideStartX ?? line.x;
    const sy = overrideStartY ?? line.y;
    const ex = overrideEndX ?? (line.x + line.width);
    const ey = overrideEndY ?? (line.y + line.height);

    if (line.curveType === 'elbow') {
        // Unbound polylines (user-defined multi-point elbows) — preserve existing points
        if (!line.startBinding && !line.endBinding) {
            return undefined;
        }

        const startEl = elements.find(e => e.id === line.startBinding?.elementId);
        const endEl = elements.find(e => e.id === line.endBinding?.elementId);

        const rawPoints = calculateSmartElbowRoute(
            { x: sx, y: sy },
            { x: ex, y: ey },
            elements,
            startEl,
            endEl,
            line.startBinding?.position,
            line.endBinding?.position
        );

        // Convert world points to relative points for storage
        return rawPoints.map(p => ({ x: p.x - sx, y: p.y - sy }));
    }

    // If it's a straight line/arrow that already has points, update them to be consistent with sx/sy
    if (line.points && line.points.length >= 2) {
        return [0, 0, ex - sx, ey - sy];
    }

    return undefined;
}

/**
 * Update a bound line's geometry when its connected shape(s) have moved.
 * Handles dynamic anchor switching and control point adjustments.
 *
 * @param lineId         The line element ID to refresh
 * @param getElements    Getter returning the current elements array (needed for recursive re-fetch after store mutation)
 * @param updateElementFn Store mutation function for updating element properties
 */
export function refreshBoundLine(
    lineId: string,
    getElements: () => DrawingElement[],
    updateElementFn: (id: string, updates: any, pushHistory: boolean) => void
): void {
    const elements = getElements();
    const line = elements.find(l => l.id === lineId);
    if (!line || (line.type !== 'line' && line.type !== 'arrow' && line.type !== 'organicBranch' && line.type !== 'bezier')) return;

    let sX = line.x;
    let sY = line.y;
    let eX = line.x + line.width;
    let eY = line.y + line.height;
    let changed = false;

    const startEl = line.startBinding ? elements.find(e => e.id === line.startBinding?.elementId) : null;
    const endEl = line.endBinding ? elements.find(e => e.id === line.endBinding?.elementId) : null;

    // Dynamic Anchor Switching: Snap to the closest cardinal anchor
    if (startEl && endEl) {
        const startCenterX = startEl.x + startEl.width / 2;
        const startCenterY = startEl.y + startEl.height / 2;
        const endCenterX = endEl.x + endEl.width / 2;
        const endCenterY = endEl.y + endEl.height / 2;

        const dx = endCenterX - startCenterX;
        const dy = endCenterY - startCenterY;

        const currentStartPos = line.startBinding?.position;
        const currentEndPos = line.endBinding?.position;

        let idealStartPos: string;
        let idealEndPos: string;

        if (Math.abs(dx) > Math.abs(dy)) {
            idealStartPos = dx > 0 ? 'right' : 'left';
            idealEndPos = dx > 0 ? 'left' : 'right';
        } else {
            idealStartPos = dy > 0 ? 'bottom' : 'top';
            idealEndPos = dy > 0 ? 'top' : 'bottom';
        }

        if (currentStartPos !== idealStartPos || currentEndPos !== idealEndPos) {
            updateElementFn(line.id, {
                startBinding: { ...line.startBinding!, position: idealStartPos as any },
                endBinding: { ...line.endBinding!, position: idealEndPos as any }
            }, false);
            // Re-fetch to get updated positions
            return refreshBoundLine(lineId, getElements, updateElementFn);
        }
    }

    if (line.startBinding) {
        const el = startEl || elements.find(e => e.id === line.startBinding!.elementId);
        if (el) {
            const pos = line.startBinding.position;
            let p;
            if (pos && pos !== 'edge') {
                const anchors = getAnchorPoints(el);
                const anchor = anchors.find(a => a.position === pos);
                if (anchor) p = { x: anchor.x, y: anchor.y };
            }
            if (!p) p = intersectElementWithLine(el, { x: eX, y: eY }, line.startBinding.gap);
            if (p) { sX = p.x; sY = p.y; changed = true; }
        }
    }

    if (line.endBinding) {
        const el = endEl || elements.find(e => e.id === line.endBinding!.elementId);
        if (el) {
            const pos = line.endBinding.position;
            let p;
            if (pos && pos !== 'edge') {
                const anchors = getAnchorPoints(el);
                const anchor = anchors.find(a => a.position === pos);
                if (anchor) p = { x: anchor.x, y: anchor.y };
            }
            if (!p) p = intersectElementWithLine(el, { x: sX, y: sY }, line.endBinding.gap);
            if (p) { eX = p.x; eY = p.y; changed = true; }
        }
    }

    if (changed) {
        const points = refreshLinePoints(line, elements, sX, sY, eX, eY);
        if (sX !== line.x || sY !== line.y || (eX - sX) !== line.width || (eY - sY) !== line.height || JSON.stringify(points) !== JSON.stringify(line.points)) {

            const updates: any = {
                x: sX,
                y: sY,
                width: eX - sX,
                height: eY - sY,
                points
            };

            // For organicBranch or bezier, update control points to follow the start/end moves
            const hasControlPoints = line.controlPoints && line.controlPoints.length === 2;
            if (hasControlPoints) {
                const dSX = sX - line.x;
                const dSY = sY - line.y;
                const dEX = eX - (line.x + line.width);
                const dEY = eY - (line.y + line.height);

                const cp1 = { x: line.controlPoints![0].x + dSX, y: line.controlPoints![0].y + dSY };
                const cp2 = { x: line.controlPoints![1].x + dEX, y: line.controlPoints![1].y + dEY };
                updates.controlPoints = [cp1, cp2];
            }

            updateElementFn(line.id, updates, false);
        }
    }
}
