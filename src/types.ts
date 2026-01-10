export type ElementType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'pencil';

export interface Point {
    x: number;
    y: number;
}

export interface DrawingElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    strokeColor: string;
    backgroundColor: string;
    strokeWidth: number;
    points?: Point[]; // For lines, arrows, pencil
    text?: string;    // For text
    isSelected?: boolean;
}

export interface ViewState {
    scale: number;
    panX: number;
    panY: number;
}
