import type { DrawingElement, ViewState } from "../types";

export interface DrawingData {
    elements: DrawingElement[];
    viewState: ViewState;
}

export interface StorageInterface {
    saveDrawing(id: string, data: DrawingData): Promise<void>;
    loadDrawing(id: string): Promise<DrawingData | null>;
    listDrawings(): Promise<string[]>;
    deleteDrawing(id: string): Promise<void>;
}
