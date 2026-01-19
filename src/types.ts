export type ElementType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'fineliner' | 'inkbrush' | 'marker' | 'eraser' | 'pan' | 'selection' | 'image' | 'bezier' | 'diamond' | 'triangle' | 'hexagon' | 'octagon' | 'parallelogram' | 'star' | 'cloud' | 'heart' | 'cross' | 'checkmark' | 'arrowLeft' | 'arrowUp' | 'arrowDown' | 'arrowRight' | 'capsule' | 'stickyNote' | 'callout' | 'burst' | 'speechBubble' | 'ribbon' | 'bracketLeft' | 'bracketRight' | 'database' | 'document' | 'predefinedProcess' | 'internalStorage' | 'server' | 'loadBalancer' | 'firewall' | 'user' | 'messageQueue' | 'lambda' | 'router' | 'browser' | 'trapezoid' | 'rightTriangle' | 'pentagon' | 'septagon' | 'starPerson' | 'scroll' | 'wavyDivider' | 'doubleBanner' | 'lightbulb' | 'signpost' | 'burstBlob' | 'browserWindow' | 'mobilePhone' | 'ghostButton' | 'inputField';
export type FillStyle = 'hachure' | 'solid' | 'cross-hatch' | 'zigzag' | 'dots' | 'dashed' | 'zigzag-line';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FontFamily = 'hand-drawn' | 'sans-serif' | 'monospace';
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ArrowHead = 'arrow' | 'triangle' | 'dot' | 'circle' | 'bar' | null;


export type Point = {
    x: number;
    y: number;
    p?: number; // pressure (0-1)
    t?: number; // timestamp for velocity calculation
};

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
    points?: Point[] | number[];
    pointsEncoding?: 'packed' | 'flat'; // flat is [x, y, x, y...], packed could be delta encoded in future
    // Control points for bezier curves and smart elbow routing
    // For bezier: [ { x, y } ] (absolute coordinates ideally, or relative to start/center?)
    // Let's use absolute coordinates for simplicity in hit testing, but they must move with shape
    controlPoints?: { x: number; y: number }[];
    startArrowhead?: ArrowHead;
    endArrowhead?: ArrowHead;

    // Specific to Text
    text?: string;
    rawText?: string;
    fontSize?: number;
    fontFamily?: FontFamily;
    fontWeight?: boolean | string;
    fontStyle?: boolean | string;
    textAlign?: TextAlign;
    verticalAlign?: VerticalAlign;
    containerId?: string | null;

    // Text inside shapes (for labels on rectangles, circles, etc.)
    containerText?: string;
    labelPosition?: 'start' | 'middle' | 'end'; // For line/arrow labels

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
    startBinding?: { elementId: string; focus: number; gap: number; position?: string } | null;
    endBinding?: { elementId: string; focus: number; gap: number; position?: string } | null;
    curveType?: 'straight' | 'bezier' | 'elbow';
    constrained?: boolean; // Keep proportions
    autoResize?: boolean; // Auto-resize based on text
}

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;    // 0-1
    order: number;      // Z-index for layer ordering (lower = background)
    backgroundColor?: string; // HEX or transparent
    colorTag?: string;     // Color name or hex for organizational tagging
    parentId?: string;     // ID of parent group layer
    isGroup?: boolean;     // Whether this layer is a container/group
    expanded?: boolean;    // For groups: whether child layers are visible in panel
}

export interface GridSettings {
    enabled: boolean;       // Show grid
    snapToGrid: boolean;    // Snap to grid
    objectSnapping: boolean; // Snap to other elements
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
