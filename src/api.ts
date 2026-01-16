import {
    store, addElement, updateElement, deleteElements, setViewState, pushToHistory, setStore, zoomToFit,
    undo, redo, groupSelected, ungroupSelected, duplicateElement, toggleTheme,
    addLayer, deleteLayer, setActiveLayer, mergeLayerDown, flattenLayers, isolateLayer, showAllLayers,
    toggleGrid, toggleSnapToGrid, toggleCommandPalette, togglePropertyPanel
} from "./store/appStore";
import type { ElementType, DrawingElement, FillStyle, StrokeStyle, FontFamily, TextAlign, ArrowHead } from "./types";

interface ElementOptions {
    strokeColor?: string;
    backgroundColor?: string;
    fillStyle?: FillStyle;
    strokeWidth?: number;
    strokeStyle?: StrokeStyle;
    opacity?: number;
    roughness?: number;
    angle?: number;
    roundness?: { type: number } | null;
    fontFamily?: FontFamily;
    fontSize?: number;
    textAlign?: TextAlign;
    startArrowhead?: ArrowHead;
    endArrowhead?: ArrowHead;
    seed?: number;
    layerId?: string;
    curveType?: 'straight' | 'bezier' | 'elbow';
    startBinding?: { elementId: string; focus: number; gap: number } | null;
    endBinding?: { elementId: string; focus: number; gap: number } | null;
}

