import { type Component, onMount, createEffect, onCleanup, createSignal, Show, untrack, createMemo, For } from "solid-js";
import { calculateAllAnimatedStates } from "../utils/animation-utils";
import { projectMasterPosition } from "../utils/slide-utils";
import { animationEngine } from "../utils/animation/animation-engine";
import rough from 'roughjs'; // Hand-drawn style
import { store, setViewState, addElement, updateElement, setStore, pushToHistory, deleteElements, toggleGrid, toggleSnapToGrid, setActiveLayer, setShowCanvasProperties, setSelectedTool, toggleZenMode, duplicateElement, groupSelected, ungroupSelected, bringToFront, sendToBack, moveElementZIndex, zoomToFit, zoomToFitSlide, isLayerVisible, isLayerLocked, toggleCollapse, setParent, clearParent, addChildNode, addSiblingNode, reorderMindmap, applyMindmapStyling, togglePropertyPanel, updateSlideThumbnail, advancePresentation, updateSlideBackground, updateAnimation, setPathEditing } from "../store/app-store";
import { renderElement, normalizePoints } from "../utils/render-element";
import { PathUtils } from "../utils/math/path-utils";
import type { DrawingElement } from "../types";
import { hitTestElement } from "../utils/hit-testing";
import { getHandleAtPosition } from "../utils/handle-detection";
import ContextMenu, { type MenuItem } from "./context-menu";
import { setImageLoadCallback } from "../utils/image-cache";
import type { SnappingGuide } from "../utils/object-snapping";
import type { SpacingGuide } from "../utils/spacing";
import { createPointerState } from "../utils/pointer-state";
import {
    presentationOnDown, presentationOnMove, presentationOnUp,
    panOnDown, panOnMove, panOnUp,
    laserOnDown, laserOnMove, laserOnUp,
    textOnDown, inkOnDown,
    eraserOnDown, eraserOnMove,
    connectorHandleOnDown, connectorHandleOnUp,
    handleAutoScroll
} from "../utils/tool-handlers/minor-handlers";
import { drawOnDown, drawOnMove, drawOnUp } from "../utils/tool-handlers/draw-handler";
import { penOnMove } from "../utils/tool-handlers/pen-handler";
import { selectionOnDown, selectionOnMove, selectionOnUp } from "../utils/tool-handlers/selection-handler";
import { checkBinding as checkBindingUtil, refreshLinePoints as refreshLinePointsUtil, refreshBoundLine as refreshBoundLineUtil } from "../utils/binding-logic";
import {
    computeViewportBounds, cullElementsForAnimation, decayLaserTrail,
    renderWorkspaceBackground, renderSlideBoundaries, renderCanvasTexture,
    renderGrid, renderLayersAndElements, renderSelectionOverlays,
    renderConnectionAnchors, renderLaserTrail, renderSlideBackground
} from "../utils/canvas-renderer";
import { Minimap } from "./minimap";
import {
    copyToClipboard, cutToClipboard, pasteFromClipboard,
    flipSelected, lockSelected, copyStyle, pasteStyle
} from '../utils/object-context-actions';
import { showToast } from "./toast";
import { perfMonitor } from "../utils/performance-monitor";
import { fitShapeToText, measureContainerText } from "../utils/text-utils";
import { changeElementType, getTransformOptions, getShapeIcon, getShapeTooltip, getCurveTypeOptions, getCurveTypeIcon, getCurveTypeTooltip } from "../utils/element-transforms";
import { exportToPng, exportToSvg } from "../utils/export";
import { getElementPreviewBaseState } from "../utils/animation/element-animator";
import { effectiveTime } from "../utils/animation/animation-engine";
import { VideoRecorder } from "../utils/video-recorder";
import RecordingOverlay from "./recording-overlay";

// Export controls for Menu/Dialog access
export const [requestRecording, setRequestRecording] = createSignal<{ start: boolean, format?: 'webm' | 'mp4' } | null>(null);

