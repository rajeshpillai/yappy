import { store, addElement, updateElement, deleteElements, setViewState, pushToHistory, setStore, zoomToFit } from "./store/appStore";
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
            fontFamily: options?.fontFamily ?? defaults.fontFamily ?? 1,
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
            fontFamily: options?.fontFamily ?? defaults.fontFamily ?? 1,
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

    setView(scale: number, panX: number, panY: number) {
        setViewState({ scale, panX, panY });
    },

    async zoomToFit() {
        zoomToFit();
    }
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
