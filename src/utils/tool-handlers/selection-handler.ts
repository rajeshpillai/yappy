/**
 * Selection Handler
 * Handles selection tool logic: hit testing, group selection, move, resize,
 * rotate, control point dragging, snapping, and selection box.
 * Extracted from canvas.tsx handlePointerDown/Move/Up.
 */

import type { DrawingElement } from '../../types';
import type { PointerState } from '../pointer-state';
import type { PointerHelpers, PointerSignals } from '../pointer-helpers';
import { store, updateElement, setStore, pushToHistory, isLayerVisible, toggleCollapse, setShowCanvasProperties } from '../../store/app-store';
import { hitTestElement } from '../hit-testing';
import { getHandleAtPosition, getSelectionBoundingBox } from '../handle-detection';
import { getDescendants } from '../hierarchy';
import { snapPoint } from '../snap-helpers';
import { getSnappingGuides } from '../object-snapping';
import { getSpacingGuides } from '../spacing';
import { calculateAllAnimatedStates } from '../animation-utils';
import { getGroupsSortedByPriority, isPointInGroupBounds } from '../group-utils';
import { normalizePoints } from '../render-element';
import { connectorHandleOnDown } from './minor-handlers';

// ─── Helper: Capture initial positions for move/resize ──────────────

function captureInitialPositions(
    pState: PointerState,
    idsToCapture: Set<string>
): void {
    pState.initialPositions.clear();
    store.elements.forEach(el => {
        if (idsToCapture.has(el.id)) {
            pState.initialPositions.set(el.id, {
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                fontSize: el.fontSize,
                points: el.points ? [...el.points] : undefined,
                controlPoints: el.controlPoints ? el.controlPoints.map(cp => ({ ...cp })) : undefined
            });
        }
    });
}

function initMoveState(
    pState: PointerState,
    x: number,
    y: number
): void {
    pushToHistory();
    pState.isDragging = true;
    pState.draggingHandle = null;
    pState.startX = x;
    pState.startY = y;

    pState.initialPositions.clear();
    const idsToMove = new Set<string>(store.selection);

    // Include descendants in the move set
    store.selection.forEach(id => {
        getDescendants(id, store.elements).forEach(d => idsToMove.add(d.id));
    });

    captureInitialPositions(pState, idsToMove);
}

// ─── Pointer Down: Selection ────────────────────────────────────────

