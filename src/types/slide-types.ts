import type { DrawingElement, Layer, ViewState, GridSettings } from '../types';
import type { DisplayState } from './motion-types';

/**
 * Represents a single slide in a presentation
 */
export interface Slide {
    id: string;
    name: string;
    dimensions: { width: number; height: number }; // slide dimensions in canvas units
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
    docType?: 'infinite' | 'slides';
}

/**
 * Global settings that apply across all slides
 */
export interface GlobalSettings {
    theme?: 'light' | 'dark';
    defaultStyles?: Partial<DrawingElement>;
    animationEnabled?: boolean; // Global toggle
    reducedMotion?: boolean;    // Accessibility preference
    renderStyle?: 'sketch' | 'architectural'; // Default style for new elements
    showMindmapToolbar?: boolean; // Toggle floating mindmap toolbar
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
    dimensions: { width: 1920, height: 1080 }, // Default 1080p
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
    viewState: { scale: 0.5, panX: 0, panY: 0 }, // Modified default view state for slides
    backgroundColor: '#ffffff',
    order: 0
});

/**
 * Create a new empty slide document
 */
export const createSlideDocument = (name?: string, docType: 'infinite' | 'slides' = 'slides'): SlideDocument => ({
    version: 3,
    metadata: {
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        docType
    },
    slides: [createDefaultSlide()],
    globalSettings: {}
});
