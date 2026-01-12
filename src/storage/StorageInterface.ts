import type { DrawingElement, ViewState, Layer, GridSettings } from "../types";

export interface DrawingData {
    elements: DrawingElement[];
    viewState: ViewState;
    layers?: Layer[]; // Optional for backward compatibility
    gridSettings?: GridSettings;
    canvasBackgroundColor?: string;
}

export interface StorageInterface {
    saveDrawing(id: string, data: DrawingData): Promise<void>;
    loadDrawing(id: string): Promise<DrawingData | null>;
    listDrawings(): Promise<string[]>;
    deleteDrawing(id: string): Promise<void>;
}