export function selectionOnDown(
    e: PointerEvent,
    x: number,
    y: number,
    pState: PointerState,
    helpers: PointerHelpers,
    signals: PointerSignals
): void {
    const hitHandle = getHandleAtPosition(x, y, store.elements, store.selection, store.viewState.scale);
    if (hitHandle) {
        // Mindmap toggle logic
        if (hitHandle.handle === 'mindmap-toggle') {
            toggleCollapse(hitHandle.id);
            return;
        }

        // Check if it's a connector handle
        if (hitHandle.handle.startsWith('connector-')) {
            pushToHistory();
            connectorHandleOnDown(hitHandle, pState);
            return;
        }

        pushToHistory();
        pState.isDragging = true;
        pState.draggingHandle = hitHandle.handle;
        pState.startX = x;
        pState.startY = y;

        if (hitHandle.id === 'multi') {
            const box = getSelectionBoundingBox(store.elements, store.selection);
            if (box) {
                pState.initialElementX = box.x;
                pState.initialElementY = box.y;
                pState.initialElementWidth = box.width;
                pState.initialElementHeight = box.height;

                pState.initialPositions.clear();
                const toCapture = new Set(store.selection);

                // Add descendants to capture list
                store.selection.forEach(selId => {
                    getDescendants(selId, store.elements).forEach(d => toCapture.add(d.id));
                });

                store.elements.forEach(el => {
                    if (toCapture.has(el.id)) {
                        pState.initialPositions.set(el.id, {
                            x: el.x,
                            y: el.y,
                            width: el.width,
                            height: el.height,
                            fontSize: el.fontSize,
                            points: el.points ? [...el.points] : undefined
                        });
                    }
                });
            }
        } else {
            const el = store.elements.find(e => e.id === hitHandle.id);
            if (el) {
                pState.initialElementX = el.x;
                pState.initialElementY = el.y;
                pState.initialElementWidth = el.width;
                pState.initialElementHeight = el.height;
                pState.initialElementFontSize = el.fontSize || 28;

                // Capture initial position for the single element to support point scaling
                pState.initialPositions.clear();
                pState.initialPositions.set(el.id, {
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height,
                    fontSize: el.fontSize,
                    points: el.points ? [...el.points] : undefined
                });
            }
        }
        return;
    }

    // Hit Test Body
    let hitId: string | null = null;
    const threshold = 10 / store.viewState.scale;

    // STEP 1: Check if click is within any group's bounding box
    const sortedGroups = getGroupsSortedByPriority(store.elements, store.layers);

    for (const { groupId } of sortedGroups) {
        const groupElements = store.elements.filter(el =>
            el.groupIds && el.groupIds.includes(groupId)
        );

        const hasInteractableElement = groupElements.some(el =>
            helpers.canInteractWithElement(el) && isLayerVisible(el.layerId)
        );

        if (!hasInteractableElement) continue;

        if (isPointInGroupBounds(x, y, groupId, store.elements)) {
            const idsToSelect = groupElements.map(el => el.id);
            const isAllSelected = idsToSelect.every(id => store.selection.includes(id));

            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                if (isAllSelected) {
                    setStore('selection', s => s.filter(id => !idsToSelect.includes(id)));
                } else {
                    setStore('selection', s => [...new Set([...s, ...idsToSelect])]);
                }
            } else {
                if (!isAllSelected) {
                    setStore('selection', idsToSelect);
                }
            }

            if (store.selection.length > 0) {
                initMoveState(pState, x, y);
            }

            return;
        }
    }

    const elementMap = new Map<string, DrawingElement>();
    for (const el of store.elements) elementMap.set(el.id, el);

    const sortedElements = store.elements.map((el, index) => {
        const layer = store.layers.find(l => l.id === el.layerId);
        return { el, index, layerOrder: layer?.order ?? 999, layerVisible: isLayerVisible(el.layerId) };
    }).sort((a, b) => {
        if (a.layerOrder !== b.layerOrder) return b.layerOrder - a.layerOrder;
        return b.index - a.index;
    });

    // Hit Testing must respect Animation
    const currentTime = (window as any).yappyGlobalTime || 0;
    const shouldAnimate = store.appMode === 'presentation' || store.isPreviewing;
    const animatedStates = calculateAllAnimatedStates(store.elements, currentTime, shouldAnimate);

    for (const { el, layerVisible } of sortedElements) {
        if (!layerVisible) continue;
        if (!helpers.canInteractWithElement(el)) continue;

        const animState = animatedStates.get(el.id);
        const testEl = helpers.applyMasterProjection(animState ? {
            ...el,
            x: animState.x,
            y: animState.y,
            angle: animState.angle
        } : el);

        if (hitTestElement(testEl, x, y, threshold, store.elements, elementMap)) {
            hitId = el.id;
            break;
        }
    }

    if (hitId) {
        const hitEl = store.elements.find(e => e.id === hitId);
        let idsToSelect = [hitId];

        // If element is grouped, select the outermost group
        if (hitEl && hitEl.groupIds && hitEl.groupIds.length > 0) {
            const outermostId = hitEl.groupIds[hitEl.groupIds.length - 1];
            idsToSelect = store.elements
                .filter(el => el.groupIds && el.groupIds.includes(outermostId))
                .map(el => el.id);
        }

        const isAllSelected = idsToSelect.every(id => store.selection.includes(id));

        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (isAllSelected) {
                setStore('selection', s => s.filter(id => !idsToSelect.includes(id)));
            } else {
                setStore('selection', s => [...new Set([...s, ...idsToSelect])]);
            }
        } else {
            if (!isAllSelected) {
                setStore('selection', idsToSelect);
            }
        }

        if (store.selection.length > 0) {
            initMoveState(pState, x, y);
        }
    } else {
        // Clicked empty space - Check if hit selection bounding box
        if (store.selection.length > 0) {
            const box = getSelectionBoundingBox(store.elements, store.selection);
            if (box) {
                const threshold = 10 / store.viewState.scale;
                if (x >= box.x - threshold && x <= box.x + box.width + threshold &&
                    y >= box.y - threshold && y <= box.y + box.height + threshold) {

                    pushToHistory();
                    pState.isDragging = true;
                    pState.draggingHandle = null;
                    pState.startX = x;
                    pState.startY = y;

                    pState.initialPositions.clear();
                    store.elements.forEach(el => {
                        if (store.selection.includes(el.id)) {
                            pState.initialPositions.set(el.id, {
                                x: el.x,
                                y: el.y,
                                width: el.width,
                                height: el.height,
                                fontSize: el.fontSize,
                                points: el.points ? [...el.points] : undefined,
                                controlPoints: el.controlPoints ? el.controlPoints.map(cp => ({ ...cp })) : undefined
                            });
                        }
                    });
                    return;
                }
            }
        }

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            setStore('selection', []);
            setShowCanvasProperties(false);
        }
        // Start Selection Box
        pState.isSelecting = true;
        pState.startX = x;
        pState.startY = y;
        signals.setSelectionBox({ x, y, w: 0, h: 0 });
    }
}

