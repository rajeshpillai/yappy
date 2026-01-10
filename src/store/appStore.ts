import { createStore } from "solid-js/store";
import type { DrawingElement, ViewState, ElementType } from "../types";

interface AppState {
    elements: DrawingElement[];
    viewState: ViewState;
    selectedTool: ElementType | 'selection';
    selection: string[]; // IDs of selected elements
}

const initialState: AppState = {
    elements: [],
    viewState: { scale: 1, panX: 0, panY: 0 },
    selectedTool: 'selection',
    selection: []
};

export const [store, setStore] = createStore<AppState>(initialState);

export const addElement = (element: DrawingElement) => {
    setStore("elements", (els) => [...els, element]);
};

export const updateElement = (id: string, updates: Partial<DrawingElement>) => {
    setStore("elements", (el) => el.id === id, updates);
};

export const setViewState = (updates: Partial<ViewState>) => {
    setStore("viewState", (vs) => ({ ...vs, ...updates }));
};

export const setSelectedTool = (tool: ElementType | 'selection') => {
    setStore("selectedTool", tool);
};
