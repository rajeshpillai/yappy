import { type Component, onMount, createEffect, onCleanup, createSignal, Show } from "solid-js";
import { store, setViewState, addElement, updateElement, setStore, pushToHistory, deleteElements } from "../store/appStore";
import { distanceToSegment, isPointOnPolyline, isPointInEllipse } from "../utils/geometry";
import type { DrawingElement } from "../types";


const Canvas: Component = () => {

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

    const draw = () => {
        if (!canvasRef) return;
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;

        // Reset Transform Matrix to Identity so we don't accumulate translations!
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

        // Background color
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

        ctx.save();

        const { scale, panX, panY } = store.viewState;

        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        // Render Elements
        store.elements.forEach(el => {
            ctx.save();
            ctx.globalAlpha = (el.opacity ?? 100) / 100;

            // Apply rotation (center based)
            let cx = el.x + el.width / 2;
            let cy = el.y + el.height / 2;

            if (el.angle) {
                ctx.translate(cx, cy);
                ctx.rotate(el.angle);
                ctx.translate(-cx, -cy);
            }

            ctx.strokeStyle = el.strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.fillStyle = el.backgroundColor;

            // Stroke Style
            if (el.strokeStyle === 'dashed') {
                ctx.setLineDash([10, 10]);
            } else if (el.strokeStyle === 'dotted') {
                ctx.setLineDash([5, 10]);
            } else {
                ctx.setLineDash([]);
            }

            ctx.beginPath();
            if (el.type === 'rectangle') {
                ctx.rect(el.x, el.y, el.width, el.height);
                ctx.fill();
                ctx.stroke();
            } else if (el.type === 'circle') {
                ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width / 2), Math.abs(el.height / 2), 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            } else if (el.type === 'line' || el.type === 'arrow') {
                ctx.moveTo(el.x, el.y);
                const endX = el.x + el.width;
                const endY = el.y + el.height;
                ctx.lineTo(endX, endY);
                ctx.stroke();

                if (el.type === 'arrow') {
                    const angle = Math.atan2(el.height, el.width);
                    const headLen = 15;
                    ctx.beginPath();
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
                    ctx.stroke();
                }
            } else if (el.type === 'pencil' && el.points) {
                if (el.points.length > 0) {
                    // Points are either absolute (while drawing) or relative (after normalization)
                    // We can check if we are currently drawing this element? 
                    // Or simpler: We haven't normalized yet if it's being drawn.
                    // BUT: normalization happens on MouseUp.
                    // Ideally we always treat them as relative? 
                    // No, when drawing `handleMouseMove` pushes absolute coordinates.
                    // So we must distinguish. 
                    // HACK: If width/height are 0, assume absolute? No.
                    // Let's assume normalized if width > 0 ? 
                    // Or better: Just check bounds.
                    // Actually, simpler logic:
                    // If creating, points are absolute. `el.x` might be start coordinate.
                    // Let's rely on standard logic: `ctx.translate(el.x, el.y)`... not straightforward without changing `points`.

                    // Correct approach:
                    // If normalized, points start near 0,0.
                    // If absolute, points are huge.
                    // We can just add el.x/el.y ONLY if we normalised?
                    // Let's use a flag? No.
                    // Check handleMouseUp normalization. It sets `x` and `y`.
                    // While drawing, `x` and `y` are the start point, but `points` are absolute.

                    // Wait, if I change `draw` to:
                    // ctx.moveTo(el.x + p.x, el.y + p.y)
                    // Then absolute points will be offset by startX... Double offset!

                    // Solution:
                    // In `handleMouseMove` for pencil, store RELATIVE points from the start!
                    // startX, startY is the start.
                    // point = { x: x - startX, y: y - startY }.
                    // Then `el.x` = startX.
                    // Then `draw` is always relative.
                    // And `normalization` at the end just tightens the bounding box.

                    // Let's fix `handleMouseMove` instead!
                    // See next tool call.
                    // But for now, I update Draw assuming they are relative.
                    // Wait, `handleMouseMove` changes are future. Current `points` are absolute.
                    // I should change logic to allow both or consistent.

                    // Better: Assuming I fix `handleMouseMove` to be relative, then this code is:

                    ctx.moveTo(el.x + el.points[0].x, el.y + el.points[0].y);
                    for (let i = 1; i < el.points.length; i++) {
                        ctx.lineTo(el.x + el.points[i].x, el.y + el.points[i].y);
                    }
                    ctx.stroke();
                }
            } else if (el.type === 'text' && el.text) {
                if (editingId() !== el.id) {
                    const fontSize = el.fontSize || 20;
                    ctx.font = `${fontSize}px sans-serif`;

                    // Text Stretching logic
                    const metrics = ctx.measureText(el.text);
                    const actualWidth = metrics.width;
                    const scaleX = (el.width && actualWidth) ? (el.width / actualWidth) : 1;

                    ctx.fillStyle = el.strokeColor;

                    if (scaleX !== 1) {
                        ctx.save();
                        ctx.translate(el.x, el.y);
                        ctx.scale(scaleX, 1);
                        ctx.fillText(el.text, 0, fontSize);
                        ctx.restore();
                    } else {
                        ctx.fillText(el.text, el.x, el.y + fontSize);
                    }
                }
            }

            ctx.restore();

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
                ctx.strokeRect(el.x - padding, el.y - padding, el.width + padding * 2, el.height + padding * 2);

                // Handles
                const handleSize = 8 / scale;
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2 / scale;

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

                // Rotate Handle
                const rotH = { x: el.x + el.width / 2, y: el.y - padding - 20 / scale };
                ctx.beginPath();
                ctx.moveTo(el.x + el.width / 2, el.y - padding);
                ctx.lineTo(rotH.x, rotH.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(rotH.x, rotH.y, handleSize / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        });

    };

    createEffect(() => {
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
            const handles = [
                { type: 'tl', x: el.x - padding, y: el.y - padding },
                { type: 'tr', x: el.x + el.width + padding, y: el.y - padding },
                { type: 'br', x: el.x + el.width + padding, y: el.y + el.height + padding },
                { type: 'bl', x: el.x - padding, y: el.y + el.height + padding },
                { type: 'tm', x: el.x + el.width / 2, y: el.y - padding },
                { type: 'rm', x: el.x + el.width + padding, y: el.y + el.height / 2 },
                { type: 'bm', x: el.x + el.width / 2, y: el.y + el.height + padding },
                { type: 'lm', x: el.x - padding, y: el.y + el.height / 2 }
            ];

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

    let draggingHandle: string | null = null;

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
        // Add threshold to box check
        if (p.x < el.x - threshold || p.x > el.x + el.width + threshold ||
            p.y < el.y - threshold || p.y > el.y + el.height + threshold) {
            return false;
        }

        if (el.type === 'rectangle') {
            // Check if inside
            return true;
        } else if (el.type === 'circle') {
            return isPointInEllipse(p, el.x, el.y, el.width, el.height);
        } else if (el.type === 'line' || el.type === 'arrow') {
            // Line
            return distanceToSegment(p, { x: el.x, y: el.y }, { x: el.x + el.width, y: el.y + el.height }) <= threshold;
        } else if (el.type === 'pencil' && el.points) {
            // For pencil, points are now relative to el.x, el.y
            // The point p is in local unrotated space matches el.x/y system.
            // But valid points are relative. So we need to check distance relative to (el.x, el.y).
            const localP = { x: p.x - el.x, y: p.y - el.y };
            return isPointOnPolyline(localP, el.points, threshold);
        } else if (el.type === 'text') {
            return true; // Box check passed
        }

        return false;
    };

    const handleMouseDown = (e: MouseEvent) => {
        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);

        if (editingId()) {
            commitText();
            return;
        }



        if (store.selectedTool === 'selection') {
            const hitHandle = getHandleAtPosition(x, y);
            if (hitHandle) {
                pushToHistory(); // Save state before resize/rotate
                isDragging = true;
                draggingHandle = hitHandle.handle;
                const el = store.elements.find(e => e.id === hitHandle.id);
                if (el) {
                    initialElementX = el.x;
                    initialElementY = el.y;
                    initialElementWidth = el.width;
                    initialElementHeight = el.height;
                    initialElementHeight = el.height;
                    initialElementPoints = el.points ? [...el.points] : undefined;
                    initialElementFontSize = el.fontSize || 20;
                    startX = x;
                    startY = y;
                }
                return;
            }

            // Hit Test Body using refined logic
            let hitId: string | null = null;
            const threshold = 10 / store.viewState.scale;

            for (let i = store.elements.length - 1; i >= 0; i--) {
                const el = store.elements[i];
                if (hitTestElement(el, x, y, threshold)) {
                    hitId = el.id;
                    break;
                }
            }

            if (hitId) {
                store.selection.includes(hitId) ? null : setStore('selection', [hitId]);
                pushToHistory(); // Save state before move
                isDragging = true;
                draggingHandle = null;
                startX = x;
                startY = y;
                const el = store.elements.find(e => e.id === hitId);
                if (el) {
                    initialElementX = el.x;
                    initialElementY = el.y;
                }
            } else {
                setStore('selection', []);
            }
            return;
        }

        // ... existing creation logic for text/shapes ...
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
                seed: Math.floor(Math.random() * 2 ** 31),
                roundness: null,
                locked: false,
                link: null
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
        startX = x;
        startY = y;
        currentId = crypto.randomUUID();

        const newElement = {
            id: currentId,
            type: store.selectedTool,
            x,
            y,
            width: 0,
            height: 0,
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            strokeWidth: 2,
            points: store.selectedTool === 'pencil' ? [{ x: 0, y: 0 }] : undefined,
            angle: 0,
            opacity: 100,
            strokeStyle: 'solid' as 'solid' | 'dashed' | 'dotted',
            fillStyle: 'hachure' as 'hachure' | 'solid' | 'cross-hatch',
            roughness: 1,
            seed: Math.floor(Math.random() * 2 ** 31),
            roundness: null,
            locked: false,
            link: null
        };

        addElement(newElement);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);

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
            if (isDragging && store.selection.length > 0) {
                const id = store.selection[0];
                const el = store.elements.find(e => e.id === id);
                if (!el) return;

                if (draggingHandle) {
                    // Resize/Rotate logic
                    if (draggingHandle === 'rotate') {
                        const cx = el.x + el.width / 2;
                        const cy = el.y + el.height / 2;
                        // Calculate angle
                        const angle = Math.atan2(y - cy, x - cx);
                        // Handle is at top (-PI/2). So we need to offset.
                        // But we just want angle of pointer relative to center
                        // plus 90 deg offset because pointer started at -90 deg relative to center?
                        // Actually, just simpler: angle from center to mouse, plus 90 degrees (so when mouse is at top, angle is 0).
                        updateElement(id, { angle: angle + Math.PI / 2 });
                    } else {
                        // RESIZING
                        const dx = x - startX;
                        const dy = y - startY;

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
                    // Move
                    const dx = x - startX;
                    const dy = y - startY;
                    updateElement(id, { x: initialElementX + dx, y: initialElementY + dy });
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
            updateElement(currentId, {
                width: x - startX,
                height: y - startY
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

    const handleMouseUp = () => {
        if (store.selectedTool === 'pan') {
            isDragging = false;
            setCursor('grab');
            return;
        }

        if (store.selectedTool === 'selection') {
            if (isDragging && store.selection.length > 0) {
                // We finished dragging/resizing.
                // WE MUST RECORD PREVIOUS STATE BEFORE THE DRAG STARTED.
                // BUT we already modified the state during drag!
                // So `pushToHistory` NOW would save the MODIFIED state.
                // Logic flaw: We need to push history BEFORE modification starts.
                // In `handleMouseDown`, we didn't push.

                // Correction: `pushToHistory` saves CURRENT state to Undo.
                // If we call it BEFORE modification, we save "State A".
                // Then we modify to "State B".
                // Undo -> Restores "State A". Correct.

                // So we need to call `pushToHistory` in `handleMouseDown` when operation STARTS.
            }
            isDragging = false;
            draggingHandle = null;
            return;
        }

        if (isDrawing && currentId) {
            const el = store.elements.find(e => e.id === currentId);
            if (el) {
                // Logic for normalization...
                if (el.type === 'rectangle' || el.type === 'circle') {
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
            // Finished drawing, state is already updated (addElement called pushToHistory BEFORE adding).
            // So we are good?
            // `addElement` calls `pushToHistory` -> Saves "Empty Canvas".
            // Then adds element. "Canvas with Element".
            // Undo -> "Empty Canvas". Correct.
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
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
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
        </>
    );
};

export default Canvas;