// ─── Pointer Move: Cursor, selection box, resize, rotate, move ──────

export function selectionOnMove(
    e: PointerEvent,
    x: number,
    y: number,
    pState: PointerState,
    helpers: PointerHelpers,
    signals: PointerSignals,
    SNAPPING_THROTTLE_MS: number
): void {
    // Cursor updates (when not dragging)
    if (!pState.isDragging) {
        const hit = getHandleAtPosition(x, y, store.elements, store.selection, store.viewState.scale);
        const prevHover = pState.hoveredConnector;

        if (hit) {
            if (hit.handle === 'rotate') helpers.setCursor('grab');
            else if (hit.handle === 'tl' || hit.handle === 'br') helpers.setCursor('nwse-resize');
            else if (hit.handle === 'tr' || hit.handle === 'bl') helpers.setCursor('nesw-resize');
            else if (hit.handle === 'tm' || hit.handle === 'bm') helpers.setCursor('ns-resize');
            else if (hit.handle === 'lm' || hit.handle === 'rm') helpers.setCursor('ew-resize');
            else if (hit.handle.startsWith('connector-')) {
                helpers.setCursor('crosshair');
                pState.hoveredConnector = { elementId: hit.id, handle: hit.handle };
            } else {
                pState.hoveredConnector = null;
            }
        } else {
            helpers.setCursor('default');
            pState.hoveredConnector = null;
        }

        // Redraw if hover connector changed
        const isChanged = (prevHover && !pState.hoveredConnector) ||
            (!prevHover && pState.hoveredConnector) ||
            (prevHover && pState.hoveredConnector && (prevHover.elementId !== pState.hoveredConnector.elementId || prevHover.handle !== pState.hoveredConnector.handle));

        if (isChanged) {
            requestAnimationFrame(helpers.draw);
        }
    }

    // Selection box drag
    if (pState.isSelecting) {
        const w = x - pState.startX;
        const h = y - pState.startY;
        signals.setSelectionBox({
            x: w > 0 ? pState.startX : pState.startX + w,
            y: h > 0 ? pState.startY : pState.startY + h,
            w: Math.abs(w),
            h: Math.abs(h)
        });
        return;
    }

    if (pState.isDragging && store.selection.length > 0) {
        const id = store.selection[0];
        const el = store.elements.find(e => e.id === id);
        if (!el) return;

        if (pState.draggingHandle && !helpers.canInteractWithElement(el)) {
            return;
        }

        if (pState.draggingHandle) {
            handleResize(e, x, y, id, el, pState, helpers, signals);
        } else {
            handleMove(e, x, y, pState, helpers, signals, SNAPPING_THROTTLE_MS);
        }
    }
}

// ─── Resize/Rotate logic ────────────────────────────────────────────

