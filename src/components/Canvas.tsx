import { type Component, onMount, createEffect, onCleanup, createSignal, Show } from "solid-js";
import { store, setViewState, addElement, updateElement, setStore } from "../store/appStore";

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

    const handleResize = () => {
        if (canvasRef) {
            canvasRef.width = window.innerWidth;
            canvasRef.height = window.innerHeight;
            draw();
        }
    };

    const draw = () => {
        if (!canvasRef) return;
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;

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
            ctx.strokeStyle = el.strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.fillStyle = el.backgroundColor;

            // Selection highlight
            if (store.selection.includes(el.id)) {
                ctx.save();
                ctx.strokeStyle = '#007acc';
                ctx.lineWidth = 1 / scale;
                const padding = 4 / scale;
                ctx.strokeRect(el.x - padding, el.y - padding, el.width + padding * 2, el.height + padding * 2);
                ctx.restore();
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
                ctx.lineTo(el.x + el.width, el.y + el.height);
                ctx.stroke();
                // Arrow head logic later
            } else if (el.type === 'pencil' && el.points) {
                if (el.points.length > 0) {
                    ctx.moveTo(el.points[0].x, el.points[0].y);
                    for (let i = 1; i < el.points.length; i++) {
                        ctx.lineTo(el.points[i].x, el.points[i].y);
                    }
                    ctx.stroke();
                }
            } else if (el.type === 'text' && el.text) {
                const fontSize = 20;
                ctx.font = `${fontSize}px sans-serif`;
                ctx.fillStyle = el.strokeColor;
                ctx.fillText(el.text, el.x, el.y + fontSize); // Adjust for baseline
            }
        });

        ctx.restore();
    };

    createEffect(() => {
        store.elements.length;
        store.elements.forEach(e => {
            e.x; e.y; e.width; e.height;
            if (e.points) e.points.length;
        });
        store.viewState.scale;
        store.viewState.panX;
        store.viewState.panY;
        store.selection.length; // Trigger redraw on selection change

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
        if (e.ctrlKey || e.metaKey) {
            // Zoom
            const zoomSensitivity = 0.001;
            const zoom = 1 - e.deltaY * zoomSensitivity;
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
            setViewState({
                panX: store.viewState.panX - e.deltaX,
                panY: store.viewState.panY - e.deltaY
            });
        }
    };

    const handleMouseDown = (e: MouseEvent) => {
        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);

        // If editing text, commit on click away
        if (editingId()) {
            setEditingId(null);
            return;
        }

        if (store.selectedTool === 'selection') {
            // Hit Test (Simple bounding box for now)
            // Iterate reverse to select top-most
            let hitId: string | null = null;
            for (let i = store.elements.length - 1; i >= 0; i--) {
                const el = store.elements[i];
                if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
                    hitId = el.id;
                    break;
                }
            }

            if (hitId) {
                store.selection.includes(hitId) ? null : setStore('selection', [hitId]); // Simple single select
                isDragging = true;
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

        if (store.selectedTool === 'text') {
            const id = crypto.randomUUID();
            const newElement = {
                id,
                type: 'text' as const,
                x,
                y,
                width: 100, // min width
                height: 30, // min height
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                strokeWidth: 1,
                text: ''
            };
            addElement(newElement);
            setEditingId(id);
            setEditText("");
            setTimeout(() => textInputRef?.focus(), 0);
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
            points: store.selectedTool === 'pencil' ? [{ x, y }] : undefined
        };

        addElement(newElement);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);

        if (store.selectedTool === 'selection') {
            if (isDragging && store.selection.length > 0) {
                const dx = x - startX;
                const dy = y - startY;
                // Move selected element
                const id = store.selection[0];
                updateElement(id, { x: initialElementX + dx, y: initialElementY + dy });
            }
            return;
        }

        if (!isDrawing || !currentId) return;

        if (store.selectedTool === 'pencil') {
            // Append point
            // Efficiently update? store is reactive.
            // Ideally we grab the current element but store update logic is by ID
            // We can push to points.
            const el = store.elements.find(e => e.id === currentId);
            if (el && el.points) {
                updateElement(currentId, { points: [...el.points, { x, y }] });
            }
        } else {
            // Shapes
            updateElement(currentId, {
                width: x - startX,
                height: y - startY
            });
        }
    };

    const handleMouseUp = () => {
        if (store.selectedTool === 'selection') {
            isDragging = false;
            return;
        }

        if (isDrawing && currentId) {
            // Normalize rect/circle
            const el = store.elements.find(e => e.id === currentId);
            if (el && (el.type === 'rectangle' || el.type === 'circle')) {
                if (el.width < 0) {
                    updateElement(currentId, { x: el.x + el.width, width: Math.abs(el.width) });
                }
                if (el.height < 0) {
                    updateElement(currentId, { y: el.y + el.height, height: Math.abs(el.height) });
                }
            }
        }
        isDrawing = false;
        currentId = null;
    };

    const handleTextBlur = () => {
        const id = editingId();
        if (id) {
            updateElement(id, { text: editText() });
            setEditingId(null);
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
                style={{ display: "block", "touch-action": "none" }}
            />
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