export const YappyAPI = {
    /**
     * Get the current state wrapper
     */
    get state() {
        return store;
    },

    /**
     * Create a generic element
     */
    createElement(type: ElementType, x: number, y: number, width: number, height: number, options?: ElementOptions): string {
        const id = crypto.randomUUID();
        const defaults = store.defaultElementStyles;

        const element: DrawingElement = {
            id,
            type,
            x,
            y,
            width,
            height,
            strokeColor: options?.strokeColor ?? defaults.strokeColor ?? '#000000',
            backgroundColor: options?.backgroundColor ?? defaults.backgroundColor ?? 'transparent',
            fillStyle: options?.fillStyle ?? defaults.fillStyle ?? 'hachure',
            strokeWidth: options?.strokeWidth ?? defaults.strokeWidth ?? 1,
            strokeStyle: options?.strokeStyle ?? defaults.strokeStyle ?? 'solid',
            opacity: options?.opacity ?? defaults.opacity ?? 100,
            roughness: options?.roughness ?? defaults.roughness ?? 1,
            angle: options?.angle ?? 0,
            renderStyle: defaults.renderStyle ?? 'sketch',
            seed: options?.seed ?? Math.floor(Math.random() * 2 ** 31),
            roundness: options?.roundness ?? defaults.roundness ?? null,
            fontFamily: options?.fontFamily ?? defaults.fontFamily ?? "hand-drawn",
            fontSize: options?.fontSize ?? defaults.fontSize ?? 20,
            textAlign: options?.textAlign ?? defaults.textAlign ?? 'left',
            startArrowhead: options?.startArrowhead ?? defaults.startArrowhead ?? null,
            endArrowhead: options?.endArrowhead ?? defaults.endArrowhead ?? 'arrow',
            locked: false,
            link: null,
            layerId: options?.layerId ?? store.activeLayerId,
            curveType: options?.curveType ?? 'straight',
            ...options
        };

        addElement(element);
        return id;
    },

    createRectangle(x: number, y: number, width: number, height: number, options?: ElementOptions) {
        return this.createElement('rectangle', x, y, width, height, options);
    },

    createCircle(x: number, y: number, width: number, height: number, options?: ElementOptions) {
        return this.createElement('circle', x, y, width, height, options);
    },

    createDiamond(x: number, y: number, width: number, height: number, options?: ElementOptions) {
        return this.createElement('diamond', x, y, width, height, options);
    },

    createLine(x1: number, y1: number, x2: number, y2: number, options?: ElementOptions) {
        // Line width/height logic is relative
        const width = x2 - x1;
        const height = y2 - y1;
        return this.createElement('line', x1, y1, width, height, options);
    },

    createArrow(x1: number, y1: number, x2: number, y2: number, options?: ElementOptions) {
        const width = x2 - x1;
        const height = y2 - y1;
        return this.createElement('arrow', x1, y1, width, height, { ...options });
    },

    createBezier(x1: number, y1: number, x2: number, y2: number, options?: ElementOptions) {
        const width = x2 - x1;
        const height = y2 - y1;
        return this.createElement('line', x1, y1, width, height, { ...options, curveType: 'bezier' });
    },

    createText(x: number, y: number, text: string, options?: ElementOptions) {
        const id = crypto.randomUUID();
        const defaults = store.defaultElementStyles;

        // Basic size estimation (can be updated later or user provides)
        const fontSize = options?.fontSize ?? defaults.fontSize ?? 20;
        const estimatedWidth = text.length * (fontSize * 0.6);

        const element: DrawingElement = {
            id,
            type: 'text',
            x,
            y,
            width: estimatedWidth,
            height: fontSize * 1.5,
            text: text,
            strokeColor: options?.strokeColor ?? defaults.strokeColor ?? '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            opacity: options?.opacity ?? 100,
            roughness: 0,
            angle: options?.angle ?? 0,
            renderStyle: 'sketch',
            seed: Math.floor(Math.random() * 2 ** 31),
            roundness: null,
            fontFamily: options?.fontFamily ?? defaults.fontFamily ?? "hand-drawn",
            fontSize: fontSize,
            textAlign: options?.textAlign ?? defaults.textAlign ?? 'left',
            locked: false,
            link: null,
            layerId: options?.layerId ?? store.activeLayerId,
            ...options
        };

        addElement(element);
        return id;
    },

    getElement(id: string) {
        return store.elements.find(e => e.id === id);
    },

    updateElement(id: string, updates: Partial<DrawingElement>) {
        updateElement(id, updates, true);
    },

    deleteElement(id: string) {
        deleteElements([id]);
    },

    clear() {
        if (store.elements.length > 0) {
            pushToHistory();
            setStore("elements", []);
            setStore("selection", []);
        }
    },

    setSelected(ids: string[]) {
        setStore("selection", ids);
    },

    setView(scale: number, panX: number, panY: number) {
        setViewState({ scale, panX, panY });
    },

    updateGridSettings(settings: any) {
        setStore("gridSettings", (s) => ({ ...s, ...settings }));
    },

    updateDefaultStyles(styles: any) {
        setStore("defaultElementStyles", (s) => ({ ...s, ...styles }));
    },

    async zoomToFit() {
        zoomToFit();
    },

    /**
     * Connect two elements with a line/arrow
     */
    connect(sourceId: string, targetId: string, options?: ElementOptions & { type?: 'line' | 'arrow' }) {
        const source = this.getElement(sourceId);
        const target = this.getElement(targetId);

        if (!source || !target) {
            console.error("Source or Target element not found");
            return null;
        }

        // Calculate approximate center points for initial placement
        const sx = source.x + source.width / 2;
        const sy = source.y + source.height / 2;
        const tx = target.x + target.width / 2;
        const ty = target.y + target.height / 2;

        const type = options?.type ?? 'arrow';
        const curveType = options?.curveType ?? 'bezier';

        // Helper to intersect (simple AABB center cast for now)
        // Ideally we use proper intersection logic, but let's at least snap to edges if we can
        // For API simplicity, we'll stick to center-to-center logic for now as 'binding' should generally snap visual anyway
        // BUT if user says "connectors are not connecting", maybe the binding data is not enough for the renderer
        // if the start/end point is INSIDE the shape.

        // Let's try to calculate intersection with edge
        const intersect = (x1: number, y1: number, x2: number, y2: number, rect: DrawingElement) => {
            // Simple center-to-center intersection with AABB
            const cx = rect.x + rect.width / 2;
            const cy = rect.y + rect.height / 2;
            const w = rect.width / 2;
            const h = rect.height / 2;

            const dx = x2 - x1;
            const dy = y2 - y1;

            if (dx === 0 && dy === 0) return { x: x1, y: y1 };

            // Diamond specific intersection
            if (rect.type === 'diamond') {
                const angle = Math.atan2(dy, dx);
                // |dx|/w + |dy|/h = 1
                const absTan = Math.abs(Math.tan(angle));
                const absDx = 1 / ((1 / w) + (absTan / h));

                const dX = (dx > 0 ? 1 : -1) * absDx;
                const dY = dX * Math.tan(angle);

                return { x: cx + dX, y: cy + dY };
            }

            // Find intersection with box
            // We use Liang-Barsky or similar, or just Ratio
            // t near 0 is source, near 1 is target

            // Let's assume we want to find point on rect boundary that matches angle
            // This is "good enough" for initial API placement
            // angle from center
            const angle = Math.atan2(dy, dx);

            // intersection with vertical edges
            // x = cx +/- w
            // y = cy + tan(a) * (x - cx)
            const rx = dx > 0 ? cx + w : cx - w;
            const ry = cy + Math.tan(angle) * (rx - cx);

            // intersection with horizontal edges
            // y = cy +/- h
            // x = cx + (y - cy) / tan(a)
            const by = dy > 0 ? cy + h : cy - h;
            const bx = cx + (by - cy) / Math.tan(angle);

            // check which is valid (within bounds)
            // intersection is the one closest to center? No, we check if points are on segment

            const onV = (ry >= cy - h - 1 && ry <= cy + h + 1);
            const onH = (bx >= cx - w - 1 && bx <= cx + w + 1);

            if (onV && onH) {
                // Corner case, taking V
                return { x: rx, y: ry };
            }
            if (onV) return { x: rx, y: ry };
            if (onH) return { x: bx, y: by };

            return { x: cx, y: cy }; // Fallback
        };

        const startP = intersect(sx, sy, tx, ty, source);
        const endP = intersect(tx, ty, sx, sy, target); // Reverse for target

        const id = this.createElement(type, startP.x, startP.y, endP.x - startP.x, endP.y - startP.y, {
            ...options,
            curveType,
            startBinding: { elementId: sourceId, focus: 0, gap: 5 },
            endBinding: { elementId: targetId, focus: 0, gap: 5 }
        });

        // We also need to update the boundElements of source and target to know about this line
        // This logic mimics handlePointerUp binding logic in Canvas.tsx
        const updateBindings = (el: DrawingElement, lineId: string) => {
            const existing = el.boundElements || [];
            if (!existing.find(b => b.id === lineId)) {
                this.updateElement(el.id, { boundElements: [...existing, { id: lineId, type: type as 'arrow' }] });
            }
        };

        updateBindings(source, id);
        updateBindings(target, id);

        return id;
    },

    // History
    undo() { undo(); },
    redo() { redo(); },

    // Grouping
    groupSelection() { groupSelected(); },
    ungroupSelection() { ungroupSelected(); },

    // Transformation
    duplicate(id: string) { duplicateElement(id); },
    toggleTheme() { toggleTheme(); },

    // Layers
    addLayer(name?: string) { return addLayer(name); },
    deleteLayer(id: string) { deleteLayer(id); },
    setActiveLayer(id: string) { setActiveLayer(id); },
    mergeLayerDown(id: string) { mergeLayerDown(id); },
    flattenLayers() { flattenLayers(); },
    isolateLayer(id: string) { isolateLayer(id); },
    showAllLayers() { showAllLayers(); },

    // Grid & Snapping
    toggleGrid() { toggleGrid(); },
    toggleSnapToGrid() { toggleSnapToGrid(); },

    // Command Palette
    toggleCommandPalette(visible?: boolean) { toggleCommandPalette(visible); },
    togglePropertyPanel(visible?: boolean) { togglePropertyPanel(visible); }
};

declare global {
    interface Window {
        Yappy: typeof YappyAPI;
    }
}

export const initAPI = () => {
    window.Yappy = YappyAPI;
    console.log("Yappy API initialized. Use window.Yappy to interact.");
};
