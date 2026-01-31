/**
 * Text Editing Handler
 * Handles double-click text editing and text commit logic.
 * Extracted from canvas.tsx commitText/handleDoubleClick.
 */

import type { DrawingElement } from '../../types';
import { store, updateElement, deleteElements, isLayerVisible } from '../../store/app-store';
import { hitTestElement } from '../hit-testing';
import { getHandleAtPosition } from '../handle-detection';
import { fitShapeToText, measureContainerText } from '../text-utils';

/**
 * Context needed by text editing functions from canvas component closures.
 */
export interface TextEditingContext {
    editingId: () => string | null;
    setEditingId: (v: string | null) => void;
    editingProperty: () => 'text' | 'containerText' | 'attributesText' | 'methodsText';
    setEditingProperty: (v: 'text' | 'containerText' | 'attributesText' | 'methodsText') => void;
    editText: () => string;
    setEditText: (v: string) => void;
    textInputRef?: HTMLTextAreaElement;
    canvasRef?: HTMLCanvasElement;
    getWorldCoordinates: (cx: number, cy: number) => { x: number; y: number };
    canInteractWithElement: (el: DrawingElement) => boolean;
    applyMasterProjection: (el: DrawingElement) => DrawingElement;
    redrawFn: () => void;
}

// ─── Commit Text ─────────────────────────────────────────────────────

export function commitText(ctx: TextEditingContext): void {
    const id = ctx.editingId();
    if (!id) return;
    const el = store.elements.find(e => e.id === id);
    if (!el) return;

    const newText = ctx.editText().trim();

    // For standalone text elements, update text property and calculate dimensions
    if (el.type === 'text') {
        if (newText) {
            let width = 0;
            let height = 0;
            if (ctx.canvasRef) {
                const canvasCtx = ctx.canvasRef.getContext("2d");
                if (canvasCtx) {
                    const fontSize = el.fontSize || 28;
                    canvasCtx.font = `${fontSize}px sans-serif`;
                    const metrics = canvasCtx.measureText(newText);
                    width = metrics.width;
                    height = fontSize;
                }
            }
            width = Math.max(width, 10);
            height = Math.max(height, 10);
            updateElement(id, { text: newText, width, height }, true);
        } else {
            deleteElements([id]);
        }
    } else {
        // For shapes with containerText
        const isLine = el.type === 'line' || el.type === 'arrow' || el.type === 'organicBranch';
        const prop = ctx.editingProperty();

        if (el.autoResize && ctx.canvasRef && !isLine && prop === 'containerText') {
            const canvasCtx = ctx.canvasRef.getContext("2d");
            if (canvasCtx) {
                const dims = fitShapeToText(canvasCtx, el, newText);
                updateElement(id, {
                    [prop]: newText,
                    width: dims.width,
                    height: dims.height,
                }, true);
            } else {
                updateElement(id, { [prop]: newText }, true);
            }
        } else {
            updateElement(id, { [prop]: newText }, true);
        }
    }

    ctx.setEditingId(null);
    ctx.setEditText("");
    requestAnimationFrame(ctx.redrawFn);
}

// ─── Double-Click Handler ────────────────────────────────────────────

