import {
    store, setStore, pushToHistory,
    deleteElements, updateElement
} from "../store/appStore";
import { normalizePoints } from "./geometry";

export const copyToClipboard = async () => {
    if (store.selection.length === 0) return;

    const elementsToCopy = store.elements.filter(el => store.selection.includes(el.id));
    const clipboardData = {
        type: 'yappy-elements',
        elements: elementsToCopy
    };

    try {
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
};

export const cutToClipboard = async () => {
    await copyToClipboard();
    deleteElements(store.selection);
};

export const pasteFromClipboard = async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return;

        const data = JSON.parse(text);
        if (data.type === 'yappy-elements' && Array.isArray(data.elements)) {
            pushToHistory();
            const newIds: string[] = [];

            // Calculate center of viewport to paste
            const viewportCX = -store.viewState.panX / store.viewState.scale + (window.innerWidth / 2) / store.viewState.scale;
            const viewportCY = -store.viewState.panY / store.viewState.scale + (window.innerHeight / 2) / store.viewState.scale;

            // Find center of copied elements
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            data.elements.forEach((el: any) => {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.width);
                maxY = Math.max(maxY, el.y + el.height);
            });
            const contentCX = minX + (maxX - minX) / 2;
            const contentCY = minY + (maxY - minY) / 2;

            const dx = viewportCX - contentCX;
            const dy = viewportCY - contentCY;

            data.elements.forEach((el: any) => {
                const newId = crypto.randomUUID();
                const newEl = {
                    ...el,
                    id: newId,
                    x: el.x + dx,
                    y: el.y + dy,
                    layerId: store.activeLayerId, // Paste to active layer
                    groupIds: [] // Reset groups for now, or handle complex group logic?
                };
                setStore('elements', els => [...els, newEl]);
                newIds.push(newId);
            });
            setStore('selection', newIds);
        }
    } catch (err) {
        console.error('Failed to paste: ', err);
    }
};

export const flipSelected = (direction: 'horizontal' | 'vertical') => {
    if (store.selection.length === 0) return;
    pushToHistory();

    // Determine flip axis (center of selection)
    let min = Infinity, max = -Infinity;
    store.elements.forEach(el => {
        if (store.selection.includes(el.id)) {
            if (direction === 'horizontal') {
                min = Math.min(min, el.x);
                max = Math.max(max, el.x + el.width);
            } else {
                min = Math.min(min, el.y);
                max = Math.max(max, el.y + el.height);
            }
        }
    });

    const center = min + (max - min) / 2;

    store.selection.forEach(id => {
        const el = store.elements.find(e => e.id === id);
        if (!el) return;

        if (direction === 'horizontal') {
            const elCenterX = el.x + el.width / 2;
            const dist = elCenterX - center;
            const newX = center - dist - el.width / 2;

            if (el.points) {
                const pts = normalizePoints(el.points);
                if (pts.length > 0) {
                    // For horizontal flip: x = width - x
                    const newPoints = pts.map(p => ({ x: el.width - p.x, y: p.y }));
                    // Always save as objects or flatten? Let's respect encoding if possible but for simplicity saving as flat if originally flat is good.
                    // Actually, let's keep it simple and just save as object array unless we write a re-flattener.
                    // Or better: write a helper 'denormalizePoints' or just save as Object Point[] and let saveDrawing flatten it later.
                    // The saveDrawing logic handles flattening! So we can save as Object Point[] safely.
                    updateElement(id, { x: newX, points: newPoints, pointsEncoding: undefined, seed: el.seed + 1 }, false);
                } else if (!el.points || el.points.length === 0) {
                    // Should imply standard shape?
                    updateElement(id, { x: newX, seed: el.seed + 1 }, false);
                }
            } else {
                updateElement(id, { x: newX, seed: el.seed + 1 }, false);
            }
        } else {
            const elCenterY = el.y + el.height / 2;
            const dist = elCenterY - center;
            const newY = center - dist - el.height / 2;

            if (el.points) {
                const pts = normalizePoints(el.points);
                if (pts.length > 0) {
                    // For vertical flip: y = height - y
                    const newPoints = pts.map(p => ({ x: p.x, y: el.height - p.y }));
                    updateElement(id, { y: newY, points: newPoints, pointsEncoding: undefined, seed: el.seed + 1 }, false);
                } else {
                    updateElement(id, { y: newY, seed: el.seed + 1 }, false);
                }
            } else {
                updateElement(id, { y: newY, seed: el.seed + 1 }, false);
            }
        }
    });
};

export const lockSelected = (locked: boolean) => {
    store.selection.forEach(id => {
        updateElement(id, { locked });
    });
};

// Style Copy/Paste
let clipboardStyle: any = null;

export const copyStyle = () => {
    if (store.selection.length !== 1) return;
    const el = store.elements.find(e => e.id === store.selection[0]);
    if (el) {
        clipboardStyle = {
            strokeColor: el.strokeColor,
            backgroundColor: el.backgroundColor,
            fillStyle: el.fillStyle,
            strokeWidth: el.strokeWidth,
            strokeStyle: el.strokeStyle,
            roughness: el.roughness,
            opacity: el.opacity,
            fontFamily: el.fontFamily,
            fontSize: el.fontSize,
            textAlign: el.textAlign,
            roundness: el.roundness
        };
    }
};

export const pasteStyle = () => {
    if (!clipboardStyle || store.selection.length === 0) return;
    pushToHistory();
    store.selection.forEach(id => {
        updateElement(id, clipboardStyle);
    });
};