function handleResize(
    e: PointerEvent,
    x: number,
    y: number,
    id: string,
    el: DrawingElement,
    pState: PointerState,
    helpers: PointerHelpers,
    signals: PointerSignals
): void {
    // Binding Logic for Lines/Arrows/OrganicBranch
    if ((el.type === 'line' || el.type === 'arrow' || el.type === 'organicBranch') && (pState.draggingHandle === 'tl' || pState.draggingHandle === 'br')) {
        const match = helpers.checkBinding(x, y, el.id);
        if (match) {
            signals.setSuggestedBinding({ elementId: match.element.id, px: match.snapPoint.x, py: match.snapPoint.y, position: match.position });
            x = match.snapPoint.x;
            y = match.snapPoint.y;
        } else {
            signals.setSuggestedBinding(null);
        }
    } else {
        signals.setSuggestedBinding(null);
    }

    // Rotate
    if (pState.draggingHandle === 'rotate') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const angle = Math.atan2(y - cy, x - cx);
        updateElement(id, { angle: angle + Math.PI / 2 });
        return;
    }

    // RESIZING
    let resizeX = x;
    let resizeY = y;

    // Snap handle position to grid if enabled
    if (store.gridSettings.snapToGrid) {
        const snapped = snapPoint(x, y, store.gridSettings.gridSize);
        resizeX = snapped.x;
        resizeY = snapped.y;
    }

    const dx = resizeX - pState.startX;
    const dy = resizeY - pState.startY;

    let newX = pState.initialElementX;
    let newY = pState.initialElementY;
    let newWidth = pState.initialElementWidth;
    let newHeight = pState.initialElementHeight;

    if (pState.draggingHandle === 'tl') {
        newX += dx; newY += dy; newWidth -= dx; newHeight -= dy;
    } else if (pState.draggingHandle === 'tr') {
        newY += dy; newWidth += dx; newHeight -= dy;
    } else if (pState.draggingHandle === 'bl') {
        newX += dx; newWidth -= dx; newHeight += dy;
    } else if (pState.draggingHandle === 'br') {
        newWidth += dx; newHeight += dy;
    } else if (pState.draggingHandle === 'tm') {
        newY += dy; newHeight -= dy;
    } else if (pState.draggingHandle === 'bm') {
        newHeight += dy;
    } else if (pState.draggingHandle === 'lm') {
        newX += dx; newWidth -= dx;
    } else if (pState.draggingHandle === 'rm') {
        newWidth += dx;
    }

    // Apply Constraints (Proportional Resizing)
    const isMulti = store.selection.length > 1;
    const firstEl = store.elements.find(e => e.id === store.selection[0]);
    let isConstrained = e.shiftKey || (store.selection.length === 1 && firstEl?.constrained);

    // Lock Aspect Ratio for Text by Default
    if (store.selection.length === 1 && firstEl?.type === 'text') {
        isConstrained = !e.shiftKey;
    }

    if (isConstrained && pState.initialElementWidth !== 0 && pState.initialElementHeight !== 0) {
        const ratio = pState.initialElementWidth / pState.initialElementHeight;

        if (['tm', 'bm'].includes(pState.draggingHandle!)) {
            newWidth = newHeight * ratio;
            if (pState.draggingHandle === 'tm') {
                newX = (pState.initialElementX + pState.initialElementWidth / 2) - newWidth / 2;
            } else {
                newX = (pState.initialElementX + pState.initialElementWidth / 2) - newWidth / 2;
            }
        } else if (['lm', 'rm'].includes(pState.draggingHandle!)) {
            newHeight = newWidth / ratio;
            newY = (pState.initialElementY + pState.initialElementHeight / 2) - newHeight / 2;
        } else {
            // Corner Handles
            if (Math.abs(newWidth) / ratio > Math.abs(newHeight)) {
                newHeight = newWidth / ratio;
            } else {
                newWidth = newHeight * ratio;
            }

            if (pState.draggingHandle === 'tl') {
                newX = (pState.initialElementX + pState.initialElementWidth) - newWidth;
                newY = (pState.initialElementY + pState.initialElementHeight) - newHeight;
            } else if (pState.draggingHandle === 'tr') {
                newY = (pState.initialElementY + pState.initialElementHeight) - newHeight;
            } else if (pState.draggingHandle === 'bl') {
                newX = (pState.initialElementX + pState.initialElementWidth) - newWidth;
            }
        }
    }

    if (pState.draggingHandle && pState.draggingHandle.startsWith('control-')) {
        handleControlPointDrag(x, y, id, pState, helpers);
    } else {
        // APPLY RESIZE (Single or Group)
        applyResize(id, el, isMulti, newX, newY, newWidth, newHeight, pState, helpers);
    }
}