const Canvas: Component = () => {

    // Auto-switch Active Layer based on Selection
    createEffect(() => {
        const selection = store.selection;
        if (selection.length > 0) {
            // Find element with highest layer order
            let topLayerId: string | null = null;
            let maxOrder = -Infinity;

            selection.forEach(id => {
                const el = store.elements.find(e => e.id === id);
                if (el) {
                    const layer = store.layers.find(l => l.id === el.layerId);
                    if (layer && layer.order > maxOrder) {
                        maxOrder = layer.order;
                        topLayerId = layer.id;
                    }
                }
            });

            if (topLayerId && topLayerId !== untrack(() => store.activeLayerId)) {
                setActiveLayer(topLayerId);
            }
        }
    });

    // Reactive Auto-Resize for property changes (fontSize, fontFamily, etc)
    createEffect(() => {
        if (!canvasRef) return;
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;

        // We track font properties and text of selected elements
        store.elements.forEach(el => {
            const isLine = el.type === 'line' || el.type === 'arrow';
            if (el.isSelected && el.autoResize && el.containerText && !isLine) {
                // Tracking these properties
                el.fontSize;
                el.fontFamily;
                el.fontWeight;
                el.fontStyle;
                el.containerText;

                const dims = fitShapeToText(ctx, el, el.containerText);
                if (Math.abs(dims.width - el.width) > 2 || Math.abs(dims.height - el.height) > 2) {
                    untrack(() => updateElement(el.id, {
                        width: dims.width,
                        height: dims.height
                    }));
                }
            }
        });
    });

    // Monitor Presentation Mode to force animation ticker
    createEffect(() => {
        if (store.appMode === 'presentation') {
            animationEngine.setForceTicker(true);
        } else {
            // Only disable if no flow animations (handled by store usually, but explicit here is safe)
            const hasFlow = store.elements.some(el => el.flowAnimation);
            animationEngine.setForceTicker(hasFlow);
        }
    });

    let canvasRef: HTMLCanvasElement | undefined;
    let videoRecorder: VideoRecorder | null = null;

    createEffect(() => {
        const req = requestRecording();
        if (req && req.start) {
            handleStartRecording(req.format || 'webm');
            setRequestRecording(null);
        }
    });

    const captureThumbnail = () => {
        if (!canvasRef) return;

        const slide = store.slides[store.activeSlideIndex];
        if (!slide) return;

        const { width: sW, height: sH } = slide.dimensions;
        const { x: spatialX, y: spatialY } = slide.spatialPosition;
        if (sW === 0 || sH === 0) return;

        // Create a temp canvas for the thumbnail
        const thumbCanvas = document.createElement('canvas');
        const thumbW = 320; // 16:9 ratio (ish)
        const thumbH = (thumbW * sH) / sW;
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const tCtx = thumbCanvas.getContext('2d');
        if (!tCtx) return;

        // We want to render the current slide at the thumbnail scale
        const thumbScale = thumbW / sW;

        tCtx.save();
        tCtx.scale(thumbScale, thumbScale);
        tCtx.translate(-spatialX, -spatialY); // Focus on the slide's spatial area

        // Background
        const isDarkMode = store.theme === 'dark';
        const rc = rough.canvas(thumbCanvas);
        renderSlideBackground(tCtx!, rc, slide, spatialX, spatialY, sW, sH, isDarkMode);

        // Render elements
        const sortedLayers = [...store.layers].sort((a, b) => a.order - b.order);

        sortedLayers.forEach(layer => {
            if (!isLayerVisible(layer.id)) return;
            const layerElements = store.elements.filter(el => el.layerId === layer.id);
            layerElements.forEach(el => {
                let renderEl = el;
                // Project master layer elements to the active slide's spatial position
                if (layer.isMaster && slide) {
                    const projected = projectMasterPosition(el, slide, store.slides);
                    renderEl = { ...el, x: projected.x, y: projected.y };
                }
                const layerOpacity = (layer?.opacity ?? 1);
                renderElement(rc, tCtx, renderEl, isDarkMode, layerOpacity);
            });
        });

        tCtx.restore();

        const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);
        updateSlideThumbnail(store.activeSlideIndex, dataUrl);
    };

    // Trigger thumbnail capture on slide change or debounced element changes
    let thumbTimeout: any;
    createEffect(() => {
        // Track slide index and element count/versions (implicitly)
        store.activeSlideIndex;
        store.elements;

        window.clearTimeout(thumbTimeout);
        thumbTimeout = window.setTimeout(() => {
            untrack(() => captureThumbnail());
        }, 1000); // 1s throttle for thumbnails
    });

    const handleStartRecording = (format: 'webm' | 'mp4') => {
        if (!canvasRef) {
            console.error('[DEBUG] Canvas: No canvasRef available');
            return;
        }

        if (!videoRecorder) {
            console.log('[DEBUG] Canvas: Initializing VideoRecorder');
            videoRecorder = new VideoRecorder(canvasRef);
        }

        console.log('[DEBUG] Canvas: Starting recorder...');
        const started = videoRecorder.start(format);
        console.log('[DEBUG] Canvas: Recorder start returned:', started);

        if (started) {
            setStore("isRecording", true);
            showToast("Recording started...", "info");
        } else {
            showToast("Failed to start recording", "error");
        }
    };

    const handleStopRecording = () => {
        if (videoRecorder) {
            videoRecorder.stop(() => {
                setStore("isRecording", false);
                showToast("Recording saved!", "success");
            });
        }
    };


    // Pointer handler shared mutable state
    const pState = createPointerState();

    // Text Editing State
    const [editingId, setEditingId] = createSignal<string | null>(null);
    const [editingProperty, setEditingProperty] = createSignal<'text' | 'containerText' | 'attributesText' | 'methodsText'>('containerText');
    const [editText, setEditText] = createSignal("");
    let textInputRef: HTMLTextAreaElement | undefined;

    // Selection/Move State
    const [selectionBox, setSelectionBox] = createSignal<{ x: number, y: number, w: number, h: number } | null>(null);
    const [suggestedBinding, setSuggestedBinding] = createSignal<{ elementId: string; px: number; py: number; position?: string } | null>(null);
    const [snappingGuides, setSnappingGuides] = createSignal<SnappingGuide[]>([]);
    const [spacingGuides, setSpacingGuides] = createSignal<SpacingGuide[]>([]);

    // Throttle constants
    const SNAPPING_THROTTLE_MS = 16; // ~60 FPS
    const LASER_THROTTLE_MS = 8; // ~120fps for smooth trail
    const LASER_DECAY_MS = 800;
    const LASER_MAX_POINTS = 100;
    const PEN_UPDATE_THROTTLE_MS = 16; // ~60fps store updates

    const flushPenPoints = () => {
        if (!pState.currentId || pState.penPointsBuffer.length === 0) return;
        const el = store.elements.find(e => e.id === pState.currentId);
        if (el && el.points) {
            const existingPoints = el.points as number[];
            const newPoints = [...existingPoints, ...pState.penPointsBuffer];
            const updates: Partial<DrawingElement> = { points: newPoints };
            // For ink tool, also update ttl
            if (el.type === 'ink') {
                updates.ttl = Date.now() + 3000;
            }
            updateElement(pState.currentId, updates, false);
            pState.penPointsBuffer = [];
        }
    };

    const handleResize = () => {
        if (canvasRef) {
            canvasRef.width = window.innerWidth;
            canvasRef.height = window.innerHeight;

            // In presentation mode, ensure the slide is re-fitted to the new window size
            // (especially important after entering fullscreen)
            if (store.appMode === 'presentation') {
                zoomToFitSlide();
                // Sometimes browsers need a tiny extra moment for layout to settle 
                // after fullscreen or URL bar shifts
                setTimeout(zoomToFitSlide, 50);
            }

            draw();
        }
    };

    // Cursor Management
    const [cursor, setCursor] = createSignal<string>('default');

    // Context Menu State
    const [contextMenuOpen, setContextMenuOpen] = createSignal(false);
    const [contextMenuPos, setContextMenuPos] = createSignal({ x: 0, y: 0 });

    function draw() {
        if (!canvasRef) return;
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;

        const startTime = performance.now();
        const currentTime = effectiveTime();
        (window as any).yappyGlobalTime = currentTime;

        const { scale, panX, panY } = store.viewState;
        const isDarkMode = store.theme === 'dark';
        const rc = rough.canvas(canvasRef);
        const shouldAnimate = store.appMode === 'presentation' || store.isPreviewing;

        // 1. Compute viewport & animated states
        const vp = computeViewportBounds(canvasRef, scale, panX, panY);
        const elementsToAnimate = cullElementsForAnimation(store.elements, store.slides, store.layers, store.docType, store.activeSlideIndex, vp);
        const animatedStates = calculateAllAnimatedStates(elementsToAnimate, currentTime, shouldAnimate);

        // 2. Clear canvas & decay laser
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
        decayLaserTrail(pState.laserTrailData, LASER_DECAY_MS);

        // 3. Render backgrounds & grids
        renderWorkspaceBackground(ctx, canvasRef, isDarkMode);
        renderSlideBoundaries(ctx, rc, store.slides, store.docType, store.activeSlideIndex, scale, panX, panY, isDarkMode);
        renderCanvasTexture(ctx, canvasRef, store.canvasTexture, scale, panX, panY, isDarkMode);

        // 4. Enter world-space for elements
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        renderGrid(ctx, canvasRef, store.gridSettings, scale, panX, panY, isDarkMode);

        // 5. Render layers & elements
        const totalRendered = renderLayersAndElements(ctx, rc, {
            elements: store.elements, layers: store.layers, slides: store.slides,
            docType: store.docType, activeSlideIndex: store.activeSlideIndex,
            selection: store.selection, selectedTool: store.selectedTool,
            activeLayerId: store.activeLayerId,
            animatedStates, viewportBounds: vp, scale, isDarkMode,
            currentDrawingId: pState.currentId,
            hoveredConnector: pState.hoveredConnector,
            editingId: editingId(),
            canInteractWithElement,
        });

        // 6. Overlays
        renderSelectionOverlays(ctx, {
            elements: store.elements, selection: store.selection, scale,
            selectionBox: selectionBox(), suggestedBinding: suggestedBinding(),
            snappingGuides: snappingGuides(), spacingGuides: spacingGuides(),
        });

        renderConnectionAnchors(ctx, {
            elements: store.elements, selectedTool: store.selectedTool,
            currentDrawingId: pState.currentId, isDrawing: pState.isDrawing,
            activeLayerId: store.activeLayerId, scale,
            canInteractWithElement,
        });

        renderLaserTrail(ctx, pState.laserTrailData, scale, LASER_DECAY_MS);

        ctx.restore();

        perfMonitor.measureFrame(performance.now() - startTime, store.elements.length, totalRendered);
    }

    createEffect(() => {
        effectiveTime(); // Track global animation clock
        store.appMode; // Track mode changes explicitly
        store.isPreviewing; // Track preview state
        store.theme; // Track theme changes
        store.elements.length;
        store.elements.forEach(e => {
            e.x; e.y; e.width; e.height;
            if (e.points) e.points.length;
            e.angle; e.opacity;
            e.strokeColor; e.backgroundColor; e.fillStyle; e.strokeWidth; e.strokeStyle;
            e.roughness; e.roundness;
            e.text; e.fontSize; e.fontFamily; e.textAlign;
            e.fontWeight; e.fontStyle;
            e.textColor; e.textHighlightEnabled; e.textHighlightColor; e.textHighlightPadding; e.textHighlightRadius;
            e.startArrowhead; e.endArrowhead;
            e.containerText; e.labelPosition; // Track label properties for immediate updates
            e.isCollapsed; e.parentId; // Track hierarchy state for immediate updates
            e.starPoints; // Track star points for parametric stars
            e.polygonSides; // Track polygon sides for parametric polygons
            e.borderRadius; // Track border radius
            e.burstPoints; // Track burst points for parametric burst
            e.tailPosition; // Track tail position for speech bubble
            e.shapeRatio; // Track shape ratio (sharpness)
            e.sideRatio; // Track side ratio (perspective)
            e.depth; // Track depth for 3D shapes
            e.viewAngle; // Track viewing angle for 3D shapes
            e.taper; e.skewX; e.skewY;
            e.frontTaper; e.frontSkewX; e.frontSkewY;
            e.drawInnerBorder; // Track double border toggle
            e.innerBorderDistance; // Track double border distance
            e.strokeStyle; // Track stroke style (solid/dashed/dotted)
            e.renderStyle; // Track drawing style (Sketch/Architectural)
            e.startArrowhead; e.endArrowhead;
            e.startArrowheadSize; e.endArrowheadSize;
            e.fillDensity; // Track fill density
            // Track gradient properties
            e.gradientStart; e.gradientEnd; e.gradientDirection;
            e.gradientStops; e.gradientType;
            // Track shadow properties
            e.shadowEnabled; e.shadowColor; e.shadowBlur; e.shadowOffsetX; e.shadowOffsetY;
            // Effects
            e.blendMode;
            // Animations
            e.spinEnabled; e.spinSpeed;
            e.orbitEnabled; e.orbitCenterId; e.orbitRadius; e.orbitSpeed; e.orbitDirection;
        });
        // Track slide background changes for real-time updates
        store.slides.forEach(s => {
            s.backgroundColor; s.fillStyle; s.gradientStops; s.gradientDirection;
            s.backgroundImage; s.backgroundOpacity;
        });
        store.viewState.scale;
        store.viewState.panX;
        store.viewState.panY;
        store.selection.length;
        selectionBox();
        // Note: pState.laserTrailData is mutable (not reactive) for performance
        // Track layer changes
        store.layers.length;
        store.layers.forEach(l => {
            l.visible; l.order; l.opacity; l.backgroundColor;
        });
        // Track grid settings changes
        store.gridSettings.enabled;
        store.gridSettings.gridSize;
        store.gridSettings.gridColor;
        store.gridSettings.gridOpacity;
        store.gridSettings.style;
        store.canvasBackgroundColor;
        store.canvasTexture;
        snappingGuides();
        // Redraw on reactive changes
        requestAnimationFrame(draw);
    });

    // Auto-refresh bound lines if bound elements move or hierarchy changes
    createEffect(() => {
        store.elements.forEach(el => {
            if (el.boundElements && el.boundElements.length > 0) {
                // Reactive trigger: track moving node's geometry
                el.x; el.y; el.width; el.height;
                untrack(() => {
                    el.boundElements?.forEach(b => refreshBoundLine(b.id));
                });
            }
        });
    });

    const getClientCoordinates = (e: MouseEvent | WheelEvent) => {
        return { x: e.clientX, y: e.clientY };
    };

    const getWorldCoordinates = (clientX: number, clientY: number) => {
        if (!canvasRef) return { x: 0, y: 0 };
        const { scale, panX, panY } = store.viewState;
        const rect = canvasRef.getBoundingClientRect();
        return {
            x: (clientX - rect.left - panX) / scale,
            y: (clientY - rect.top - panY) / scale
        };
    };

    const handleDragOver = (e: DragEvent) => {
        if (e.dataTransfer) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    const handleDrop = async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const data = e.dataTransfer?.getData('text/plain');
        if (!data) return;

        // Loosened color detection to be very inclusive for various color strings
        const isColor = data.startsWith('color(') ||
            data.startsWith('#') ||
            data.startsWith('rgba(') ||
            data.startsWith('rgb(') ||
            data.startsWith('oklch(') ||
            data.startsWith('hsl(') ||
            data.includes('display-p3') ||
            data.includes('oklch');
        const isImage = data.startsWith('http') || data.startsWith('data:image');

        if (!isColor && !isImage) return;

        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);
        const threshold = 10 / store.viewState.scale;

        const elementMap = new Map<string, DrawingElement>();
        for (const el of store.elements) elementMap.set(el.id, el);

        const sortedElements = store.elements.map((el, index) => {
            const layer = store.layers.find(l => l.id === el.layerId);
            return { el, index, layerOrder: layer?.order ?? 999, layerVisible: isLayerVisible(el.layerId) };
        }).sort((a, b) => {
            if (a.layerOrder !== b.layerOrder) return b.layerOrder - a.layerOrder;
            return b.index - a.index;
        });

        const currentTime = (window as any).yappyGlobalTime || 0;
        const shouldAnimate = store.appMode === 'presentation' || store.isPreviewing;
        const animatedStates = calculateAllAnimatedStates(store.elements, currentTime, shouldAnimate);

        let hitId: string | null = null;
        for (const { el, layerVisible } of sortedElements) {
            if (!layerVisible || !canInteractWithElement(el)) continue;
            const animState = animatedStates.get(el.id);
            const testEl = applyMasterProjection(animState ? { ...el, x: animState.x, y: animState.y, angle: animState.angle } : el);
            if (hitTestElement(testEl, x, y, threshold, store.elements, elementMap)) {
                hitId = el.id;
                break;
            }
        }

        if (hitId) {
            pushToHistory();
            if (isColor) {
                updateElement(hitId, { backgroundColor: data, fillStyle: 'solid' });
            } else if (isImage) {
                updateElement(hitId, { type: 'image', dataURL: data });
            }
        } else if (store.docType === 'slides') {
            // Drop anywhere on the canvas (even outside slide bounds) updates the ACTIVE slide background
            const activeSlideIndex = store.activeSlideIndex;
            if (activeSlideIndex !== -1) {
                pushToHistory();
                if (isColor) {
                    updateSlideBackground(activeSlideIndex, {
                        backgroundColor: data,
                        fillStyle: 'solid'
                    });
                } else if (isImage) {
                    updateSlideBackground(activeSlideIndex, {
                        backgroundImage: data,
                        fillStyle: 'image'
                    });
                }
            } else if (store.slides.length > 0) {
                // Fallback to first slide if activeIndex is somehow -1
                pushToHistory();
                if (isColor) updateSlideBackground(0, { backgroundColor: data, fillStyle: 'solid' });
                else if (isImage) updateSlideBackground(0, { backgroundImage: data, fillStyle: 'image' });
            }
        }
    };

    const handleWheel = (e: WheelEvent) => {
        if (store.appMode === 'presentation' && store.docType === 'slides') return;
        e.preventDefault();

        // Normalize delta values based on deltaMode
        // 0: Pixel, 1: Line, 2: Page
        const multiplier = e.deltaMode === 1 ? 33 : (e.deltaMode === 2 ? 400 : 1);
        const deltaX = e.deltaX * multiplier;
        const deltaY = e.deltaY * multiplier;

        if (e.ctrlKey || e.metaKey) {
            // ... Zoom Logic ...
            const zoomSensitivity = 0.001;
            const zoom = 1 - deltaY * zoomSensitivity;
            const newScale = Math.min(Math.max(store.viewState.scale * zoom, 0.1), 10);

            const { x: mouseX, y: mouseY } = getClientCoordinates(e);
            const { scale, panX, panY } = store.viewState;

            const worldX = (mouseX - panX) / scale;
            const worldY = (mouseY - panY) / scale;

            const newPanX = mouseX - worldX * newScale;
            const newPanY = mouseY - worldY * newScale;

            setViewState({ scale: newScale, panX: newPanX, panY: newPanY });
        } else {
            // Pan
            if (e.shiftKey) {
                // Horizontal Scroll
                setViewState({
                    panX: store.viewState.panX - (deltaY || deltaX),
                    panY: store.viewState.panY
                });
            } else {
                setViewState({
                    panX: store.viewState.panX - deltaX,
                    panY: store.viewState.panY - deltaY
                });
            }
        }
    };


    // Helper: Rotate point (x,y) around center (cx,cy) by angle
    const rotatePoint = (x: number, y: number, cx: number, cy: number, angle: number) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: (cos * (x - cx)) - (sin * (y - cy)) + cx,
            y: (sin * (x - cx)) + (cos * (y - cy)) + cy
        };
    };

    // Helper: Inverse rotate point
    const unrotatePoint = (x: number, y: number, cx: number, cy: number, angle: number) => {
        return rotatePoint(x, y, cx, cy, -angle);
    };

    // Helper: Normalize pencil points to be relative to bounding box
    const normalizePencil = (el: DrawingElement) => {
        if (!el.points || el.points.length === 0) return null;

        const pts = normalizePoints(el.points);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        pts.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        const newWidth = maxX - minX;
        const newHeight = maxY - minY;

        // Pad slightly? No, exact bounds.
        const newPoints = pts.map(p => ({ x: p.x - minX, y: p.y - minY }));

        return {
            x: el.x + minX,
            y: el.y + minY,
            width: newWidth,
            height: newHeight,
            points: newPoints
        };
    };


    /**
     * Return element with projected position if it's on a master layer in slides mode.
     * Used to make hit testing match the rendered (projected) position.
     */
    const applyMasterProjection = (el: DrawingElement): DrawingElement => {
        if (store.docType !== 'slides') return el;
        const layer = store.layers.find(l => l.id === el.layerId);
        if (!layer?.isMaster) return el;
        const activeSlide = store.slides[store.activeSlideIndex];
        if (!activeSlide) return el;
        const projected = projectMasterPosition(el, activeSlide, store.slides);
        return { ...el, x: projected.x, y: projected.y };
    };

    const canInteractWithElement = (el: DrawingElement): boolean => {
        if (el.locked) return false;
        return !isLayerLocked(el.layerId);
    };

    // Binding helpers — thin wrappers closing over store
    const checkBinding = (x: number, y: number, excludeId: string) =>
        checkBindingUtil(x, y, excludeId, store.elements, store.viewState.scale, store.activeLayerId, canInteractWithElement);

    const refreshLinePoints = (line: DrawingElement, overrideStartX?: number, overrideStartY?: number, overrideEndX?: number, overrideEndY?: number) =>
        refreshLinePointsUtil(line, store.elements, overrideStartX, overrideStartY, overrideEndX, overrideEndY);

    const refreshBoundLine = (lineId: string) =>
        refreshBoundLineUtil(lineId, () => store.elements, updateElement);

    // Helpers & signals bundles for extracted handler modules
    const pHelpers: import("../utils/pointer-helpers").PointerHelpers = {
        getWorldCoordinates, canInteractWithElement, checkBinding,
        refreshLinePoints, refreshBoundLine, flushPenPoints,
        applyMasterProjection, normalizePencil, commitText: () => commitText(),
        draw, setCursor
    };
    const pSignals: import("../utils/pointer-helpers").PointerSignals = {
        editingId, setEditingId, setEditText,
        selectionBox, setSelectionBox,
        suggestedBinding, setSuggestedBinding,
        snappingGuides, setSnappingGuides,
        spacingGuides, setSpacingGuides,
        get textInputRef() { return textInputRef; }
    };

    const handlePointerDown = (e: PointerEvent) => {
        if (presentationOnDown(e, pState, pHelpers)) return;
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);

        if (editingId()) {
            commitText();
            return;
        }



        if (store.selectedTool === 'selection') {
            selectionOnDown(e, x, y, pState, pHelpers, pSignals);
            return;
        }

        // ... existing creation logic for text/shapes ...
        // Check if active layer is visible and unlocked
        const activeLayer = store.layers.find(l => l.id === store.activeLayerId);
        if (!activeLayer?.visible) {
            showToast('Cannot draw on a hidden layer. Please show the layer first or select a visible layer.', 'error');
            return;
        }
        if (activeLayer?.locked) {
            showToast('Cannot draw on a locked layer. Please unlock the layer first or select an unlocked layer.', 'error');
            return;
        }

        if (store.selectedTool === 'text') { textOnDown(x, y, pSignals); return; }
        if (store.selectedTool === 'laser') { laserOnDown(x, y, pState); return; }
        if (store.selectedTool === 'ink') { inkOnDown(x, y, pState); return; }
        if (store.selectedTool === 'eraser') { eraserOnDown(x, y, pState, pHelpers); return; }
        if (store.selectedTool === 'pan') { panOnDown(pState, pHelpers); return; }

        drawOnDown(x, y, pState, pHelpers);
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (presentationOnMove(e, pState)) return;
        let { x, y } = getWorldCoordinates(e.clientX, e.clientY);
        // console.log('Move', { tool: store.selectedTool, isDragging: pState.isDragging, selection: store.selection.length });

        if (store.selectedTool === 'pan') { panOnMove(e, pState, pHelpers); return; }

        if (store.selectedTool === 'selection') {
            selectionOnMove(e, x, y, pState, pHelpers, pSignals, SNAPPING_THROTTLE_MS);
            return;
        }


        if (store.selectedTool === 'laser') {
            laserOnMove(e, pState, pHelpers, LASER_THROTTLE_MS, LASER_MAX_POINTS);
        }

        if (!pState.isDrawing || !pState.currentId) {
            if (pState.isDrawing && store.selectedTool === 'eraser') {
                eraserOnMove(x, y, pHelpers);
            }
            return;
        }

        if (store.selectedTool === 'fineliner' || store.selectedTool === 'marker' || store.selectedTool === 'inkbrush' || store.selectedTool === 'ink') {
            penOnMove(e, pState, pHelpers, PEN_UPDATE_THROTTLE_MS);
        } else {
            drawOnMove(x, y, pState, pHelpers, pSignals);
        }

        // Auto-Scroll Check
        handleAutoScroll(e, pState);

        if (pState.isDrawing || pState.isDragging) {
            requestAnimationFrame(draw);
        }
    };

    const handlePointerUp = (e: PointerEvent) => {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);

        if (presentationOnUp(pState)) return;
        if (store.selectedTool === 'pan') { panOnUp(pState, pHelpers); return; }
        if (store.selectedTool === 'laser') { laserOnUp(pState, pHelpers); return; }

        // Handle connector drawing first (before selection tool handling)
        if (pState.draggingFromConnector && pState.isDrawing && pState.currentId) {
            connectorHandleOnUp(pState, pSignals, pHelpers);
            return;
        }

        if (store.selectedTool === 'selection') {
            selectionOnUp(e, pState, pHelpers, pSignals);
            return;
        }

        drawOnUp(pState, pHelpers, pSignals);
    };

    const commitText = () => {
        const id = editingId();
        if (!id) return;
        const el = store.elements.find(e => e.id === id);
        if (!el) return;

        const newText = editText().trim();

        // For standalone text elements, update text property and calculate dimensions
        if (el.type === 'text') {
            if (newText) {
                let width = 0;
                let height = 0;
                if (canvasRef) {
                    const ctx = canvasRef.getContext("2d");
                    if (ctx) {
                        const fontSize = el.fontSize || 28;
                        ctx.font = `${fontSize}px sans-serif`;
                        const metrics = ctx.measureText(newText);
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
            const prop = editingProperty();

            if (el.autoResize && canvasRef && !isLine && prop === 'containerText') {
                const ctx = canvasRef.getContext("2d");
                if (ctx) {
                    const dims = fitShapeToText(ctx, el, newText);
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

        setEditingId(null);
        setEditText("");
        requestAnimationFrame(draw);
    };

    const handleDoubleClick = (e: MouseEvent) => {
        e.preventDefault(); // Prevent browser context menu
        if (store.selectedTool !== 'selection') return;

        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);
        const threshold = 10 / store.viewState.scale;

        // Find element under cursor
        const elementMap = new Map<string, DrawingElement>();
        for (const el of store.elements) elementMap.set(el.id, el);

        for (let i = store.elements.length - 1; i >= 0; i--) {
            const el = store.elements[i];
            if (!canInteractWithElement(el)) continue;
            if (!isLayerVisible(el.layerId)) continue;

            if (hitTestElement(applyMasterProjection(el), x, y, threshold, store.elements, elementMap)) {

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
                    // Logic to add a control point

                    const newControlPoints = el.controlPoints ? [...el.controlPoints] : [];

                    // LIMIT TO 2 Control Points for S-Curve Support
                    if (newControlPoints.length >= 2) {
                        return; // Already has 2 points, don't add more for now
                    }

                    newControlPoints.push({ x, y });

                    updateElement(el.id, {
                        controlPoints: newControlPoints,
                        curveType: 'bezier' // Switch to bezier if adding control points
                    }, true); // Push to history

                    // Don't open text editor if we added a point
                    return;
                }

                // Only allow editing containerText for shapes and lines
                const shapeTypes = ['rectangle', 'circle', 'diamond', 'line', 'arrow', 'text', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'starPerson', 'scroll', 'wavyDivider', 'doubleBanner', 'lightbulb', 'signpost', 'burstBlob', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField', 'dfdProcess', 'dfdDataStore', 'isometricCube', 'solidBlock', 'perspectiveBlock', 'cylinder', 'stateStart', 'stateEnd', 'stateSync', 'activationBar', 'externalEntity', 'umlClass', 'umlInterface', 'umlActor', 'umlUseCase', 'umlNote', 'umlPackage', 'umlComponent', 'umlState', 'umlLifeline', 'umlFragment', 'umlSignalSend', 'umlSignalReceive', 'umlProvidedInterface', 'umlRequiredInterface'];
                if (shapeTypes.includes(el.type)) {
                    setEditingId(el.id);

                    if (el.type === 'umlClass') {
                        // Determine which section was clicked
                        const clickYRelativeToShape = y - el.y;
                        const ctx = canvasRef?.getContext("2d");
                        let headerHeight = 30;
                        if (el.containerText && ctx) {
                            const metrics = measureContainerText(ctx, el, el.containerText, el.width - 10);
                            headerHeight = Math.max(30, metrics.textHeight + 20);
                        }

                        let attrHeight = 20;
                        if (el.attributesText && ctx) {
                            const metrics = measureContainerText(ctx, { ...el, fontSize: (el.fontSize || 28) * 0.9 }, el.attributesText, el.width - 10);
                            attrHeight = Math.max(20, metrics.textHeight + 10);
                        }

                        if (clickYRelativeToShape < headerHeight) {
                            setEditingProperty('containerText');
                            setEditText(el.containerText || '');
                        } else if (clickYRelativeToShape < headerHeight + attrHeight) {
                            setEditingProperty('attributesText');
                            setEditText(el.attributesText || '');
                        } else {
                            setEditingProperty('methodsText');
                            setEditText(el.methodsText || '');
                        }
                    } else if (el.type === 'umlState') {
                        const clickYRelativeToShape = y - el.y;
                        const ctx = canvasRef?.getContext("2d");
                        let headerHeight = 35;
                        if (el.containerText && ctx) {
                            const metrics = measureContainerText(ctx, el, el.containerText, el.width - 20);
                            headerHeight = Math.max(35, metrics.textHeight + 15);
                        }
                        if (clickYRelativeToShape < headerHeight) {
                            setEditingProperty('containerText');
                            setEditText(el.containerText || '');
                        } else {
                            setEditingProperty('attributesText');
                            setEditText(el.attributesText || '');
                        }
                    } else if (el.type === 'umlFragment') {
                        const clickYRelativeToShape = y - el.y;
                        const clickXRelativeToShape = x - el.x;
                        const tabW = Math.min(el.width * 0.3, 60);
                        const tabH = Math.min(el.height * 0.12, 22) + 5;

                        if (clickXRelativeToShape < tabW && clickYRelativeToShape < tabH) {
                            setEditingProperty('containerText');
                            setEditText(el.containerText || '');
                        } else {
                            setEditingProperty('attributesText');
                            setEditText(el.attributesText || '');
                        }
                    } else if (el.type === 'text') {
                        setEditingProperty('text');
                        setEditText(el.text || '');
                    } else {
                        setEditingProperty('containerText');
                        setEditText(el.containerText || '');
                    }

                    setTimeout(() => textInputRef?.focus(), 0);
                    return;
                }
                break;
            }
        }
    };

    const handleTextBlur = () => {
        // If we are still editing (i.e. didn't click canvas which manually commits), commit now.
        if (editingId()) {
            commitText();
        }
    };

    const activeTextElement = () => {
        const id = editingId();
        if (!id) return null;
        return store.elements.find(e => e.id === id);
    };

    createEffect(() => {
        if (editingId() && textInputRef) {
            textInputRef.style.height = 'auto';
            textInputRef.style.height = textInputRef.scrollHeight + 'px';
        }
    });

    const [showScrollBack, setShowScrollBack] = createSignal(false);

    // Check if content is visible
    createEffect(() => {
        const { scale, panX, panY } = store.viewState;
        if (!canvasRef) {
            setShowScrollBack(false);
            return;
        }

        // Viewport in World Coords
        const vpX = -panX / scale;
        const vpY = -panY / scale;
        const vpW = canvasRef.width / scale;
        const vpH = canvasRef.height / scale;

        let minX: number, minY: number, maxX: number, maxY: number;

        if (store.docType === 'slides') {
            // In slide mode, check visibility of the active slide region
            const slide = store.slides[store.activeSlideIndex];
            if (!slide) { setShowScrollBack(false); return; }
            minX = slide.spatialPosition.x;
            minY = slide.spatialPosition.y;
            maxX = minX + slide.dimensions.width;
            maxY = minY + slide.dimensions.height;
        } else {
            // In infinite canvas mode, check visibility of all elements
            if (store.elements.length === 0) { setShowScrollBack(false); return; }
            minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
            store.elements.forEach(el => {
                const x1 = el.x;
                const x2 = el.x + el.width;
                const y1 = el.y;
                const y2 = el.y + el.height;
                minX = Math.min(minX, x1, x2);
                maxX = Math.max(maxX, x1, x2);
                minY = Math.min(minY, y1, y2);
                maxY = Math.max(maxY, y1, y2);
            });
        }

        // Check if Viewport intersects Content
        const isContentVisible = !(minX > vpX + vpW || maxX < vpX || minY > vpY + vpH || maxY < vpY);

        setShowScrollBack(!isContentVisible);
    });

    const handleScrollBack = () => {
        // In slide mode, fit the active slide into view
        if (store.docType === 'slides') {
            zoomToFitSlide();
            return;
        }

        if (store.elements.length === 0) return;

        // Calculate center of content
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        store.elements.forEach(el => {
            const x1 = el.x;
            const x2 = el.x + el.width;
            const y1 = el.y;
            const y2 = el.y + el.height;

            minX = Math.min(minX, x1, x2);
            maxX = Math.max(maxX, x1, x2);
            minY = Math.min(minY, y1, y2);
            maxY = Math.max(maxY, y1, y2);
        });

        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const contentCX = minX + contentW / 2;
        const contentCY = minY + contentH / 2;

        // Center viewport on content center
        // panX = -worldX * scale + screenCX
        const { scale } = store.viewState;
        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;

        const newPanX = -contentCX * scale + screenCX;
        const newPanY = -contentCY * scale + screenCY;

        setViewState({ panX: newPanX, panY: newPanY });
    };

    onMount(() => {
        // Register callback to trigger redraw when images load
        setImageLoadCallback(() => {
            draw();
        });

        window.addEventListener("resize", handleResize);
        document.addEventListener("fullscreenchange", handleResize);
        handleResize();
        onCleanup(() => {
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("fullscreenchange", handleResize);
        });
    });


    // CONTEXT MENU LOGIC
    const getContextMenuItems = (): MenuItem[] => {
        const selectionCount = store.selection.length;
        const hasSelection = selectionCount > 0;
        const items: MenuItem[] = [];

        if (hasSelection) {
            items.push(
                { label: 'Copy', shortcut: 'Ctrl+C', onClick: copyToClipboard },
                { label: 'Paste', shortcut: 'Ctrl+V', onClick: pasteFromClipboard },
                { label: 'Cut', shortcut: 'Ctrl+X', onClick: cutToClipboard },
                { label: 'Duplicate', shortcut: 'Ctrl+D', onClick: () => store.selection.forEach(id => duplicateElement(id)) },
                { separator: true }
            );

            // Hierarchy Submenu
            const firstId = store.selection[0];
            const firstEl = store.elements.find(e => e.id === firstId);
            if (firstEl) {
                const hierarchyItems: MenuItem[] = [];

                if (selectionCount === 1) {
                    hierarchyItems.push({ label: 'Add Child', onClick: () => addChildNode(firstId) });
                    if (firstEl.parentId) {
                        hierarchyItems.push({ label: 'Add Sibling', onClick: () => addSiblingNode(firstId) });
                    }
                    hierarchyItems.push({ separator: true });
                }

                if (firstEl.parentId) {
                    hierarchyItems.push({ label: 'Clear Parent', onClick: () => clearParent(firstId) });
                }

                const hasChildren = store.elements.some(e => e.parentId === firstId);
                if (hasChildren) {
                    hierarchyItems.push({
                        label: firstEl.isCollapsed ? 'Expand Subtree' : 'Collapse Subtree',
                        onClick: () => toggleCollapse(firstId)
                    });
                }

                if (selectionCount === 2) {
                    const childId = store.selection[0];
                    const parentId = store.selection[1];
                    hierarchyItems.push({
                        label: 'Set as Child of Selected',
                        onClick: () => setParent(childId, parentId)
                    });
                }

                // Mindmap Auto Layout Submenu
                const autoLayoutItems: MenuItem[] = [
                    { label: 'Horizontal (Right)', icon: '➡️', onClick: () => reorderMindmap(firstId, 'horizontal-right') },
                    { label: 'Horizontal (Left)', icon: '⬅️', onClick: () => reorderMindmap(firstId, 'horizontal-left') },
                    { label: 'Vertical (Down)', icon: '⬇️', onClick: () => reorderMindmap(firstId, 'vertical-down') },
                    { label: 'Vertical (Up)', icon: '⬆️', onClick: () => reorderMindmap(firstId, 'vertical-up') },
                    { label: 'Radial (Neuron)', icon: '🕸️', onClick: () => reorderMindmap(firstId, 'radial') },
                ];
                hierarchyItems.push({ separator: true });
                hierarchyItems.push({ label: 'Auto Layout', submenu: autoLayoutItems, icon: '🪄' });
                hierarchyItems.push({ label: 'Auto Style Branch', icon: '🎨', onClick: () => applyMindmapStyling(firstId) });

                if (hierarchyItems.length > 0) {
                    items.push({ label: 'Hierarchy', submenu: hierarchyItems });
                }
            }

            // Batch Transform Logic (Split by Family)
            const allSelectedElements = store.selection.map(id => store.elements.find(e => e.id === id)).filter(Boolean) as DrawingElement[];

            // Filter selection into families
            const shapesInSelection = allSelectedElements.filter(el => {
                const type = el.type;
                return type !== 'line' && type !== 'arrow' && type !== 'bezier' && type !== 'organicBranch' && type !== 'text' && type !== 'image';
            });

            const connectorsInSelection = allSelectedElements.filter(el => {
                const type = el.type;
                return type === 'line' || type === 'arrow' || type === 'bezier' || type === 'organicBranch';
            });

            // 1. Transform Shapes
            if (shapesInSelection.length > 0) {
                let transformOptions = getTransformOptions(shapesInSelection[0].type);
                const distinctTypes = new Set(shapesInSelection.map(e => e.type));

                // If mixed types, allow converting to any of the present types as well (e.g. Rect+Circle -> convert all to Rect)
                if (distinctTypes.size > 1) {
                    transformOptions.push(shapesInSelection[0].type);
                }

                if (transformOptions.length > 0) {
                    items.push({
                        label: shapesInSelection.length > 1 ? `Transform ${shapesInSelection.length} Shapes` : 'Transform Shape',
                        submenu: transformOptions.map(t => ({
                            icon: getShapeIcon(t),
                            tooltip: getShapeTooltip(t),
                            onClick: () => {
                                pushToHistory();
                                shapesInSelection.forEach(el => changeElementType(el.id, t, false));
                                requestAnimationFrame(draw);
                            }
                        })),
                        gridColumns: 3
                    });
                }
            }

            // 2. Transform Connectors
            if (connectorsInSelection.length > 0) {
                let transformOptions = getTransformOptions(connectorsInSelection[0].type);
                const distinctTypes = new Set(connectorsInSelection.map(e => e.type));

                if (distinctTypes.size > 1) {
                    transformOptions.push(connectorsInSelection[0].type);
                }

                if (transformOptions.length > 0) {
                    items.push({
                        label: connectorsInSelection.length > 1 ? `Transform ${connectorsInSelection.length} Connectors` : 'Transform Connector',
                        submenu: transformOptions.map(t => ({
                            icon: getShapeIcon(t),
                            tooltip: getShapeTooltip(t),
                            onClick: () => {
                                pushToHistory();
                                connectorsInSelection.forEach(el => changeElementType(el.id, t, false));
                                requestAnimationFrame(draw);
                            }
                        })),
                        gridColumns: 3
                    });
                }
            }

            // 3. Change Curve Style (Connectors only)
            if (connectorsInSelection.length > 0) {
                const firstEl = connectorsInSelection[0];
                const currentCurveType = firstEl.curveType || 'straight';
                const curveOptions = getCurveTypeOptions(currentCurveType);

                const distinctCurveTypes = new Set(connectorsInSelection.map(e => e.curveType || 'straight'));
                if (distinctCurveTypes.size > 1) {
                    curveOptions.push(currentCurveType);
                }

                if (curveOptions.length > 0) {
                    items.push({
                        label: connectorsInSelection.length > 1 ? 'Change All Curve Styles' : 'Change Curve Style',
                        submenu: curveOptions.map(ct => ({
                            icon: getCurveTypeIcon(ct),
                            tooltip: getCurveTypeTooltip(ct),
                            onClick: () => {
                                pushToHistory();
                                connectorsInSelection.forEach(el => updateElement(el.id, { curveType: ct as any }, false));
                                requestAnimationFrame(draw);
                            }
                        })),
                        gridColumns: 3
                    });
                }
            }

            items.push({ separator: true });

            // Grouping
            if (selectionCount > 1) {
                items.push({ label: 'Group', shortcut: 'Ctrl+G', onClick: groupSelected });
            }

            const isAnyGrouped = store.selection.some(id => {
                const el = store.elements.find(e => e.id === id);
                return el?.groupIds && el.groupIds.length > 0;
            });

            if (isAnyGrouped) {
                items.push({ label: 'Ungroup', shortcut: 'Ctrl+Shift+G', onClick: ungroupSelected });
            }

            items.push({ separator: true });

            // Export Selection
            items.push(
                {
                    label: 'Export as PNG',
                    onClick: () => exportToPng(2, true, true) // 2x scale, white bg, selection only
                },
                {
                    label: 'Export as SVG',
                    onClick: () => exportToSvg(true) // selection only
                }
            );

            items.push({ separator: true });

            // Layering
            items.push(
                {
                    label: 'Bring to Front', shortcut: 'Ctrl+]',
                    onClick: () => bringToFront(store.selection)
                },
                {
                    label: 'Send to Back', shortcut: 'Ctrl+[',
                    onClick: () => sendToBack(store.selection)
                },
                {
                    label: 'Bring Forward',
                    onClick: () => store.selection.forEach(id => moveElementZIndex(id, 'forward'))
                },
                {
                    label: 'Send Backward',
                    onClick: () => store.selection.forEach(id => moveElementZIndex(id, 'backward'))
                },
                { separator: true }
            );

            // Styling
            if (selectionCount === 1) {
                items.push(
                    { label: 'Copy Styles', shortcut: 'Ctrl+Alt+C', onClick: copyStyle },
                    { label: 'Paste Styles', shortcut: 'Ctrl+Alt+V', onClick: pasteStyle },
                    { separator: true }
                );
            }

            // Lock / Flip / Delete
            const isLocked = store.selection.some(id => store.elements.find(e => e.id === id)?.locked);
            items.push(
                {
                    label: isLocked ? 'Unlock' : 'Lock',
                    shortcut: 'Ctrl+Shift+L',
                    onClick: () => lockSelected(!isLocked)
                },
                {
                    label: 'Flip Horizontal', shortcut: 'Shift+H',
                    onClick: () => flipSelected('horizontal')
                },
                {
                    label: 'Flip Vertical', shortcut: 'Shift+V',
                    onClick: () => flipSelected('vertical')
                },
                { separator: true },
                {
                    label: 'Delete', shortcut: 'Delete',
                    onClick: () => deleteElements(store.selection)
                },
                { separator: true },
                {
                    label: 'Show Properties',
                    onClick: () => togglePropertyPanel(true)
                }
            );
        } else {
            // Default Canvas Menu
            items.push(
                { label: 'Paste', shortcut: 'Ctrl+V', onClick: pasteFromClipboard },
                { separator: true },
                { label: 'Select all', shortcut: 'Ctrl+A', onClick: () => setStore('selection', store.elements.map(e => e.id)) },
                { label: 'Zoom to Fit', shortcut: 'Shift+1', onClick: store.docType === 'slides' ? zoomToFitSlide : zoomToFit },
                { separator: true },
                { label: 'Show Grid', checked: store.gridSettings.enabled, onClick: toggleGrid },
                { label: 'Snap to Grid', checked: store.gridSettings.snapToGrid, onClick: toggleSnapToGrid },
                { label: 'Smart Snapping', checked: store.gridSettings.objectSnapping, onClick: () => setStore('gridSettings', 'objectSnapping', !store.gridSettings.objectSnapping) },
                { separator: true },
                { label: 'Zen Mode', shortcut: 'Alt+Z', checked: store.zenMode, onClick: toggleZenMode },
                { label: 'Reset View', onClick: () => setViewState({ scale: 1, panX: 0, panY: 0 }) },
                { separator: true },
                { label: 'Canvas Settings', onClick: () => setShowCanvasProperties(true) }
            );
        }
        return items;
    };


    return (
        <>
            <canvas
                ref={canvasRef}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDblClick={handleDoubleClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                    setContextMenuOpen(true);
                }}
                style={{ display: "block", "touch-action": "none", cursor: cursor(), "user-select": "none" }}
            />

            {/* Global Texture Overlay */}
            <Show when={store.canvasTexture !== 'none' && store.canvasTexture !== 'grid' && store.canvasTexture !== 'graph'}>
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        "pointer-events": "none",
                        "z-index": 0,
                        opacity: store.theme === 'dark' ? 0.1 : 0.4,
                        "background-image": store.canvasTexture === 'paper'
                            ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opactiy='0.5'/%3E%3C/svg%3E")`
                            : store.canvasTexture === 'dots'
                                ? `radial-gradient(${store.theme === 'dark' ? '#ffffff' : '#000000'} 1px, transparent 1px)`
                                : 'none',
                        "background-size": store.canvasTexture === 'dots' ? '20px 20px' : 'auto'
                    }}
                />
            </Show>

            <Show when={showScrollBack()}>
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    "z-index": 100
                }}>
                    <button
                        onClick={handleScrollBack}
                        style={{
                            "background-color": "white",
                            border: "1px solid #e5e7eb",
                            padding: "8px 16px",
                            "border-radius": "9999px",
                            "box-shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            cursor: "pointer",
                            color: "#3b82f6",
                            "font-weight": "500",
                            "font-size": "14px",
                            transition: "all 0.2s"
                        }}
                    >
                        Scroll back to content
                    </button>
                </div>
            </Show>
            <Show when={editingId() && activeTextElement()}>
                {(_) => {
                    const el = activeTextElement()!;
                    const baseState = getElementPreviewBaseState(el.id);
                    const elX = baseState ? baseState.x : el.x;
                    const elY = baseState ? baseState.y : el.y;
                    const elW = baseState ? baseState.width : el.width;
                    const elH = baseState ? baseState.height : el.height;
                    const { scale, panX, panY } = store.viewState;

                    // Calculate Center based on Editing Property
                    let centerX = (elX + elW / 2) * scale + panX;
                    let centerY = (elY + elH / 2) * scale + panY;
                    let textAlign = 'center';
                    let fontSizeVal = el.fontSize || 28;

                    if (el.type === 'umlClass') {
                        const prop = editingProperty();
                        if (prop === 'attributesText' || prop === 'methodsText') {
                            textAlign = 'left';
                            fontSizeVal = fontSizeVal * 0.9;

                            // Re-calculate layout to find Y position
                            const ctx = canvasRef ? canvasRef.getContext("2d") : null;
                            let headerHeight = 30;
                            if (el.containerText && ctx) {
                                const metrics = measureContainerText(ctx, el, el.containerText, el.width - 10);
                                headerHeight = Math.max(30, metrics.textHeight + 20);
                            }

                            let attrOffsetY = headerHeight;
                            let attrHeight = 20;
                            if (el.attributesText && ctx) {
                                const metrics = measureContainerText(ctx, { ...el, fontSize: fontSizeVal }, el.attributesText, el.width - 10);
                                attrHeight = Math.max(20, metrics.textHeight + 10);
                            }

                            if (prop === 'attributesText') {
                                centerY = (elY + attrOffsetY + attrHeight / 2) * scale + panY;
                                centerX = (elX + elW / 2) * scale + panX; // Keep X center but align text left
                            } else if (prop === 'methodsText') {
                                // Methods start after attributes
                                const methodOffsetY = attrOffsetY + attrHeight;
                                // We don't verify methods height, just start it below
                                centerY = (elY + methodOffsetY + 20) * scale + panY;
                                centerX = (elX + elW / 2) * scale + panX;
                            }
                        }
                    }

                    return (
                        <textarea
                            ref={textInputRef}
                            value={editText()}
                            onInput={(e) => setEditText(e.currentTarget.value)}
                            onBlur={handleTextBlur}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingId(null);
                                    setEditText("");
                                }
                            }}
                            style={{
                                position: 'absolute',
                                top: `${centerY}px`,
                                left: `${centerX}px`,
                                transform: 'translate(-50%, -50%)',
                                font: `${fontSizeVal * scale}px ${el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
                                    el.fontFamily === 'monospace' ? 'Source Code Pro, monospace' :
                                        'Handlee, cursive'
                                    }`,
                                color: el.strokeColor,
                                background: 'transparent',
                                border: '1px dashed #007acc',
                                outline: 'none',
                                margin: 0,
                                padding: '4px',
                                resize: 'none',
                                overflow: 'hidden',
                                'min-width': '50px',
                                'min-height': '1em',
                                'text-align': textAlign as any
                            }}
                        />
                    );
                }}
            </Show>

            {/* Context Menu */}
            <Show when={contextMenuOpen()}>
                <ContextMenu
                    x={contextMenuPos().x}
                    y={contextMenuPos().y}
                    items={getContextMenuItems()}
                    onClose={() => setContextMenuOpen(false)}
                />
            </Show>

            {/* Recording Overlay */}
            <Show when={store.isRecording}>
                <RecordingOverlay onStop={handleStopRecording} />
            </Show>

            {/* Path Editor Overlay */}
            <Show when={store.pathEditState.isActive}>
                <PathEditorOverlay
                    elementId={store.pathEditState.elementId}
                    animationId={store.pathEditState.animationId}
                    scale={store.viewState.scale}
                    panX={store.viewState.panX}
                    panY={store.viewState.panY}
                />
            </Show>

            {/* Minimap */}
            <Show when={store.minimapVisible}>
                <Minimap
                    canvasWidth={canvasRef?.width || window.innerWidth}
                    canvasHeight={canvasRef?.height || window.innerHeight}
                />
            </Show>
        </>
    );
};

