import { type Component, onMount, createEffect, onCleanup, createSignal, Show, untrack, createMemo, For } from "solid-js";
import { calculateAllAnimatedStates } from "../utils/animation-utils";
import { animationEngine } from "../utils/animation/animation-engine";
import rough from 'roughjs'; // Hand-drawn style
import { isElementHiddenByHierarchy, getDescendants } from "../utils/hierarchy";
import { store, setViewState, addElement, updateElement, setStore, pushToHistory, deleteElements, toggleGrid, toggleSnapToGrid, setActiveLayer, setShowCanvasProperties, setSelectedTool, toggleZenMode, duplicateElement, groupSelected, ungroupSelected, bringToFront, sendToBack, moveElementZIndex, zoomToFit, zoomToFitSlide, isLayerVisible, isLayerLocked, toggleCollapse, setParent, clearParent, addChildNode, addSiblingNode, reorderMindmap, applyMindmapStyling, togglePropertyPanel, updateSlideThumbnail, advancePresentation, updateSlideBackground, updateAnimation, setPathEditing } from "../store/app-store";
import { renderElement, normalizePoints } from "../utils/render-element";
import { PathUtils } from "../utils/math/path-utils";
import { getAnchorPoints, findClosestAnchor } from "../utils/anchor-points";
import { calculateSmartElbowRoute } from "../utils/routing";
import type { DrawingElement } from "../types";
import { distanceToSegment, isPointOnPolyline, isPointInEllipse, intersectElementWithLine, isPointOnBezier, isPointInPolygon, getOrganicBranchPolygon } from "../utils/geometry";
import ContextMenu, { type MenuItem } from "./context-menu";
import { snapPoint } from "../utils/snap-helpers";
import { getImage, setImageLoadCallback } from "../utils/image-cache";
import { getSnappingGuides } from "../utils/object-snapping";
import type { SnappingGuide } from "../utils/object-snapping";
import { getSpacingGuides } from "../utils/spacing";
import type { SpacingGuide } from "../utils/spacing";
import { Minimap } from "./minimap";
import {
    copyToClipboard, cutToClipboard, pasteFromClipboard,
    flipSelected, lockSelected, copyStyle, pasteStyle
} from '../utils/object-context-actions';
import { showToast } from "./toast";
import { perfMonitor } from "../utils/performance-monitor";
import { fitShapeToText, measureContainerText } from "../utils/text-utils";
import { changeElementType, getTransformOptions, getShapeIcon, getShapeTooltip, getCurveTypeOptions, getCurveTypeIcon, getCurveTypeTooltip } from "../utils/element-transforms";
import { getGroupsSortedByPriority, isPointInGroupBounds } from "../utils/group-utils";
import { exportToPng, exportToSvg } from "../utils/export";
import { getElementPreviewBaseState } from "../utils/animation/element-animator";
import { effectiveTime } from "../utils/animation/animation-engine";
import { VideoRecorder } from "../utils/video-recorder";
import RecordingOverlay from "./recording-overlay";
import { generateId } from "../utils/id-generator"; // New Import


// Export controls for Menu/Dialog access
export const [requestRecording, setRequestRecording] = createSignal<{ start: boolean, format?: 'webm' | 'mp4' } | null>(null);