// ─── Control Point Dragging ─────────────────────────────────────────

function handleControlPointDrag(
    x: number,
    y: number,
    id: string,
    pState: PointerState,
    helpers: PointerHelpers
): void {
    const index = parseInt(pState.draggingHandle!.replace('control-', ''), 10);
    const element = store.elements.find(e => e.id === id);

    if (element) {
        let newControlPoints = element.controlPoints ? [...element.controlPoints] : [];

        while (newControlPoints.length <= index) {
            newControlPoints.push({ x: x, y: y });
        }

        if (element.controlPoints && element.controlPoints.length === 1 && index === 0) {
            // Curve Handle Logic
            let start = { x: element.x, y: element.y };
            let end = { x: element.x + element.width, y: element.y + element.height };
            if (element.points && element.points.length >= 2) {
                const pts = normalizePoints(element.points);
                if (pts.length > 0) {
                    start = { x: element.x + pts[0].x, y: element.y + pts[0].y };
                    end = { x: element.x + pts[pts.length - 1].x, y: element.y + pts[pts.length - 1].y };
                }
            }
            const cpX = 2 * x - 0.5 * start.x - 0.5 * end.x;
            const cpY = 2 * y - 0.5 * start.y - 0.5 * end.y;
            newControlPoints[0] = { x: cpX, y: cpY };
        } else {
            newControlPoints[index] = { x: x, y: y };
        }
        updateElement(element.id, { controlPoints: newControlPoints });
    }

    // Handle Custom Control Handles (Virtual handles like Top Control for Cube)
    const el = store.elements.find(e => e.id === id);
    if (el) {
        if (el.type === 'isometricCube' && pState.draggingHandle === 'control-1') {
            let newVRatio = (y - el.y) / el.height;
            newVRatio = Math.max(0.1, Math.min(0.9, newVRatio));
            const shapeRatio = Math.round(newVRatio * 100);

            let newHRatio = (x - el.x) / el.width;
            newHRatio = Math.max(0, Math.min(1, newHRatio));
            const sideRatio = Math.round(newHRatio * 100);

            updateElement(el.id, { shapeRatio, sideRatio }, false);
        } else if ((el.type === 'solidBlock' || el.type === 'cylinder') && pState.draggingHandle === 'control-1') {
            const centerX = el.x + el.width / 2;
            const centerY = el.y + el.height / 2;
            const dx = x - centerX;
            const dy = y - centerY;

            let newDepth = Math.sqrt(dx * dx + dy * dy);
            newDepth = Math.round(newDepth);

            let angleRad = Math.atan2(dy, dx);
            let angleDeg = Math.round((angleRad * 180) / Math.PI);
            if (angleDeg < 0) angleDeg += 360;

            updateElement(el.id, { depth: newDepth, viewAngle: angleDeg }, false);
        } else if (el.type === 'perspectiveBlock') {
            handlePerspectiveBlockControl(x, y, el, pState);
        } else if ((el.type === 'star' || el.type === 'burst') && pState.draggingHandle === 'control-1') {
            let newRatio = (y - el.y) / el.height;
            newRatio = Math.max(0.1, Math.min(0.9, newRatio));
            const shapeRatio = Math.round(newRatio * 100);
            updateElement(el.id, { shapeRatio }, false);
        } else if (el.type === 'speechBubble' && pState.draggingHandle === 'control-1') {
            let newTailX = (x - el.x) / el.width;
            let newTailY = (y - el.y) / el.height;
            newTailX = Math.max(-0.5, Math.min(1.5, newTailX));
            newTailY = Math.max(-0.5, Math.min(1.5, newTailY));
            updateElement(el.id, { tailX: newTailX, tailY: newTailY }, false);
        }
    }
}

