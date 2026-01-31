/**
 * Polyline Handler
 * Multi-click tool: click to place points, double-click to finish.
 * Creates a line element with curveType: 'elbow' and a points array.
 */

import type { DrawingElement } from '../../types';
import type { PointerState } from '../pointer-state';
import type { PointerHelpers, PointerSignals } from '../pointer-helpers';
import { store, addElement, updateElement, setStore, setSelectedTool, pushToHistory } from '../../store/app-store';
import { snapPoint } from '../snap-helpers';
import { generateId } from '../id-generator';

// ─── Pointer Down: Create or append point ────────────────────────────

export function polylineOnDown(
    x: number,
    y: number,
    pState: PointerState,
    helpers: PointerHelpers
): void {
    let px = x;
    let py = y;
    if (store.gridSettings.snapToGrid) {
        const snapped = snapPoint(x, y, store.gridSettings.gridSize);
        px = snapped.x;
        py = snapped.y;
    }

    if (!pState.isPolylineBuilding) {
        // First click — create the element
        pushToHistory();
        pState.isPolylineBuilding = true;
        pState.isDrawing = true;
        pState.startX = px;
        pState.startY = py;
        pState.currentId = generateId('line');
        pState.polylinePoints = [{ x: 0, y: 0 }];

        // Check for start binding (magnetic snap)
        let startBindingData: { elementId: string; focus: number; gap: number; position?: string } | undefined;
        const match = helpers.checkBinding(px, py, pState.currentId);
        if (match) {
            startBindingData = {
                elementId: match.element.id,
                focus: 0,
                gap: 5,
                position: match.position
            };
            px = match.snapPoint.x;
            py = match.snapPoint.y;
            pState.startX = px;
            pState.startY = py;
        }

        const newElement = {
            ...store.defaultElementStyles,
            id: pState.currentId,
            type: 'line',
            x: px,
            y: py,
            width: 0,
            height: 0,
            seed: Math.floor(Math.random() * 2 ** 31) + 1,
            layerId: store.activeLayerId,
            curveType: 'elbow' as const,
            points: [{ x: 0, y: 0 }],
            startBinding: startBindingData,
            startArrowhead: null,
            endArrowhead: null,
        } as DrawingElement;

        addElement(newElement);

        // Update target's boundElements if we have a start binding
        if (startBindingData) {
            const target = store.elements.find(e => e.id === startBindingData!.elementId);
            if (target) {
                const existing = target.boundElements || [];
                updateElement(target.id, { boundElements: [...existing, { id: pState.currentId, type: 'line' as any }] });
            }
        }
    } else if (pState.currentId) {
        // Subsequent click — commit the preview point as a real point
        const relX = px - pState.startX;
        const relY = py - pState.startY;
        pState.polylinePoints.push({ x: relX, y: relY });

        // Update the element with committed points (no preview tail)
        updateElement(pState.currentId, {
            points: [...pState.polylinePoints],
        });
    }
}

// ─── Pointer Move: Rubber-band preview ───────────────────────────────

export function polylineOnMove(
    x: number,
    y: number,
    pState: PointerState,
    helpers: PointerHelpers,
    signals: PointerSignals
): void {
    if (!pState.isPolylineBuilding || !pState.currentId) return;

    let px = x;
    let py = y;

    // Check for binding near cursor (magnetic snap preview)
    const match = helpers.checkBinding(px, py, pState.currentId);
    if (match) {
        signals.setSuggestedBinding({ elementId: match.element.id, px: match.snapPoint.x, py: match.snapPoint.y, position: match.position });
        px = match.snapPoint.x;
        py = match.snapPoint.y;
    } else {
        signals.setSuggestedBinding(null);
        if (store.gridSettings.snapToGrid) {
            const snapped = snapPoint(x, y, store.gridSettings.gridSize);
            px = snapped.x;
            py = snapped.y;
        }
    }

    const relX = px - pState.startX;
    const relY = py - pState.startY;

    // Show committed points + preview point at cursor
    const previewPoints = [...pState.polylinePoints, { x: relX, y: relY }];

    // Compute bounding box for width/height
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of previewPoints) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }

    updateElement(pState.currentId, {
        points: previewPoints,
        width: maxX - minX || relX,
        height: maxY - minY || relY,
    });
}

// ─── Pointer Up: No-op (keep building) ──────────────────────────────

export function polylineOnUp(_pState: PointerState): void {
    // Intentionally empty — polyline keeps building until double-click or Escape
}

// ─── Finalize: Commit the polyline ───────────────────────────────────

export function polylineFinalize(
    pState: PointerState,
    _helpers?: PointerHelpers,
    signals?: PointerSignals
): void {
    if (!pState.isPolylineBuilding || !pState.currentId) return;

    // Need at least 2 points for a valid polyline
    if (pState.polylinePoints.length < 2) {
        // Remove the element if only 1 point
        const idx = store.elements.findIndex(e => e.id === pState.currentId);
        if (idx >= 0) {
            setStore('elements', els => els.filter(e => e.id !== pState.currentId));
        }
    } else {
        // Check for end binding at the last point
        if (signals && signals.suggestedBinding()) {
            const binding = signals.suggestedBinding()!;
            const bindingData = {
                elementId: binding.elementId,
                focus: 0,
                gap: 5,
                position: binding.position
            };
            // Snap the last point to the binding position
            const snappedRelX = binding.px - pState.startX;
            const snappedRelY = binding.py - pState.startY;
            const finalPoints = [...pState.polylinePoints];
            // Replace or append the last point with the snapped position
            if (finalPoints.length >= 2) {
                finalPoints[finalPoints.length - 1] = { x: snappedRelX, y: snappedRelY };
            } else {
                finalPoints.push({ x: snappedRelX, y: snappedRelY });
            }
            updateElement(pState.currentId, {
                points: finalPoints,
                endBinding: bindingData,
            });

            // Update target's boundElements
            const target = store.elements.find(e => e.id === binding.elementId);
            if (target) {
                const existing = target.boundElements || [];
                updateElement(target.id, { boundElements: [...existing, { id: pState.currentId!, type: 'line' as any }] });
            }
            signals.setSuggestedBinding(null);
        } else {
            // Commit final points
            updateElement(pState.currentId, {
                points: [...pState.polylinePoints],
            });
        }
    }

    // Select the created element
    if (pState.polylinePoints.length >= 2 && pState.currentId) {
        setStore('selection', [pState.currentId]);
    }

    // Reset state
    pState.isPolylineBuilding = false;
    pState.isDrawing = false;
    pState.polylinePoints = [];
    pState.currentId = null;
    setSelectedTool('selection');
}

// ─── Undo last point (Backspace) ─────────────────────────────────────

export function polylineUndo(pState: PointerState): void {
    if (!pState.isPolylineBuilding || !pState.currentId) return;

    if (pState.polylinePoints.length <= 1) {
        // Only origin point — cancel entirely
        setStore('elements', els => els.filter(e => e.id !== pState.currentId));
        pState.isPolylineBuilding = false;
        pState.isDrawing = false;
        pState.polylinePoints = [];
        pState.currentId = null;
        return;
    }

    // Remove last committed point
    pState.polylinePoints.pop();
    updateElement(pState.currentId, {
        points: [...pState.polylinePoints],
    });
}
