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

// History Stacks
const undoStack: DrawingElement[][] = [];
const redoStack: DrawingElement[][] = [];

export const pushToHistory = () => {
    // Deep copy current elements
    const snapshot = JSON.parse(JSON.stringify(store.elements));
    undoStack.push(snapshot);
    // Limit stack size? Say 50
    if (undoStack.length > 50) undoStack.shift();
    // Clear redo
    redoStack.length = 0;
};

export const undo = () => {
    if (undoStack.length === 0) return;

    // Save current state to redo
    const currentSnapshot = JSON.parse(JSON.stringify(store.elements));
    redoStack.push(currentSnapshot);

    // Restore from undo
    const previousState = undoStack.pop();
    if (previousState) {
        setStore("elements", previousState);
    }
};

export const redo = () => {
    if (redoStack.length === 0) return;

    // Save current to undo
    const currentSnapshot = JSON.parse(JSON.stringify(store.elements));
    undoStack.push(currentSnapshot);

    // Restore from redo
    const nextState = redoStack.pop();
    if (nextState) {
        setStore("elements", nextState);
    }
};

export const addElement = (element: DrawingElement) => {
    pushToHistory(); // Save state BEFORE adding
    setStore("elements", (els) => [...els, element]);
};

export const deleteElements = (ids: string[]) => {
    if (ids.length === 0) return;
    pushToHistory(); // Save state before deletion
    setStore("elements", (els) => els.filter(el => !ids.includes(el.id)));
    setStore("selection", []); // Clear selection
};

export const updateElement = (id: string, updates: Partial<DrawingElement>, recordHistory = false) => {
    if (recordHistory) pushToHistory();
    setStore("elements", (el) => el.id === id, updates);
};

export const setViewState = (updates: Partial<ViewState>) => {
    setStore("viewState", (vs) => ({ ...vs, ...updates }));
};

export const setSelectedTool = (tool: ElementType | 'selection') => {
    setStore("selectedTool", tool);
};

// Helper to clear history (e.g. on new file)
export const clearHistory = () => {
    undoStack.length = 0;
    redoStack.length = 0;
};
