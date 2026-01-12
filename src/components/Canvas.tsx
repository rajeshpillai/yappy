import { type Component, onMount, createEffect, onCleanup, createSignal, Show } from "solid-js";
import rough from 'roughjs/bin/rough'; // Hand-drawn style
import { store, setViewState, addElement, updateElement, setStore, pushToHistory, deleteElements, toggleGrid, toggleSnapToGrid, setActiveLayer, setShowCanvasProperties, setSelectedTool } from "../store/appStore";
import { distanceToSegment, isPointOnPolyline, isPointInEllipse, intersectElementWithLine, isPointOnBezier } from "../utils/geometry";
import type { DrawingElement } from "../types";
import { renderElement } from "../utils/renderElement";
import ContextMenu from "./ContextMenu";
import { snapPoint } from "../utils/snapHelpers";


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

            if (topLayerId && topLayerId !== store.activeLayerId) {
                setActiveLayer(topLayerId);
            }
        }
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
    let initialPositions = new Map<string, { x: number, y: number }>();
    const [suggestedBinding, setSuggestedBinding] = createSignal<{ elementId: string; px: number; py: number } | null>(null);

    let initialElementX = 0;
    let initialElementY = 0;
    let initialElementWidth = 0;
    let initialElementHeight = 0;

    let initialElementPoints: { x: number; y: number }[] | undefined;
    let initialElementFontSize = 20;

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

    const draw = () => {
        if (!canvasRef) return;
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;

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

            // Restore transform for elements
            ctx.translate(panX, panY);
            ctx.scale(scale, scale);
        }

        // Render Elements - Sort by layer order and filter by visibility
        const visibleElements = store.elements
            .map(el => {
                const layer = store.layers.find(l => l.id === el.layerId);
                return { element: el, layer };
            })
            .filter(({ layer }) => layer?.visible !== false)  // Hide if layer invisible
            .sort((a, b) => {
                // First sort by layer order (lower order = background)
                const layerOrderDiff = (a.layer?.order ?? 999) - (b.layer?.order ?? 999);
                if (layerOrderDiff !== 0) return layerOrderDiff;

                // Within same layer, maintain element order
                return store.elements.indexOf(a.element) - store.elements.indexOf(b.element);
            });

        visibleElements.forEach(({ element: el, layer }) => {
            let cx = el.x + el.width / 2;
            let cy = el.y + el.height / 2;

            if (el.type !== 'text' || editingId() !== el.id) {
                const rc = rough.canvas(canvasRef);
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
                if (el.type !== 'line' && el.type !== 'arrow') {
                    ctx.strokeRect(el.x - padding, el.y - padding, el.width + padding * 2, el.height + padding * 2);
                }

                // Handles (Only if single selection)
                if (store.selection.length === 1) {
                    const handleSize = 8 / scale;
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 2 / scale;

                    if (el.type === 'line' || el.type === 'arrow') {
                        // Line/Arrow Specific Handles (Start and End only)
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
                        ctx.arc(rotH.x, rotH.y, handleSize / 2, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                    }

                    ctx.restore();
                } else {
                    // For multi-selection, just show the box (already drawn)
                    ctx.restore();
                }
            }
        });

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

    };

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
            e.startArrowhead; e.endArrowhead;
        });
        store.viewState.scale;
        store.viewState.panX;
        store.viewState.panY;
        store.selection.length;
        selectionBox();
        // Track layer changes
        store.layers.length;
        store.layers.forEach(l => {
            l.visible; l.order; l.opacity;
        });
        // Track grid settings changes
        store.gridSettings.enabled;
        store.gridSettings.gridSize;
        store.gridSettings.gridColor;
        store.gridSettings.gridOpacity;
        store.gridSettings.style;
        store.canvasBackgroundColor;
        requestAnimationFrame(draw);
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

    const getHandleAtPosition = (x: number, y: number) => {
        const { scale } = store.viewState;
        const handleSize = 10 / scale; // slightly larger hit area

        for (let i = store.elements.length - 1; i >= 0; i--) {
            const el = store.elements[i];
            if (!store.selection.includes(el.id)) continue;

            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const heading = el.angle || 0;

            // Transform mouse point to element's local system (unrotate)
            const local = unrotatePoint(x, y, cx, cy, heading);

            const padding = 2 / scale;

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

            if (el.type === 'line' || el.type === 'arrow') {
                // For lines, only TL (Start) and BR (End) are valid handles essentially.
                // We map them to the exact points.
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
        }
        return null;
    };

    // Helper: Normalize pencil points to be relative to bounding box
    const normalizePencil = (el: DrawingElement) => {
        if (!el.points || el.points.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        el.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        const width = maxX - minX;
        const height = maxY - minY;

        // Pad slightly? No, exact bounds.
        const newPoints = el.points.map(p => ({ x: p.x - minX, y: p.y - minY }));

        return {
            x: el.x + minX,
            y: el.y + minY,
            width,
            height,
            points: newPoints
        };
    };


    const hitTestElement = (el: DrawingElement, x: number, y: number, threshold: number): boolean => {
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

                if (Math.abs(w) > Math.abs(h)) {
                    cp1 = { x: el.x + w / 2, y: el.y };
                    cp2 = { x: endX - w / 2, y: endY };
                } else {
                    cp1 = { x: el.x, y: el.y + h / 2 };
                    cp2 = { x: endX, y: endY - h / 2 };
                }
                // Use threshold / scale? No, threshold is already correct?
                // The threshold passed to hitTestElement is "10 / scale".
                return isPointOnBezier(p, { x: el.x, y: el.y }, cp1, cp2, { x: endX, y: endY }, threshold);
            } else {
                // Line
                return distanceToSegment(p, { x: el.x, y: el.y }, { x: el.x + el.width, y: el.y + el.height }) <= threshold;
            }
        } else if (el.type === 'pencil' && el.points) {
            // For pencil, points are now relative to el.x, el.y
            // The point p is in local unrotated space matches el.x/y system.
            // But valid points are relative. So we need to check distance relative to (el.x, el.y).
            const localP = { x: p.x - el.x, y: p.y - el.y };
            return isPointOnPolyline(localP, el.points, threshold);
        } else if (el.type === 'text' || el.type === 'image') {
            return true; // Box check passed
        }

        return false;
    };

    // Helper: Check if element can be interacted with (not on locked layer)
    const canInteractWithElement = (el: DrawingElement): boolean => {
        const layer = store.layers.find(l => l.id === el.layerId);
        return layer?.locked !== true;
    };

    // Helper: Binding Check
    const checkBinding = (x: number, y: number, excludeId: string) => {
        const threshold = 40 / store.viewState.scale;
        let bindingHit = null;

        for (let i = store.elements.length - 1; i >= 0; i--) {
            const target = store.elements[i];
            if (target.id === excludeId || target.layerId !== store.activeLayerId || !canInteractWithElement(target)) continue;
            // Allow binding across layers? Maybe. For now restrict to active layer or just visible?
            // "target.layerId !== el.layerId" was in previous logic. Let's relax it to visible & unlocked.
            const layer = store.layers.find(l => l.id === target.layerId);
            if (!layer?.visible || layer?.locked) continue;

            if (target.type === 'rectangle' || target.type === 'circle' || target.type === 'image' || target.type === 'text') {
                let isHit = false;
                const cx = target.x + target.width / 2;
                const cy = target.y + target.height / 2;

                if (target.type === 'circle') {
                    const rx = target.width / 2;
                    const ry = target.height / 2;
                    const dx = x - cx;
                    const dy = y - cy;
                    // Check normalized distance (allow slightly outside)
                    const dist = (dx * dx) / ((rx + threshold) * (rx + threshold)) + (dy * dy) / ((ry + threshold) * (ry + threshold));
                    if (dist <= 1) isHit = true;
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
        }

        if (bindingHit) {
            const snapPoint = intersectElementWithLine(bindingHit, { x, y }, 5);
            if (snapPoint) {
                return { element: bindingHit, snapPoint };
            }
        }
        return null;
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
            // Allow resize ONLY if single item selected
            if (hitHandle && store.selection.length === 1) {
                pushToHistory();
                isDragging = true;
                draggingHandle = hitHandle.handle;
                const el = store.elements.find(e => e.id === hitHandle.id);
                if (el) {
                    initialElementX = el.x;
                    initialElementY = el.y;
                    initialElementWidth = el.width;
                    initialElementHeight = el.height;
                    initialElementPoints = el.points ? [...el.points] : undefined;
                    initialElementFontSize = el.fontSize || 20;
                    startX = x;
                    startY = y;
                }
                return;
            }

            // Hit Test Body
            let hitId: string | null = null;
            const threshold = 10 / store.viewState.scale;

            for (let i = store.elements.length - 1; i >= 0; i--) {
                const el = store.elements[i];
                // Skip elements on locked layers
                if (!canInteractWithElement(el)) continue;

                if (hitTestElement(el, x, y, threshold)) {
                    hitId = el.id;
                    break;
                }
            }

            if (hitId) {
                const isSelected = store.selection.includes(hitId);

                if (e.shiftKey) {
                    // Toggle selection
                    if (isSelected) {
                        setStore('selection', s => s.filter(id => id !== hitId));
                    } else {
                        setStore('selection', s => [...s, hitId]);
                    }
                } else {
                    // Normal click
                    if (!isSelected) {
                        setStore('selection', [hitId]);
                    }
                    // If already selected, do nothing (keep selection for potential drag)
                }

                // Initialize Move (if there is selection)
                if (store.selection.length > 0) {
                    pushToHistory();
                    isDragging = true;
                    draggingHandle = null;
                    startX = x;
                    startY = y;

                    // Capture initial positions for ALL selected elements
                    initialPositions.clear();
                    store.elements.forEach(el => {
                        if (store.selection.includes(el.id)) {
                            initialPositions.set(el.id, { x: el.x, y: el.y });
                        }
                    });
                }
            } else {
                // Clicked empty space
                if (!e.shiftKey) {
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
            alert('Cannot draw on a hidden layer. Please show the layer first or select a visible layer.');
            return;
        }
        if (activeLayer?.locked) {
            alert('Cannot draw on a locked layer. Please unlock the layer first or select an unlocked layer.');
            return;
        }

        if (store.selectedTool === 'text') {
            const id = crypto.randomUUID();
            const newElement = {
                id,
                type: 'text' as const,
                x,
                y,
                width: 100,
                height: 30,
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                strokeWidth: 1,
                text: '',
                fontSize: 20,
                angle: 0,
                opacity: 100,
                fillStyle: 'hachure' as 'hachure' | 'solid' | 'cross-hatch',
                strokeStyle: 'solid' as 'solid' | 'dashed' | 'dotted',
                roughness: 1,
                renderStyle: 'sketch' as 'sketch' | 'architectural',
                seed: Math.floor(Math.random() * 2 ** 31),
                roundness: null,
                locked: false,
                link: null,
                layerId: store.activeLayerId
            };
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
        const actualCurveType = tool === 'bezier' ? 'bezier' : 'straight';

        const newElement = {
            id: currentId,
            type: actualType,
            x: creationX,
            y: creationY,
            width: 0,
            height: 0,
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            strokeWidth: 2,
            points: tool === 'pencil' ? [{ x: 0, y: 0 }] : undefined,
            angle: 0,
            opacity: 100,
            strokeStyle: 'solid' as 'solid' | 'dashed' | 'dotted',
            fillStyle: 'hachure' as 'hachure' | 'solid' | 'cross-hatch',
            roughness: 1,
            renderStyle: 'sketch' as 'sketch' | 'architectural',
            seed: Math.floor(Math.random() * 2 ** 31),
            roundness: null,
            locked: false,
            link: null,
            layerId: store.activeLayerId,
            curveType: actualCurveType as 'straight' | 'bezier' | 'elbow'
        };

        addElement(newElement);
    };

    const handlePointerMove = (e: PointerEvent) => {
        let { x, y } = getWorldCoordinates(e.clientX, e.clientY);

        // Update Cursor
        if (store.selectedTool === 'pan') {
            setCursor(isDragging ? 'grabbing' : 'grab');
        } else if (store.selectedTool === 'selection' && !isDragging) {
            const hit = getHandleAtPosition(x, y);
            if (hit) {
                if (hit.handle === 'rotate') setCursor('grab');
                else if (hit.handle === 'tl' || hit.handle === 'br') setCursor('nwse-resize');
                else if (hit.handle === 'tr' || hit.handle === 'bl') setCursor('nesw-resize');
                else if (hit.handle === 'tm' || hit.handle === 'bm') setCursor('ns-resize');
                else if (hit.handle === 'lm' || hit.handle === 'rm') setCursor('ew-resize');
            } else {
                setCursor('default');
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

                if (draggingHandle) {
                    // Binding Logic for Lines/Arrows
                    if ((el.type === 'line' || el.type === 'arrow') && (draggingHandle === 'tl' || draggingHandle === 'br')) {
                        const match = checkBinding(x, y, el.id);
                        if (match) {
                            setSuggestedBinding({ elementId: match.element.id, px: match.snapPoint.x, py: match.snapPoint.y });
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

                        const updates: any = { x: newX, y: newY, width: newWidth, height: newHeight };

                        // Scale points for pencil
                        if (el.type === 'pencil' && initialElementPoints) {
                            const scaleX = newWidth / initialElementWidth;
                            const scaleY = newHeight / initialElementHeight;

                            const newPoints = initialElementPoints.map(p => ({
                                x: p.x * (initialElementWidth === 0 ? 1 : scaleX),
                                y: p.y * (initialElementHeight === 0 ? 1 : scaleY)
                            }));
                            updates.points = newPoints;
                        }
                        // Scale font size for text
                        if (el.type === 'text') {
                            const scaleY = newHeight / initialElementHeight;
                            if (scaleY > 0) {
                                let newFontSize = initialElementFontSize * scaleY;
                                newFontSize = Math.max(newFontSize, 8);
                                updates.fontSize = newFontSize;
                                updates.width = newWidth;
                            }
                        }
                        updateElement(id, updates);
                    }
                } else {
                    // Move Multiple Items
                    let dx = x - startX;
                    let dy = y - startY;

                    // Snap delta to grid if enabled
                    if (store.gridSettings.snapToGrid) {
                        const gridSize = store.gridSettings.gridSize;
                        dx = Math.round(dx / gridSize) * gridSize;
                        dy = Math.round(dy / gridSize) * gridSize;
                    }

                    store.selection.forEach(selId => {
                        const initPos = initialPositions.get(selId);
                        if (initPos) {
                            updateElement(selId, { x: initPos.x + dx, y: initPos.y + dy });

                            // Update Bound Lines
                            const movedEl = store.elements.find(e => e.id === selId);
                            if (movedEl && movedEl.boundElements) {
                                movedEl.boundElements.forEach(b => {
                                    const line = store.elements.find(l => l.id === b.id);
                                    if (line) {
                                        let startX = line.x;
                                        let startY = line.y;
                                        let endX = line.x + line.width;
                                        let endY = line.y + line.height;
                                        let changed = false;

                                        if (line.startBinding?.elementId === movedEl.id) {
                                            const p = intersectElementWithLine(movedEl, { x: endX, y: endY }, line.startBinding.gap);
                                            if (p) { startX = p.x; startY = p.y; changed = true; }
                                        }
                                        if (line.endBinding?.elementId === movedEl.id) {
                                            const p = intersectElementWithLine(movedEl, { x: startX, y: startY }, line.endBinding.gap);
                                            if (p) { endX = p.x; endY = p.y; changed = true; }
                                        }

                                        if (changed) {
                                            updateElement(line.id, {
                                                x: startX,
                                                y: startY,
                                                width: endX - startX,
                                                height: endY - startY
                                            });
                                        }
                                    }
                                });
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

        if (store.selectedTool === 'pencil') {
            const el = store.elements.find(e => e.id === currentId);
            if (el && el.points) {
                // Store relative to element origin (startX, startY)
                updateElement(currentId, { points: [...el.points, { x: x - startX, y: y - startY }] });
            }
        } else {
            // Apply snap to grid if enabled
            let finalX = x;
            let finalY = y;

            if (store.selectedTool === 'line' || store.selectedTool === 'arrow' || store.selectedTool === 'bezier') {
                if (currentId) {
                    const match = checkBinding(x, y, currentId);
                    if (match) {
                        setSuggestedBinding({ elementId: match.element.id, px: match.snapPoint.x, py: match.snapPoint.y });
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
    };

    const handlePointerUp = (e: PointerEvent) => {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
        if (store.selectedTool === 'pan') {
            isDragging = false;
            setCursor('grab');
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

                    if (e.shiftKey) {
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
                    if (el && (el.type === 'line' || el.type === 'arrow')) {
                        const isStart = draggingHandle === 'tl';
                        const bindingData = { elementId: binding.elementId, focus: 0, gap: 5 };

                        updateElement(elId, isStart ? { startBinding: bindingData } : { endBinding: bindingData });

                        // Update Target Bound Elements
                        const target = store.elements.find(e => e.id === binding.elementId);
                        if (target) {
                            const existing = target.boundElements || [];
                            if (!existing.find(b => b.id === elId)) {
                                updateElement(target.id, { boundElements: [...existing, { id: elId, type: el.type as 'arrow' }] });
                            }
                        }
                    }
                }
                setSuggestedBinding(null);
            }

            isDragging = false;
            draggingHandle = null;
            initialPositions.clear();
            return;
        }

        if (isDrawing && currentId) {
            const el = store.elements.find(e => e.id === currentId);
            if (el) {
                // Binding for new lines/arrows/bezier
                if ((el.type === 'line' || el.type === 'arrow') && suggestedBinding()) {
                    const binding = suggestedBinding()!;
                    const bindingData = { elementId: binding.elementId, focus: 0, gap: 5 };
                    // New lines are drawn from x,y (TopLeft) to x+width, y+height.
                    // The end point (width/height) is where the mouse is.
                    // So we update 'endBinding'.
                    updateElement(currentId, { endBinding: bindingData });

                    const target = store.elements.find(e => e.id === binding.elementId);
                    if (target) {
                        const existing = target.boundElements || [];
                        updateElement(target.id, { boundElements: [...existing, { id: currentId, type: el.type as 'arrow' }] });
                    }
                    setSuggestedBinding(null);
                }

                // Logic for normalization...
                // Logic for normalization...
                if (el.type === 'rectangle' || el.type === 'circle' || el.type === 'diamond') {
                    if (el.width < 0) {
                        updateElement(currentId, { x: el.x + el.width, width: Math.abs(el.width) });
                    }
                    if (el.height < 0) {
                        updateElement(currentId, { y: el.y + el.height, height: Math.abs(el.height) });
                    }
                } else if (el.type === 'pencil') {
                    // Normalize pencil
                    const updates = normalizePencil(el);
                    if (updates) {
                        updateElement(currentId, updates);
                    }
                }
            }

            // Switch back to selection tool after drawing (except for pencil/eraser?) 
            // User requested "After a shape is drawn". Usually pencil is continuous.
            // Let's reset for Shapes (Rect, Circle, Line, Arrow, Bezier).
            if (['rectangle', 'circle', 'line', 'arrow', 'image', 'bezier', 'diamond'].includes(store.selectedTool)) {
                setSelectedTool('selection');
            }
        }
        isDrawing = false;
        currentId = null;
    };

    const commitText = () => {
        const id = editingId();
        if (id) {
            const text = editText().trim();
            if (text) {
                const el = store.elements.find(e => e.id === id);
                let width = 0;
                let height = 0;
                if (canvasRef && el) {
                    const ctx = canvasRef.getContext("2d");
                    if (ctx) {
                        const fontSize = el.fontSize || 20;
                        ctx.font = `${fontSize}px sans-serif`;
                        const metrics = ctx.measureText(text);
                        width = metrics.width;
                        height = fontSize; // Approximate height as font size is standard for single line
                    }
                }
                // Fallback or min dimensions
                width = Math.max(width, 10);
                height = Math.max(height, 10);

                updateElement(id, { text: editText(), width, height }, true);
            } else {
                deleteElements([id]);
            }
            setEditingId(null);
            setEditText("");
            // Force redraw immediately to prevent flicker
            requestAnimationFrame(draw);
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
        window.addEventListener("resize", handleResize);
        handleResize();
        onCleanup(() => window.removeEventListener("resize", handleResize));
    });

    return (
        <>
            <canvas
                ref={canvasRef}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                    setContextMenuOpen(true);
                }}
                style={{ display: "block", "touch-action": "none", cursor: cursor() }}
            />

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
                    const screenX = el.x * scale + panX;
                    const screenY = el.y * scale + panY;

                    return (
                        <textarea
                            ref={textInputRef}
                            value={editText()}
                            onInput={(e) => setEditText(e.currentTarget.value)}
                            onBlur={handleTextBlur}
                            style={{
                                position: 'absolute',
                                top: `${screenY}px`,
                                left: `${screenX}px`,
                                font: `${20 * scale}px sans-serif`,
                                color: el.strokeColor,
                                background: 'transparent',
                                border: '1px dashed #007acc',
                                outline: 'none',
                                margin: 0,
                                padding: 0,
                                resize: 'none',
                                overflow: 'hidden',
                                'min-width': '50px',
                                'min-height': '1em'
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
                    items={[
                        {
                            label: 'Paste',
                            shortcut: 'Ctrl+V',
                            onClick: () => { },
                            disabled: true
                        },
                        {
                            label: 'Select all',
                            shortcut: 'Ctrl+A',
                            onClick: () => setStore('selection', store.elements.map(e => e.id))
                        },
                        { separator: true } as any,
                        {
                            label: 'Canvas Properties',
                            onClick: () => {
                                setStore('selection', []);
                                setShowCanvasProperties(true);
                            }
                        },
                        { separator: true } as any,
                        {
                            label: store.gridSettings.enabled ? 'Hide Grid' : 'Show Grid',
                            shortcut: "Shift+'",
                            onClick: toggleGrid,
                            checked: store.gridSettings.enabled
                        },
                        {
                            label: 'Snap to Grid',
                            shortcut: "Shift+;",
                            onClick: toggleSnapToGrid,
                            checked: store.gridSettings.snapToGrid
                        },
                        { separator: true } as any,
                        {
                            label: 'Reset View',
                            onClick: () => {
                                setViewState({ scale: 1, panX: 0, panY: 0 });
                            }
                        }
                    ]}
                    onClose={() => setContextMenuOpen(false)}
                />
            </Show>
        </>
    );
};

export default Canvas;
