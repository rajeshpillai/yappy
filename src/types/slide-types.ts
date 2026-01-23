import type { DrawingElement, Layer, ViewState, GridSettings } from '../types';
import type { DisplayState } from './motion-types';

/**
 * Represents a single slide in a presentation
 */
export interface Slide {
    id: string;
    name: string;
    elements: DrawingElement[];
    layers: Layer[];
    viewState: ViewState;
    gridSettings?: GridSettings;
    backgroundColor?: string;
    order: number;
    states?: DisplayState[];
    initialStateId?: string;
}

/**
 * Metadata for a slide document
 */
export interface SlideDocumentMetadata {
    name?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Global settings that apply across all slides
 */
export interface GlobalSettings {
    theme?: 'light' | 'dark';
    defaultStyles?: Partial<DrawingElement>;
}

/**
 * The new v3 document format with multi-slide support
 */
export interface SlideDocument {
    version: 3;
    metadata: SlideDocumentMetadata;
    slides: Slide[];
    globalSettings?: GlobalSettings;
}

/**
 * Default slide factory
 */
export const createDefaultSlide = (id?: string, name?: string): Slide => ({
    id: id || crypto.randomUUID(),
    name: name || 'Slide 1',
    elements: [],
    layers: [{
        id: 'default-layer',
        name: 'Layer 1',
        visible: true,
        locked: false,
        opacity: 1,
        order: 0,
        backgroundColor: 'transparent'
    }],
    viewState: { scale: 1, panX: 0, panY: 0 },
    backgroundColor: '#ffffff',
    order: 0
});

/**
 * Create a new empty slide document
 */
export const createSlideDocument = (name?: string): SlideDocument => ({
    version: 3,
    metadata: {
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    slides: [createDefaultSlide()],
    globalSettings: {}
});
