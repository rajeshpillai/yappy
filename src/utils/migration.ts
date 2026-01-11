import type { DrawingElement, Layer } from '../types';

const DEFAULT_LAYER_ID = 'default-layer';

export const migrateElements = (elements: DrawingElement[]): DrawingElement[] => {
    return elements.map(el => ({
        ...el,
        layerId: el.layerId || DEFAULT_LAYER_ID
    }));
};

export const migrateDrawingData = (data: any): { elements: DrawingElement[]; layers: Layer[] } => {
    // Use existing layers or create default
    const layers: Layer[] = data.layers || [
        {
            id: DEFAULT_LAYER_ID,
            name: 'Layer 1',
            visible: true,
            locked: false,
            order: 0
        }
    ];

    // Ensure all elements have a layerId
    const elements = migrateElements(data.elements || []);

    return { elements, layers };
};
