import type { DrawingElement, Layer, GridSettings } from '../types';

const DEFAULT_LAYER_ID = 'default-layer';

/**
 * Normalize an element by ensuring all required properties have sane defaults
 * This prevents runtime errors from missing properties in templates or old data
 */
export const normalizeElement = (el: Partial<DrawingElement> & { id: string; type: string }): DrawingElement => {
    return {
        // Core properties (required)
        id: el.id,
        type: el.type as any,
        x: el.x ?? 0,
        y: el.y ?? 0,
        width: el.width ?? 100,
        height: el.height ?? 100,

        // Style properties with sane defaults
        strokeColor: el.strokeColor ?? '#000000',
        backgroundColor: el.backgroundColor ?? 'transparent',
        fillStyle: el.fillStyle ?? 'hachure',
        strokeWidth: el.strokeWidth ?? 1,
        strokeStyle: el.strokeStyle ?? 'solid',
        roughness: el.roughness ?? 1,
        opacity: el.opacity ?? 100,
        angle: el.angle ?? 0,
        renderStyle: el.renderStyle ?? 'sketch',
        seed: el.seed ?? Math.floor(Math.random() * 2147483647),
        roundness: el.roundness ?? null,
        locked: el.locked ?? false,
        link: el.link ?? null,

        // Layer reference
        layerId: el.layerId || DEFAULT_LAYER_ID,

        // Optional properties (passed through if present)
        ...(el.points && { points: el.points }),
        ...(el.startArrowhead !== undefined && { startArrowhead: el.startArrowhead }),
        ...(el.endArrowhead !== undefined && { endArrowhead: el.endArrowhead }),
        ...(el.text !== undefined && { text: el.text }),
        ...(el.rawText !== undefined && { rawText: el.rawText }),
        ...(el.fontSize !== undefined && { fontSize: el.fontSize }),
        ...(el.fontFamily !== undefined && { fontFamily: el.fontFamily }),
        ...(el.textAlign !== undefined && { textAlign: el.textAlign }),
        ...(el.verticalAlign !== undefined && { verticalAlign: el.verticalAlign }),
        ...(el.containerId !== undefined && { containerId: el.containerId }),
        ...(el.containerText !== undefined && { containerText: el.containerText }),
        ...(el.labelPosition !== undefined && { labelPosition: el.labelPosition }),
        ...(el.fileId !== undefined && { fileId: el.fileId }),
        ...(el.scale !== undefined && { scale: el.scale }),
        ...(el.crop !== undefined && { crop: el.crop }),
        ...(el.status !== undefined && { status: el.status }),
        ...(el.dataURL !== undefined && { dataURL: el.dataURL }),
        ...(el.mimeType !== undefined && { mimeType: el.mimeType }),
        ...(el.groupIds !== undefined && { groupIds: el.groupIds }),
        ...(el.boundElements !== undefined && { boundElements: el.boundElements }),
        ...(el.isSelected !== undefined && { isSelected: el.isSelected }),
        ...(el.startBinding !== undefined && { startBinding: el.startBinding }),
        ...(el.endBinding !== undefined && { endBinding: el.endBinding }),
        ...(el.curveType !== undefined && { curveType: el.curveType }),
    } as DrawingElement;
};

export const migrateElements = (elements: any[]): DrawingElement[] => {
    return elements.map(el => normalizeElement(el));
};

export const migrateDrawingData = (data: any): {
    elements: DrawingElement[];
    layers: Layer[];
    gridSettings?: GridSettings;
    canvasBackgroundColor?: string;
} => {
    // Use existing layers or create default
    const layers: Layer[] = data.layers || [
        {
            id: DEFAULT_LAYER_ID,
            name: 'Layer 1',
            visible: true,
            locked: false,
            opacity: 1,
            order: 0,
            backgroundColor: 'transparent',
            colorTag: undefined
        }
    ];

    // Ensure all elements have required properties with defaults
    const elements = migrateElements(data.elements || []);

    return {
        elements,
        layers,
        gridSettings: data.gridSettings,
        canvasBackgroundColor: data.canvasBackgroundColor
    };
};