// --- Path Editor Overlay --- (New)
const PathEditorOverlay: Component<{
    elementId: string | null;
    animationId: string | null;
    scale: number;
    panX: number;
    panY: number;
}> = (props) => {
    const element = createMemo(() => store.elements.find(e => e.id === props.elementId));

    // We parse the points from the store LIVE
    const points = createMemo<{ x: number, y: number, type: string }[]>(() => {
        const el = element();
        if (!el || !props.animationId) return [];

        const anim = el.animations?.find(a => a.id === props.animationId);
        if (!anim || anim.type !== 'path') return [];

        return PathUtils.svgToPoints((anim as any).pathData);
    });

    // Memoize the transform string to avoid messy JSX
    const transformString = createMemo(() => {
        const el = element();
        if (!el) return `translate(${props.panX}, ${props.panY}) scale(${props.scale})`;
        const anim = el.animations?.find(a => a.id === props.animationId);
        const isRelative = (anim as any)?.isRelative ?? true;

        const offsetX = isRelative ? (el.x + el.width / 2) : 0;
        const offsetY = isRelative ? (el.y + el.height / 2) : 0;

        // Final transform: Canvas Pan/Zoom -> Element Relative Offset
        return `translate(${props.panX}, ${props.panY}) scale(${props.scale}) translate(${offsetX}, ${offsetY})`;
    });

    return (
        <Show when={element() && points().length > 0}>
            <div
                class="path-editor-overlay"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    'pointer-events': 'none',
                }}
            >
                {/* 1. Render Control Points (Handles) */}
                <For each={points()}>
                    {(point, i) => {
                        // Calculate screen position for the handle
                        const el = element()!;
                        const anim = el.animations?.find(a => a.id === props.animationId);
                        const isRelative = (anim as any).isRelative ?? true;

                        let worldX = point.x;
                        let worldY = point.y;

                        if (isRelative) {
                            const cx = el.x + el.width / 2;
                            const cy = el.y + el.height / 2;
                            worldX = cx + point.x;
                            worldY = cy + point.y;
                        }

                        const screenX = worldX * props.scale + props.panX;
                        const screenY = worldY * props.scale + props.panY;

                        return (
                            <div
                                class="path-control-point"
                                style={{
                                    position: 'absolute',
                                    left: `${screenX}px`,
                                    top: `${screenY}px`,
                                    transform: 'translate(-50%, -50%)',
                                    width: '10px',
                                    height: '10px',
                                    background: point.type === 'anchor' ? '#3b82f6' : '#ffffff',
                                    border: '2px solid #3b82f6',
                                    'border-radius': '50%',
                                    // Handles must be interactive
                                    'pointer-events': 'all',
                                    cursor: 'move',
                                    'z-index': 1000
                                }}
                                title={`Point ${i()}: ${point.type}`}
                                onPointerDown={(e) => {
                                    e.stopPropagation(); // Stop canvas pan
                                    e.currentTarget.setPointerCapture(e.pointerId);

                                    const dragStartX = e.clientX;
                                    const dragStartY = e.clientY;
                                    const initialPoint = { ...point };

                                    const onMove = (ev: PointerEvent) => {
                                        const dx = (ev.clientX - dragStartX) / props.scale;
                                        const dy = (ev.clientY - dragStartY) / props.scale;

                                        // Update Point in Store
                                        const currentPoints = [...points()];
                                        currentPoints[i()] = {
                                            ...currentPoints[i()],
                                            x: initialPoint.x + dx,
                                            y: initialPoint.y + dy
                                        };

                                        // Sync back to SVG
                                        const newD = PathUtils.pointsToSvg(currentPoints);
                                        updateAnimation(props.elementId!, props.animationId!, { pathData: newD } as any);
                                    };

                                    const onUp = (ev: PointerEvent) => {
                                        e.currentTarget.releasePointerCapture(ev.pointerId);
                                        window.removeEventListener('pointermove', onMove);
                                        window.removeEventListener('pointerup', onUp);
                                        pushToHistory(); // Commit change
                                    };

                                    window.addEventListener('pointermove', onMove);
                                    window.addEventListener('pointerup', onUp);
                                }}
                            />
                        );
                    }}
                </For>

                {/* 2. Render Path Trace (SVG Overlay) */}
                <svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        'pointer-events': 'none',
                        'z-index': 999
                    }}
                >
                    <path
                        d={(element()?.animations?.find(a => a.id === props.animationId) as any)?.pathData || ''}
                        fill="none"
                        stroke="#3b82f6"
                        stroke-width="2"
                        stroke-dasharray="5 5"
                        transform={transformString()}
                    />
                </svg>

                {/* 3. Invisible Hit Area for Adding New Points */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        'z-index': 998, // Below points, above canvas
                        'pointer-events': 'all', // CLICKABLE
                        'cursor': 'crosshair'
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        // Add new point at click location
                        const el = element()!;
                        const anim = el.animations?.find(a => a.id === props.animationId);
                        const isRelative = (anim as any).isRelative ?? true;

                        // Calculate World Coordinates
                        const clickX = (e.clientX - props.panX) / props.scale;
                        const clickY = (e.clientY - props.panY) / props.scale;

                        let newPointX = clickX;
                        let newPointY = clickY;

                        if (isRelative) {
                            const cx = el.x + el.width / 2;
                            const cy = el.y + el.height / 2;
                            newPointX = clickX - cx;
                            newPointY = clickY - cy;
                        }

                        const currentPoints = [...points()];
                        currentPoints.push({ x: newPointX, y: newPointY, type: 'anchor' });

                        const newD = PathUtils.pointsToSvg(currentPoints);
                        updateAnimation(props.elementId!, props.animationId!, { pathData: newD } as any);
                    }}
                />

                {/* 4. Done Button */}
                <button
                    onClick={() => setPathEditing(false)}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        'z-index': 2000,
                        'background': '#3b82f6',
                        'color': 'white',
                        'padding': '8px 16px',
                        'border-radius': '20px',
                        'border': 'none',
                        'font-weight': 600,
                        'box-shadow': '0 4px 6px rgba(0,0,0,0.1)',
                        'cursor': 'pointer',
                        'pointer-events': 'all'
                    }}
                >
                    Done Editing Path
                </button>
            </div>
        </Show>
    );
};

export default Canvas;
