import type { ElementAnimation } from './types/motion-types';
export type ElementType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'fineliner' | 'inkbrush' | 'marker' | 'eraser' | 'pan' | 'selection' | 'image' | 'bezier' | 'diamond' | 'triangle' | 'hexagon' | 'octagon' | 'parallelogram' | 'star' | 'cloud' | 'heart' | 'cross' | 'checkmark' | 'arrowLeft' | 'arrowUp' | 'arrowDown' | 'arrowRight' | 'capsule' | 'stickyNote' | 'callout' | 'burst' | 'speechBubble' | 'ribbon' | 'bracketLeft' | 'bracketRight' | 'database' | 'document' | 'predefinedProcess' | 'internalStorage' | 'server' | 'loadBalancer' | 'firewall' | 'user' | 'messageQueue' | 'lambda' | 'router' | 'browser' | 'trapezoid' | 'rightTriangle' | 'pentagon' | 'septagon' | 'starPerson' | 'scroll' | 'wavyDivider' | 'doubleBanner' | 'lightbulb' | 'signpost' | 'burstBlob' | 'browserWindow' | 'mobilePhone' | 'ghostButton' | 'inputField' | 'organicBranch' | 'polygon';
export type FillStyle = 'hachure' | 'solid' | 'cross-hatch' | 'zigzag' | 'dots' | 'dashed' | 'zigzag-line' | 'linear' | 'radial' | 'conic';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FontFamily = 'hand-drawn' | 'sans-serif' | 'monospace';
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ArrowHead = 'arrow' | 'triangle' | 'dot' | 'circle' | 'bar' | null;

export interface GradientStop {
    offset: number; // 0 to 1
    color: string;
}

export type GradientType = 'linear' | 'radial' | 'conic';

export type BlendMode =
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'color-burn'
    | 'hard-light'
    | 'soft-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity'
    | 'source-over'
    | 'destination-over'; // standard composite ops



export type Point = {
    x: number;
    y: number;
    p?: number; // pressure (0-1)
    t?: number; // timestamp for velocity calculation
};

export type EntranceAnimation = 'none' |
    // Attention seekers
    'bounce' | 'flash' | 'pulse' | 'rubberBand' | 'shakeX' | 'shakeY' | 'headShake' | 'swing' | 'tada' | 'wobble' | 'jello' | 'heartBeat' |
    // Back entrances
    'backInDown' | 'backInLeft' | 'backInRight' | 'backInUp' |
    // Bouncing entrances
    'bounceIn' | 'bounceInDown' | 'bounceInLeft' | 'bounceInRight' | 'bounceInUp' |
    // Fading entrances
    'fadeIn' | 'fadeInDown' | 'fadeInDownBig' | 'fadeInLeft' | 'fadeInLeftBig' | 'fadeInRight' | 'fadeInRightBig' | 'fadeInUp' | 'fadeInUpBig' | 'fadeInTopLeft' | 'fadeInTopRight' | 'fadeInBottomLeft' | 'fadeInBottomRight' |
    // Flippers
    'flip' | 'flipInX' | 'flipInY' |
    // Lightspeed
    'lightSpeedInRight' | 'lightSpeedInLeft' |
    // Rotating entrances
    'rotateIn' | 'rotateInDownLeft' | 'rotateInDownRight' | 'rotateInUpLeft' | 'rotateInUpRight' |
    // Specials
    'rollIn' | 'jackInTheBox' |
    'scaleIn' | // Added for compatibility
    // Zooming entrances
    'zoomIn' | 'zoomInDown' | 'zoomInLeft' | 'zoomInRight' | 'zoomInUp' |
    // Sliding entrances
    'slideInDown' | 'slideInLeft' | 'slideInRight' | 'slideInUp';