export function handleDoubleClick(e: MouseEvent, ctx: TextEditingContext): void {
    e.preventDefault();
    if (store.selectedTool !== 'selection') return;

    const { x, y } = ctx.getWorldCoordinates(e.clientX, e.clientY);
    const threshold = 10 / store.viewState.scale;

    // Find element under cursor
    const elementMap = new Map<string, DrawingElement>();
    for (const el of store.elements) elementMap.set(el.id, el);

    for (let i = store.elements.length - 1; i >= 0; i--) {
        const el = store.elements[i];
        if (!ctx.canInteractWithElement(el)) continue;
        if (!isLayerVisible(el.layerId)) continue;

        if (hitTestElement(ctx.applyMasterProjection(el), x, y, threshold, store.elements, elementMap)) {

            // Check for control handles (Star, Burst, Speech Bubble, Isometric Cube, Solid Block, Perspective Block)
            if (['star', 'burst', 'speechBubble', 'isometricCube', 'solidBlock', 'perspectiveBlock'].includes(el.type)) {
                const hitHandle = getHandleAtPosition(x, y, store.elements, store.selection, store.viewState.scale);
                if (hitHandle && hitHandle.handle.startsWith('control-')) {
                    // Hit a control handle, don't open text editor
                    return;
                }
            }

            // Add Control Point for Bezier/Arrow
            if ((el.type === 'line' || el.type === 'arrow' || el.type === 'bezier')) {
                const newControlPoints = el.controlPoints ? [...el.controlPoints] : [];

                // LIMIT TO 2 Control Points for S-Curve Support
                if (newControlPoints.length >= 2) {
                    return;
                }

                newControlPoints.push({ x, y });

                updateElement(el.id, {
                    controlPoints: newControlPoints,
                    curveType: 'bezier'
                }, true);

                return;
            }

            // Only allow editing containerText for shapes and lines
            const shapeTypes = ['rectangle', 'circle', 'diamond', 'line', 'arrow', 'text', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'starPerson', 'scroll', 'wavyDivider', 'doubleBanner', 'lightbulb', 'signpost', 'burstBlob', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField', 'dfdProcess', 'dfdDataStore', 'isometricCube', 'solidBlock', 'perspectiveBlock', 'cylinder', 'stateStart', 'stateEnd', 'stateSync', 'activationBar', 'externalEntity', 'umlClass', 'umlInterface', 'umlActor', 'umlUseCase', 'umlNote', 'umlPackage', 'umlComponent', 'umlState', 'umlLifeline', 'umlFragment', 'umlSignalSend', 'umlSignalReceive', 'umlProvidedInterface', 'umlRequiredInterface', 'trophy', 'clock', 'gear', 'target', 'rocket', 'flag'];
            if (shapeTypes.includes(el.type)) {
                ctx.setEditingId(el.id);

                if (el.type === 'umlClass') {
                    // Determine which section was clicked
                    const clickYRelativeToShape = y - el.y;
                    const canvasCtx = ctx.canvasRef?.getContext("2d");
                    let headerHeight = 30;
                    if (el.containerText && canvasCtx) {
                        const metrics = measureContainerText(canvasCtx, el, el.containerText, el.width - 10);
                        headerHeight = Math.max(30, metrics.textHeight + 20);
                    }

                    let attrHeight = 20;
                    if (el.attributesText && canvasCtx) {
                        const metrics = measureContainerText(canvasCtx, { ...el, fontSize: (el.fontSize || 28) * 0.9 }, el.attributesText, el.width - 10);
                        attrHeight = Math.max(20, metrics.textHeight + 10);
                    }

                    if (clickYRelativeToShape < headerHeight) {
                        ctx.setEditingProperty('containerText');
                        ctx.setEditText(el.containerText || '');
                    } else if (clickYRelativeToShape < headerHeight + attrHeight) {
                        ctx.setEditingProperty('attributesText');
                        ctx.setEditText(el.attributesText || '');
                    } else {
                        ctx.setEditingProperty('methodsText');
                        ctx.setEditText(el.methodsText || '');
                    }
                } else if (el.type === 'umlState') {
                    const clickYRelativeToShape = y - el.y;
                    const canvasCtx = ctx.canvasRef?.getContext("2d");
                    let headerHeight = 35;
                    if (el.containerText && canvasCtx) {
                        const metrics = measureContainerText(canvasCtx, el, el.containerText, el.width - 20);
                        headerHeight = Math.max(35, metrics.textHeight + 15);
                    }
                    if (clickYRelativeToShape < headerHeight) {
                        ctx.setEditingProperty('containerText');
                        ctx.setEditText(el.containerText || '');
                    } else {
                        ctx.setEditingProperty('attributesText');
                        ctx.setEditText(el.attributesText || '');
                    }
                } else if (el.type === 'umlFragment') {
                    const clickYRelativeToShape = y - el.y;
                    const clickXRelativeToShape = x - el.x;
                    const tabW = Math.min(el.width * 0.3, 60);
                    const tabH = Math.min(el.height * 0.12, 22) + 5;

                    if (clickXRelativeToShape < tabW && clickYRelativeToShape < tabH) {
                        ctx.setEditingProperty('containerText');
                        ctx.setEditText(el.containerText || '');
                    } else {
                        ctx.setEditingProperty('attributesText');
                        ctx.setEditText(el.attributesText || '');
                    }
                } else if (el.type === 'text') {
                    ctx.setEditingProperty('text');
                    ctx.setEditText(el.text || '');
                } else {
                    ctx.setEditingProperty('containerText');
                    ctx.setEditText(el.containerText || '');
                }

                setTimeout(() => ctx.textInputRef?.focus(), 0);
                return;
            }
            break;
        }
    }
}
