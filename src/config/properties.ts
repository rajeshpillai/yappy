import type { ElementType } from "../types";

export interface PropertyConfig {
    key: string;
    label: string;
    type: 'color' | 'slider' | 'select' | 'toggle' | 'input' | 'number' | 'textarea';
    options?: { label: string; value: any; icon?: any }[];
    min?: number;
    max?: number;
    step?: number;
    applicableTo: (ElementType | 'canvas')[] | 'all';
    defaultValue?: any;
    group: 'style' | 'stroke' | 'background' | 'text' | 'dimensions' | 'advanced' | 'canvas';
}

export const properties: PropertyConfig[] = [
    // Canvas Properties
    {
        key: 'canvasBackgroundColor',
        label: 'Background',
        type: 'color',
        options: [
            { label: 'White', value: '#ffffff' },
            { label: 'Light Gray', value: '#fafafa' },
            { label: 'Paper', value: '#fdf6e3' },
            { label: 'Dark Gray', value: '#121212' },
            { label: 'Deep Black', value: '#000000' }
        ],
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: '#fafafa'
    },
    {
        key: 'canvasTexture',
        label: 'Canvas Texture',
        type: 'select',
        options: [
            { label: 'None', value: 'none' },
            { label: 'Dots', value: 'dots' },
            { label: 'Grid', value: 'grid' },
            { label: 'Graph Paper', value: 'graph' },
            { label: 'Recycled Paper', value: 'paper' }
        ],
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: 'none'
    },
    {
        key: 'maxLayers',
        label: 'Max Layers',
        type: 'number',
        min: 1,
        max: 100,
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: 20
    },
    {
        key: 'gridEnabled',
        label: 'Show Grid',
        type: 'toggle',
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: false
    },
    {
        key: 'snapToGrid',
        label: 'Snap to Grid',
        type: 'toggle',
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: false
    },
    {
        key: 'objectSnapping',
        label: 'Smart Snapping',
        type: 'toggle',
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: true
    },
    {
        key: 'gridStyle',
        label: 'Grid Style',
        type: 'select',
        options: [
            { label: 'Lines', value: 'lines' },
            { label: 'Dots', value: 'dots' }
        ],
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: 'lines'
    },
    {
        key: 'gridColor',
        label: 'Grid Color',
        type: 'color',
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: '#e0e0e0'
    },
    {
        key: 'gridOpacity',
        label: 'Grid Opacity',
        type: 'slider',
        min: 0.1,
        max: 1,
        step: 0.1,
        group: 'canvas',
        applicableTo: ['canvas'],
        defaultValue: 0.5
    },
    // Style
    {
        key: 'renderStyle',
        label: 'Style',
        type: 'select',
        group: 'style',
        options: [
            { label: 'Sketch', value: 'sketch' },
            { label: 'Architectural', value: 'architectural' }
        ],
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'],
        defaultValue: 'sketch'
    },
    {
        key: 'borderRadius',
        label: 'Roundness',
        type: 'slider',
        min: 0,
        max: 50,
        step: 1,
        group: 'style',
        applicableTo: ['rectangle', 'diamond', 'capsule', 'speechBubble', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'],
        defaultValue: 0
    },
    // Stroke
    {
        key: 'strokeColor',
        label: 'Stroke',
        type: 'color',
        group: 'stroke',
        applicableTo: 'all',
        defaultValue: '#000000'
    },
    {
        key: 'backgroundColor',
        label: 'Background',
        type: 'color',
        group: 'background',
        applicableTo: ['rectangle', 'circle', 'text', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'], // text bg? maybe
        defaultValue: 'transparent'
    },
    {
        key: 'fillStyle',
        label: 'Fill',
        type: 'select',
        group: 'background',
        options: [
            { label: 'Solid', value: 'solid' },
            { label: 'Hachure', value: 'hachure' },
            { label: 'Cross-Hatch', value: 'cross-hatch' }
        ],
        applicableTo: ['rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'],
        defaultValue: 'hachure'
    },
    {
        key: 'strokeWidth',
        label: 'Width',
        type: 'slider',
        min: 1,
        max: 20,
        step: 1,
        group: 'stroke',
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'fineliner', 'inkbrush', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'cross', 'checkmark', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'],
        defaultValue: 1
    },
    {
        key: 'strokeStyle',
        label: 'Stroke Style',
        type: 'select',
        group: 'stroke',
        options: [
            { label: 'Solid', value: 'solid' },
            { label: 'Dashed', value: 'dashed' },
            { label: 'Dotted', value: 'dotted' }
        ],
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'cross', 'checkmark', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'], // Exclude text
        defaultValue: 'solid'
    },
    {
        key: 'roughness',
        label: 'Sloppiness',
        type: 'slider',
        min: 0,
        max: 3,
        step: 0.1,
        group: 'style',
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon', 'browserWindow', 'mobilePhone', 'ghostButton', 'inputField'],
        defaultValue: 1
    },
    {
        key: 'opacity',
        label: 'Opacity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        group: 'style',
        applicableTo: 'all',
        defaultValue: 100
    },

    // Text Specific
    {
        key: 'fontSize',
        label: 'Size',
        type: 'select',
        // simplified to select for now, could be slider
        options: [
            { label: 'Small', value: 16 },
            { label: 'Medium', value: 20 },
            { label: 'Large', value: 28 },
            { label: 'XL', value: 36 }
        ],
        group: 'text',
        applicableTo: ['text', 'rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'line', 'arrow', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: 20
    },
    {
        key: 'fontFamily',
        label: 'Font',
        type: 'select',
        options: [
            { label: 'Virgil (Hand)', value: 'hand-drawn' },
            { label: 'Inter (Sans)', value: 'sans-serif' },
            { label: 'Cascadia (Code)', value: 'monospace' }
        ],
        group: 'text',
        applicableTo: ['text', 'rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'line', 'arrow', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: 'hand-drawn'
    },
    {
        key: 'fontWeight',
        label: 'Bold',
        type: 'toggle',
        group: 'text',
        applicableTo: ['text', 'rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'line', 'arrow', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: false
    },
    {
        key: 'fontStyle',
        label: 'Italic',
        type: 'toggle',
        group: 'text',
        applicableTo: ['text', 'rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'line', 'arrow', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: false
    },
    {
        key: 'textAlign',
        label: 'Align',
        type: 'select',
        options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' }
        ],
        group: 'text',
        applicableTo: ['text', 'rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'line', 'arrow', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: 'left'
    },
    {
        key: 'text',
        label: 'Content',
        type: 'textarea',
        group: 'text',
        applicableTo: ['text'],
        defaultValue: ''
    },
    {
        key: 'containerText',
        label: 'Label',
        type: 'textarea',
        group: 'text',
        applicableTo: ['rectangle', 'circle', 'diamond', 'line', 'arrow', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: ''
    },
    {
        key: 'labelPosition',
        label: 'Label Position',
        type: 'select',
        options: [
            { label: 'Start', value: 'start' },
            { label: 'Middle', value: 'middle' },
            { label: 'End', value: 'end' }
        ],
        group: 'text',
        applicableTo: ['line', 'arrow'],
        defaultValue: 'middle'
    },
    {
        key: 'autoResize',
        label: 'Auto Resize',
        type: 'toggle',
        group: 'text',
        applicableTo: ['rectangle', 'circle', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: true
    },

    // Linear
    {
        key: 'startArrowhead',
        label: 'Start Arrow',
        type: 'select',
        options: [
            { label: 'None', value: null },
            { label: 'Arrow', value: 'arrow' },
            { label: 'Dot', value: 'dot' }
        ],
        group: 'style',
        applicableTo: ['arrow', 'line'],
        defaultValue: null
    },
    {
        key: 'endArrowhead',
        label: 'End Arrow',
        type: 'select',
        options: [
            { label: 'None', value: null },
            { label: 'Arrow', value: 'arrow' },
            { label: 'Dot', value: 'dot' },
            { label: 'Triangle', value: 'triangle' }
        ],
        group: 'style',
        applicableTo: ['arrow', 'line'],
        defaultValue: null
    },
    {
        key: 'curveType',
        label: 'Line Type',
        type: 'select',
        options: [
            { label: 'Straight', value: 'straight' },
            { label: 'Curved', value: 'bezier' },
            { label: 'Smart (Elbow)', value: 'elbow' }
        ],
        group: 'style',
        applicableTo: ['arrow', 'line'],
        defaultValue: 'straight'
    },

    // Advanced / Common
    {
        key: 'angle',
        label: 'Angle',
        type: 'number',
        group: 'dimensions',
        applicableTo: 'all',
        defaultValue: 0
    },
    {
        key: 'locked',
        label: 'Locked',
        type: 'toggle',
        group: 'advanced',
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'text', 'image', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'bracketLeft', 'bracketRight', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: false
    },

    {
        key: 'link',
        label: 'Link',
        type: 'input',
        group: 'advanced',
        applicableTo: 'all',
        defaultValue: null
    },
    {
        key: 'constrained',
        label: 'Keep Proportions',
        type: 'toggle',
        group: 'dimensions',
        applicableTo: ['rectangle', 'circle', 'image', 'diamond', 'triangle', 'hexagon', 'octagon', 'parallelogram', 'star', 'cloud', 'heart', 'arrowLeft', 'arrowRight', 'arrowUp', 'arrowDown', 'capsule', 'stickyNote', 'callout', 'burst', 'speechBubble', 'ribbon', 'database', 'document', 'predefinedProcess', 'internalStorage', 'server', 'loadBalancer', 'firewall', 'user', 'messageQueue', 'lambda', 'router', 'browser', 'trapezoid', 'rightTriangle', 'pentagon', 'septagon'],
        defaultValue: false
    },
    {
        key: 'pressureEnabled',
        label: 'Pressure',
        type: 'toggle',
        group: 'advanced',
        applicableTo: ['fineliner', 'inkbrush'],
        defaultValue: true
    },
    {
        key: 'starPoints',
        label: 'Star Points',
        type: 'slider',
        min: 3,
        max: 12,
        step: 1,
        group: 'dimensions',
        applicableTo: ['star'],
        defaultValue: 5
    },
    {
        key: 'polygonSides',
        label: 'Polygon Sides',
        type: 'slider',
        min: 3,
        max: 20,
        step: 1,
        group: 'dimensions',
        applicableTo: ['polygon'],
        defaultValue: 6
    },
    {
        key: 'burstPoints',
        label: 'Burst Rays',
        type: 'slider',
        min: 8,
        max: 32,
        step: 1,
        group: 'dimensions',
        applicableTo: ['burst'],
        defaultValue: 16
    }
];

export const getPropertiesForType = (type: ElementType) => {
    return properties.filter(p => p.applicableTo === 'all' || p.applicableTo.includes(type));
}