export type ExitAnimation = 'none' |
    // Back exits
    'backOutDown' | 'backOutLeft' | 'backOutRight' | 'backOutUp' |
    // Bouncing exits
    'bounceOut' | 'bounceOutDown' | 'bounceOutLeft' | 'bounceOutRight' | 'bounceOutUp' |
    // Fading exits
    'fadeOut' | 'fadeOutDown' | 'fadeOutDownBig' | 'fadeOutLeft' | 'fadeOutLeftBig' | 'fadeOutRight' | 'fadeOutRightBig' | 'fadeOutUp' | 'fadeOutUpBig' | 'fadeOutTopLeft' | 'fadeOutTopRight' | 'fadeOutBottomRight' | 'fadeOutBottomLeft' |
    // Flippers
    'flipOutX' | 'flipOutY' |
    // Lightspeed
    'lightSpeedOutRight' | 'lightSpeedOutLeft' |
    // Rotating exits
    'rotateOut' | 'rotateOutDownLeft' | 'rotateOutDownRight' | 'rotateOutUpLeft' | 'rotateOutUpRight' |
    // Specials
    'rollOut' | 'hinge' |
    'scaleOut' | // Added for compatibility
    // Zooming exits
    'zoomOut' | 'zoomOutDown' | 'zoomOutLeft' | 'zoomOutRight' | 'zoomOutUp' |
    // Sliding exits
    'slideOutDown' | 'slideOutLeft' | 'slideOutRight' | 'slideOutUp';

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
    textColor?: string;
    textHighlightEnabled?: boolean;
    textHighlightColor?: string;
    textHighlightPadding?: number;
    textHighlightRadius?: number;

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
    boundElements?: { id: string; type: 'arrow' | 'text' | 'organicBranch' }[] | null;
    isSelected?: boolean;
    layerId: string; // Reference to parent layer
    startBinding?: { elementId: string; focus: number; gap: number; position?: string } | null;
    endBinding?: { elementId: string; focus: number; gap: number; position?: string } | null;
    curveType?: 'straight' | 'bezier' | 'elbow';
    constrained?: boolean; // Keep proportions
    autoResize?: boolean; // Auto-resize based on text
    parentId?: string | null;
    isCollapsed?: boolean;
    starPoints?: number; // Number of points for star shapes (3-12, default: 5)
    polygonSides?: number; // Number of sides for polygon shapes (3-20, default: 6)
    borderRadius?: number; // Corner radius percentage (0-50, default: 0)
    burstPoints?: number; // Number of points for burst shapes (8-32, default: 16)
    tailPosition?: number; // Tail position percentage (0-100, default: 20)
    shapeRatio?: number; // Inner/Outer radius ratio percentage (10-90, default: var)
    drawInnerBorder?: boolean; // Toggle for double border
    innerBorderColor?: string; // Optional color (defaults to strokeColor if null)
    innerBorderDistance?: number; // Distance from outer border (padding)
    strokeLineJoin?: 'round' | 'bevel' | 'miter'; // Corner style (default: 'round')
    fillDensity?: number;
    // Shadow Properties
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    // Gradient Properties
    gradientStart?: string; // Deprecated in favor of gradientStops
    gradientEnd?: string;   // Deprecated in favor of gradientStops
    gradientDirection?: number; // Angle in degrees (0-360)
    gradientStops?: GradientStop[];
    gradientType?: GradientType;
    gradientHandlePositions?: { start: Point; end: Point };

    // Effects
    blendMode?: BlendMode;
    filter?: string; // CSS filter string (e.g. "blur(5px)")
    isEditing?: boolean;


    // NEW: Robust Animation System
    /** @deprecated Use animations array instead */
    entranceAnimation?: EntranceAnimation;
    animations?: ElementAnimation[];
    isMotionPath?: boolean; // Can this element act as a path for others?

    // Motion Graphics
    flowAnimation?: boolean;
    flowSpeed?: number;          // 0 to 10
    flowStyle?: 'dashes' | 'dots' | 'pulse';
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
