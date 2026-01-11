import type { ElementType } from "../types";

export interface PropertyConfig {
    key: string;
    label: string;
    type: 'color' | 'slider' | 'select' | 'toggle' | 'input' | 'number';
    options?: { label: string; value: any; icon?: any }[];
    min?: number;
    max?: number;
    step?: number;
    applicableTo: ElementType[] | 'all';
    defaultValue?: any;
    group: 'style' | 'stroke' | 'background' | 'text' | 'dimensions' | 'advanced';
}

export const properties: PropertyConfig[] = [
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
        applicableTo: ['rectangle', 'circle', 'text'], // text bg? maybe
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
        applicableTo: ['rectangle', 'circle'],
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
        applicableTo: 'all',
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
        applicableTo: 'all',
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
        applicableTo: ['rectangle', 'circle', 'line', 'arrow'],
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
        applicableTo: 'all',
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