// Helper to render slide background
const renderSlideBackground = (ctx: CanvasRenderingContext2D, rc: any, slide: any, x: number, y: number, w: number, h: number, isDarkMode: boolean) => {
    const type = slide.fillStyle || 'solid';

    if (type === 'solid') {
        const fallbackColor = isDarkMode ? "#121212" : "#ffffff";
        let color = slide.backgroundColor || fallbackColor;
        if (color === 'transparent') color = fallbackColor;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    } else if (['linear', 'radial', 'conic'].includes(type)) {
        const stops = slide.gradientStops || [];
        const angle = slide.gradientDirection || 0;

        if (stops.length === 0) {
            const fallbackColor = isDarkMode ? "#121212" : "#ffffff";
            let color = slide.backgroundColor || fallbackColor;
            if (color === 'transparent') color = fallbackColor;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, w, h);
            return;
        }

        const centerX = x + w / 2;
        const centerY = y + h / 2;

        let grad;
        if (type === 'linear') {
            const angleRad = (angle * Math.PI) / 180;
            const length = Math.sqrt(w * w + h * h) / 2;
            const dx = Math.cos(angleRad) * length;
            const dy = Math.sin(angleRad) * length;
            grad = ctx.createLinearGradient(centerX - dx, centerY - dy, centerX + dx, centerY + dy);
        } else {
            // Radial
            const angleRad = (angle * Math.PI) / 180;
            const radius = Math.max(w, h) / 2;
            const focalOffset = radius * 0.4; // 40% offset
            const fx = centerX + Math.cos(angleRad) * focalOffset;
            const fy = centerY + Math.sin(angleRad) * focalOffset;
            grad = ctx.createRadialGradient(fx, fy, 0, centerX, centerY, radius);
        }

        stops.forEach((s: any) => grad.addColorStop(s.offset, s.color));
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
    } else if (['hachure', 'cross-hatch', 'zigzag', 'dots', 'dashed', 'zigzag-line'].includes(type)) {
        // RoughJS Pattern Fills for slides
        const bgColor = slide.backgroundColor || (isDarkMode ? "#121212" : "#ffffff");
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);

        rc.rectangle(x, y, w, h, {
            fill: slide.strokeColor || (isDarkMode ? "#ffffff" : "#000000"),
            fillStyle: type as any,
            fillWeight: 0.5,
            hachureGap: 8,
            stroke: 'transparent',
            roughness: 0
        });
    } else if (type === 'image' && slide.backgroundImage) {
        const img = getImage(slide.backgroundImage);
        if (img) {
            ctx.save();
            ctx.globalAlpha = slide.backgroundOpacity ?? 1;
            // Draw image cropped/fitted
            const imgAspect = img.width / img.height;
            const slideAspect = w / h;
            let dw, dh, dx, dy;

            if (imgAspect > slideAspect) {
                dh = h;
                dw = h * imgAspect;
                dx = x - (dw - w) / 2;
                dy = y;
            } else {
                dw = w;
                dh = w / imgAspect;
                dx = x;
                dy = y - (dh - h) / 2;
            }
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
        } else {
            // Placeholder while loading
            ctx.fillStyle = isDarkMode ? "#1a1a1a" : "#f0f0f0";
            ctx.fillRect(x, y, w, h);
        }
    }
};

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
            // Only render elements that are within this slide's bounds (roughly)
            // Or just render all and let clipping/positioning handle it
            const layerElements = store.elements.filter(el => el.layerId === layer.id);
            layerElements.forEach(el => {
                const layerOpacity = (layer?.opacity ?? 1);
                renderElement(rc, tCtx, el, isDarkMode, layerOpacity);
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


    let isDrawing = false;
    let currentId: string | null = null;
    let startX = 0;
    let startY = 0;

    // Text Editing State
    const [editingId, setEditingId] = createSignal<string | null>(null);
    const [editingProperty, setEditingProperty] = createSignal<'text' | 'containerText' | 'attributesText' | 'methodsText'>('containerText');
    const [editText, setEditText] = createSignal("");
    let textInputRef: HTMLTextAreaElement | undefined;

    // Selection/Move State
    let isDragging = false;
    let isSelecting = false; // Drag selection box
    let draggingHandle: string | null = null;
    const [selectionBox, setSelectionBox] = createSignal<{ x: number, y: number, w: number, h: number } | null>(null);
    let initialPositions = new Map<string, any>();
    const [suggestedBinding, setSuggestedBinding] = createSignal<{ elementId: string; px: number; py: number; position?: string } | null>(null);
    const [snappingGuides, setSnappingGuides] = createSignal<SnappingGuide[]>([]);
    const [spacingGuides, setSpacingGuides] = createSignal<SpacingGuide[]>([]);

    // Interactive Connector State
    let draggingFromConnector: { elementId: string; anchorPosition: string; startX: number; startY: number } | null = null;
    let hoveredConnector: { elementId: string; handle: string } | null = null;

    let initialElementX = 0;
    let initialElementY = 0;
    let initialElementWidth = 0;
    let initialElementHeight = 0;

    let initialElementFontSize = 20;

    // OPTIMIZATION: Throttle smart snapping calculations
    let lastSnappingTime = 0;
    const SNAPPING_THROTTLE_MS = 16; // ~60 FPS

    // Laser Pointer State (Transient) - Using mutable array for performance
    let laserTrailData: Array<{ x: number, y: number, timestamp: number }> = [];
    let laserRafPending = false;
    let lastLaserUpdateTime = 0;
    const LASER_THROTTLE_MS = 8; // ~120fps for smooth trail
    const LASER_DECAY_MS = 800;
    const LASER_MAX_POINTS = 100;

    // Pen/Ink Tool Optimization - Buffer points locally and batch update to store
    let penPointsBuffer: number[] = [];
    let lastPenUpdateTime = 0;
    const PEN_UPDATE_THROTTLE_MS = 16; // ~60fps store updates
    let penUpdatePending = false;

    const flushPenPoints = () => {
        if (!currentId || penPointsBuffer.length === 0) return;
        const el = store.elements.find(e => e.id === currentId);
        if (el && el.points) {
            const existingPoints = el.points as number[];
            const newPoints = [...existingPoints, ...penPointsBuffer];
            const updates: Partial<DrawingElement> = { points: newPoints };
            // For ink tool, also update ttl
            if (el.type === 'ink') {
                updates.ttl = Date.now() + 3000;
            }
            updateElement(currentId, updates, false);
            penPointsBuffer = [];
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
        console.log('[Canvas] draw() called, effectiveTime:', effectiveTime());
        if (!canvasRef) return;
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;

        // Expose effectiveTime to window for renderers to access without signal overhead in deep loops
        const currentTime = effectiveTime();
        (window as any).yappyGlobalTime = currentTime;

        const startTime = performance.now();

        // PRE-CALCULATE ANIMATION STATES FOR THIS FRAME
        // Performance Optimization: In Slide View, only calculate animations for elements on the active slide
        // to avoid CPU overhead from hidden slides.
        const shouldAnimate = store.appMode === 'presentation' || store.isPreviewing;

        let elementsToAnimate = store.elements;
        if (store.docType === 'slides' && store.slides.length > 0) {
            const activeSlide = store.slides[store.activeSlideIndex];
            if (activeSlide) {
                const { x: sX, y: sY } = activeSlide.spatialPosition;
                const { width: sW, height: sH } = activeSlide.dimensions;
                const BUFFER = 200; // Extra margin to prevent pop-in

                // 1. Get elements on or near the active slide, OR on a Master layer
                const masterLayerIds = new Set(store.layers.filter(l => l.isMaster).map(l => l.id));
                const primaryElements = store.elements.filter(el => {
                    if (masterLayerIds.has(el.layerId)) return true;

                    const cx = el.x + el.width / 2;
                    const cy = el.y + el.height / 2;
                    return cx >= sX - BUFFER && cx <= sX + sW + BUFFER &&
                        cy >= sY - BUFFER && cy <= sY + sH + BUFFER;
                });

                // 2. Ensure Orbit Centers are included even if they are off-slide
                const centerIds = new Set(primaryElements.map(el => el.orbitCenterId).filter(Boolean));
                const centerElements = store.elements.filter(el => centerIds.has(el.id));

                elementsToAnimate = primaryElements.length === store.elements.length
                    ? store.elements
                    : [...new Set([...primaryElements, ...centerElements])];
            }
        }

        const animatedStates = calculateAllAnimatedStates(elementsToAnimate, currentTime, shouldAnimate);

        // Reset Transform Matrix to Identity so we don't accumulate translations!
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

        // --- Laser Trail Decay (using mutable array for performance) ---
        const now = Date.now();
        if (laserTrailData.length > 0) {
            // Filter in place for performance
            let writeIdx = 0;
            for (let i = 0; i < laserTrailData.length; i++) {
                if (now - laserTrailData[i].timestamp < LASER_DECAY_MS) {
                    laserTrailData[writeIdx++] = laserTrailData[i];
                }
            }
            laserTrailData.length = writeIdx;
        }

        // Render Canvas Overall Background (The "Infinite" workspace)
        const isDarkMode = store.theme === 'dark';
        const workspaceBg = isDarkMode ? "#1a1a1b" : "#e2e8f0"; // Slightly darker for contrast
        ctx.fillStyle = workspaceBg;
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

        const { scale, panX, panY } = store.viewState;

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        const rc = rough.canvas(canvasRef);

        // --- Render Slide Boundaries ---
        if (store.docType === 'slides') {
            // Strict Mode: Only render the ACTIVE slide
            const activeSlide = store.slides[store.activeSlideIndex];
            if (activeSlide) {
                const { width: sW, height: sH } = activeSlide.dimensions;
                const { x: sX, y: sY } = activeSlide.spatialPosition;

                // 1. Draw Slide Shadow (Outer)
                ctx.save();
                ctx.shadowColor = isDarkMode ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";
                ctx.shadowBlur = 40;
                ctx.shadowOffsetY = 10;
                ctx.fillStyle = "black";
                ctx.fillRect(sX, sY, sW, sH);
                ctx.restore();

                // 2. Draw Slide Surface
                renderSlideBackground(ctx, rc, activeSlide, sX, sY, sW, sH, isDarkMode);
            }
        } else if (store.docType === 'infinite' && store.slides.length > 1) {
            // Wide Mode: Render slide frames only if there are multiple slides
            // Single-slide infinite canvas should be clean and boundless
            store.slides.forEach((slide, index) => {
                const { width: sW, height: sH } = slide.dimensions;
                const { x: sX, y: sY } = slide.spatialPosition;

                // Dashed frame for slide boundaries
                ctx.save();
                ctx.strokeStyle = isDarkMode ? "rgba(100,149,237,0.4)" : "rgba(70,130,180,0.3)"; // Cornflower blue
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 5]);
                ctx.strokeRect(sX, sY, sW, sH);
                ctx.setLineDash([]);
                ctx.restore();

                // Very light background tint
                ctx.fillStyle = isDarkMode ? "rgba(100,149,237,0.03)" : "rgba(70,130,180,0.02)";
                ctx.fillRect(sX, sY, sW, sH);

                // Slide number label in top-left corner
                ctx.save();
                const labelText = `Slide ${index + 1}`;
                const fontSize = Math.max(14, 16 / scale); // Scale-aware font size
                ctx.font = `${fontSize}px Inter, sans-serif`;
                ctx.fillStyle = isDarkMode ? "rgba(100,149,237,0.6)" : "rgba(70,130,180,0.5)";

                const padding = 8;
                const textMetrics = ctx.measureText(labelText);
                const labelHeight = fontSize + padding * 2;
                const labelWidth = textMetrics.width + padding * 2;

                // Label background
                ctx.fillStyle = isDarkMode ? "rgba(30,30,30,0.8)" : "rgba(255,255,255,0.9)";
                ctx.fillRect(sX, sY, labelWidth, labelHeight);

                // Label border
                ctx.strokeStyle = isDarkMode ? "rgba(100,149,237,0.4)" : "rgba(70,130,180,0.3)";
                ctx.lineWidth = 1;
                ctx.strokeRect(sX, sY, labelWidth, labelHeight);

                // Label text
                ctx.fillStyle = isDarkMode ? "rgba(100,149,237,0.8)" : "rgba(70,130,180,0.7)";
                ctx.fillText(labelText, sX + padding, sY + fontSize + padding / 2);
                ctx.restore();
            });
        }
        ctx.restore();

        // Render Canvas Texture
        if (store.canvasTexture !== 'none') {
            const texture = store.canvasTexture;

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Use screen coordinates for texture

            if (texture === 'dots' || texture === 'grid' || texture === 'graph') {
                const spacing = texture === 'graph' ? 40 : 20;
                const subSpacing = spacing / 4;
                const dotColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
                const lineColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';
                const majorLineColor = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.07)';

                const startX = (panX % (spacing * scale));
                const startY = (panY % (spacing * scale));

                if (texture === 'dots') {
                    ctx.fillStyle = dotColor;
                    for (let x = startX; x < canvasRef.width; x += spacing * scale) {
                        for (let y = startY; y < canvasRef.height; y += spacing * scale) {
                            ctx.beginPath();
                            ctx.arc(x, y, 1, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                } else if (texture === 'grid') {
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let x = startX; x < canvasRef.width; x += spacing * scale) {
                        ctx.moveTo(x, 0); ctx.lineTo(x, canvasRef.height);
                    }
                    for (let y = startY; y < canvasRef.height; y += spacing * scale) {
                        ctx.moveTo(0, y); ctx.lineTo(canvasRef.width, y);
                    }
                    ctx.stroke();
                } else if (texture === 'graph') {
                    // Minor lines
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    for (let x = (panX % (subSpacing * scale)); x < canvasRef.width; x += subSpacing * scale) {
                        ctx.moveTo(x, 0); ctx.lineTo(x, canvasRef.height);
                    }
                    for (let y = (panY % (subSpacing * scale)); y < canvasRef.height; y += subSpacing * scale) {
                        ctx.moveTo(0, y); ctx.lineTo(canvasRef.width, y);
                    }
                    ctx.stroke();

                    // Major lines
                    ctx.strokeStyle = majorLineColor;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let x = startX; x < canvasRef.width; x += spacing * scale) {
                        ctx.moveTo(x, 0); ctx.lineTo(x, canvasRef.height);
                    }
                    for (let y = startY; y < canvasRef.height; y += spacing * scale) {
                        ctx.moveTo(0, y); ctx.lineTo(canvasRef.width, y);
                    }
                    ctx.stroke();
                }
            } else if (texture === 'paper') {
                // Handled by CSS Overlay for performance
            }

            ctx.restore();
        }

        ctx.save();

        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        // Draw Grid if enabled
        if (store.gridSettings.enabled) {
            const gridSize = store.gridSettings.gridSize;
            let gridColor = store.gridSettings.gridColor;

            // Adjust grid color for dark mode if using default
            if (isDarkMode && gridColor === '#e0e0e0') {
                gridColor = '#333333';
            }

            const gridOpacity = store.gridSettings.gridOpacity;
            const gridStyle = store.gridSettings.style || 'lines';

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for grid optimization
            ctx.strokeStyle = gridColor;
            ctx.fillStyle = gridColor;
            ctx.globalAlpha = gridOpacity;
            ctx.lineWidth = 1;

            // Calculate visible grid bounds
            const startX = Math.floor((-panX / scale) / gridSize) * gridSize;
            const endX = Math.ceil((canvasRef.width - panX) / scale / gridSize) * gridSize;
            const startY = Math.floor((-panY / scale) / gridSize) * gridSize;
            const endY = Math.ceil((canvasRef.height - panY) / scale / gridSize) * gridSize;

            if (gridStyle === 'lines') {
                // Draw vertical lines
                ctx.beginPath();
                for (let x = startX; x <= endX; x += gridSize) {
                    const screenX = x * scale + panX;
                    ctx.moveTo(screenX, 0);
                    ctx.lineTo(screenX, canvasRef.height);
                }
                // Draw horizontal lines
                for (let y = startY; y <= endY; y += gridSize) {
                    const screenY = y * scale + panY;
                    ctx.moveTo(0, screenY);
                    ctx.lineTo(canvasRef.width, screenY);
                }
                ctx.stroke();
            } else {
                // Draw DOTS
                const dotSize = 3; // Slightly larger for visibility

                // Enhance contrast for dots in light mode
                if (!isDarkMode && gridStyle === 'dots' && (gridColor === '#e0e0e0' || gridColor === '#fafafa')) {
                    ctx.fillStyle = '#b0b0b0'; // Darker gray for dots
                }

                for (let x = startX; x <= endX; x += gridSize) {
                    for (let y = startY; y <= endY; y += gridSize) {
                        const screenX = x * scale + panX;
                        const screenY = y * scale + panY;

                        // Optimization: Only draw if on screen
                        if (screenX >= -dotSize && screenX <= canvasRef.width + dotSize &&
                            screenY >= -dotSize && screenY <= canvasRef.height + dotSize) {
                            ctx.beginPath();
                            ctx.arc(screenX, screenY, dotSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }

            ctx.restore();
        }

        // Calculate viewport bounds in world coordinates for culling
        const viewportBounds = {
            minX: (-panX) / scale,
            maxX: (canvasRef.width - panX) / scale,
            minY: (-panY) / scale,
            maxY: (canvasRef.height - panY) / scale
        };

        // Add 10% buffer for smoother transitions at viewport edges
        const bufferX = (viewportBounds.maxX - viewportBounds.minX) * 0.1;
        const bufferY = (viewportBounds.maxY - viewportBounds.minY) * 0.1;

        // Render Layers and Elements
        const sortedLayers = [...store.layers].sort((a, b) => a.order - b.order);
        let totalRendered = 0;

        // OPTIMIZATION: Create O(1) lookup map for elements at start of frame
        const elementMap = new Map<string, DrawingElement>();
        for (const el of store.elements) {
            elementMap.set(el.id, el);
        }

        // OPTIMIZATION: Create RoughJS instance ONCE per render frame, reuse across all layers
        // (rc is now declared at top of draw function)

        sortedLayers.forEach(layer => {
            if (!isLayerVisible(layer.id)) return;

            // 1. Draw Layer Background
            if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
                ctx.save();
                ctx.globalAlpha = layer.opacity;
                ctx.fillStyle = layer.backgroundColor;

                // Fill the whole world (or at least a very large area)
                // Since we are in world coordinates (translated/scaled),
                // we should fill a massive area to cover the infinite canvas.
                const BIG_VALUE = 1000000;
                ctx.fillRect(-BIG_VALUE, -BIG_VALUE, BIG_VALUE * 2, BIG_VALUE * 2);
                ctx.restore();
            }

            // 2. Draw Elements on this layer with viewport culling

            const layerElements = store.elements.filter(el => {
                if (el.layerId !== layer.id) return false;

                // FIX: Always render the element currently being drawn
                if (el.id === currentId) return true;

                // FIX: Skip viewport culling for Master layers because they will be 
                // projected into the active slide's origin during render
                if (layer.isMaster) return true;

                // Mindmap Visibility Check
                if (isElementHiddenByHierarchy(el, store.elements, elementMap)) return false;

                // Hide connectors if their bound elements are hidden
                if (el.type === 'line' || el.type === 'arrow' || el.type === 'bezier') {
                    if (el.startBinding) {
                        const startEl = elementMap.get(el.startBinding.elementId);
                        if (startEl && isElementHiddenByHierarchy(startEl, store.elements, elementMap)) return false;
                    }
                    if (el.endBinding) {
                        const endEl = elementMap.get(el.endBinding.elementId);
                        if (endEl && isElementHiddenByHierarchy(endEl, store.elements, elementMap)) return false;
                    }
                }

                // OPTIMIZATION: Skip elements smaller than 1px on screen (invisible when zoomed out)
                const screenWidth = Math.abs(el.width) * scale;
                const screenHeight = Math.abs(el.height) * scale;
                if (screenWidth < 1 && screenHeight < 1) return false;

                // OPTIMIZATION: Quick AABB (Axis-Aligned Bounding Box) visibility check
                // Add margin for rotated elements (use max dimension as safe bound)
                const margin = Math.max(Math.abs(el.width), Math.abs(el.height)) * 0.5;

                return !(el.x + el.width + margin < viewportBounds.minX - bufferX ||
                    el.x - margin > viewportBounds.maxX + bufferX ||
                    el.y + el.height + margin < viewportBounds.minY - bufferY ||
                    el.y - margin > viewportBounds.maxY + bufferY);
            });

            totalRendered += layerElements.length;

            layerElements.forEach(el => {
                // Get Animated State if exists
                const animState = animatedStates.get(el.id);

                // Construct Renderable Element with animated props
                const renderedEl = animState ? {
                    ...el,
                    x: animState.x,
                    y: animState.y,
                    angle: animState.angle
                } : JSON.parse(JSON.stringify(el)); // Deep copy to safely mutate for Master rendering

                const isMasterLayer = layer.isMaster;

                // Project Master elements relative to active slide
                if (isMasterLayer && store.docType === 'slides') {
                    const activeSlide = store.slides[store.activeSlideIndex];
                    if (activeSlide) {
                        const { x: sX, y: sY } = activeSlide.spatialPosition;
                        // Master elements are defined relative to (0,0) (the first slide's origin usually)
                        // or at least should be projected relative to each slide's top-left.
                        // We assume Master Layer elements define a template coordinate system.
                        renderedEl.x += sX;
                        renderedEl.y += sY;
                    }
                }

                let cx = renderedEl.x + renderedEl.width / 2;
                let cy = renderedEl.y + renderedEl.height / 2;

                // Strict isolation in Slide Mode (unless it's a Master Layer element which we just projected)
                if (store.docType === 'slides' && !isMasterLayer) {
                    const activeSlide = store.slides[store.activeSlideIndex];
                    if (activeSlide) {
                        const { x: sX, y: sY } = activeSlide.spatialPosition;
                        const { width: sW, height: sH } = activeSlide.dimensions;
                        const isOnActiveSlide = cx >= sX && cx <= sX + sW && cy >= sY && cy <= sY + sH;

                        // If element is completely outside the active slide frame, don't render it
                        if (!isOnActiveSlide) return;
                    }
                }

                // Handle Dynamic Variables in Text (Formula Syntax starts with '=')
                if (renderedEl.type === 'text' && renderedEl.text) {
                    if (renderedEl.text.startsWith('==')) {
                        // ESCAPE SYNTAX: "==" at start renders as a literal "=" and disables formulas
                        renderedEl.text = renderedEl.text.substring(1);
                    } else if (renderedEl.text.startsWith('=')) {
                        // FORMULA SYNTAX: "=" at start enables variable substitution
                        const slideNumber = (store.activeSlideIndex + 1).toString();
                        const totalSlides = store.slides.length.toString();

                        // Remove the leading '=' and perform replacement
                        renderedEl.text = renderedEl.text.substring(1)
                            .replace(/\$\{slideNumber\}/g, slideNumber)
                            .replace(/\$\{totalSlides\}/g, totalSlides);
                    }
                }

                if (renderedEl.type !== 'text' || editingId() !== renderedEl.id) {
                    const layerOpacity = (layer?.opacity ?? 1);
                    renderElement(rc, ctx, renderedEl, isDarkMode, layerOpacity);
                }

                // Selection highlight & Handles
                if (store.selection.includes(el.id)) {
                    // Use RENDERED ELEMENT for selection highlighting so it follows the animation
                    const hX = renderedEl.x;
                    const hY = renderedEl.y;
                    const hW = renderedEl.width;
                    const hH = renderedEl.height;
                    const hAngle = renderedEl.angle;
                    const hcx = hX + hW / 2;
                    const hcy = hY + hH / 2;

                    ctx.save();
                    // Re-apply rotation for handles
                    if (hAngle) {
                        ctx.translate(hcx, hcy);
                        ctx.rotate(hAngle);
                        ctx.translate(-hcx, -hcy);
                    }
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 1 / scale;
                    const padding = 2 / scale;

                    // Only draw bounding box for non-linear elements
                    if (el.type !== 'line' && el.type !== 'arrow' && el.type !== 'bezier' && el.type !== 'organicBranch') {
                        ctx.strokeRect(hX - padding, hY - padding, hW + padding * 2, hH + padding * 2);
                    } else if (el.type === 'organicBranch' && el.points && el.points.length >= 2 && el.controlPoints && el.controlPoints.length >= 2) {
                        // Draw curved selection outline for organicBranch
                        const pts = normalizePoints(el.points);
                        if (pts.length >= 2) {
                            const start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
                            const end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
                            const polygon = getOrganicBranchPolygon(start, end, el.controlPoints[0], el.controlPoints[1], el.strokeWidth);

                            ctx.save();
                            ctx.strokeStyle = '#3b82f6';
                            ctx.lineWidth = 2 / scale;
                            ctx.beginPath();
                            ctx.moveTo(polygon[0].x, polygon[0].y);
                            for (let i = 1; i < polygon.length; i++) {
                                ctx.lineTo(polygon[i].x, polygon[i].y);
                            }
                            ctx.closePath();
                            ctx.stroke();
                            ctx.restore();
                        }
                    }

                    // Handles (Only if single selection)
                    if (store.selection.length === 1) {
                        const handleSize = 8 / scale;
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 2 / scale;

                        if (el.type === 'line' || el.type === 'arrow' || el.type === 'bezier' || el.type === 'organicBranch') {
                            // Line/Arrow/Bezier/OrganicBranch Specific Handles (Start and End only)
                            let startX = hX;
                            let startY = hY;
                            let endX = hX + hW;
                            let endY = hY + hH;

                            // For organicBranch, use actual start/end points from points array
                            if (el.type === 'organicBranch' && el.points && el.points.length >= 2) {
                                const pts = normalizePoints(el.points);
                                if (pts.length >= 2) {
                                    startX = el.x + pts[0].x;
                                    startY = el.y + pts[0].y;
                                    endX = el.x + pts[pts.length - 1].x;
                                    endY = el.y + pts[pts.length - 1].y;
                                }
                            }

                            const handles = [
                                { x: startX, y: startY }, // Start (TL)
                                { x: endX, y: endY }      // End (BR)
                            ];

                            handles.forEach(h => {
                                ctx.beginPath();
                                ctx.arc(h.x, h.y, handleSize / 1.5, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            });

                        } else {
                            // Standard Box Handles
                            const handles = [
                                { x: hX - padding, y: hY - padding }, // TL
                                { x: hX + hW + padding, y: hY - padding }, // TR
                                { x: hX + hW + padding, y: hY + hH + padding }, // BR
                                { x: hX - padding, y: hY + hH + padding }, // BL
                                // Side Handles
                                { x: hX + hW / 2, y: hY - padding }, // TM
                                { x: hX + hW + padding, y: hY + hH / 2 }, // RM
                                { x: hX + hW / 2, y: hY + hH + padding }, // BM
                                { x: hX - padding, y: hY + hH / 2 } // LM
                            ];

                            handles.forEach(h => {
                                ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                                ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                            });

                            // Rotate Handle (Not for lines? Or maybe lines can rotate?)
                            // Lines usually just move endpoints. Rotating a line is same as moving endpoints.
                            // So hide rotate handle for lines.
                            const rotH = { x: el.x + el.width / 2, y: el.y - padding - 20 / scale };
                            ctx.beginPath();
                            ctx.moveTo(el.x + el.width / 2, el.y - padding);
                            ctx.lineTo(rotH.x, rotH.y);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.arc(rotH.x, rotH.y, handleSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        }
                    }

                    // Mindmap Toggle Handle (+) / (-)
                    const hasChildren = store.elements.some(e => e.parentId === el.id);
                    if (hasChildren && el.type !== 'line' && el.type !== 'arrow') {
                        const toggleSize = 14 / scale;
                        const centerX = el.x + el.width + 15 / scale;
                        const centerY = el.y + el.height / 2;

                        ctx.beginPath();
                        ctx.arc(centerX, centerY, toggleSize / 2, 0, Math.PI * 2);
                        ctx.fillStyle = el.isCollapsed ? '#10b981' : (isDarkMode ? '#333' : '#fff');
                        ctx.fill();
                        ctx.strokeStyle = '#10b981';
                        ctx.lineWidth = 2 / scale;
                        ctx.stroke();

                        // Draw + or -
                        ctx.beginPath();
                        ctx.strokeStyle = el.isCollapsed ? '#fff' : '#10b981';
                        ctx.lineWidth = 2 / scale;
                        // Horizontal line
                        ctx.moveTo(centerX - toggleSize / 4, centerY);
                        ctx.lineTo(centerX + toggleSize / 4, centerY);
                        if (el.isCollapsed) {
                            // Vertical line for +
                            ctx.moveTo(centerX, centerY - toggleSize / 4);
                            ctx.lineTo(centerX, centerY + toggleSize / 4);
                        }
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                // Visual Indicator for Collapsed Nodes (Subtle glow)
                if (el.isCollapsed && !store.selection.includes(el.id)) {
                    ctx.save();
                    if (el.angle) {
                        ctx.translate(cx, cy);
                        ctx.rotate(el.angle);
                        ctx.translate(-cx, -cy);
                    }
                    ctx.shadowBlur = 10 / scale;
                    ctx.shadowColor = '#10b981';
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 1 / scale;
                    const p = 1 / scale;
                    ctx.strokeRect(el.x - p, el.y - p, el.width + p * 2, el.height + p * 2);
                    ctx.restore();
                }

                // Custom Control Handles (Isometric Cube, Star, Burst, Solid Block, Perspective Block)
                if (store.selection.includes(el.id) && (el.type === 'isometricCube' || el.type === 'star' || el.type === 'burst' || el.type === 'solidBlock' || el.type === 'perspectiveBlock' || el.type === 'cylinder')) {
                    const cpSize = 10 / scale;
                    let cx = 0, cy = 0;

                    if (el.type === 'isometricCube') {
                        const shapeRatio = (el.shapeRatio !== undefined ? el.shapeRatio : 25) / 100;
                        const sideRatio = (el.sideRatio !== undefined ? el.sideRatio : 50) / 100;
                        const faceHeight = el.height * shapeRatio;
                        cy = el.y + faceHeight;
                        cx = el.x + el.width * sideRatio;
                    } else if (el.type === 'solidBlock' || el.type === 'cylinder') {
                        // Handle at Back Face Center
                        const depth = el.depth !== undefined ? el.depth : 50;
                        const angle = (el.viewAngle !== undefined ? el.viewAngle : 45) * Math.PI / 180;

                        const centerX = el.x + el.width / 2;
                        const centerY = el.y + el.height / 2;

                        cx = centerX + depth * Math.cos(angle);
                        cy = centerY + depth * Math.sin(angle);
                    } else if (el.type === 'perspectiveBlock') {
                        const depth = el.depth !== undefined ? el.depth : 50;
                        const angle = (el.viewAngle !== undefined ? el.viewAngle : 45) * Math.PI / 180;
                        const bTaper = el.taper !== undefined ? el.taper : 0;
                        const skewX = (el.skewX !== undefined ? el.skewX : 0) * el.width;
                        const skewY = (el.skewY !== undefined ? el.skewY : 0) * el.height;

                        const centerX = el.x + el.width / 2;
                        const centerY = el.y + el.height / 2;

                        const dx = depth * Math.cos(angle) + skewX;
                        const dy = depth * Math.sin(angle) + skewY;

                        const bScale = 1 - bTaper;
                        const bw = (el.width / 2) * bScale;
                        const bh = (el.height / 2) * bScale;

                        const fScale = 1 - (el.frontTaper || 0);
                        const fw = (el.width / 2) * fScale;
                        const fh = (el.height / 2) * fScale;
                        const fsX = (el.frontSkewX || 0) * el.width;
                        const fsY = (el.frontSkewY || 0) * el.height;

                        // Draw 9 handles
                        const handles = [
                            { x: centerX + dx, y: centerY + dy, type: 'depth' },   // Back Center
                            // Back Vertices
                            { x: centerX + dx - bw, y: centerY + dy - bh, type: 'bTL' },
                            { x: centerX + dx + bw, y: centerY + dy - bh, type: 'bTR' },
                            { x: centerX + dx + bw, y: centerY + dy + bh, type: 'bBR' },
                            { x: centerX + dx - bw, y: centerY + dy + bh, type: 'bBL' },
                            // Front Vertices
                            { x: centerX + fsX - fw, y: centerY + fsY - fh, type: 'fTL' },
                            { x: centerX + fsX + fw, y: centerY + fsY - fh, type: 'fTR' },
                            { x: centerX + fsX + fw, y: centerY + fsY + fh, type: 'fBR' },
                            { x: centerX + fsX - fw, y: centerY + fsY + fh, type: 'fBL' }
                        ];

                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.5 / scale;
                        for (const h of handles) {
                            if (h.type === 'depth') ctx.fillStyle = '#f59e0b'; // Amber
                            else if (h.type.startsWith('b')) ctx.fillStyle = '#3b82f6'; // Blue
                            else ctx.fillStyle = '#10b981'; // Green

                            ctx.beginPath();
                            ctx.arc(h.x, h.y, cpSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        }
                        return; // Already drawn handles
                    } else if (el.type === 'star' || el.type === 'burst') {
                        const ratio = (el.shapeRatio !== undefined ? el.shapeRatio : 25) / 100;
                        cx = el.x + el.width / 2;
                        cy = el.y + el.height * ratio;
                    }

                    ctx.fillStyle = '#f59e0b'; // Amber-500
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5 / scale;
                    ctx.beginPath();
                    // Diamond shape for 2D handle? Or just circle? Circle is fine.
                    ctx.arc(cx, cy, cpSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }

                // Selection-dependent UI (Control points, Connectors)
                if (store.selection.includes(el.id)) {
                    if ((el.type === 'line' || el.type === 'arrow' || el.type === 'bezier' || el.type === 'organicBranch') && el.controlPoints && store.selectedTool === 'selection') {
                        const cpSize = 10 / scale;
                        if (el.controlPoints.length === 1) {
                            const cp = el.controlPoints[0];
                            let start = { x: el.x, y: el.y };
                            let end = { x: el.x + el.width, y: el.y + el.height };
                            if (el.points && el.points.length >= 2) {
                                const pts = normalizePoints(el.points);
                                if (pts.length > 0) {
                                    start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
                                    end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
                                }
                            }

                            const curveX = 0.25 * start.x + 0.5 * cp.x + 0.25 * end.x;
                            const curveY = 0.25 * start.y + 0.5 * cp.y + 0.25 * end.y;

                            ctx.fillStyle = '#3b82f6';
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 1.5 / scale;
                            ctx.beginPath();
                            ctx.arc(curveX, curveY, cpSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        } else {
                            el.controlPoints.forEach((cp) => {
                                // Draw normal CP handles (Off-Curve)
                                ctx.fillStyle = '#3b82f6';
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 1.5 / scale;
                                ctx.beginPath();
                                ctx.arc(cp.x, cp.y, cpSize / 2, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            });
                        }
                    }

                    // Draw Connector Handles (Interactive connection points)
                    // Only for shapes, not lines/arrows, and only when selection tool is active
                    if (el.type !== 'line' && el.type !== 'arrow' && store.selectedTool === 'selection') {
                        const connectorSize = 14 / scale; // Slightly larger
                        const connectorOffset = 32 / scale; // Increased offset to clear mindmap toggle
                        const cx = el.x + el.width / 2;
                        const cy = el.y + el.height / 2;
                        const connectorHandles = [
                            { pos: 'top', x: cx, y: el.y - connectorOffset },
                            { pos: 'right', x: el.x + el.width + connectorOffset, y: cy },
                            { pos: 'bottom', x: cx, y: el.y + el.height + connectorOffset },
                            { pos: 'left', x: el.x - connectorOffset, y: cy }
                        ];

                        connectorHandles.forEach(ch => {
                            const isHovered = hoveredConnector && hoveredConnector.elementId === el.id && hoveredConnector.handle === `connector-${ch.pos}`;
                            const currentSize = isHovered ? connectorSize * 1.3 : connectorSize;

                            // Draw connecting line from shape to handle
                            ctx.strokeStyle = isHovered ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.4)';
                            ctx.lineWidth = (isHovered ? 2 : 1) / scale;
                            ctx.setLineDash([3 / scale, 3 / scale]);
                            ctx.beginPath();
                            if (ch.pos === 'top') {
                                ctx.moveTo(ch.x, el.y);
                                ctx.lineTo(ch.x, ch.y);
                            } else if (ch.pos === 'right') {
                                ctx.moveTo(el.x + el.width, ch.y);
                                ctx.lineTo(ch.x, ch.y);
                            } else if (ch.pos === 'bottom') {
                                ctx.moveTo(ch.x, el.y + el.height);
                                ctx.lineTo(ch.x, ch.y);
                            } else if (ch.pos === 'left') {
                                ctx.moveTo(el.x, ch.y);
                                ctx.lineTo(ch.x, ch.y);
                            }
                            ctx.stroke();
                            ctx.setLineDash([]);

                            // Draw connector circle with subtle glow
                            ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
                            ctx.shadowBlur = (isHovered ? 8 : 4) / scale;
                            ctx.fillStyle = isHovered ? '#059669' : '#10b981'; // Darker green on hover
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2 / scale;
                            ctx.beginPath();
                            ctx.arc(ch.x, ch.y, currentSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                            ctx.shadowBlur = 0;

                            // Draw outward-pointing arrow icon
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 1.8 / scale;
                            const arrowSize = currentSize * 0.25;
                            ctx.beginPath();
                            if (ch.pos === 'top') {
                                ctx.moveTo(ch.x - arrowSize, ch.y + arrowSize / 2);
                                ctx.lineTo(ch.x, ch.y - arrowSize / 2);
                                ctx.lineTo(ch.x + arrowSize, ch.y + arrowSize / 2);
                            } else if (ch.pos === 'right') {
                                ctx.moveTo(ch.x - arrowSize / 2, ch.y - arrowSize);
                                ctx.lineTo(ch.x + arrowSize / 2, ch.y);
                                ctx.lineTo(ch.x - arrowSize / 2, ch.y + arrowSize);
                            } else if (ch.pos === 'bottom') {
                                ctx.moveTo(ch.x - arrowSize, ch.y - arrowSize / 2);
                                ctx.lineTo(ch.x, ch.y + arrowSize / 2);
                                ctx.lineTo(ch.x + arrowSize, ch.y - arrowSize / 2);
                            } else if (ch.pos === 'left') {
                                ctx.moveTo(ch.x + arrowSize / 2, ch.y - arrowSize);
                                ctx.lineTo(ch.x - arrowSize / 2, ch.y);
                                ctx.lineTo(ch.x + arrowSize / 2, ch.y + arrowSize);
                            }
                            ctx.stroke();
                        });
                    }
                }

                // This ctx.restore() was for the main selection block, but that block is now split.
                // If there was an initial ctx.save() for the element, it should be here.
                // For now, it seems this restore was tied to the selection block's save.
                // Since the selection block now has its own save/restore, this one is removed.
                // If an element-level save/restore is needed, it should be added around the element rendering.
            });
        });

        // 3. Draw Multi-selection bounding box and handles
        if (store.selection.length > 1) {
            const box = getSelectionBoundingBox();
            if (box) {
                const scale = store.viewState.scale;
                const padding = 2 / scale;
                const handleSize = 8 / scale;

                ctx.save();
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 1 / scale;
                ctx.setLineDash([5 / scale, 5 / scale]);
                ctx.strokeRect(box.x - padding, box.y - padding, box.width + padding * 2, box.height + padding * 2);
                ctx.setLineDash([]);

                // Draw handles
                ctx.fillStyle = '#ffffff';
                ctx.lineWidth = 2 / scale;

                const handles = [
                    { x: box.x - padding, y: box.y - padding }, // TL
                    { x: box.x + box.width + padding, y: box.y - padding }, // TR
                    { x: box.x + box.width + padding, y: box.y + box.height + padding }, // BR
                    { x: box.x - padding, y: box.y + box.height + padding }, // BL
                    // Side Handles
                    { x: box.x + box.width / 2, y: box.y - padding }, // TM
                    { x: box.x + box.width + padding, y: box.y + box.height / 2 }, // RM
                    { x: box.x + box.width / 2, y: box.y + box.height + padding }, // BM
                    { x: box.x - padding, y: box.y + box.height / 2 } // LM
                ];

                handles.forEach(h => {
                    ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                    ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                });
                ctx.restore();
            }
        }

        // Draw Selection Box
        const box = selectionBox();
        if (box) {
            ctx.save();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / scale;
            // Box is in world coordinates?
            // Yes, startX/startY and pointer are world.
            // But context is translated/scaled!
            // So we draw directly using world coords.

            ctx.fillRect(box.x, box.y, box.w, box.h);
            ctx.strokeRect(box.x, box.y, box.w, box.h);
            ctx.restore();
        }

        // Draw Suggested Binding Highlight
        const binding = suggestedBinding();
        if (binding) {
            const target = store.elements.find(e => e.id === binding.elementId);
            if (target) {
                ctx.save();
                ctx.strokeStyle = '#f59e0b'; // Amber
                ctx.lineWidth = 2 / scale;
                ctx.strokeRect(target.x - 4 / scale, target.y - 4 / scale, target.width + 8 / scale, target.height + 8 / scale);

                // Draw Snap Point
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(binding.px, binding.py, 5 / scale, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        // Draw Snapping Guides
        const guides = snappingGuides();
        if (guides.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#ff00ff';
            ctx.setLineDash([5 / store.viewState.scale, 5 / store.viewState.scale]);
            ctx.lineWidth = 1 / store.viewState.scale;

            guides.forEach(g => {
                ctx.beginPath();
                if (g.type === 'vertical') {
                    ctx.moveTo(g.coordinate, -100000);
                    ctx.lineTo(g.coordinate, 100000);
                } else {
                    ctx.moveTo(-100000, g.coordinate);
                    ctx.lineTo(100000, g.coordinate);
                }
                ctx.stroke();
            });
            ctx.restore();
        }

        // Draw Spacing Guides
        const sGuides = spacingGuides();
        if (sGuides.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#ff00ff';
            ctx.fillStyle = '#ff00ff';
            ctx.lineWidth = 1 / store.viewState.scale;
            ctx.font = `${Math.floor(10 / store.viewState.scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            sGuides.forEach(g => {
                g.segments.forEach(seg => {
                    ctx.beginPath();
                    if (g.orientation === 'horizontal') {
                        // Drawing line with arrows
                        ctx.moveTo(seg.from, g.variableCoordinate);
                        ctx.lineTo(seg.to, g.variableCoordinate);
                        ctx.stroke();

                        // Short vertical ticks
                        const tickSize = 4 / store.viewState.scale;
                        ctx.beginPath();
                        ctx.moveTo(seg.from, g.variableCoordinate - tickSize);
                        ctx.lineTo(seg.from, g.variableCoordinate + tickSize);
                        ctx.moveTo(seg.to, g.variableCoordinate - tickSize);
                        ctx.lineTo(seg.to, g.variableCoordinate + tickSize);
                        ctx.stroke();

                        // Label
                        const midX = (seg.from + seg.to) / 2;
                        const label = Math.round(g.gap).toString();
                        const padding = 2 / store.viewState.scale;
                        const textW = ctx.measureText(label).width + padding * 4;
                        const textH = (12 / store.viewState.scale);

                        ctx.fillStyle = '#ff00ff';
                        ctx.fillRect(midX - textW / 2, g.variableCoordinate - textH / 2, textW, textH);
                        ctx.fillStyle = 'white';
                        ctx.fillText(label, midX, g.variableCoordinate);
                        ctx.fillStyle = '#ff00ff'; // Restore
                    } else {
                        // Vertical
                        ctx.beginPath();
                        ctx.moveTo(g.variableCoordinate, seg.from);
                        ctx.lineTo(g.variableCoordinate, seg.to);
                        ctx.stroke();

                        // Ticks
                        const tickSize = 4 / store.viewState.scale;
                        ctx.beginPath();
                        ctx.moveTo(g.variableCoordinate - tickSize, seg.from);
                        ctx.lineTo(g.variableCoordinate + tickSize, seg.from);
                        ctx.moveTo(g.variableCoordinate - tickSize, seg.to);
                        ctx.lineTo(g.variableCoordinate + tickSize, seg.to);
                        ctx.stroke();

                        // Label
                        const midY = (seg.from + seg.to) / 2;
                        const label = Math.round(g.gap).toString();
                        const padding = 2 / store.viewState.scale;
                        const textW = ctx.measureText(label).width + padding * 4;
                        const textH = (12 / store.viewState.scale);

                        ctx.fillStyle = '#ff00ff';
                        ctx.fillRect(g.variableCoordinate - textW / 2, midY - textH / 2, textW, textH);
                        ctx.fillStyle = 'white';
                        ctx.fillText(label, g.variableCoordinate, midY);
                        ctx.fillStyle = '#ff00ff'; // Restore
                    }
                });
            });
            ctx.restore();
        }

        // Render Connection Anchors (when drawing lines/arrows)
        if ((store.selectedTool === 'line' || store.selectedTool === 'arrow') && isDrawing && currentId) {
            const currentEl = store.elements.find(e => e.id === currentId);
            if (currentEl && (currentEl.type === 'line' || currentEl.type === 'arrow')) {
                const endX = currentEl.x + currentEl.width;
                const endY = currentEl.y + currentEl.height;

                // OPTIMIZATION: Show anchors only on very nearby shapes (reduced from 200px)
                const threshold = 50 / store.viewState.scale;
                const anchorSnapThreshold = 15 / store.viewState.scale;

                ctx.save();
                for (const element of store.elements) {
                    if (element.id === currentId) continue;
                    if (!canInteractWithElement(element)) continue;
                    if (element.type === 'line' || element.type === 'arrow' || element.type === 'bezier') continue;
                    if (element.layerId !== store.activeLayerId) continue;

                    const cx = element.x + element.width / 2;
                    const cy = element.y + element.height / 2;
                    const dist = Math.sqrt((cx - endX) ** 2 + (cy - endY) ** 2);

                    if (dist < threshold) {
                        const anchors = getAnchorPoints(element);

                        for (const anchor of anchors) {
                            const dx = anchor.x - endX;
                            const dy = anchor.y - endY;
                            const anchorDist = Math.sqrt(dx * dx + dy * dy);

                            const isHovered = anchorDist < anchorSnapThreshold;
                            const radius = isHovered ? (6 / store.viewState.scale) : (4 / store.viewState.scale);

                            ctx.beginPath();
                            ctx.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);

                            if (isHovered) {
                                ctx.fillStyle = '#3b82f6'; // Blue
                                ctx.fill();
                            } else {
                                ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'; // Semi-transparent blue
                                ctx.fill();
                                ctx.strokeStyle = '#3b82f6';
                                ctx.lineWidth = 1 / store.viewState.scale;
                                ctx.stroke();
                            }
                        }
                    }
                }
                ctx.restore();
            }
        }

        // --- Render Laser Trail (optimized: batch by opacity bands, no per-segment shadows) ---
        if (laserTrailData.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Single glow layer (cheaper than per-segment shadows)
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(255, 50, 50, 0.6)';

            // Batch segments into opacity bands for fewer state changes
            const baseWidth = 4 / store.viewState.scale;
            let currentOpacityBand = -1;

            for (let i = 0; i < laserTrailData.length - 1; i++) {
                const p1 = laserTrailData[i];
                const p2 = laserTrailData[i + 1];
                const age = now - p1.timestamp;
                const opacity = Math.max(0, 1 - age / LASER_DECAY_MS);

                if (opacity <= 0) continue;

                // Quantize opacity to bands (0.2, 0.4, 0.6, 0.8, 1.0) for batching
                const band = Math.ceil(opacity * 5);
                if (band !== currentOpacityBand) {
                    if (currentOpacityBand !== -1) ctx.stroke(); // Finish previous batch
                    currentOpacityBand = band;
                    const bandOpacity = band / 5;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 30, 30, ${bandOpacity})`;
                    ctx.lineWidth = baseWidth * bandOpacity;
                    ctx.moveTo(p1.x, p1.y);
                }
                ctx.lineTo(p2.x, p2.y);
            }
            if (currentOpacityBand !== -1) ctx.stroke(); // Finish last batch

            ctx.restore();
        }

        ctx.restore(); // Final global restore

        // OPTIMIZATION: Track rendering performance
        const drawTime = performance.now() - startTime;
        perfMonitor.measureFrame(drawTime, store.elements.length, totalRendered);
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
        // Note: laserTrailData is mutable (not reactive) for performance
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
            const testEl = animState ? { ...el, x: animState.x, y: animState.y, angle: animState.angle } : el;
            if (hitTestElement(testEl, x, y, threshold, elementMap)) {
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

    const getSelectionBoundingBox = () => {
        if (store.selection.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasElements = false;

        store.elements.forEach(el => {
            if (store.selection.includes(el.id)) {
                // For rotated elements, we technically need the rotated bounds, 
                // but usually multi-selection boxes are axis-aligned to the world.
                // However, we should consider the visual bounds.
                // For now, let's stick to axis-aligned world bounds.
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.width);
                maxY = Math.max(maxY, el.y + el.height);
                hasElements = true;
            }
        });

        if (!hasElements) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    };

    const getHandleAtPosition = (x: number, y: number) => {
        const { scale } = store.viewState;
        const handleSize = 12 / scale; // slightly larger hit area
        const padding = 2 / scale;

        // 1. Priority: Multi-selection handles
        if (store.selection.length > 1) {
            const box = getSelectionBoundingBox();
            if (box) {
                const handles = [
                    { type: 'tl', x: box.x - padding, y: box.y - padding },
                    { type: 'tr', x: box.x + box.width + padding, y: box.y - padding },
                    { type: 'br', x: box.x + box.width + padding, y: box.y + box.height + padding },
                    { type: 'bl', x: box.x - padding, y: box.y + box.height + padding },
                    { type: 'tm', x: box.x + box.width / 2, y: box.y - padding },
                    { type: 'rm', x: box.x + box.width + padding, y: box.y + box.height / 2 },
                    { type: 'bm', x: box.x + box.width / 2, y: box.y + box.height + padding },
                    { type: 'lm', x: box.x - padding, y: box.y + box.height / 2 }
                ];

                for (const h of handles) {
                    if (Math.abs(x - h.x) <= handleSize / 2 && Math.abs(y - h.y) <= handleSize / 2) {
                        return { id: 'multi', handle: h.type };
                    }
                }
            }
        }

        // 2. Mindmap Toggle Handles (Priority over element selection)
        for (let i = store.elements.length - 1; i >= 0; i--) {
            const el = store.elements[i];
            if (isElementHiddenByHierarchy(el, store.elements)) continue;

            const hasChildren = store.elements.some(e => e.parentId === el.id);
            if (hasChildren && el.type !== 'line' && el.type !== 'arrow') {
                const ecx = el.x + el.width / 2;
                const ecy = el.y + el.height / 2;
                const local = unrotatePoint(x, y, ecx, ecy, el.angle || 0);

                const toggleSize = 14 / scale;
                const tx = el.x + el.width + 15 / scale;
                const ty = el.y + el.height / 2;

                const dist = Math.sqrt(Math.pow(local.x - tx, 2) + Math.pow(local.y - ty, 2));
                if (dist <= (toggleSize / 2) + (5 / scale)) {
                    return { id: el.id, handle: 'mindmap-toggle' };
                }
            }
        }

        // 3. Single element handles
        for (let i = store.elements.length - 1; i >= 0; i--) {
            const el = store.elements[i];
            if (!store.selection.includes(el.id)) continue;
            // If part of multi-selection, we only allow individual handles if single selected? 
            // Usually if multi-selected, individual handles are hidden.
            if (store.selection.length > 1) continue;

            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const heading = el.angle || 0;

            // Transform mouse point to element's local system (unrotate)
            const local = unrotatePoint(x, y, cx, cy, heading);

            // Check corners and sides
            let handles = [
                { type: 'tl', x: el.x - padding, y: el.y - padding },
                { type: 'tr', x: el.x + el.width + padding, y: el.y - padding },
                { type: 'br', x: el.x + el.width + padding, y: el.y + el.height + padding },
                { type: 'bl', x: el.x - padding, y: el.y + el.height + padding },
                { type: 'tm', x: el.x + el.width / 2, y: el.y - padding },
                { type: 'rm', x: el.x + el.width + padding, y: el.y + el.height / 2 },
                { type: 'bm', x: el.x + el.width / 2, y: el.y + el.height + padding },
                { type: 'lm', x: el.x - padding, y: el.y + el.height / 2 }
            ];

            if (el.type === 'line' || el.type === 'arrow' || el.type === 'organicBranch') {
                let startX = el.x;
                let startY = el.y;
                let endX = el.x + el.width;
                let endY = el.y + el.height;

                // For organicBranch, use actual start/end points from points array
                if (el.type === 'organicBranch' && el.points && el.points.length >= 2) {
                    const pts = normalizePoints(el.points);
                    if (pts.length >= 2) {
                        startX = el.x + pts[0].x;
                        startY = el.y + pts[0].y;
                        endX = el.x + pts[pts.length - 1].x;
                        endY = el.y + pts[pts.length - 1].y;
                    }
                }

                handles = [
                    { type: 'tl', x: startX, y: startY },
                    { type: 'br', x: endX, y: endY }
                ];
            }

            for (const h of handles) {
                if (Math.abs(local.x - h.x) <= handleSize / 2 && Math.abs(local.y - h.y) <= handleSize / 2) {
                    return { id: el.id, handle: h.type };
                }
            }

            // Check Rotate Handle
            const rotH = { x: el.x + el.width / 2, y: el.y - padding - 20 / scale };
            if (Math.abs(local.x - rotH.x) <= handleSize && Math.abs(local.y - rotH.y) <= handleSize / 2) {
                return { id: el.id, handle: 'rotate' };
            }

            // Custom Control Handles (Star, Burst, Isometric Cube, Solid Block)
            if (el.type === 'isometricCube') {
                const shapeRatio = (el.shapeRatio !== undefined ? el.shapeRatio : 25) / 100;
                const sideRatio = (el.sideRatio !== undefined ? el.sideRatio : 50) / 100;

                // Calculate handle position (Center Vertex)
                const faceHeight = el.height * shapeRatio;
                const cy = el.y + faceHeight;
                const cx = el.x + el.width * sideRatio;

                if (Math.abs(local.x - cx) <= handleSize && Math.abs(local.y - cy) <= handleSize) {
                    return { id: el.id, handle: 'control-1' };
                }
            } else if (el.type === 'solidBlock' || el.type === 'cylinder') {
                const depth = el.depth !== undefined ? el.depth : 50;
                const angle = (el.viewAngle !== undefined ? el.viewAngle : 45) * Math.PI / 180;

                const centerX = el.x + el.width / 2;
                const centerY = el.y + el.height / 2;

                const cx = centerX + depth * Math.cos(angle);
                const cy = centerY + depth * Math.sin(angle);

                if (Math.abs(local.x - cx) <= handleSize && Math.abs(local.y - cy) <= handleSize) {
                    return { id: el.id, handle: 'control-1' };
                }
            } else if (el.type === 'perspectiveBlock') {
                const depth = el.depth !== undefined ? el.depth : 50;
                const angle = (el.viewAngle !== undefined ? el.viewAngle : 45) * Math.PI / 180;
                const taper = el.taper !== undefined ? el.taper : 0;
                const skewX = (el.skewX !== undefined ? el.skewX : 0) * el.width;
                const skewY = (el.skewY !== undefined ? el.skewY : 0) * el.height;

                const centerX = el.x + el.width / 2;
                const centerY = el.y + el.height / 2;

                const dx = depth * Math.cos(angle) + skewX;
                const dy = depth * Math.sin(angle) + skewY;

                const scale = 1 - taper;
                const bw = (el.width / 2) * scale;
                const bh = (el.height / 2) * scale;

                const fScale = 1 - (el.frontTaper || 0);
                const fw = (el.width / 2) * fScale;
                const fh = (el.height / 2) * fScale;
                const fsX = (el.frontSkewX || 0) * el.width;
                const fsY = (el.frontSkewY || 0) * el.height;

                const handles = [
                    { x: centerX + dx, y: centerY + dy, handle: 'control-1' },   // Back Center
                    // Back Vertices
                    { x: centerX + dx - bw, y: centerY + dy - bh, handle: 'control-2' },
                    { x: centerX + dx + bw, y: centerY + dy - bh, handle: 'control-3' },
                    { x: centerX + dx + bw, y: centerY + dy + bh, handle: 'control-4' },
                    { x: centerX + dx - bw, y: centerY + dy + bh, handle: 'control-5' },
                    // Front Vertices
                    { x: centerX + fsX - fw, y: centerY + fsY - fh, handle: 'control-6' },
                    { x: centerX + fsX + fw, y: centerY + fsY - fh, handle: 'control-7' },
                    { x: centerX + fsX + fw, y: centerY + fsY + fh, handle: 'control-8' },
                    { x: centerX + fsX - fw, y: centerY + fsY + fh, handle: 'control-9' }
                ];

                for (const h of handles) {
                    if (Math.abs(local.x - h.x) <= handleSize && Math.abs(local.y - h.y) <= handleSize) {
                        return { id: el.id, handle: h.handle };
                    }
                }
            } else if (el.type === 'star' || el.type === 'burst') {
                const ratio = (el.shapeRatio !== undefined ? el.shapeRatio : 25) / 100;
                const cx = el.x + el.width / 2;
                const cy = el.y + el.height * ratio; // Simple approx for top inner point? 

                // Actually star logic usually puts handle at inner radius top position
                // For now let's assume it's just a vertical slider handle relative to bounds
                if (Math.abs(local.x - cx) <= handleSize && Math.abs(local.y - cy) <= handleSize) {
                    return { id: el.id, handle: 'control-1' };
                }
            }

            // Check Control Points for Bezier/SmartElbow
            if ((el.type === 'line' || el.type === 'arrow' || el.type === 'bezier' || el.type === 'organicBranch') && el.controlPoints) {
                if (el.controlPoints.length === 1) {
                    const cp = el.controlPoints[0];
                    let start = { x: el.x, y: el.y };
                    let end = { x: el.x + el.width, y: el.y + el.height };
                    if (el.points && el.points.length >= 2) {
                        const pts = normalizePoints(el.points);
                        if (pts.length > 0) {
                            start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
                            end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
                        }
                    }

                    const curveX = 0.25 * start.x + 0.5 * cp.x + 0.25 * end.x;
                    const curveY = 0.25 * start.y + 0.5 * cp.y + 0.25 * end.y;

                    if (Math.abs(x - curveX) <= handleSize / 2 && Math.abs(y - curveY) <= handleSize / 2) {
                        return { id: el.id, handle: `control-0` };
                    }
                } else {
                    for (let i = 0; i < el.controlPoints.length; i++) {
                        const cp = el.controlPoints[i];
                        // Control points might be in absolute coordinates, so use world x/y
                        if (Math.abs(x - cp.x) <= handleSize / 2 && Math.abs(y - cp.y) <= handleSize / 2) {
                            return { id: el.id, handle: `control-${i}` };
                        }
                    }
                }
            }

            // Check Connector Handles (only for non-line/arrow shapes)
            if (el.type !== 'line' && el.type !== 'arrow') {
                const connectorSize = 14 / scale;
                const connectorOffset = 32 / scale;
                const ecx = el.x + el.width / 2;
                const ecy = el.y + el.height / 2;
                const connectorHandles = [
                    { type: 'connector-top', x: ecx, y: el.y - connectorOffset },
                    { type: 'connector-right', x: el.x + el.width + connectorOffset, y: ecy },
                    { type: 'connector-bottom', x: ecx, y: el.y + el.height + connectorOffset },
                    { type: 'connector-left', x: el.x - connectorOffset, y: ecy }
                ];

                for (const ch of connectorHandles) {
                    const dist = Math.sqrt(Math.pow(local.x - ch.x, 2) + Math.pow(local.y - ch.y, 2));
                    if (dist <= connectorSize / 2 + 2 / scale) { // Small tolerance
                        return { id: el.id, handle: ch.type };
                    }
                }
            }
        }
        return null;
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


    const hitTestElement = (el: DrawingElement, x: number, y: number, threshold: number, elementMap?: Map<string, DrawingElement>): boolean => {
        if (isElementHiddenByHierarchy(el, store.elements, elementMap)) return false;
        // Transform point to local non-rotated space
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const p = unrotatePoint(x, y, cx, cy, el.angle || 0);

        // Check if inside bounding box (broad phase)
        // Normalize bounds to handle negative width/height
        let x1 = Math.min(el.x, el.x + el.width);
        let x2 = Math.max(el.x, el.x + el.width);
        let y1 = Math.min(el.y, el.y + el.height);
        let y2 = Math.max(el.y, el.y + el.height);

        // Adjust broad-phase for extruding shapes
        if (el.type === 'solidBlock') {
            const depth = el.depth !== undefined ? el.depth : 50;
            const angle = (el.viewAngle !== undefined ? el.viewAngle : 45) * Math.PI / 180;
            const dx = depth * Math.cos(angle);
            const dy = depth * Math.sin(angle);
            x1 = Math.min(x1, x1 + dx, x2 + dx);
            x2 = Math.max(x2, x1 + dx, x2 + dx);
            y1 = Math.min(y1, y1 + dy, y2 + dy);
            y2 = Math.max(y2, y1 + dy, y2 + dy);
        } else if (el.type === 'perspectiveBlock') {
            const depth = el.depth !== undefined ? el.depth : 50;
            const angle = (el.viewAngle !== undefined ? el.viewAngle : 45) * Math.PI / 180;
            const skewX = (el.skewX || 0) * el.width;
            const skewY = (el.skewY || 0) * el.height;
            const dx = depth * Math.cos(angle) + skewX;
            const dy = depth * Math.sin(angle) + skewY;
            const taper = el.taper || 0;
            const bw = (el.width / 2) * (1 - taper);
            const bh = (el.height / 2) * (1 - taper);
            const centerX = el.x + el.width / 2;
            const centerY = el.y + el.height / 2;
            const bX1 = centerX + dx - bw;
            const bX2 = centerX + dx + bw;
            const bY1 = centerY + dy - bh;
            const bY2 = centerY + dy + bh;

            x1 = Math.min(x1, bX1, bX2);
            x2 = Math.max(x2, bX1, bX2);
            y1 = Math.min(y1, bY1, bY2);
            y2 = Math.max(y2, bY1, bY2);
        }

        if (p.x < x1 - threshold || p.x > x2 + threshold ||
            p.y < y1 - threshold || p.y > y2 + threshold) {
            return false;
        }

        if (el.type === 'rectangle' || el.type === 'solidBlock' || el.type === 'isometricCube' || el.type === 'perspectiveBlock') {
            // Check if inside expanded bounding box (passed broad-phase check above)
            return true;
        } else if (el.type === 'diamond') {
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const dx = Math.abs(p.x - cx);
            const dy = Math.abs(p.y - cy);
            // Diamond equation: |dx|/(w/2) + |dy|/(h/2) <= 1
            // 2*dx/w + 2*dy/h <= 1
            return (2 * dx / el.width) + (2 * dy / el.height) <= 1;
        } else if (el.type === 'circle') {
            return isPointInEllipse(p, el.x, el.y, el.width, el.height, threshold);
        } else if (el.type === 'line' || el.type === 'arrow') {
            const endX = el.x + el.width;
            const endY = el.y + el.height;

            if (el.curveType === 'bezier') {
                const w = el.width;
                const h = el.height;
                let cp1 = { x: el.x, y: el.y };
                let cp2 = { x: endX, y: endY };

                if (el.controlPoints && el.controlPoints.length > 0) {
                    const p0 = { x: el.x, y: el.y };
                    const p2 = { x: endX, y: endY };

                    if (el.controlPoints.length === 2) {
                        // Cubic Bezier with 2 explicit control points
                        return isPointOnBezier(p, p0, el.controlPoints[0], el.controlPoints[1], p2, threshold);
                    } else {
                        // Quadratic Bezier (1 control point) approximated as Cubic for hit test
                        const cp = el.controlPoints[0];
                        const cp1Cube = {
                            x: p0.x + (2 / 3) * (cp.x - p0.x),
                            y: p0.y + (2 / 3) * (cp.y - p0.y)
                        };
                        const cp2Cube = {
                            x: p2.x + (2 / 3) * (cp.x - p2.x),
                            y: p2.y + (2 / 3) * (cp.y - p2.y)
                        };
                        return isPointOnBezier(p, p0, cp1Cube, cp2Cube, p2, threshold);
                    }

                } else if (Math.abs(w) > Math.abs(h)) {
                    cp1 = { x: el.x + w / 2, y: el.y };
                    cp2 = { x: endX - w / 2, y: endY };
                    return isPointOnBezier(p, { x: el.x, y: el.y }, cp1, cp2, { x: endX, y: endY }, threshold);
                } else {
                    cp1 = { x: el.x, y: el.y + h / 2 };
                    cp2 = { x: endX, y: endY - h / 2 };
                    return isPointOnBezier(p, { x: el.x, y: el.y }, cp1, cp2, { x: endX, y: endY }, threshold);
                }
            } else if (el.curveType === 'elbow') {
                const pts = normalizePoints(el.points);
                if (pts && pts.length > 0) {
                    const localP = { x: p.x - el.x, y: p.y - el.y };
                    return isPointOnPolyline(localP, pts, threshold);
                } else {
                    // Fallback to simple line
                    return distanceToSegment(p, { x: el.x, y: el.y }, { x: endX, y: endY }) <= threshold;
                }
            } else {
                // Line (Straight)
                // If points exist, check polyline (e.g. for manually adjusted straight lines if that becomes a thing)
                if (el.points && el.points.length > 0) {
                    const pts = normalizePoints(el.points);
                    if (pts.length > 1) { // Need at least 2 points
                        const localP = { x: p.x - el.x, y: p.y - el.y };
                        return isPointOnPolyline(localP, pts, threshold);
                    }
                }
                return distanceToSegment(p, { x: el.x, y: el.y }, { x: el.x + el.width, y: el.y + el.height }) <= threshold;
            }
        } else if (el.type === 'fineliner' || el.type === 'marker' || el.type === 'inkbrush' || el.type === 'ink') {
            const pts = normalizePoints(el.points);
            if (pts.length > 0) {
                const localP = { x: p.x - el.x, y: p.y - el.y };
                return isPointOnPolyline(localP, pts, threshold + (el.strokeWidth || 0) / 2);
            }
            return false;
        } else if (el.type === 'organicBranch') {
            const pts = normalizePoints(el.points);
            const controls = el.controlPoints || [];
            if (pts.length < 2 || controls.length < 2) return false;

            const start = { x: el.x + pts[0].x, y: el.y + pts[0].y };
            const end = { x: el.x + pts[pts.length - 1].x, y: el.y + pts[pts.length - 1].y };
            const polygon = getOrganicBranchPolygon(start, end, controls[0], controls[1], el.strokeWidth);

            return isPointInPolygon(p, polygon);
        } else if (el.type === 'text' || el.type === 'image') {
            return true; // Box check passed
        } else if (
            el.type === 'triangle' || el.type === 'hexagon' || el.type === 'octagon' ||
            el.type === 'parallelogram' || el.type === 'star' || el.type === 'cloud' ||
            el.type === 'heart' || el.type === 'cross' || el.type === 'checkmark' ||
            el.type === 'arrowLeft' || el.type === 'arrowRight' || el.type === 'arrowUp' || el.type === 'arrowDown' ||
            el.type === 'capsule' || el.type === 'stickyNote' || el.type === 'callout' ||
            el.type === 'burst' || el.type === 'speechBubble' || el.type === 'ribbon' ||
            el.type === 'bracketLeft' || el.type === 'bracketRight' ||
            el.type === 'database' || el.type === 'document' || el.type === 'predefinedProcess' || el.type === 'internalStorage' ||
            el.type === 'server' || el.type === 'loadBalancer' || el.type === 'firewall' ||
            el.type === 'user' || el.type === 'messageQueue' || el.type === 'lambda' ||
            el.type === 'router' || el.type === 'browser' ||
            el.type === 'trapezoid' || el.type === 'rightTriangle' || el.type === 'pentagon' || el.type === 'septagon' ||
            el.type === 'starPerson' || el.type === 'scroll' || el.type === 'wavyDivider' ||
            el.type === 'doubleBanner' || el.type === 'lightbulb' || el.type === 'signpost' ||
            el.type === 'burstBlob' || el.type === 'browserWindow' || el.type === 'mobilePhone' ||
            el.type === 'ghostButton' || el.type === 'inputField' || el.type === 'polygon' ||
            el.type === 'dfdProcess' || el.type === 'dfdDataStore' ||
            el.type === 'cylinder' || el.type === 'stateStart' || el.type === 'stateEnd' ||
            el.type === 'stateSync' || el.type === 'activationBar' || el.type === 'externalEntity' ||
            el.type === 'umlClass' || el.type === 'umlInterface' || el.type === 'umlActor' ||
            el.type === 'umlUseCase' || el.type === 'umlNote' || el.type === 'umlPackage' ||
            el.type === 'umlComponent' || el.type === 'umlState' || el.type === 'umlLifeline' ||
            el.type === 'umlFragment' || el.type === 'umlSignalSend' || el.type === 'umlSignalReceive' ||
            el.type === 'umlProvidedInterface' || el.type === 'umlRequiredInterface'
        ) {
            // For these shapes, rely on bounding box hit test (passed above)
            // or implement detailed geometry check if needed
            return true;

        }

        return false;
    };

    const canInteractWithElement = (el: DrawingElement): boolean => {
        if (el.locked) return false;
        return !isLayerLocked(el.layerId);
    };

    // Helper: Binding Check
    const checkBinding = (x: number, y: number, excludeId: string) => {
        const threshold = 40 / store.viewState.scale;
        const anchorSnapThreshold = 25 / store.viewState.scale; // Increased to include handle area (usually 18px away)
        let bindingHit = null;

        for (const target of store.elements) {
            if (target.id === excludeId) continue;
            if (!canInteractWithElement(target)) continue;
            if (target.type === 'line' || target.type === 'arrow' || target.type === 'bezier' || target.type === 'organicBranch') continue;

            const activeLayer = store.layers.find(l => l.id === store.activeLayerId);
            if (!activeLayer) continue;
            if (target.layerId !== activeLayer.id) continue;

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
            } else if (target.type === 'diamond') {
                if (x >= target.x - threshold && x <= target.x + target.width + threshold &&
                    y >= target.y - threshold && y <= target.y + target.height + threshold) {
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
            // **ENHANCEMENT**: Try anchor snap first
            const closestAnchor = findClosestAnchor(bindingHit, { x, y }, anchorSnapThreshold);
            if (closestAnchor) {
                return { element: bindingHit, snapPoint: { x: closestAnchor.x, y: closestAnchor.y }, position: closestAnchor.position };
            }

            // Fallback to existing edge intersection logic
            const snapPoint = intersectElementWithLine(bindingHit, { x, y }, 5);
            if (snapPoint) {
                return { element: bindingHit, snapPoint, position: 'edge' };
            }
        }
        return null;
    };

    const refreshLinePoints = (line: DrawingElement, overrideStartX?: number, overrideStartY?: number, overrideEndX?: number, overrideEndY?: number) => {
        const sx = overrideStartX ?? line.x;
        const sy = overrideStartY ?? line.y;
        const ex = overrideEndX ?? (line.x + line.width);
        const ey = overrideEndY ?? (line.y + line.height);

        if (line.curveType === 'elbow') {
            const startEl = store.elements.find(e => e.id === line.startBinding?.elementId);
            const endEl = store.elements.find(e => e.id === line.endBinding?.elementId);

            const rawPoints = calculateSmartElbowRoute(
                { x: sx, y: sy },
                { x: ex, y: ey },
                store.elements,
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
    };

    const refreshBoundLine = (lineId: string) => {
        const line = store.elements.find(l => l.id === lineId);
        if (!line || (line.type !== 'line' && line.type !== 'arrow' && line.type !== 'organicBranch' && line.type !== 'bezier')) return;

        let sX = line.x;
        let sY = line.y;
        let eX = line.x + line.width;
        let eY = line.y + line.height;
        let changed = false;

        const startEl = line.startBinding ? store.elements.find(e => e.id === line.startBinding?.elementId) : null;
        const endEl = line.endBinding ? store.elements.find(e => e.id === line.endBinding?.elementId) : null;

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
                updateElement(line.id, {
                    startBinding: { ...line.startBinding!, position: idealStartPos as any },
                    endBinding: { ...line.endBinding!, position: idealEndPos as any }
                }, false);
                // Re-fetch to get updated positions
                return refreshBoundLine(lineId);
            }
        }

        if (line.startBinding) {
            const el = startEl || store.elements.find(e => e.id === line.startBinding!.elementId);
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
            const el = endEl || store.elements.find(e => e.id === line.endBinding!.elementId);
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
            const points = refreshLinePoints(line, sX, sY, eX, eY);
            if (sX !== line.x || sY !== line.y || (eX - sX) !== line.width || (eY - sY) !== line.height || JSON.stringify(points) !== JSON.stringify(line.points)) {

                const updates: any = {
                    x: sX,
                    y: sY,
                    width: eX - sX,
                    height: eY - sY,
                    points
                };

                // For organicBranch or bezier, we must update control points to follow the start/end moves
                const hasControlPoints = line.controlPoints && line.controlPoints.length === 2;
                if (hasControlPoints) {
                    const dSX = sX - line.x;
                    const dSY = sY - line.y;
                    // End point logic: eX/eY are absolute bottom-right coordinates
                    // Old eX = line.x + line.width
                    const dEX = eX - (line.x + line.width);
                    const dEY = eY - (line.y + line.height);

                    const cp1 = { x: line.controlPoints![0].x + dSX, y: line.controlPoints![0].y + dSY };
                    const cp2 = { x: line.controlPoints![1].x + dEX, y: line.controlPoints![1].y + dEY };
                    updates.controlPoints = [cp1, cp2];
                }

                updateElement(line.id, updates, false);
            }
        }
    };

    const handlePointerDown = (e: PointerEvent) => {
        // Presentation Mode Logic
        if (store.appMode === 'presentation') {
            const isNavTool = store.selectedTool === 'selection' || store.selectedTool === 'pan';

            if (store.docType === 'slides') {
                if (isNavTool) {
                    // Only advance if left click and not on a control
                    if (e.button === 0) {
                        advancePresentation();
                    }
                    return;
                }
                // If it's a presentation tool (laser, ink, eraser), continue to standard drawing logic
            } else {
                // For infinite mode, allow panning if left click or middle click
                if (e.button === 0 || e.button === 1) {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    (e.currentTarget as Element).setPointerCapture(e.pointerId);
                    return;
                }
            }
        }
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);

        if (editingId()) {
            commitText();
            return;
        }



        if (store.selectedTool === 'selection') {
            const hitHandle = getHandleAtPosition(x, y);
            if (hitHandle) {
                // Mindmap toggle logic
                if (hitHandle.handle === 'mindmap-toggle') {
                    toggleCollapse(hitHandle.id);
                    return;
                }

                // Check if it's a connector handle
                if (hitHandle.handle.startsWith('connector-')) {
                    const sourceEl = store.elements.find(e => e.id === hitHandle.id);
                    if (sourceEl) {
                        // Get the anchor position from the connector handle type
                        const anchorPosition = hitHandle.handle.replace('connector-', '');
                        const ecx = sourceEl.x + sourceEl.width / 2;
                        const ecy = sourceEl.y + sourceEl.height / 2;

                        let anchorX: number, anchorY: number;
                        switch (anchorPosition) {
                            case 'top':
                                anchorX = ecx;
                                anchorY = sourceEl.y;
                                break;
                            case 'right':
                                anchorX = sourceEl.x + sourceEl.width;
                                anchorY = ecy;
                                break;
                            case 'bottom':
                                anchorX = ecx;
                                anchorY = sourceEl.y + sourceEl.height;
                                break;
                            case 'left':
                                anchorX = sourceEl.x;
                                anchorY = ecy;
                                break;
                            default:
                                anchorX = ecx;
                                anchorY = ecy;
                        }

                        // Start drawing an arrow from this anchor
                        pushToHistory();
                        isDrawing = true;
                        startX = anchorX;
                        startY = anchorY;
                        startX = anchorX;
                        startY = anchorY;
                        currentId = generateId('arrow');

                        // Store connector drag state
                        draggingFromConnector = {
                            elementId: sourceEl.id,
                            anchorPosition,
                            startX: anchorX,
                            startY: anchorY
                        };

                        const newElement = {
                            ...store.defaultElementStyles,
                            id: currentId,
                            type: 'arrow',
                            x: anchorX,
                            y: anchorY,
                            width: 0,
                            height: 0,
                            seed: Math.floor(Math.random() * 2 ** 31),
                            layerId: store.activeLayerId,
                            curveType: store.defaultElementStyles.curveType || 'straight',
                            startBinding: { elementId: sourceEl.id, focus: 0, gap: 5, position: anchorPosition }
                        } as DrawingElement;

                        addElement(newElement);

                        // Update source element's boundElements
                        const existing = sourceEl.boundElements || [];
                        updateElement(sourceEl.id, { boundElements: [...existing, { id: currentId, type: 'arrow' }] });

                        return;
                    }
                }

                pushToHistory();
                isDragging = true;
                draggingHandle = hitHandle.handle;
                startX = x;
                startY = y;

                if (hitHandle.id === 'multi') {
                    const box = getSelectionBoundingBox();
                    if (box) {
                        initialElementX = box.x;
                        initialElementY = box.y;
                        initialElementWidth = box.width;
                        initialElementHeight = box.height;

                        initialPositions.clear();
                        const toCapture = new Set(store.selection);

                        // Add descendants to capture list
                        store.selection.forEach(selId => {
                            getDescendants(selId, store.elements).forEach(d => toCapture.add(d.id));
                        });

                        store.elements.forEach(el => {
                            if (toCapture.has(el.id)) {
                                initialPositions.set(el.id, {
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
                        initialElementX = el.x;
                        initialElementY = el.y;
                        initialElementWidth = el.width;
                        initialElementHeight = el.height;
                        initialElementFontSize = el.fontSize || 28;

                        // Capture initial position for the single element to support point scaling
                        initialPositions.clear();
                        initialPositions.set(el.id, {
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
            // This makes grouped elements (like Block Text) easier to select
            const sortedGroups = getGroupsSortedByPriority(store.elements, store.layers);

            for (const { groupId } of sortedGroups) {
                // Check if any element in this group is on a visible, unlocked layer
                const groupElements = store.elements.filter(el =>
                    el.groupIds && el.groupIds.includes(groupId)
                );

                // Skip if all elements are locked or on locked/invisible layers
                const hasInteractableElement = groupElements.some(el =>
                    canInteractWithElement(el) && isLayerVisible(el.layerId)
                );

                if (!hasInteractableElement) continue;

                // Check if point is within group bounds
                if (isPointInGroupBounds(x, y, groupId, store.elements)) {
                    // Select all elements in this group
                    const idsToSelect = groupElements.map(el => el.id);

                    const isAllSelected = idsToSelect.every(id => store.selection.includes(id));

                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        if (isAllSelected) {
                            // Toggle off
                            setStore('selection', s => s.filter(id => !idsToSelect.includes(id)));
                        } else {
                            // Toggle on
                            setStore('selection', s => [...new Set([...s, ...idsToSelect])]);
                        }
                    } else {
                        if (!isAllSelected) {
                            setStore('selection', idsToSelect);
                        }
                    }

                    // Initialize Move
                    if (store.selection.length > 0) {
                        pushToHistory();
                        isDragging = true;
                        draggingHandle = null;
                        startX = x;
                        startY = y;

                        // Capture initial positions for ALL selected elements and their descendants
                        initialPositions.clear();
                        const idsToMove = new Set<string>(store.selection);

                        // Include descendants in the move set
                        store.selection.forEach(id => {
                            getDescendants(id, store.elements).forEach(d => idsToMove.add(d.id));
                        });

                        store.elements.forEach(el => {
                            if (idsToMove.has(el.id)) {
                                initialPositions.set(el.id, {
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

                    return; // Group hit detected, stop processing
                }
            }

            const elementMap = new Map<string, DrawingElement>();
            for (const el of store.elements) elementMap.set(el.id, el);

            const sortedElements = store.elements.map((el, index) => {
                const layer = store.layers.find(l => l.id === el.layerId);
                return { el, index, layerOrder: layer?.order ?? 999, layerVisible: isLayerVisible(el.layerId) };
            }).sort((a, b) => {
                if (a.layerOrder !== b.layerOrder) return b.layerOrder - a.layerOrder; // Descending
                return b.index - a.index; // Descending
            });

            // Hit Testing must respect Animation
            const currentTime = (window as any).yappyGlobalTime || 0;
            const shouldAnimate = store.appMode === 'presentation' || store.isPreviewing;
            const animatedStates = calculateAllAnimatedStates(store.elements, currentTime, shouldAnimate);

            for (const { el, layerVisible } of sortedElements) {
                // Skip invisible layers
                if (!layerVisible) continue;

                // Skip elements on locked layers or locked elements
                if (!canInteractWithElement(el)) continue;

                const animState = animatedStates.get(el.id);
                const testEl = animState ? {
                    ...el,
                    x: animState.x,
                    y: animState.y,
                    angle: animState.angle
                } : el;

                if (hitTestElement(testEl, x, y, threshold, elementMap)) {
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
                        // Toggle off
                        setStore('selection', s => s.filter(id => !idsToSelect.includes(id)));
                    } else {
                        // Toggle on
                        setStore('selection', s => [...new Set([...s, ...idsToSelect])]);
                    }
                } else {
                    if (!isAllSelected) {
                        setStore('selection', idsToSelect);
                    }
                }

                // Initialize Move (if there is selection)
                if (store.selection.length > 0) {
                    pushToHistory();
                    isDragging = true;
                    draggingHandle = null;
                    startX = x;
                    startY = y;

                    // Capture initial positions for ALL selected elements and their descendants
                    initialPositions.clear();
                    const idsToMove = new Set<string>(store.selection);

                    // Include descendants in the move set
                    store.selection.forEach(id => {
                        getDescendants(id, store.elements).forEach(d => idsToMove.add(d.id));
                    });

                    store.elements.forEach(el => {
                        if (idsToMove.has(el.id)) {
                            initialPositions.set(el.id, {
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
            } else {
                // Clicked empty space - Check if hit selection bounding box
                if (store.selection.length > 0) {
                    const box = getSelectionBoundingBox();
                    if (box) {
                        const threshold = 10 / store.viewState.scale;
                        if (x >= box.x - threshold && x <= box.x + box.width + threshold &&
                            y >= box.y - threshold && y <= box.y + box.height + threshold) {

                            pushToHistory();
                            isDragging = true;
                            draggingHandle = null;
                            startX = x;
                            startY = y;

                            initialPositions.clear();
                            store.elements.forEach(el => {
                                if (store.selection.includes(el.id)) {
                                    initialPositions.set(el.id, {
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
                    setShowCanvasProperties(false); // Hide canvas properties on click away
                }
                // Start Selection Box
                isSelecting = true;
                startX = x;
                startY = y;
                setSelectionBox({ x, y, w: 0, h: 0 });
            }
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

        if (store.selectedTool === 'text') {
            const id = generateId('text');
            const newElement = {
                ...store.defaultElementStyles,
                id,
                type: 'text',
                x,
                y,
                width: 100,
                height: 30,
                text: '',
                layerId: store.activeLayerId
            } as DrawingElement;
            addElement(newElement);
            setEditingId(id);
            setEditText("");
            setTimeout(() => textInputRef?.focus(), 0);
            return;
        }

        if (store.selectedTool === 'laser') {
            isDrawing = true;
            laserTrailData = [{ x, y, timestamp: Date.now() }];
            lastLaserUpdateTime = Date.now();
            return;
        }

        if (store.selectedTool === 'ink') {
            isDrawing = true;
            startX = x;
            startY = y;
            currentId = generateId('ink');
            const newElement = {
                ...store.defaultElementStyles,
                id: currentId,
                type: 'ink',
                x,
                y,
                width: 0,
                height: 0,
                strokeColor: '#ef4444', // Bright red
                strokeWidth: 4,
                opacity: 100,
                points: [0, 0],
                pointsEncoding: 'flat',
                ttl: Date.now() + 3000, // 3 seconds
                layerId: store.activeLayerId,
                seed: Math.floor(Math.random() * 2 ** 31)
            } as DrawingElement;
            addElement(newElement);
            return;
        }

        if (store.selectedTool === 'eraser') {
            isDrawing = true; // Enable drag
            const threshold = 10 / store.viewState.scale;
            const elementMap = new Map<string, DrawingElement>();
            for (const el of store.elements) elementMap.set(el.id, el);

            for (let i = store.elements.length - 1; i >= 0; i--) {
                const el = store.elements[i];
                if (!canInteractWithElement(el)) continue;
                if (!isLayerVisible(el.layerId)) continue;
                if (hitTestElement(el, x, y, threshold, elementMap)) {
                    deleteElements([el.id]);
                }
            }
            return;
        }

        if (store.selectedTool === 'pan') {
            isDragging = true;
            setCursor('grabbing');
            return;
        }

        isDrawing = true;

        // Clear pen buffer for new stroke
        penPointsBuffer = [];
        lastPenUpdateTime = 0;

        // Snap start position if enabled
        let creationX = x;
        let creationY = y;
        if (store.gridSettings.snapToGrid) {
            const snapped = snapPoint(x, y, store.gridSettings.gridSize);
            creationX = snapped.x;
            creationY = snapped.y;
        }

        startX = creationX;
        startY = creationY;
        currentId = generateId(store.selectedTool);

        const tool = store.selectedTool;
        const actualType = tool === 'bezier' ? 'line' : tool;
        const actualCurveType = (tool === 'bezier' || tool === 'organicBranch') ? 'bezier' : (store.defaultElementStyles.curveType || 'straight');

        // Check for start binding at creation time (source connection fix)
        let startBindingData: { elementId: string; focus: number; gap: number; position?: string } | undefined;
        let snappedStartX = creationX;
        let snappedStartY = creationY;

        if (tool === 'line' || tool === 'arrow' || tool === 'bezier' || tool === 'organicBranch') {
            const match = checkBinding(creationX, creationY, currentId);
            if (match) {
                startBindingData = {
                    elementId: match.element.id,
                    focus: 0,
                    gap: 5,
                    position: match.position
                };
                snappedStartX = match.snapPoint.x;
                snappedStartY = match.snapPoint.y;
                startX = snappedStartX;
                startY = snappedStartY;
            }
        }

        const newElement = {
            ...store.defaultElementStyles,
            id: currentId,
            type: actualType,
            x: snappedStartX,
            y: snappedStartY,
            width: 0,
            height: 0,
            seed: Math.floor(Math.random() * 2 ** 31) + 1,
            layerId: store.activeLayerId,
            curveType: actualCurveType as 'straight' | 'bezier' | 'elbow',
            points: (tool === 'fineliner' || tool === 'inkbrush' || tool === 'marker') ? [0, 0] : undefined,
            pointsEncoding: (tool === 'fineliner' || tool === 'inkbrush' || tool === 'marker') ? 'flat' : undefined,
            startBinding: startBindingData,
            // Ensure geometric shapes default to solid stroke unless explicitly changed
            strokeStyle: (['rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'pentagon', 'septagon', 'star', 'cloud', 'heart', 'capsule', 'stickyNote', 'callout', 'speechBubble', 'database', 'document', 'cylinder', 'isometricCube', 'solidBlock', 'perspectiveBlock', 'umlClass', 'umlInterface', 'umlActor', 'umlComponent', 'umlState', 'umlLifeline', 'umlFragment', 'umlSignalSend', 'umlSignalReceive'].includes(actualType)) ? 'solid' : store.defaultElementStyles.strokeStyle,
        } as DrawingElement;

        // Apply specific defaults for Sticky Note
        if (actualType === 'stickyNote') {
            newElement.backgroundColor = '#fef08a'; // Pastel Yellow
            newElement.fillStyle = 'solid';
            newElement.strokeColor = '#000000'; // Ensure black text/outline
        }

        addElement(newElement);

        // Update target's boundElements if we have a start binding
        if (startBindingData) {
            const target = store.elements.find(e => e.id === startBindingData!.elementId);
            if (target) {
                const existing = target.boundElements || [];
                updateElement(target.id, { boundElements: [...existing, { id: currentId, type: actualType as 'arrow' }] });
            }
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (store.appMode === 'presentation') {
            const isNavTool = store.selectedTool === 'selection' || store.selectedTool === 'pan';
            if (store.docType === 'slides' && isNavTool) return;

            // For infinite mode OR presentation tools, continue...
            if (store.docType === 'slides') {
                // We fall through to world-coord calculation and tool logic
            } else if (isDragging) {
                setViewState({
                    panX: store.viewState.panX + e.movementX,
                    panY: store.viewState.panY + e.movementY
                });
                return;
            }
            // If not slides and not dragging, we might be using a presentation tool like laser/ink
            // In this case, we fall through to the regular tool logic below.
        }
        let { x, y } = getWorldCoordinates(e.clientX, e.clientY);
        // console.log('Move', { tool: store.selectedTool, isDragging, selection: store.selection.length });

        // Update Cursor
        if (store.selectedTool === 'pan') {
            setCursor(isDragging ? 'grabbing' : 'grab');
        } else if (store.selectedTool === 'selection' && !isDragging) {
            const hit = getHandleAtPosition(x, y);
            const prevHover = hoveredConnector;

            if (hit) {
                if (hit.handle === 'rotate') setCursor('grab');
                else if (hit.handle === 'tl' || hit.handle === 'br') setCursor('nwse-resize');
                else if (hit.handle === 'tr' || hit.handle === 'bl') setCursor('nesw-resize');
                else if (hit.handle === 'tm' || hit.handle === 'bm') setCursor('ns-resize');
                else if (hit.handle === 'lm' || hit.handle === 'rm') setCursor('ew-resize');
                else if (hit.handle.startsWith('connector-')) {
                    setCursor('crosshair'); // Or pointer
                    hoveredConnector = { elementId: hit.id, handle: hit.handle };
                } else {
                    // Reset if hit something else (like resize handle)
                    hoveredConnector = null;
                }
            } else {
                setCursor('default');
                hoveredConnector = null;
            }

            // Redraw if hover connector changed (for animation/highlight)
            const isChanged = (prevHover && !hoveredConnector) ||
                (!prevHover && hoveredConnector) ||
                (prevHover && hoveredConnector && (prevHover.elementId !== hoveredConnector.elementId || prevHover.handle !== hoveredConnector.handle));

            if (isChanged) {
                requestAnimationFrame(draw);
            }
        }

        if (store.selectedTool === 'pan') {
            if (isDragging) {
                setViewState({
                    panX: store.viewState.panX + e.movementX,
                    panY: store.viewState.panY + e.movementY
                });
            }
            return;
        }

        if (store.selectedTool === 'selection') {
            if (isSelecting) {
                const w = x - startX;
                const h = y - startY;
                setSelectionBox({
                    x: w > 0 ? startX : startX + w,
                    y: h > 0 ? startY : startY + h,
                    w: Math.abs(w),
                    h: Math.abs(h)
                });
                return;
            }

            if (isDragging && store.selection.length > 0) {
                const id = store.selection[0];
                const el = store.elements.find(e => e.id === id);
                if (!el) return;

                if (draggingHandle && !canInteractWithElement(el)) {
                    return;
                }

                if (draggingHandle) {
                    // Binding Logic for Lines/Arrows/OrganicBranch
                    if ((el.type === 'line' || el.type === 'arrow' || el.type === 'organicBranch') && (draggingHandle === 'tl' || draggingHandle === 'br')) {
                        const match = checkBinding(x, y, el.id);
                        if (match) {
                            setSuggestedBinding({ elementId: match.element.id, px: match.snapPoint.x, py: match.snapPoint.y, position: match.position });
                            x = match.snapPoint.x;
                            y = match.snapPoint.y;
                        } else {
                            setSuggestedBinding(null);
                        }
                    } else {
                        setSuggestedBinding(null);
                    }

                    // Resize/Rotate logic
                    if (draggingHandle === 'rotate') {
                        const cx = el.x + el.width / 2;
                        const cy = el.y + el.height / 2;
                        // Calculate angle
                        const angle = Math.atan2(y - cy, x - cx);
                        updateElement(id, { angle: angle + Math.PI / 2 });
                    } else {
                        // RESIZING
                        let resizeX = x;
                        let resizeY = y;

                        // Snap handle position to grid if enabled
                        if (store.gridSettings.snapToGrid) {
                            const snapped = snapPoint(x, y, store.gridSettings.gridSize);
                            resizeX = snapped.x;
                            resizeY = snapped.y;
                        }

                        const dx = resizeX - startX;
                        const dy = resizeY - startY;

                        let newX = initialElementX;
                        let newY = initialElementY;
                        let newWidth = initialElementWidth;
                        let newHeight = initialElementHeight;

                        if (draggingHandle === 'tl') {
                            newX += dx;
                            newY += dy;
                            newWidth -= dx;
                            newHeight -= dy;
                        } else if (draggingHandle === 'tr') {
                            newY += dy;
                            newWidth += dx;
                            newHeight -= dy;
                        } else if (draggingHandle === 'bl') {
                            newX += dx;
                            newWidth -= dx;
                            newHeight += dy;
                        } else if (draggingHandle === 'br') {
                            newWidth += dx;
                            newHeight += dy;
                        } else if (draggingHandle === 'tm') {
                            newY += dy;
                            newHeight -= dy;
                        } else if (draggingHandle === 'bm') {
                            newHeight += dy;
                        } else if (draggingHandle === 'lm') {
                            newX += dx;
                            newWidth -= dx;
                        } else if (draggingHandle === 'rm') {
                            newWidth += dx;
                        }

                        // Apply Constraints (Proportional Resizing)
                        const isMulti = store.selection.length > 1;
                        const firstEl = store.elements.find(e => e.id === store.selection[0]);
                        let isConstrained = e.shiftKey || (store.selection.length === 1 && firstEl?.constrained);

                        // Point 2: Lock Aspect Ratio for Text by Default
                        // For text, we invert the Shift behavior: 
                        // - No Shift = Constrained (Locked)
                        // - Shift = Unconstrained (Free)
                        if (store.selection.length === 1 && firstEl?.type === 'text') {
                            isConstrained = !e.shiftKey;
                        }

                        if (isConstrained && initialElementWidth !== 0 && initialElementHeight !== 0) {
                            const ratio = initialElementWidth / initialElementHeight;

                            if (['tm', 'bm'].includes(draggingHandle!)) {
                                // Side-only resize but constrained -> change width too
                                newWidth = newHeight * ratio;
                                // Need to keep center if it was side handle? 
                                // Actually usually we just scale from the other side.
                                if (draggingHandle === 'tm') {
                                    newX = (initialElementX + initialElementWidth / 2) - newWidth / 2;
                                } else {
                                    newX = (initialElementX + initialElementWidth / 2) - newWidth / 2;
                                }
                            } else if (['lm', 'rm'].includes(draggingHandle!)) {
                                newHeight = newWidth / ratio;
                                newY = (initialElementY + initialElementHeight / 2) - newHeight / 2;
                            } else {
                                // Corner Handles
                                if (Math.abs(newWidth) / ratio > Math.abs(newHeight)) {
                                    newHeight = newWidth / ratio;
                                } else {
                                    newWidth = newHeight * ratio;
                                }

                                // Re-adjust X/Y for corner constraints
                                if (draggingHandle === 'tl') {
                                    newX = (initialElementX + initialElementWidth) - newWidth;
                                    newY = (initialElementY + initialElementHeight) - newHeight;
                                } else if (draggingHandle === 'tr') {
                                    newY = (initialElementY + initialElementHeight) - newHeight;
                                } else if (draggingHandle === 'bl') {
                                    newX = (initialElementX + initialElementWidth) - newWidth;
                                }
                            }
                        }

                        if (draggingHandle && draggingHandle.startsWith('control-')) {
                            // DRAGGING CONTROL POINT
                            const index = parseInt(draggingHandle.replace('control-', ''), 10);
                            const element = store.elements.find(e => e.id === id);

                            if (element) {
                                let newControlPoints = element.controlPoints ? [...element.controlPoints] : [];

                                // Initialize if missing (e.g., first drag)
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
                            if (draggingHandle && draggingHandle.startsWith('control-')) {
                                const el = store.elements.find(e => e.id === id);
                                if (el) {
                                    if (el.type === 'isometricCube' && draggingHandle === 'control-1') {
                                        // Vertical Drag -> shapeRatio (Height of top face)
                                        let newVRatio = (y - el.y) / el.height;
                                        newVRatio = Math.max(0.1, Math.min(0.9, newVRatio));
                                        const shapeRatio = Math.round(newVRatio * 100);

                                        // Horizontal Drag -> sideRatio (Perspective/Rotation)
                                        let newHRatio = (x - el.x) / el.width;
                                        newHRatio = Math.max(0, Math.min(1, newHRatio));
                                        const sideRatio = Math.round(newHRatio * 100);

                                        updateElement(el.id, { shapeRatio, sideRatio }, false);
                                    } else if ((el.type === 'solidBlock' || el.type === 'cylinder') && draggingHandle === 'control-1') {
                                        // Handle drag adjusts Depth and View Angle
                                        const centerX = el.x + el.width / 2;
                                        const centerY = el.y + el.height / 2;
                                        const dx = x - centerX;
                                        const dy = y - centerY;

                                        // 1. Calculate Depth (Magnitude of vector)
                                        let newDepth = Math.sqrt(dx * dx + dy * dy);
                                        newDepth = Math.round(newDepth);

                                        // 2. Calculate Angle (Direction)
                                        // atan2 returns -PI to PI. Convert to 0-360 deg.
                                        let angleRad = Math.atan2(dy, dx);
                                        let angleDeg = Math.round((angleRad * 180) / Math.PI);
                                        if (angleDeg < 0) angleDeg += 360;

                                        updateElement(el.id, { depth: newDepth, viewAngle: angleDeg }, false);
                                    } else if (el.type === 'perspectiveBlock') {
                                        if (draggingHandle === 'control-1') {
                                            const centerX = el.x + el.width / 2;
                                            const centerY = el.y + el.height / 2;
                                            const dx = x - centerX - (el.skewX || 0) * el.width;
                                            const dy = y - centerY - (el.skewY || 0) * el.height;

                                            let newDepth = Math.sqrt(dx * dx + dy * dy);
                                            let angleRad = Math.atan2(dy, dx);
                                            let angleDeg = Math.round((angleRad * 180) / Math.PI);
                                            if (angleDeg < 0) angleDeg += 360;

                                            updateElement(el.id, { depth: Math.round(newDepth), viewAngle: angleDeg }, false);
                                        } else if (draggingHandle === 'control-2' || draggingHandle === 'control-3' || draggingHandle === 'control-4' || draggingHandle === 'control-5') {
                                            // Back Vertices (TL, TR, BR, BL)
                                            const mw = el.width / 2;
                                            const mh = el.height / 2;
                                            const centerX = el.x + mw;
                                            const centerY = el.y + mh;
                                            const angle = (el.viewAngle || 45) * Math.PI / 180;
                                            const depth = el.depth || 50;
                                            const baseBackCenterX = centerX + depth * Math.cos(angle);
                                            const baseBackCenterY = centerY + depth * Math.sin(angle);

                                            // Mouse in local space relative to predicted base center
                                            const imx = x - baseBackCenterX;
                                            const imy = y - baseBackCenterY;

                                            // Determine signs based on handle
                                            const sx = (draggingHandle === 'control-3' || draggingHandle === 'control-4') ? 1 : -1;
                                            const sy = (draggingHandle === 'control-4' || draggingHandle === 'control-5') ? 1 : -1;

                                            // We want to solve for new skew and taper
                                            // mx = skewX + sx * mw * (1-taper)
                                            // my = skewY + sy * mh * (1-taper)
                                            // This is underdetermined. Let's fix Taper based on distance or scale, and Skew as the shift.
                                            // Simple direct mapping: 
                                            // Dragging a corner adjusts both skew and taper.
                                            // Taper = 1 - (distance from mouse to back center / predicted distance)
                                            const distToCenter = Math.sqrt(imx * imx + imy * imy);
                                            const predictedDist = Math.sqrt((mw * mw) + (mh * mh));
                                            const newTaper = Math.max(0, Math.min(1, 1 - (distToCenter / predictedDist)));

                                            // Skew is the offset of the "face center"
                                            const newSkewX = (imx - sx * mw * (1 - newTaper)) / el.width;
                                            const newSkewY = (imy - sy * mh * (1 - newTaper)) / el.height;

                                            updateElement(el.id, { taper: newTaper, skewX: newSkewX, skewY: newSkewY }, false);
                                        } else if (draggingHandle === 'control-6' || draggingHandle === 'control-7' || draggingHandle === 'control-8' || draggingHandle === 'control-9') {
                                            // Front Vertices (TL, TR, BR, BL)
                                            const mw = el.width / 2;
                                            const mh = el.height / 2;
                                            const centerX = el.x + mw;
                                            const centerY = el.y + mh;

                                            const imx = x - centerX;
                                            const imy = y - centerY;

                                            const sx = (draggingHandle === 'control-7' || draggingHandle === 'control-8') ? 1 : -1;
                                            const sy = (draggingHandle === 'control-8' || draggingHandle === 'control-9') ? 1 : -1;

                                            const distToCenter = Math.sqrt(imx * imx + imy * imy);
                                            const predictedDist = Math.sqrt((mw * mw) + (mh * mh));
                                            const newTaper = Math.max(0, Math.min(1, 1 - (distToCenter / predictedDist)));

                                            const newSkewX = (imx - sx * mw * (1 - newTaper)) / el.width;
                                            const newSkewY = (imy - sy * mh * (1 - newTaper)) / el.height;

                                            updateElement(el.id, { frontTaper: newTaper, frontSkewX: newSkewX, frontSkewY: newSkewY }, false);
                                        }
                                    } else if ((el.type === 'star' || el.type === 'burst') && draggingHandle === 'control-1') {
                                        let newRatio = (y - el.y) / el.height;
                                        newRatio = Math.max(0.1, Math.min(0.9, newRatio));
                                        const shapeRatio = Math.round(newRatio * 100);
                                        updateElement(el.id, { shapeRatio }, false);
                                    } else if (el.type === 'speechBubble' && draggingHandle === 'control-1') {
                                        let newTailX = (x - el.x) / el.width;
                                        let newTailY = (y - el.y) / el.height;
                                        newTailX = Math.max(-0.5, Math.min(1.5, newTailX));
                                        newTailY = Math.max(-0.5, Math.min(1.5, newTailY));
                                        updateElement(el.id, { tailX: newTailX, tailY: newTailY }, false);
                                    }
                                }
                            }
                        } else {
                            // APPLY RESIZE (Single or Group)
                            // This runs if it's NOT a control handle (i.e. normal corner/side resize)

                            if (isMulti) {
                                // GROUP RESIZING
                                const scaleX = initialElementWidth === 0 ? 1 : newWidth / initialElementWidth;
                                const scaleY = initialElementHeight === 0 ? 1 : newHeight / initialElementHeight;

                                store.selection.forEach(selId => {
                                    const init = initialPositions.get(selId);
                                    if (!init) return;

                                    const relX = init.x - initialElementX;
                                    const relY = init.y - initialElementY;

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
                                const id = store.selection[0];
                                const el = store.elements.find(e => e.id === id);
                                if (el) {
                                    const updates: any = { x: newX, y: newY, width: newWidth, height: newHeight };

                                    // Scale factors for points/content
                                    const scaleX = initialElementWidth === 0 ? 1 : newWidth / initialElementWidth;
                                    const scaleY = initialElementHeight === 0 ? 1 : newHeight / initialElementHeight;

                                    // Scale font size for text
                                    if (el.type === 'text') {
                                        if (scaleY > 0) {
                                            let newFontSize = initialElementFontSize * scaleY;
                                            newFontSize = Math.max(newFontSize, 8);
                                            updates.fontSize = newFontSize;
                                        }
                                    }

                                    // Scale points for pen tools
                                    if ((el.type === 'fineliner' || el.type === 'inkbrush' || el.type === 'marker') && el.points) {
                                        const init = initialPositions.get(id);
                                        if (init && init.points) {
                                            if (el.pointsEncoding === 'flat' || (init.points.length > 0 && typeof init.points[0] === 'number')) {
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

                                    if (el.type === 'line' || el.type === 'arrow' || el.type === 'bezier') {
                                        updates.points = refreshLinePoints(el, newX, newY, newX + newWidth, newY + newHeight);
                                    }

                                    if (el.type === 'organicBranch') {
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
                    }
                } else {
                    // Move Multiple Items
                    let dx = x - startX;
                    let dy = y - startY;

                    // OPTIMIZATION: Throttle Object Snapping calculations
                    if (store.gridSettings.objectSnapping && !e.shiftKey) {
                        const now = performance.now();

                        // Only recalculate if enough time has passed (throttle to ~60 FPS)
                        if (now - lastSnappingTime >= SNAPPING_THROTTLE_MS) {
                            const snap = getSnappingGuides(store.selection, store.elements, dx, dy, 5 / store.viewState.scale);
                            dx = snap.dx;
                            dy = snap.dy;
                            setSnappingGuides(snap.guides);

                            const spacing = getSpacingGuides(store.selection, store.elements, dx, dy, 5 / store.viewState.scale);
                            dx = spacing.dx;
                            dy = spacing.dy;
                            setSpacingGuides(spacing.guides);

                            lastSnappingTime = now;
                        }
                        // If throttled, keep using the visual guides but don't recalculate snap position
                    } else {
                        setSnappingGuides([]);
                        setSpacingGuides([]);
                    }

                    // Snap delta to grid if enabled and no object snapping guides
                    if (store.gridSettings.snapToGrid && !e.shiftKey && snappingGuides().length === 0) {
                        const gridSize = store.gridSettings.gridSize;
                        dx = Math.round(dx / gridSize) * gridSize;
                        dy = Math.round(dy / gridSize) * gridSize;
                    }

                    const skipHierarchy = e.altKey;

                    initialPositions.forEach((initPos, selId) => {
                        // If Alt is held, only move selected items, not their (unselected) descendants
                        if (skipHierarchy && !store.selection.includes(selId)) return;

                        const el = store.elements.find(e => e.id === selId);
                        if (el && canInteractWithElement(el)) {
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
                                el.boundElements.forEach(b => refreshBoundLine(b.id));
                            }
                        }
                    });
                }
            }
        }


        if (store.selectedTool === 'laser') {
            const now = Date.now();
            // Throttle updates for smooth performance
            if (now - lastLaserUpdateTime >= LASER_THROTTLE_MS) {
                lastLaserUpdateTime = now;
                const { x, y } = getWorldCoordinates(e.clientX, e.clientY);
                // Mutate array directly for performance
                if (laserTrailData.length >= LASER_MAX_POINTS) {
                    laserTrailData.shift();
                }
                laserTrailData.push({ x, y, timestamp: now });
                // Single RAF request to prevent stacking
                if (!laserRafPending) {
                    laserRafPending = true;
                    requestAnimationFrame(() => {
                        laserRafPending = false;
                        draw();
                    });
                }
            }
        }

        if (!isDrawing || !currentId) {
            if (isDrawing && store.selectedTool === 'eraser') {
                const threshold = 10 / store.viewState.scale;
                const elementMap = new Map<string, DrawingElement>();
                for (const el of store.elements) elementMap.set(el.id, el);

                for (let i = store.elements.length - 1; i >= 0; i--) {
                    const el = store.elements[i];
                    if (!canInteractWithElement(el)) continue;
                    if (!isLayerVisible(el.layerId)) continue;
                    if (hitTestElement(el, x, y, threshold, elementMap)) {
                        deleteElements([el.id]);
                    }
                }
            }
            return;
        }

        if (store.selectedTool === 'fineliner' || store.selectedTool === 'marker' || store.selectedTool === 'inkbrush' || store.selectedTool === 'ink') {
            const { x: ex, y: ey } = getWorldCoordinates(e.clientX, e.clientY);
            const px = ex - startX;
            const py = ey - startY;

            // Buffer points locally for performance
            penPointsBuffer.push(px, py);

            const now = Date.now();
            // Throttle store updates but ensure smooth visual feedback
            if (now - lastPenUpdateTime >= PEN_UPDATE_THROTTLE_MS) {
                lastPenUpdateTime = now;
                flushPenPoints();
            } else if (!penUpdatePending) {
                // Schedule a flush if not already pending
                penUpdatePending = true;
                requestAnimationFrame(() => {
                    penUpdatePending = false;
                    flushPenPoints();
                });
            }
        } else {
            // Apply snap to grid if enabled
            let finalX = x;
            let finalY = y;

            if (store.selectedTool === 'line' || store.selectedTool === 'arrow' || store.selectedTool === 'bezier' || store.selectedTool === 'organicBranch' || draggingFromConnector) {
                if (currentId) {
                    const match = checkBinding(x, y, currentId);
                    if (match) {
                        setSuggestedBinding({ elementId: match.element.id, px: match.snapPoint.x, py: match.snapPoint.y, position: match.position });
                        finalX = match.snapPoint.x;
                        finalY = match.snapPoint.y;
                    } else {
                        setSuggestedBinding(null);
                    }
                }
            } else {
                setSuggestedBinding(null);
            }

            if (!suggestedBinding() && store.gridSettings.snapToGrid) {
                const snapped = snapPoint(x, y, store.gridSettings.gridSize);
                finalX = snapped.x;
                finalY = snapped.y;
            }

            const updates: Partial<DrawingElement> = {
                width: finalX - startX,
                height: finalY - startY
            };

            // For organicBranch, provide temporary points and controlPoints for live preview
            if (store.selectedTool === 'organicBranch') {
                const w = finalX - startX;
                const h = finalY - startY;
                // Relative start and end points (start at origin, end at width/height)
                updates.points = [0, 0, w, h];
                // Calculate control points for S-curve
                const cp1 = { x: startX + w * 0.5, y: startY };
                const cp2 = { x: finalX - w * 0.5, y: finalY };
                updates.controlPoints = [cp1, cp2];
            }

            updateElement(currentId, updates);
        }

        // Auto-Scroll Check
        if (isDragging || isDrawing) {
            const edgeThreshold = 50;
            const scrollSpeed = 10;
            const clientX = e.clientX;
            const clientY = e.clientY;

            let dPanX = 0;
            let dPanY = 0;

            if (clientX < edgeThreshold) dPanX = scrollSpeed;
            if (clientX > window.innerWidth - edgeThreshold) dPanX = -scrollSpeed;
            if (clientY < edgeThreshold) dPanY = scrollSpeed;
            if (clientY > window.innerHeight - edgeThreshold) dPanY = -scrollSpeed;

            if (dPanX !== 0 || dPanY !== 0) {
                setViewState({
                    panX: store.viewState.panX + dPanX,
                    panY: store.viewState.panY + dPanY
                });
            }
        }

        if (isDrawing || isDragging) {
            requestAnimationFrame(draw);
        }
    };

    const handlePointerUp = (e: PointerEvent) => {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);

        if (store.appMode === 'presentation') {
            const isNavTool = store.selectedTool === 'selection' || store.selectedTool === 'pan';
            if (store.docType === 'slides' && isNavTool) return;

            // For infinite mode or interaction tools, we continue to the reset logic below
            if (store.docType !== 'slides') {
                isDragging = false;
                return;
            }
        }

        if (store.selectedTool === 'pan') {
            isDragging = false;
            setCursor('grab');
            return;
        }

        if (store.selectedTool === 'laser') {
            isDrawing = false;
            // Continue decay animation until trail is empty
            const decayLoop = () => {
                if (laserTrailData.length > 0) {
                    draw();
                    requestAnimationFrame(decayLoop);
                }
            };
            requestAnimationFrame(decayLoop);
            return;
        }

        // Handle connector drawing first (before selection tool handling)
        // This is needed because connector drawing happens while in selection mode
        if (draggingFromConnector && isDrawing && currentId) {
            const el = store.elements.find(e => e.id === currentId);
            if (el) {
                // Apply end binding if suggested
                if (suggestedBinding()) {
                    const binding = suggestedBinding()!;
                    const bindingData = { elementId: binding.elementId, focus: 0, gap: 5 };
                    updateElement(currentId, { endBinding: bindingData });

                    const target = store.elements.find(e => e.id === binding.elementId);
                    if (target) {
                        const existing = target.boundElements || [];
                        if (!existing.find(b => b.id === currentId)) {
                            updateElement(target.id, { boundElements: [...existing, { id: currentId, type: 'arrow' }] });
                        }
                    }
                }

                // Select the new arrow
                setStore('selection', [currentId]);
            }

            isDrawing = false;
            currentId = null;
            draggingFromConnector = null;
            setSuggestedBinding(null);
            requestAnimationFrame(draw);
            return;
        }

        if (store.selectedTool === 'selection') {
            if (isSelecting) {
                const box = selectionBox();
                if (box) {
                    // Find touching elements
                    const selectedIds: string[] = [];
                    // Strict inside? Or touching? usually touching/intersecting.
                    // Box is in World Coordinates (since startX/Y and x/y are world)

                    // Normalize Box
                    const bx = box.x;
                    const by = box.y;
                    const bw = box.w;
                    const bh = box.h;

                    store.elements.forEach(el => {
                        // Simple AABB overlap check
                        // Element AABB
                        const elX = el.x;
                        const elY = el.y;
                        const elW = el.width;
                        const elH = el.height;

                        // Normalize bounds
                        const ex1 = Math.min(elX, elX + elW);
                        const ex2 = Math.max(elX, elX + elW);
                        const ey1 = Math.min(elY, elY + elH);
                        const ey2 = Math.max(elY, elY + elH);

                        // Intersection
                        if (bx < ex2 && bx + bw > ex1 &&
                            by < ey2 && by + bh > ey1) {
                            selectedIds.push(el.id);
                        }
                    });

                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        // Add to existing
                        const existing = new Set(store.selection);
                        selectedIds.forEach(id => existing.add(id));
                        setStore('selection', Array.from(existing));
                    } else {
                        setStore('selection', selectedIds);
                    }
                }
                isSelecting = false;
                setSelectionBox(null);
            }

            if (isDragging) {
                const binding = suggestedBinding();
                if (binding && store.selection.length === 1 && draggingHandle) {
                    const elId = store.selection[0];
                    const el = store.elements.find(e => e.id === elId);
                    if (el && (el.type === 'line' || el.type === 'arrow' || el.type === 'organicBranch')) {
                        const isStart = draggingHandle === 'tl';
                        const bindingData = {
                            elementId: binding.elementId,
                            focus: 0,
                            gap: 5,
                            position: binding.position
                        };

                        updateElement(elId, isStart ? { startBinding: bindingData } : { endBinding: bindingData });

                        // Update Target Bound Elements
                        const target = store.elements.find(e => e.id === binding.elementId);
                        if (target) {
                            const existing = target.boundElements || [];
                            if (!existing.find(b => b.id === elId)) {
                                updateElement(target.id, { boundElements: [...existing, { id: elId, type: el.type as any }] });
                            }
                        }
                    }
                }
                setSuggestedBinding(null);
            }

            isDragging = false;
            draggingHandle = null;
            initialPositions.clear();
            setSnappingGuides([]);
            return;
        }

        if (isDrawing && currentId) {
            const el = store.elements.find(e => e.id === currentId);
            if (el) {
                // Binding for new lines/arrows/bezier/organicBranch
                if ((el.type === 'line' || el.type === 'arrow' || el.type === 'bezier' || el.type === 'organicBranch') && suggestedBinding()) {
                    const binding = suggestedBinding()!;
                    const bindingData = {
                        elementId: binding.elementId,
                        focus: 0,
                        gap: 5,
                        position: binding.position
                    };
                    // New lines are drawn from x,y (TopLeft) to x+width, y+height.
                    // The end point (width/height) is where the mouse is.
                    // So we update 'endBinding'.
                    updateElement(currentId, { endBinding: bindingData });

                    const target = store.elements.find(e => e.id === binding.elementId);
                    if (target) {
                        const existing = target.boundElements || [];
                        updateElement(target.id, { boundElements: [...existing, { id: currentId, type: el.type as any }] });
                    }
                    setSuggestedBinding(null);
                }

                // Logic for normalization...
                // Logic for normalization...
                if (['rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'].includes(el.type)) {
                    if (el.width < 0) {
                        updateElement(currentId, { x: el.x + el.width, width: Math.abs(el.width) });
                    }
                    if (el.height < 0) {
                        updateElement(currentId, { y: el.y + el.height, height: Math.abs(el.height) });
                    }
                } else if (el.type === 'fineliner' || el.type === 'inkbrush' || el.type === 'marker' || el.type === 'ink') {
                    // Flush any buffered points before normalization
                    flushPenPoints();
                    // Re-fetch element after flush
                    const updatedEl = store.elements.find(e => e.id === currentId);
                    if (updatedEl && updatedEl.points && updatedEl.points.length > 2) {
                        const updates = normalizePencil({ ...updatedEl, points: updatedEl.points });
                        if (updates) {
                            updateElement(currentId, updates);
                        }
                    }
                } else if (el.type === 'organicBranch') {
                    // Initialize control points for S-curve if likely intended
                    let startX = el.x;
                    let startY = el.y;
                    let width = el.width;
                    let height = el.height;

                    // Normalize negative dimensions specifically for organicBranch to ensure hit testing works
                    if (width < 0) {
                        startX += width;
                        width = Math.abs(width);
                    }
                    if (height < 0) {
                        startY += height;
                        height = Math.abs(height);
                    }

                    // If we swapped x/y (normalized), the "start" point for the branch (root)
                    // conceptually moves. But for organicBranch, "start" is implicitly TL if W/H positive?
                    // No, renderElement uses: start={x,y}, end={x+w, y+h}.
                    // If we normalize, {x,y} changes.
                    // If original was drawn Right-to-Left (neg width):
                    // Orig: Start=(100,0), End=(0,100). (W=-100, H=100)
                    // New: x=0, y=0, W=100, H=100. Start=(0,0), End=(100,100).
                    // This FLIPS the branch logic.
                    // To preserve direction, we need to swap start/end logic conceptually?
                    // OR we just calculate Control Points based on the *actual* drag visual,
                    // and store them. Since renderElement uses CPs if present!
                    // If CPs are present, renderElement uses:
                    // input: el.x, el.y.
                    // start = {el.x + pts[0].x, ...} IF points exist.
                    // IF CPs exist:
                    // uses CPs for curve.
                    // BUT start/end points passed to drawOrganicBranch?
                    // Lines 2038+ in renderElement:
                    // start = {el.x, el.y}, end = {el.x+w, ...}
                    // IF CPs exist, it uses `el.x/y` as base.

                    // Ideally, we want "start" to be where mouse started, "end" where mouse ended.
                    // If we normalize, we lose that info unless we store it.
                    // BUT 'organicBranch' relies on `drawOrganicBranch` which takes start/end.
                    // If we normalize, we force Start=TL, End=BR (or similar).
                    // Unless we use `points` property to store [startOffset, endOffset]?
                    // Let's use `points` property to define start/end explicitly relative to x,y!
                    // Similar to `fineliner`.

                    // Actually, let's keep it simple:
                    // If width was negative, it meant Start was Right, End was Left.
                    // We normalize x,y,w,h.
                    // We set explicit Start/End points in `points` array relative to new TopLeft.

                    const normalizedX = Math.min(el.x, el.x + el.width);
                    const normalizedY = Math.min(el.y, el.y + el.height);
                    const normalizedW = Math.abs(el.width);
                    const normalizedH = Math.abs(el.height);

                    // Original Start (el.x, el.y) relative to Normalized TL (normalizedX, normalizedY)
                    const relStartX = el.x - normalizedX;
                    const relStartY = el.y - normalizedY;
                    const relEndX = (el.x + el.width) - normalizedX;
                    const relEndY = (el.y + el.height) - normalizedY;

                    // Calculate CPs based on these relative start/end points
                    // S-Curve logic between RelStart and RelEnd
                    const dx = relEndX - relStartX;
                    // CP1: Absolute = NormalizedX + RelStartX + dx*0.5
                    const cp1 = { x: normalizedX + relStartX + dx * 0.5, y: normalizedY + relStartY };
                    const cp2 = { x: normalizedX + relEndX - dx * 0.5, y: normalizedY + relEndY };

                    updateElement(currentId, {
                        x: normalizedX,
                        y: normalizedY,
                        width: normalizedW,
                        height: normalizedH,
                        // Store points so renderElement knows where start/end are relative to TL
                        points: [relStartX, relStartY, relEndX, relEndY],
                        controlPoints: [cp1, cp2]
                    });
                }

                // Switch back to selection tool after drawing (except for continuous tools)
                // Continuous tools: Pencils, Text, Eraser, Pan, Selection
                const continuousTools = ['selection', 'pan', 'eraser', 'fineliner', 'inkbrush', 'marker', 'text', 'block-text', 'ink'];
                if (!continuousTools.includes(store.selectedTool)) {
                    setSelectedTool('selection');
                }

                // If this was drawn from a connector handle, select the new arrow and switch to selection
                if (draggingFromConnector) {
                    setStore('selection', [currentId]);
                    setSelectedTool('selection');
                }
            }
        }
        isDrawing = false;
        currentId = null;
        draggingFromConnector = null; // Reset connector drag state
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

            if (hitTestElement(el, x, y, threshold, elementMap)) {

                // Check for control handles (Star, Burst, Speech Bubble, Isometric Cube, Solid Block, Perspective Block)
                if (['star', 'burst', 'speechBubble', 'isometricCube', 'solidBlock', 'perspectiveBlock'].includes(el.type)) {
                    const hitHandle = getHandleAtPosition(x, y);
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
        if (!canvasRef || store.elements.length === 0) {
            setShowScrollBack(false);
            return;
        }

        // Viewport in World Coords
        const vpX = -panX / scale;
        const vpY = -panY / scale;
        const vpW = canvasRef.width / scale;
        const vpH = canvasRef.height / scale;

        // Content Bounds
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

        // Check if Viewport intersects Content
        // Loose check: If viewport is completely outside content bounds? 
        // Or if content is completely outside viewport? YES.

        const isContentVisible = !(minX > vpX + vpW || maxX < vpX || minY > vpY + vpH || maxY < vpY);

        setShowScrollBack(!isContentVisible);
    });

    const handleScrollBack = () => {
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
                { label: 'Zoom to Fit', shortcut: 'Shift+1', onClick: zoomToFit },
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

                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    const initialPoint = { ...point };

                                    const onMove = (ev: PointerEvent) => {
                                        const dx = (ev.clientX - startX) / props.scale;
                                        const dy = (ev.clientY - startY) / props.scale;

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
