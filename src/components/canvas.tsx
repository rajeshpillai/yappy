import { type Component, onMount, createEffect, onCleanup, createSignal, Show, untrack } from "solid-js";
import rough from 'roughjs/bin/rough'; // Hand-drawn style
import { isElementHiddenByHierarchy, getDescendants } from "../utils/hierarchy";
import { store, setViewState, addElement, updateElement, setStore, pushToHistory, deleteElements, toggleGrid, toggleSnapToGrid, setActiveLayer, setShowCanvasProperties, setSelectedTool, toggleZenMode, duplicateElement, groupSelected, ungroupSelected, bringToFront, sendToBack, moveElementZIndex, zoomToFit, isLayerVisible, isLayerLocked, toggleCollapse, setParent, clearParent, addChildNode, addSiblingNode, reorderMindmap } from "../store/app-store";
import { renderElement, normalizePoints } from "../utils/render-element";
import { getAnchorPoints, findClosestAnchor } from "../utils/anchor-points";
import { calculateSmartElbowRoute } from "../utils/routing";
import type { DrawingElement } from "../types";
import { distanceToSegment, isPointOnPolyline, isPointInEllipse, intersectElementWithLine, isPointOnBezier } from "../utils/geometry";
import ContextMenu, { type MenuItem } from "./context-menu";
import { snapPoint } from "../utils/snap-helpers";
import { setImageLoadCallback } from "../utils/image-cache";
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
import { fitShapeToText } from "../utils/text-utils";
import { changeElementType, getTransformOptions, getShapeIcon, getShapeTooltip, getCurveTypeOptions, getCurveTypeIcon, getCurveTypeTooltip } from "../utils/element-transforms";
import { getGroupsSortedByPriority, isPointInGroupBounds } from "../utils/group-utils";
import { exportToPng, exportToSvg } from "../utils/export";


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

    let canvasRef: HTMLCanvasElement | undefined;


    let isDrawing = false;
    let currentId: string | null = null;
    let startX = 0;
    let startY = 0;

    // Text Editing State
    const [editingId, setEditingId] = createSignal<string | null>(null);
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


    const handleResize = () => {
        if (canvasRef) {
            canvasRef.width = window.innerWidth;
            canvasRef.height = window.innerHeight;
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

        // Reset Transform Matrix to Identity so we don't accumulate translations!
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

        // Background color
        const isDarkMode = store.theme === 'dark';
        // Use store background color, but fallback to theme default if needed
        let bgColor = store.canvasBackgroundColor;
        if (!bgColor) {
            bgColor = isDarkMode ? "#121212" : "#fafafa";
        }
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

        // Render Canvas Texture
        if (store.canvasTexture !== 'none') {
            const texture = store.canvasTexture;
            const { scale, panX, panY } = store.viewState;

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

        const { scale, panX, panY } = store.viewState;

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
            // OPTIMIZATION: Create RoughJS instance ONCE per layer, not per element
            const rc = rough.canvas(canvasRef);

            const layerElements = store.elements.filter(el => {
                if (el.layerId !== layer.id) return false;

                // FIX: Always render the element currently being drawn
                if (el.id === currentId) return true;

                // Mindmap Visibility Check
                if (isElementHiddenByHierarchy(el, store.elements)) return false;

                // Hide connectors if their bound elements are hidden
                if (el.type === 'line' || el.type === 'arrow' || el.type === 'bezier') {
                    if (el.startBinding) {
                        const startEl = store.elements.find(e => e.id === el.startBinding?.elementId);
                        if (startEl && isElementHiddenByHierarchy(startEl, store.elements)) return false;
                    }
                    if (el.endBinding) {
                        const endEl = store.elements.find(e => e.id === el.endBinding?.elementId);
                        if (endEl && isElementHiddenByHierarchy(endEl, store.elements)) return false;
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
                let cx = el.x + el.width / 2;
                let cy = el.y + el.height / 2;

                if (el.type !== 'text' || editingId() !== el.id) {
                    const layerOpacity = (layer?.opacity ?? 1);
                    renderElement(rc, ctx, el, isDarkMode, layerOpacity);
                }

                // Selection highlight & Handles
                if (store.selection.includes(el.id)) {
                    ctx.save();
                    // Re-apply rotation for handles
                    if (el.angle) {
                        ctx.translate(cx, cy);
                        ctx.rotate(el.angle);
                        ctx.translate(-cx, -cy);
                    }

                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 1 / scale;
                    const padding = 2 / scale;

                    // Only draw bounding box for non-linear elements
                    if (el.type !== 'line' && el.type !== 'arrow' && el.type !== 'organicBranch') {
                        ctx.strokeRect(el.x - padding, el.y - padding, el.width + padding * 2, el.height + padding * 2);
                    }

                    // Handles (Only if single selection)
                    if (store.selection.length === 1) {
                        const handleSize = 8 / scale;
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 2 / scale;

                        if (el.type === 'line' || el.type === 'arrow' || el.type === 'organicBranch') {
                            // Line/Arrow/OrganicBranch Specific Handles (Start and End only)
                            const startX = el.x;
                            const startY = el.y;
                            const endX = el.x + el.width;
                            const endY = el.y + el.height;

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
                                { x: el.x - padding, y: el.y - padding }, // TL
                                { x: el.x + el.width + padding, y: el.y - padding }, // TR
                                { x: el.x + el.width + padding, y: el.y + el.height + padding }, // BR
                                { x: el.x - padding, y: el.y + el.height + padding }, // BL
                                // Side Handles
                                { x: el.x + el.width / 2, y: el.y - padding }, // TM
                                { x: el.x + el.width + padding, y: el.y + el.height / 2 }, // RM
                                { x: el.x + el.width / 2, y: el.y + el.height + padding }, // BM
                                { x: el.x - padding, y: el.y + el.height / 2 } // LM
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

        ctx.restore(); // Restore for line 104

        // OPTIMIZATION: Track rendering performance
        const drawTime = performance.now() - startTime;
        perfMonitor.measureFrame(drawTime, store.elements.length, totalRendered);
    }

    createEffect(() => {
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
            e.startArrowhead; e.endArrowhead;
            e.containerText; e.labelPosition; // Track label properties for immediate updates
            e.isCollapsed; e.parentId; // Track hierarchy state for immediate updates
            e.starPoints; // Track star points for parametric stars
            e.polygonSides; // Track polygon sides for parametric polygons
            e.borderRadius; // Track border radius
            e.burstPoints; // Track burst points for parametric burst
            e.tailPosition; // Track tail position for speech bubble
            e.shapeRatio; // Track shape ratio (sharpness)
            e.drawInnerBorder; // Track double border toggle
            e.innerBorderDistance; // Track double border distance
            e.strokeLineJoin; // Track corner style
            e.fillDensity; // Track fill density
            // Track gradient properties
            e.gradientStart; e.gradientEnd; e.gradientDirection;
            e.gradientStops; e.gradientType;
            // Track shadow properties
            e.shadowEnabled; e.shadowColor; e.shadowBlur; e.shadowOffsetX; e.shadowOffsetY;
            // Effects
            e.blendMode;
        });
        store.viewState.scale;
        store.viewState.panX;
        store.viewState.panY;
        store.selection.length;
        selectionBox();
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
        const { scale, panX, panY } = store.viewState;
        return {
            x: (clientX - panX) / scale,
            y: (clientY - panY) / scale
        };
    };

    const handleWheel = (e: WheelEvent) => {
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
                handles = [
                    { type: 'tl', x: el.x, y: el.y },
                    { type: 'br', x: el.x + el.width, y: el.y + el.height }
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


    const hitTestElement = (el: DrawingElement, x: number, y: number, threshold: number): boolean => {
        if (isElementHiddenByHierarchy(el, store.elements)) return false;
        // Transform point to local non-rotated space
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const p = unrotatePoint(x, y, cx, cy, el.angle || 0);

        // Check if inside bounding box (broad phase)
        // Normalize bounds to handle negative width/height
        const x1 = Math.min(el.x, el.x + el.width);
        const x2 = Math.max(el.x, el.x + el.width);
        const y1 = Math.min(el.y, el.y + el.height);
        const y2 = Math.max(el.y, el.y + el.height);

        if (p.x < x1 - threshold || p.x > x2 + threshold ||
            p.y < y1 - threshold || p.y > y2 + threshold) {
            return false;
        }

        if (el.type === 'rectangle') {
            // Check if inside
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
            return isPointInEllipse(p, el.x, el.y, el.width, el.height);
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
        } else if ((el.type === 'fineliner' || el.type === 'inkbrush' || el.type === 'marker') && el.points) {
            // For pen types, points are now relative to el.x, el.y
            // The point p is in local unrotated space matches el.x/y system.
            // But valid points are relative. So we need to check distance relative to (el.x, el.y).
            const localP = { x: p.x - el.x, y: p.y - el.y };
            const pts = normalizePoints(el.points);
            return isPointOnPolyline(localP, pts, threshold);
        } else if (el.type === 'text' || el.type === 'image') {
            return true; // Box check passed
        } else if (el.type === 'triangle' || el.type === 'hexagon' || el.type === 'octagon' ||
            el.type === 'parallelogram' || el.type === 'star' || el.type === 'cloud' ||
            el.type === 'heart' || el.type === 'cross' || el.type === 'checkmark' ||
            el.type === 'arrowLeft' || el.type === 'arrowRight' || el.type === 'arrowUp' || el.type === 'arrowDown' ||
            el.type === 'capsule' || el.type === 'stickyNote' || el.type === 'callout' ||
            el.type === 'burst' || el.type === 'speechBubble' || el.type === 'ribbon' ||
            el.type === 'bracketLeft' || el.type === 'bracketRight' ||
            el.type === 'database' || el.type === 'document' || el.type === 'predefinedProcess' || el.type === 'internalStorage' ||
            el.type === 'server' || el.type === 'loadBalancer' || el.type === 'firewall' || el.type === 'user' || el.type === 'messageQueue' || el.type === 'lambda' || el.type === 'router' || el.type === 'browser' ||
            el.type === 'trapezoid' || el.type === 'rightTriangle' || el.type === 'pentagon' || el.type === 'septagon' ||
            el.type === 'starPerson' || el.type === 'scroll' || el.type === 'wavyDivider' || el.type === 'doubleBanner' ||
            el.type === 'lightbulb' || el.type === 'signpost' || el.type === 'burstBlob' ||
            el.type === 'browserWindow' || el.type === 'mobilePhone' || el.type === 'ghostButton' || el.type === 'inputField') {
            // For new shapes, use bounding box hit test (simple and effective)
            return true; // Box check already passed above
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
                        currentId = crypto.randomUUID();

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
                        initialElementFontSize = el.fontSize || 20;

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

            // STEP 2: Fall back to individual element hit testing
            // Sort elements by visual order (Top to Bottom) for hit testing
            // Visual Order = Highest Layer Order -> Highest Array Index
            const sortedElements = store.elements.map((el, index) => {
                const layer = store.layers.find(l => l.id === el.layerId);
                return { el, index, layerOrder: layer?.order ?? 999, layerVisible: isLayerVisible(el.layerId) };
            }).sort((a, b) => {
                if (a.layerOrder !== b.layerOrder) return b.layerOrder - a.layerOrder; // Descending
                return b.index - a.index; // Descending
            });

            for (const { el, layerVisible } of sortedElements) {
                // Skip invisible layers
                if (!layerVisible) continue;

                // Skip elements on locked layers or locked elements
                if (!canInteractWithElement(el)) continue;

                if (hitTestElement(el, x, y, threshold)) {
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
            const id = crypto.randomUUID();
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

        if (store.selectedTool === 'eraser') {
            isDrawing = true; // Enable drag
            const threshold = 10 / store.viewState.scale;
            for (let i = store.elements.length - 1; i >= 0; i--) {
                const el = store.elements[i];
                if (hitTestElement(el, x, y, threshold)) {
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
        currentId = crypto.randomUUID();

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
        } as DrawingElement;

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
                        const isConstrained = e.shiftKey || (store.selection.length === 1 && firstEl?.constrained);

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
                        } else if (draggingHandle && draggingHandle.startsWith('control-')) {
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
                                    // Dragging the Curve Handle (Quadratic t=0.5)
                                    // Inverse math: CP = 2*mouse - 0.5*start - 0.5*end
                                    let start = { x: element.x, y: element.y };
                                    let end = { x: element.x + element.width, y: element.y + element.height };
                                    if (element.points && element.points.length >= 2) {
                                        if (element.points && element.points.length >= 2) {
                                            const pts = normalizePoints(element.points);
                                            if (pts.length > 0) {
                                                start = { x: element.x + pts[0].x, y: element.y + pts[0].y };
                                                end = { x: element.x + pts[pts.length - 1].x, y: element.y + pts[pts.length - 1].y };
                                            }
                                        }
                                    }

                                    const cpX = 2 * x - 0.5 * start.x - 0.5 * end.x;
                                    const cpY = 2 * y - 0.5 * start.y - 0.5 * end.y;

                                    newControlPoints[0] = { x: cpX, y: cpY };
                                } else {
                                    newControlPoints[index] = { x: x, y: y };
                                }

                                updateElement(id, { controlPoints: newControlPoints }, false);
                                requestAnimationFrame(draw);
                                return; // Skip resize logic
                            }
                        }

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
                                    updates.fontSize = Math.max(8, (init.fontSize || 20) * scaleY);
                                }

                                // Update without history push during drag
                                updateElement(selId, updates, false);
                            });
                        } else {
                            // SINGLE ELEMENT RESIZING
                            const id = store.selection[0];
                            const el = store.elements.find(e => e.id === id);
                            if (!el) return;

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
                                            // Handle pressure if exists in old object format
                                            ...(p.p !== undefined ? { p: p.p } : {})
                                        }));
                                    }
                                }
                            }

                            if (el.type === 'line' || el.type === 'arrow' || el.type === 'bezier') {
                                updates.points = refreshLinePoints(el, newX, newY, newX + newWidth, newY + newHeight);
                            }

                            updateElement(id, updates, false);
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


        if (!isDrawing || !currentId) {
            if (isDrawing && store.selectedTool === 'eraser') {
                const threshold = 10 / store.viewState.scale;
                for (let i = store.elements.length - 1; i >= 0; i--) {
                    const el = store.elements[i];
                    if (hitTestElement(el, x, y, threshold)) {
                        deleteElements([el.id]);
                    }
                }
            }
            return;
        }

        if (store.selectedTool === 'fineliner' || store.selectedTool === 'marker') {
            const el = store.elements.find(e => e.id === currentId);
            if (el && el.points) {
                const { x: ex, y: ey } = getWorldCoordinates(e.clientX, e.clientY);
                const px = ex - startX;
                const py = ey - startY;

                if (el.pointsEncoding === 'flat') {
                    const newPoints = [...(el.points as number[]), px, py];
                    updateElement(currentId, { points: newPoints }, false);
                } else {
                    const newPoints = [...(el.points as any[]), { x: px, y: py, p: 0.5 }];
                    updateElement(currentId, { points: newPoints }, false);
                }
            }
        } else if (store.selectedTool === 'inkbrush') {
            const el = store.elements.find(e => e.id === currentId);
            if (el && el.points) {
                const { x: ex, y: ey } = getWorldCoordinates(e.clientX, e.clientY);
                const px = ex - startX;
                const py = ey - startY;

                if (el.pointsEncoding === 'flat') {
                    const newPoints = [...(el.points as number[]), px, py];
                    updateElement(currentId, { points: newPoints }, false);
                } else {
                    const newPoints = [...(el.points as any[]), {
                        x: px,
                        y: py,
                        p: (e.pressure !== undefined && e.pressure > 0) ? e.pressure : 0.5
                    }];
                    updateElement(currentId, { points: newPoints }, false);
                }
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

            updateElement(currentId, {
                width: finalX - startX,
                height: finalY - startY
            });
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
        if (store.selectedTool === 'pan') {
            isDragging = false;
            setCursor('grab');
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
                } else if (el.type === 'fineliner' || el.type === 'marker') {
                    if (el.points && el.points.length > 2) {
                        // Simple normalization - keep all points for smooth curves
                        const updates = normalizePencil({ ...el, points: el.points });
                        if (updates) {
                            updateElement(currentId, updates);
                        }
                    }
                } else if (el.type === 'inkbrush') {
                    if (el.points && el.points.length > 2) {
                        // Normalize inkbrush - keep all points for cubic Bézier
                        const updates = normalizePencil({ ...el, points: el.points });
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
                const continuousTools = ['selection', 'pan', 'eraser', 'fineliner', 'inkbrush', 'marker', 'text', 'block-text'];
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
                        const fontSize = el.fontSize || 20;
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
            if (el.autoResize && canvasRef && !isLine) {
                const ctx = canvasRef.getContext("2d");
                if (ctx) {
                    const dims = fitShapeToText(ctx, el, newText);
                    updateElement(id, {
                        containerText: newText,
                        width: dims.width,
                        height: dims.height,
                    }, true);
                } else {
                    updateElement(id, { containerText: newText }, true);
                }
            } else {
                updateElement(id, { containerText: newText }, true);
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
        for (let i = store.elements.length - 1; i >= 0; i--) {
            const el = store.elements[i];
            if (!canInteractWithElement(el)) continue;

            if (hitTestElement(el, x, y, threshold)) {

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
                const shapeTypes = ['rectangle', 'circle', 'diamond', 'line', 'arrow', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'starPerson', 'scroll', 'wavyDivider', 'doubleBanner', 'lightbulb', 'signpost', 'burstBlob', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'];
                if (shapeTypes.includes(el.type)) {
                    setEditingId(el.id);
                    setEditText(el.containerText || '');
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
        handleResize();
        onCleanup(() => window.removeEventListener("resize", handleResize));
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
                    const { scale, panX, panY } = store.viewState;

                    // Center the textarea in the shape
                    const centerX = (el.x + el.width / 2) * scale + panX;
                    const centerY = (el.y + el.height / 2) * scale + panY;

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
                                font: `${(el.fontSize || 20) * scale}px ${el.fontFamily === 'sans-serif' ? 'Inter, sans-serif' :
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
                                'text-align': 'center'
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

export default Canvas;
