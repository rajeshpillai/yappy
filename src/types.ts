export type ElementType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'pencil' | 'eraser' | 'pan' | 'selection' | 'image';
export type FillStyle = 'hachure' | 'solid' | 'cross-hatch';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FontFamily = 1 | 2 | 3; // 1: Hand-drawn, 2: Normal, 3: Code
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ArrowHead = 'arrow' | 'triangle' | 'dot' | 'circle' | 'bar' | null;

export interface Point {
    x: number;
    y: number;
}

export interface DrawingElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;

    // Common Styles
    strokeColor: string;
    backgroundColor: string;
    fillStyle: FillStyle;
    strokeWidth: number;
    strokeStyle: StrokeStyle;
    roughness: number;
    opacity: number; // 0-100
    angle: number; // radians
    renderStyle: 'sketch' | 'architectural';
    seed: number;
    roundness: null | { type: number };
    locked: boolean;
    link: string | null;

    // Specific to Linear (Line, Arrow, Pencil)
    points?: Point[];
    startArrowhead?: ArrowHead;
    endArrowhead?: ArrowHead;

    // Specific to Text
    text?: string;
    rawText?: string;
    fontSize?: number;
    fontFamily?: FontFamily;
    textAlign?: TextAlign;
    verticalAlign?: VerticalAlign;
    containerId?: string | null;

    // Specific to Image
    fileId?: string | null;
    scale?: [number, number]; // [x, y]
    crop?: { x: number; y: number; width: number; height: number } | null;
    status?: 'pending' | 'loaded' | 'error';
    dataURL?: string;
    mimeType?: string;

    // Meta
    groupIds?: string[];
    boundElements?: { id: string; type: 'arrow' | 'text' }[] | null;
    isSelected?: boolean;
    layerId: string; // Reference to parent layer
    startBinding?: { elementId: string; focus: number; gap: number } | null;

    endBinding?: { elementId: string; focus: number; gap: number } | null;
    curveType?: 'straight' | 'bezier' | 'elbow';
}

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;    // 0-1
    order: number;      // Z-index for layer ordering (lower = background)
}

export interface GridSettings {
    enabled: boolean;       // Show grid
    snapToGrid: boolean;    // Snap to grid
    gridSize: number;       // Grid spacing in pixels (default 20)
    gridColor: string;      // Grid line color
    gridOpacity: number;    // Grid opacity (0-1)
    style: 'lines' | 'dots'; // Grid style
}

export interface ViewState {
    scale: number;
    panX: number;
    panY: number;
}