// ─── Perspective Block Control Points ───────────────────────────────

function handlePerspectiveBlockControl(
    x: number,
    y: number,
    el: DrawingElement,
    pState: PointerState
): void {
    if (pState.draggingHandle === 'control-1') {
        const centerX = el.x + el.width / 2;
        const centerY = el.y + el.height / 2;
        const dx = x - centerX - (el.skewX || 0) * el.width;
        const dy = y - centerY - (el.skewY || 0) * el.height;

        let newDepth = Math.sqrt(dx * dx + dy * dy);
        let angleRad = Math.atan2(dy, dx);
        let angleDeg = Math.round((angleRad * 180) / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        updateElement(el.id, { depth: Math.round(newDepth), viewAngle: angleDeg }, false);
    } else if (pState.draggingHandle === 'control-2' || pState.draggingHandle === 'control-3' || pState.draggingHandle === 'control-4' || pState.draggingHandle === 'control-5') {
        // Back Vertices (TL, TR, BR, BL)
        const mw = el.width / 2;
        const mh = el.height / 2;
        const centerX = el.x + mw;
        const centerY = el.y + mh;
        const angle = (el.viewAngle || 45) * Math.PI / 180;
        const depth = el.depth || 50;
        const baseBackCenterX = centerX + depth * Math.cos(angle);
        const baseBackCenterY = centerY + depth * Math.sin(angle);

        const imx = x - baseBackCenterX;
        const imy = y - baseBackCenterY;

        const sx = (pState.draggingHandle === 'control-3' || pState.draggingHandle === 'control-4') ? 1 : -1;
        const sy = (pState.draggingHandle === 'control-4' || pState.draggingHandle === 'control-5') ? 1 : -1;

        const distToCenter = Math.sqrt(imx * imx + imy * imy);
        const predictedDist = Math.sqrt((mw * mw) + (mh * mh));
        const newTaper = Math.max(0, Math.min(1, 1 - (distToCenter / predictedDist)));

        const newSkewX = (imx - sx * mw * (1 - newTaper)) / el.width;
        const newSkewY = (imy - sy * mh * (1 - newTaper)) / el.height;

        updateElement(el.id, { taper: newTaper, skewX: newSkewX, skewY: newSkewY }, false);
    } else if (pState.draggingHandle === 'control-6' || pState.draggingHandle === 'control-7' || pState.draggingHandle === 'control-8' || pState.draggingHandle === 'control-9') {
        // Front Vertices (TL, TR, BR, BL)
        const mw = el.width / 2;
        const mh = el.height / 2;
        const centerX = el.x + mw;
        const centerY = el.y + mh;

        const imx = x - centerX;
        const imy = y - centerY;

        const sx = (pState.draggingHandle === 'control-7' || pState.draggingHandle === 'control-8') ? 1 : -1;
        const sy = (pState.draggingHandle === 'control-8' || pState.draggingHandle === 'control-9') ? 1 : -1;

        const distToCenter = Math.sqrt(imx * imx + imy * imy);
        const predictedDist = Math.sqrt((mw * mw) + (mh * mh));
        const newTaper = Math.max(0, Math.min(1, 1 - (distToCenter / predictedDist)));

        const newSkewX = (imx - sx * mw * (1 - newTaper)) / el.width;
        const newSkewY = (imy - sy * mh * (1 - newTaper)) / el.height;

        updateElement(el.id, { frontTaper: newTaper, frontSkewX: newSkewX, frontSkewY: newSkewY }, false);
    }
}

// ─── Apply Resize (Single or Group) ─────────────────────────────────

function applyResize(
    id: string,
    el: DrawingElement,
    isMulti: boolean,
    newX: number,
    newY: number,
    newWidth: number,
    newHeight: number,
    pState: PointerState,
    helpers: PointerHelpers
): void {
    if (isMulti) {
        // GROUP RESIZING
        const scaleX = pState.initialElementWidth === 0 ? 1 : newWidth / pState.initialElementWidth;
        const scaleY = pState.initialElementHeight === 0 ? 1 : newHeight / pState.initialElementHeight;

        store.selection.forEach(selId => {
            const init = pState.initialPositions.get(selId);
            if (!init) return;

            const relX = init.x - pState.initialElementX;
            const relY = init.y - pState.initialElementY;

            const updates: any = {
                x: newX + relX * scaleX,
                y: newY + relY * scaleY,
                width: init.width * scaleX,
                height: init.height * scaleY
            };

            if (init.points) {
                if (typeof init.points[0] === 'number') {
                    const pts = init.points as number[];
                    const newPts = [];
                    for (let i = 0; i < pts.length; i += 2) {
                        newPts.push(pts[i] * scaleX, pts[i + 1] * scaleY);
                    }
                    updates.points = newPts;
                } else {
                    updates.points = (init.points as any[]).map((p: any) => ({
                        x: p.x * scaleX,
                        y: p.y * scaleY
                    }));
                }
            }

            const element = store.elements.find(e => e.id === selId);
            if (element && element.type === 'text') {
                updates.fontSize = Math.max(8, (init.fontSize || 28) * scaleY);
            }

            updateElement(selId, updates, false);
        });
    } else {
        // SINGLE ELEMENT RESIZING
        const singleEl = store.elements.find(e => e.id === id);
        if (singleEl) {
            const updates: any = { x: newX, y: newY, width: newWidth, height: newHeight };

            const scaleX = pState.initialElementWidth === 0 ? 1 : newWidth / pState.initialElementWidth;
            const scaleY = pState.initialElementHeight === 0 ? 1 : newHeight / pState.initialElementHeight;

            // Scale font size for text
            if (singleEl.type === 'text') {
                if (scaleY > 0) {
                    let newFontSize = pState.initialElementFontSize * scaleY;
                    newFontSize = Math.max(newFontSize, 8);
                    updates.fontSize = newFontSize;
                }
            }

            // Scale points for pen tools
            if ((singleEl.type === 'fineliner' || singleEl.type === 'inkbrush' || singleEl.type === 'marker') && singleEl.points) {
                const init = pState.initialPositions.get(id);
                if (init && init.points) {
                    if (singleEl.pointsEncoding === 'flat' || (init.points.length > 0 && typeof init.points[0] === 'number')) {
                        const pts = init.points as number[];
                        const newPts = [];
                        for (let i = 0; i < pts.length; i += 2) {
                            newPts.push(pts[i] * scaleX, pts[i + 1] * scaleY);
                        }
                        updates.points = newPts;
                    } else {
                        updates.points = (init.points as any[]).map((p: any) => ({
                            x: p.x * scaleX,
                            y: p.y * scaleY,
                            ...(p.p !== undefined ? { p: p.p } : {})
                        }));
                    }
                }
            }

            if (singleEl.type === 'line' || singleEl.type === 'arrow' || singleEl.type === 'bezier') {
                updates.points = helpers.refreshLinePoints(singleEl, newX, newY, newX + newWidth, newY + newHeight);
            }

            if (singleEl.type === 'organicBranch') {
                updates.points = [0, 0, newWidth, newHeight];
                const newStartX = newX;
                const newStartY = newY;
                const newEndX = newX + newWidth;
                const newEndY = newY + newHeight;
                const newCp1 = { x: newStartX + newWidth * 0.5, y: newStartY };
                const newCp2 = { x: newEndX - newWidth * 0.5, y: newEndY };
                updates.controlPoints = [newCp1, newCp2];
            }

            updateElement(id, updates, false);
        }
    }
}

// ─── Move logic ─────────────────────────────────────────────────────

function handleMove(
    e: PointerEvent,
    x: number,
    y: number,
    pState: PointerState,
    helpers: PointerHelpers,
    signals: PointerSignals,
    SNAPPING_THROTTLE_MS: number
): void {
    let dx = x - pState.startX;
    let dy = y - pState.startY;

    // Throttled Object Snapping
    if (store.gridSettings.objectSnapping && !e.shiftKey) {
        const now = performance.now();

        if (now - pState.lastSnappingTime >= SNAPPING_THROTTLE_MS) {
            const snap = getSnappingGuides(store.selection, store.elements, dx, dy, 5 / store.viewState.scale);
            dx = snap.dx;
            dy = snap.dy;
            signals.setSnappingGuides(snap.guides);

            const spacing = getSpacingGuides(store.selection, store.elements, dx, dy, 5 / store.viewState.scale);
            dx = spacing.dx;
            dy = spacing.dy;
            signals.setSpacingGuides(spacing.guides);

            pState.lastSnappingTime = now;
        }
    } else {
        signals.setSnappingGuides([]);
        signals.setSpacingGuides([]);
    }

    // Snap delta to grid if enabled and no object snapping guides
    if (store.gridSettings.snapToGrid && !e.shiftKey && signals.snappingGuides().length === 0) {
        const gridSize = store.gridSettings.gridSize;
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
    }

    const skipHierarchy = e.altKey;

    pState.initialPositions.forEach((initPos, selId) => {
        if (skipHierarchy && !store.selection.includes(selId)) return;

        const el = store.elements.find(e => e.id === selId);
        if (el && helpers.canInteractWithElement(el)) {
            const updates: any = { x: initPos.x + dx, y: initPos.y + dy };

            // Update Absolute Control Points
            if (initPos.controlPoints) {
                updates.controlPoints = initPos.controlPoints.map((cp: any) => ({
                    x: cp.x + dx,
                    y: cp.y + dy
                }));
            }

            updateElement(selId, updates, false);

            // Update Bound Lines
            if (el.boundElements) {
                el.boundElements.forEach(b => helpers.refreshBoundLine(b.id));
            }
        }
    });
}

// ─── Pointer Up: Selection finalization ─────────────────────────────

export function selectionOnUp(
    e: PointerEvent,
    pState: PointerState,
    helpers: PointerHelpers,
    signals: PointerSignals
): void {
    if (pState.isSelecting) {
        const box = signals.selectionBox();
        if (box) {
            const selectedIds: string[] = [];
            const bx = box.x;
            const by = box.y;
            const bw = box.w;
            const bh = box.h;

            store.elements.forEach(el => {
                const elX = el.x;
                const elY = el.y;
                const elW = el.width;
                const elH = el.height;

                const ex1 = Math.min(elX, elX + elW);
                const ex2 = Math.max(elX, elX + elW);
                const ey1 = Math.min(elY, elY + elH);
                const ey2 = Math.max(elY, elY + elH);

                if (bx < ex2 && bx + bw > ex1 &&
                    by < ey2 && by + bh > ey1) {
                    selectedIds.push(el.id);
                }
            });

            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                const existing = new Set(store.selection);
                selectedIds.forEach(id => existing.add(id));
                setStore('selection', Array.from(existing));
            } else {
                setStore('selection', selectedIds);
            }
        }
        pState.isSelecting = false;
        signals.setSelectionBox(null);
    }

    if (pState.isDragging) {
        const binding = signals.suggestedBinding();
        if (binding && store.selection.length === 1 && pState.draggingHandle) {
            const elId = store.selection[0];
            const el = store.elements.find(e => e.id === elId);
            if (el && (el.type === 'line' || el.type === 'arrow' || el.type === 'organicBranch')) {
                const isStart = pState.draggingHandle === 'tl';
                const bindingData = {
                    elementId: binding.elementId,
                    focus: 0,
                    gap: 5,
                    position: binding.position
                };

                updateElement(elId, isStart ? { startBinding: bindingData } : { endBinding: bindingData });

                const target = store.elements.find(e => e.id === binding.elementId);
                if (target) {
                    const existing = target.boundElements || [];
                    if (!existing.find(b => b.id === elId)) {
                        updateElement(target.id, { boundElements: [...existing, { id: elId, type: el.type as any }] });
                    }
                }
            }
        }
        signals.setSuggestedBinding(null);
    }

    pState.isDragging = false;
    pState.draggingHandle = null;
    pState.initialPositions.clear();
    signals.setSnappingGuides([]);
}
