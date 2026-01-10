import { type Component, onMount, createEffect, onCleanup } from "solid-js";
import { store, setViewState, addElement, updateElement } from "../store/appStore";

const Canvas: Component = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    let isDrawing = false;
    let currentId: string | null = null;
    let startX = 0;
    let startY = 0;

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
                ctx.font = `${20 * scale}px sans-serif`; // Needs text size handling
                ctx.fillStyle = el.strokeColor;
                ctx.fillText(el.text, el.x, el.y);
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
        if (store.selectedTool === 'selection') return;

        isDrawing = true;
        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);
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
        if (!isDrawing || !currentId) return;

        const { x, y } = getWorldCoordinates(e.clientX, e.clientY);

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

    onMount(() => {
        window.addEventListener("resize", handleResize);
        handleResize();
        onCleanup(() => window.removeEventListener("resize", handleResize));
    });

    return (
        <canvas
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ display: "block", "touch-action": "none" }}
        />
    );
};

export default Canvas;
