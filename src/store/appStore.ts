import { createStore } from "solid-js/store";
import type { DrawingElement, ViewState, ElementType } from "../types";

interface AppState {
    elements: DrawingElement[];
    viewState: ViewState;
    selectedTool: ElementType | 'selection';
    selection: string[]; // IDs of selected elements
    defaultElementStyles: Partial<DrawingElement>; // Styles for new elements
}

const initialState: AppState = {
    elements: [],
    viewState: { scale: 1, panX: 0, panY: 0 },
    selectedTool: 'selection',
    selection: [],
    defaultElementStyles: {
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        renderStyle: 'sketch',
        opacity: 100,
        angle: 0,
        roundness: null,
        locked: false,
        fontFamily: 1,
        fontSize: 20,
        textAlign: 'left',
        startArrowhead: null,
        endArrowhead: 'arrow',
        seed: 0
    }
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

export const updateDefaultStyles = (updates: Partial<DrawingElement>) => {
    setStore("defaultElementStyles", (s) => ({ ...s, ...updates }));
};

// Helper to clear history (e.g. on new file)
export const clearHistory = () => {
    undoStack.length = 0;
    redoStack.length = 0;
};

export const duplicateElement = (id: string) => {
    const el = store.elements.find(e => e.id === id);
    if (!el) return;

    pushToHistory();
    const newId = crypto.randomUUID();
    const offset = 10 / store.viewState.scale;

    // Deep copy objects
    const newElement: DrawingElement = {
        ...el,
        id: newId,
        x: el.x + offset,
        y: el.y + offset,
        points: el.points ? el.points.map(p => ({ ...p })) : undefined,
        roundness: el.roundness ? { ...el.roundness } : null,
        crop: el.crop ? { ...el.crop } : null,
        // bounds/meta might need attention too but boundElements usually reset or logic specific
        boundElements: null, // Don't copy bindings directly for now
        groupIds: el.groupIds ? [...el.groupIds] : undefined,
        seed: Math.floor(Math.random() * 2147483647)
    };

    setStore("elements", els => [...els, newElement]);
    setStore("selection", [newId]); // Select new
};

export const moveElementZIndex = (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => {
    const idx = store.elements.findIndex(e => e.id === id);
    if (idx === -1) return;

    pushToHistory();

    setStore("elements", els => {
        const newEls = [...els];
        const el = newEls.splice(idx, 1)[0];

        if (direction === 'front') {
            newEls.push(el);
        } else if (direction === 'back') {
            newEls.unshift(el);
        } else if (direction === 'forward') {
            const newIdx = Math.min(newEls.length, idx + 1);
            newEls.splice(newIdx, 0, el);
        } else if (direction === 'backward') {
            const newIdx = Math.max(0, idx - 1);
            newEls.splice(newIdx, 0, el);
        }

        return newEls;
    });
};
