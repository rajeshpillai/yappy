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
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'diamond'],
        defaultValue: 'sketch'
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
        applicableTo: ['rectangle', 'circle', 'text', 'diamond'], // text bg? maybe
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
        applicableTo: ['rectangle', 'circle', 'diamond'],
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
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'pencil', 'diamond'], // Exclude text
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
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'pencil', 'diamond'], // Exclude text
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
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'diamond'],
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
        applicableTo: ['text'],
        defaultValue: 20
    },
    {
        key: 'fontFamily',
        label: 'Font',
        type: 'select',
        options: [
            { label: 'Hand-drawn', value: 1 },
            { label: 'Normal', value: 2 },
            { label: 'Code', value: 3 }
        ],
        group: 'text',
        applicableTo: ['text'],
        defaultValue: 1
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
        applicableTo: ['text'],
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
        applicableTo: ['rectangle', 'circle', 'diamond', 'line', 'arrow'],
        defaultValue: ''
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
        defaultValue: 'arrow'
    },
    {
        key: 'curveType',
        label: 'Line Type',
        type: 'select',
        options: [
            { label: 'Straight', value: 'straight' },
            { label: 'Curved', value: 'bezier' }
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
        applicableTo: ['rectangle', 'circle', 'line', 'arrow', 'text', 'pencil', 'image', 'diamond'],
        defaultValue: false
    },

    {
        key: 'link',
        label: 'Link',
        type: 'input',
        group: 'advanced',
        applicableTo: 'all',
        defaultValue: null
    }
];

export const getPropertiesForType = (type: ElementType) => {
    return properties.filter(p => p.applicableTo === 'all' || p.applicableTo.includes(type));
}
