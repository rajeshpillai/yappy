import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import type { DrawingElement, ViewState, ElementType, Layer, GridSettings } from "../types";
import { createDefaultSlide, createSlideDocument } from '../types/slide-types';
import type { Slide, GlobalSettings, SlideDocument } from '../types/slide-types';
import type { ElementAnimation, DisplayState } from "../types/motion-types";
import { showToast } from "../components/toast";
import { MindmapLayoutEngine, type LayoutDirection } from "../utils/mindmap-layout";
import { animationEngine } from "../utils/animation/animation-engine";

interface AppState {
    // Current Active Slide properties (for performance and compatibility)
    elements: DrawingElement[];
    viewState: ViewState;
    layers: Layer[];
    activeLayerId: string;
    gridSettings: GridSettings;
    canvasBackgroundColor: string;
    dimensions: { width: number; height: number };

    // Slide Management
    slides: Slide[];
    activeSlideIndex: number;
    docType: 'infinite' | 'slides';

    // Remaining Global State
    selectedTool: ElementType | 'selection';
    selection: string[]; // IDs of selected elements
    defaultElementStyles: Partial<DrawingElement>; // Styles for new elements
    theme: 'light' | 'dark';
    globalSettings: GlobalSettings;
    showCanvasProperties: boolean;
    undoStackLength: number;
    redoStackLength: number;
    flowTick: number; // For forcing redraws on flow animations
    // Panel Visibility
    showPropertyPanel: boolean;
    showLayerPanel: boolean;
    isPropertyPanelMinimized: boolean;
    isLayerPanelMinimized: boolean;
    minimapVisible: boolean;
    zenMode: boolean;
    presentationMode: boolean;
    showCommandPalette: boolean;
    selectedPenType: 'fineliner' | 'inkbrush' | 'marker';
    selectedShapeType: 'triangle' | 'hexagon' | 'octagon' | 'parallelogram' | 'star' | 'cloud' | 'heart' | 'cross' | 'checkmark' | 'arrowLeft' | 'arrowRight' | 'arrowUp' | 'arrowDown' | 'capsule' | 'stickyNote' | 'callout' | 'burst' | 'speechBubble' | 'ribbon' | 'bracketLeft' | 'bracketRight' | 'database' | 'document' | 'predefinedProcess' | 'internalStorage';
    selectedInfraType: 'server' | 'loadBalancer' | 'firewall' | 'user' | 'messageQueue' | 'lambda' | 'router' | 'browser';
    selectedMathType: 'trapezoid' | 'rightTriangle' | 'pentagon' | 'septagon';
    selectedSketchnoteType: 'starPerson' | 'scroll' | 'wavyDivider' | 'doubleBanner';
    selectedWireframeType: 'browserWindow' | 'mobilePhone' | 'ghostButton' | 'inputField';
    layerGroupingModeEnabled: boolean;
    maxLayers: number;
    canvasTexture: 'none' | 'dots' | 'grid' | 'graph' | 'paper';
    isRecording: boolean;
    selectedTechnicalType: 'dfdProcess' | 'dfdDataStore' | 'isometricCube' | 'cylinder' | 'stateStart' | 'stateEnd' | 'stateSync' | 'activationBar' | 'externalEntity';
    // State Morphing
    states: DisplayState[];
    activeStateId?: string;
    showStatePanel: boolean;
    showSlideNavigator: boolean;
}

const defaultSlide = createDefaultSlide();

const initialState: AppState = {
    elements: defaultSlide.elements,
    viewState: defaultSlide.viewState,
    layers: defaultSlide.layers,
    activeLayerId: defaultSlide.layers[0].id,
    gridSettings: {
        enabled: false,
        snapToGrid: false,
        objectSnapping: true,
        gridSize: 20,
        gridColor: '#cccccc',
        gridOpacity: 0.5,
        style: 'lines'
    },
    canvasBackgroundColor: defaultSlide.backgroundColor || '#ffffff',
    dimensions: defaultSlide.dimensions,
    slides: [defaultSlide],
    activeSlideIndex: 0,
    docType: 'slides',

    canvasTexture: 'none',
    selectedTool: 'selection',
    selection: [],
    flowTick: 0,
    isRecording: false,
    defaultElementStyles: {
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        renderStyle: 'sketch',
        opacity: 100,
        angle: 0,
        roundness: null,
        locked: false,
        fontSize: 20,
        fontFamily: 'hand-drawn',
        fontWeight: false,
        fontStyle: false,
        textAlign: 'left',
        startArrowhead: null,
        endArrowhead: null,
        autoResize: false,
        flowColor: undefined,
        seed: 0,
        shadowEnabled: false,
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowBlur: 10,
        shadowOffsetX: 5,
        shadowOffsetY: 5,
        gradientStart: '#ffffff',
        gradientEnd: '#000000',
        gradientDirection: 45
    },
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
    globalSettings: {
        animationEnabled: true,
        reducedMotion: false,
        renderStyle: 'sketch',
        showMindmapToolbar: true // Default to showing the toolbar
    },
    showCanvasProperties: false,
    undoStackLength: 0,
    redoStackLength: 0,
    showPropertyPanel: false,
    showLayerPanel: false,
    isPropertyPanelMinimized: false,
    isLayerPanelMinimized: false,
    minimapVisible: false,
    zenMode: false,
    presentationMode: false,
    showCommandPalette: false,
    selectedPenType: 'fineliner',
    selectedShapeType: 'triangle',
    selectedInfraType: 'server',
    selectedMathType: 'trapezoid',
    selectedSketchnoteType: 'starPerson',
    selectedWireframeType: 'browserWindow',
    layerGroupingModeEnabled: false,
    maxLayers: 20,
    selectedTechnicalType: 'dfdProcess',
    states: [],
    showStatePanel: false,
    showSlideNavigator: true,
};

export const [store, setStore] = createStore<AppState>(initialState);

// History Stacks - Now include layers
interface HistorySnapshot {
    elements: DrawingElement[];
    layers: Layer[];
}
const undoStack: HistorySnapshot[] = [];
const redoStack: HistorySnapshot[] = [];

export const pushToHistory = () => {
    // Deep copy current elements and layers
    const snapshot: HistorySnapshot = {
        elements: JSON.parse(JSON.stringify(store.elements)),
        layers: JSON.parse(JSON.stringify(store.layers))
    };
    undoStack.push(snapshot);
    // Limit stack size? Say 50
    if (undoStack.length > 50) undoStack.shift();
    // Clear redo
    redoStack.length = 0;

    // Update store for reactivity
    setStore("undoStackLength", undoStack.length);
    setStore("redoStackLength", 0);
};

export const undo = () => {
    if (undoStack.length === 0) return;

    // Save current state to redo
    const currentSnapshot: HistorySnapshot = {
        elements: JSON.parse(JSON.stringify(store.elements)),
        layers: JSON.parse(JSON.stringify(store.layers))
    };
    redoStack.push(currentSnapshot);

    // Restore from undo
    const previousState = undoStack.pop();
    if (previousState) {
        setStore("elements", previousState.elements);
        setStore("layers", previousState.layers);
        setStore("selection", []); // Clear selection to avoid stale IDs
    }

    // Update store for reactivity
    setStore("undoStackLength", undoStack.length);
    setStore("redoStackLength", redoStack.length);
};

export const redo = () => {
    if (redoStack.length === 0) return;

    // Save current to undo
    const currentSnapshot: HistorySnapshot = {
        elements: JSON.parse(JSON.stringify(store.elements)),
        layers: JSON.parse(JSON.stringify(store.layers))
    };
    undoStack.push(currentSnapshot);

    // Restore from redo
    const nextState = redoStack.pop();
    if (nextState) {
        setStore("elements", nextState.elements);
        setStore("layers", nextState.layers);
        setStore("selection", []); // Clear selection to avoid stale IDs
    }

    // Update store for reactivity
    setStore("undoStackLength", undoStack.length);
    setStore("redoStackLength", redoStack.length);
};

export const addElement = (element: DrawingElement) => {
    pushToHistory(); // Save state BEFORE adding
    setStore("elements", (els) => [...els, element]);
};

export const addChildNode = (parentId: string) => {
    const parent = store.elements.find(e => e.id === parentId);
    if (!parent) return;

    pushToHistory();
    const newId = crypto.randomUUID();
    const hOffset = 150;
    const vOffset = 0;

    const newElement: DrawingElement = {
        ...store.defaultElementStyles,
        // Inherit styles from parent
        strokeColor: parent.strokeColor,
        backgroundColor: parent.backgroundColor,
        fillStyle: parent.fillStyle,
        strokeWidth: parent.strokeWidth,
        roughness: parent.roughness,
        renderStyle: parent.renderStyle,
        opacity: parent.opacity,
        strokeStyle: parent.strokeStyle || 'solid',

        id: newId,
        type: (parent.type === 'image' || parent.type === 'line' || parent.type === 'arrow') ? 'rectangle' : parent.type,
        x: parent.x + parent.width + hOffset,
        y: parent.y + vOffset,
        width: parent.width > 0 ? parent.width : 100,
        height: parent.height > 0 ? parent.height : 60,
        layerId: store.activeLayerId,
        parentId: parent.id,
        text: "",
        isCollapsed: false,
        angle: 0,
        seed: Math.floor(Math.random() * 2 ** 31),
        roundness: null,
        locked: false,
        link: null,
    };

    const connector: DrawingElement = {
        ...store.defaultElementStyles,
        id: crypto.randomUUID(),
        type: 'arrow',
        x: parent.x + parent.width,
        y: parent.y + parent.height / 2,
        width: hOffset,
        height: 0,
        layerId: store.activeLayerId,
        startBinding: { elementId: parent.id, gap: 5, position: 'right', focus: 0 },
        endBinding: { elementId: newId, gap: 5, position: 'left', focus: 0 },
        curveType: 'bezier',
        angle: 0,
        seed: Math.floor(Math.random() * 2 ** 31),
        roundness: null,
        locked: false,
        link: null,
        opacity: 100,
        renderStyle: parent.renderStyle,
        strokeColor: parent.strokeColor,
        backgroundColor: parent.backgroundColor,
        fillStyle: parent.fillStyle,
        strokeStyle: parent.strokeStyle,
        strokeWidth: parent.strokeWidth,
        roughness: parent.roughness,
        points: [0, 0, hOffset, 0]
    };

    const connectorId = connector.id;
    setStore("elements", els => [...els, newElement, connector]);

    // Movement sync: Add connector to boundElements of both nodes
    setStore("elements", e => e.id === parentId, "boundElements", b => [...(b || []), { id: connectorId, type: 'arrow' as const }]);
    setStore("elements", e => e.id === newId, "boundElements", b => [...(b || []), { id: connectorId, type: 'arrow' as const }]);

    setStore("selection", [newId]);
    return newId;
};

export const addSiblingNode = (siblingId: string) => {
    const sibling = store.elements.find(e => e.id === siblingId);
    if (!sibling) return;

    const parentId = sibling.parentId;
    if (!parentId) return;

    pushToHistory();
    const newId = crypto.randomUUID();
    // Dynamic spacing based on sibling height
    const vOffset = sibling.height + 40;

    const newElement: DrawingElement = {
        ...store.defaultElementStyles,
        // Inherit styles from sibling
        strokeColor: sibling.strokeColor,
        backgroundColor: sibling.backgroundColor,
        fillStyle: sibling.fillStyle,
        strokeWidth: sibling.strokeWidth,
        roughness: sibling.roughness,
        renderStyle: sibling.renderStyle,
        opacity: sibling.opacity,
        strokeStyle: sibling.strokeStyle || 'solid',

        id: newId,
        type: sibling.type,
        x: sibling.x,
        y: sibling.y + vOffset,
        width: sibling.width,
        height: sibling.height,
        layerId: store.activeLayerId,
        parentId: parentId,
        text: "",
        isCollapsed: false,
        angle: 0,
        seed: Math.floor(Math.random() * 2 ** 31),
        roundness: null,
        locked: false,
        link: null,
    };

    const connector: DrawingElement = {
        ...store.defaultElementStyles,
        id: crypto.randomUUID(),
        type: 'arrow',
        x: sibling.x - 150,
        y: sibling.y + vOffset + sibling.height / 2,
        width: 150,
        height: 0,
        layerId: store.activeLayerId,
        startBinding: { elementId: parentId, gap: 5, position: 'right', focus: 0 },
        endBinding: { elementId: newId, gap: 5, position: 'left', focus: 0 },
        curveType: 'bezier',
        angle: 0,
        seed: Math.floor(Math.random() * 2 ** 31),
        roundness: null,
        locked: false,
        link: null,
        opacity: 100,
        renderStyle: sibling.renderStyle,
        strokeColor: sibling.strokeColor,
        backgroundColor: sibling.backgroundColor,
        fillStyle: sibling.fillStyle,
        strokeStyle: sibling.strokeStyle,
        strokeWidth: sibling.strokeWidth,
        roughness: sibling.roughness,
        points: [0, 0, 150, 0]
    };

    const connectorId = connector.id;
    setStore("elements", els => [...els, newElement, connector]);

    // Movement sync: Add connector to boundElements of both nodes
    setStore("elements", e => e.id === parentId, "boundElements", b => [...(b || []), { id: connectorId, type: 'arrow' as const }]);
    setStore("elements", e => e.id === newId, "boundElements", b => [...(b || []), { id: connectorId, type: 'arrow' as const }]);

    setStore("selection", [newId]);
    return newId;
};

export const toggleCollapseSelection = () => {
    if (store.selection.length === 0) return;
    pushToHistory();
    setStore('elements',
        el => store.selection.includes(el.id),
        el => ({ isCollapsed: !el.isCollapsed })
    );
};

export const setShowCanvasProperties = (visible: boolean) => {
    setStore("showCanvasProperties", visible);
    if (visible) {
        setStore("showPropertyPanel", true);
        setStore("isPropertyPanelMinimized", false);
    }
};

export const deleteElements = (ids: string[]) => {
    if (ids.length === 0) return;
    pushToHistory(); // Save state before deletion
    setStore("elements", (els) => els.filter(el => !ids.includes(el.id)));
    setStore("selection", []); // Clear selection
};

export const bringToFront = (ids: string[]) => {
    if (ids.length === 0) return;
    pushToHistory();
    setStore("elements", (els) => {
        const selected = els.filter(el => ids.includes(el.id));
        const others = els.filter(el => !ids.includes(el.id));
        return [...others, ...selected];
    });
};

export const sendToBack = (ids: string[]) => {
    if (ids.length === 0) return;
    pushToHistory();
    setStore("elements", (els) => {
        const selected = els.filter(el => ids.includes(el.id));
        const others = els.filter(el => !ids.includes(el.id));
        return [...selected, ...others];
    });
};

export const updateGlobalTickerState = () => {
    const hasFlow = store.elements.some(el => el.flowAnimation);
    animationEngine.setForceTicker(hasFlow);
};

export const updateElement = (id: string, updates: Partial<DrawingElement>, recordHistory = false) => {
    if (recordHistory) pushToHistory();
    setStore("elements", (el) => el.id === id, updates);
    if ('flowAnimation' in updates) {
        updateGlobalTickerState();
    }
};

export const updateAnimation = (elementId: string, animationId: string, updates: Partial<ElementAnimation>, recordHistory = false) => {
    if (recordHistory) pushToHistory();
    setStore("elements",
        (el) => el.id === elementId,
        "animations",
        (anim: ElementAnimation) => anim.id === animationId,
        updates
    );
};

export const reorderAnimation = (elementId: string, animationId: string, direction: 'up' | 'down', recordHistory = true) => {
    const el = store.elements.find(e => e.id === elementId);
    if (!el || !el.animations) return;

    const animations = [...el.animations];
    const index = animations.findIndex(a => a.id === animationId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= animations.length) return;

    if (recordHistory) pushToHistory();

    const [removed] = animations.splice(index, 1);
    animations.splice(newIndex, 0, removed);

    setStore("elements", (e) => e.id === elementId, "animations", animations);
};

export const moveSelectedElements = (dx: number, dy: number, recordHistory = false) => {
    if (store.selection.length === 0) return;
    if (recordHistory) pushToHistory();

    setStore("elements", (el) => store.selection.includes(el.id), (el) => ({
        x: el.x + dx,
        y: el.y + dy
    }));
};

export const setViewState = (updates: Partial<ViewState>) => {
    setStore("viewState", (vs) => ({ ...vs, ...updates }));
};

export const setSelectedTool = (tool: ElementType | 'selection') => {
    setStore('selectedTool', tool);
    if (tool !== 'selection' && tool !== 'pan' && tool !== 'eraser') {
        setStore('selection', []);
    }

    // Adjust default styles based on tool
    if (tool === 'arrow') {
        updateDefaultStyles({ endArrowhead: 'arrow' });
    } else if (tool === 'line') {
        updateDefaultStyles({ endArrowhead: null });
    }

    if (tool === 'starPerson' || tool === 'scroll' || tool === 'wavyDivider' || tool === 'doubleBanner' ||
        tool === 'lightbulb' || tool === 'signpost' || tool === 'burstBlob' ||
        tool === 'browserWindow' || tool === 'mobilePhone' || tool === 'ghostButton' || tool === 'inputField') {
        updateDefaultStyles({ autoResize: false });
    } else {
        updateDefaultStyles({ autoResize: false });
    }
};

export const updateDefaultStyles = (updates: Partial<DrawingElement>) => {
    setStore("defaultElementStyles", (s) => ({ ...s, ...updates }));
};

export const updateGlobalSettings = (updates: Partial<GlobalSettings>) => {
    setStore("globalSettings", (s) => ({ ...s, ...updates }));

    // Sync renderStyle to default styles if it was updated
    if (updates.renderStyle) {
        updateDefaultStyles({ renderStyle: updates.renderStyle });
    }
};

// --- Slide Management Actions ---

export const updateSlideThumbnail = (index: number, dataUrl: string) => {
    setStore("slides", index, "thumbnail", dataUrl);
};

export const saveActiveSlide = () => {
    const currentIndex = store.activeSlideIndex;
    if (currentIndex < 0 || currentIndex >= store.slides.length) return;

    const currentSlideValues: Partial<Slide> = {
        elements: JSON.parse(JSON.stringify(store.elements)),
        layers: JSON.parse(JSON.stringify(store.layers)),
        viewState: JSON.parse(JSON.stringify(store.viewState)),
        gridSettings: JSON.parse(JSON.stringify(store.gridSettings)),
        backgroundColor: store.canvasBackgroundColor,
        states: JSON.parse(JSON.stringify(store.states)),
        initialStateId: store.activeStateId,
        thumbnail: store.slides[store.activeSlideIndex].thumbnail, // Keep existing or update
        dimensions: JSON.parse(JSON.stringify(store.dimensions)),
    };

    setStore("slides", currentIndex, currentSlideValues);
};

export const setActiveSlide = (index: number) => {
    if (index < 0 || index >= store.slides.length || index === store.activeSlideIndex) return;

    // 1. Save current slide
    saveActiveSlide();

    // 2. Load next slide
    const nextSlide = store.slides[index];

    batch(() => {
        setStore("activeSlideIndex", index);
        setStore("elements", JSON.parse(JSON.stringify(nextSlide.elements)));
        setStore("layers", JSON.parse(JSON.stringify(nextSlide.layers)));
        setStore("viewState", JSON.parse(JSON.stringify(nextSlide.viewState)));
        setStore("gridSettings", nextSlide.gridSettings ? JSON.parse(JSON.stringify(nextSlide.gridSettings)) : initialState.gridSettings);
        setStore("canvasBackgroundColor", nextSlide.backgroundColor || '#ffffff');
        setStore("dimensions", JSON.parse(JSON.stringify(nextSlide.dimensions)));
        setStore("states", nextSlide.states ? JSON.parse(JSON.stringify(nextSlide.states)) : []);
        setStore("activeStateId", nextSlide.initialStateId);
        setStore("selection", []); // Clear selection on slide switch

        // Update active layer ID if needed
        if (!nextSlide.layers.some(l => l.id === store.activeLayerId)) {
            setStore("activeLayerId", nextSlide.layers[0]?.id || 'default-layer');
        }

        if (store.presentationMode) {
            zoomToFitSlide();
        }
    });

    showToast(`Switched to Slide ${index + 1}`, 'info');
};

export const addSlide = () => {
    saveActiveSlide();

    const nextIndex = store.slides.length;
    const newSlide = createDefaultSlide(undefined, `Slide ${nextIndex + 1}`);
    newSlide.order = nextIndex;

    setStore("slides", (prev) => [...prev, newSlide]);
    setActiveSlide(nextIndex);

    showToast('Slide added', 'success');
};

export const deleteSlide = (index: number) => {
    if (store.slides.length <= 1) {
        showToast('Cannot delete the last slide', 'error');
        return;
    }

    const newSlides = store.slides.filter((_, i) => i !== index);

    // Update orders
    newSlides.forEach((s, i) => s.order = i);

    let nextIndex = store.activeSlideIndex;
    if (nextIndex >= newSlides.length) {
        nextIndex = newSlides.length - 1;
    }

    batch(() => {
        setStore("slides", newSlides);
        if (index === store.activeSlideIndex) {
            // Force load the new slide at this index (or previous if it was the last one)
            const nextSlide = newSlides[nextIndex];
            setStore("activeSlideIndex", nextIndex);
            setStore("elements", JSON.parse(JSON.stringify(nextSlide.elements)));
            setStore("layers", JSON.parse(JSON.stringify(nextSlide.layers)));
            setStore("viewState", JSON.parse(JSON.stringify(nextSlide.viewState)));
            setStore("gridSettings", nextSlide.gridSettings ? JSON.parse(JSON.stringify(nextSlide.gridSettings)) : initialState.gridSettings);
            setStore("canvasBackgroundColor", nextSlide.backgroundColor || '#ffffff');
            setStore("dimensions", JSON.parse(JSON.stringify(nextSlide.dimensions)));
            setStore("states", nextSlide.states ? JSON.parse(JSON.stringify(nextSlide.states)) : []);
            setStore("activeStateId", nextSlide.initialStateId);
            setStore("selection", []);
        } else if (index < store.activeSlideIndex) {
            setStore("activeSlideIndex", store.activeSlideIndex - 1);
        }
    });

    showToast('Slide deleted', 'info');
};

export const reorderSlides = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newSlides = [...store.slides];
    const [moved] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, moved);

    // Update orders
    newSlides.forEach((s, i) => s.order = i);

    // Update active index if it moved
    let newActiveIndex = store.activeSlideIndex;
    if (store.activeSlideIndex === fromIndex) {
        newActiveIndex = toIndex;
    } else if (fromIndex < store.activeSlideIndex && toIndex >= store.activeSlideIndex) {
        newActiveIndex--;
    } else if (fromIndex > store.activeSlideIndex && toIndex <= store.activeSlideIndex) {
        newActiveIndex++;
    }

    setStore("slides", newSlides);
    setStore("activeSlideIndex", newActiveIndex);
};

export const loadDocument = (doc: SlideDocument) => {
    batch(() => {
        setStore("slides", JSON.parse(JSON.stringify(doc.slides)));
        setStore("globalSettings", doc.globalSettings || initialState.globalSettings);
        setStore("docType", doc.metadata?.docType || 'slides');

        // Load the first slide
        const targetIndex = 0;

        const firstSlide = doc.slides[targetIndex];
        setStore("activeSlideIndex", targetIndex);
        setStore("elements", JSON.parse(JSON.stringify(firstSlide.elements)));
        setStore("layers", JSON.parse(JSON.stringify(firstSlide.layers)));
        setStore("viewState", JSON.parse(JSON.stringify(firstSlide.viewState)));
        setStore("gridSettings", firstSlide.gridSettings ? JSON.parse(JSON.stringify(firstSlide.gridSettings)) : initialState.gridSettings);
        setStore("canvasBackgroundColor", firstSlide.backgroundColor || '#ffffff');
        setStore("dimensions", JSON.parse(JSON.stringify(firstSlide.dimensions)));
        setStore("states", firstSlide.states ? JSON.parse(JSON.stringify(firstSlide.states)) : []);
        setStore("activeStateId", firstSlide.initialStateId);
        setStore("selection", []);

        if (!firstSlide.layers.some((l: Layer) => l.id === store.activeLayerId)) {
            setStore("activeLayerId", firstSlide.layers[0]?.id || 'default-layer');
        }
    });

    // Clear history on new document load
    clearHistory();
};

// --- Document Type Actions ---

export const setDocType = (type: 'infinite' | 'slides') => {
    setStore("docType", type);
};

// --- State Morphing Actions ---

export const toggleStatePanel = (visible?: boolean) => {
    setStore("showStatePanel", visible ?? !store.showStatePanel);
};

export const addDisplayState = (name: string) => {
    const id = crypto.randomUUID();
    const overrides: Record<string, Partial<any>> = {};

    // Capture current values for all elements
    store.elements.forEach(el => {
        overrides[el.id] = {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            opacity: el.opacity,
            angle: el.angle,
            backgroundColor: el.backgroundColor,
            strokeColor: el.strokeColor,
            text: el.text
        };
    });

    const newState: DisplayState = { id, name, overrides: overrides as any };
    setStore("states", (prev) => [...prev, newState]);
    setStore("activeStateId", id);
    showToast(`State "${name}" captured`, 'success');
};

export const updateDisplayState = (id: string) => {
    const stateIndex = store.states.findIndex(s => s.id === id);
    if (stateIndex === -1) return;

    const overrides: Record<string, Partial<any>> = {};
    store.elements.forEach(el => {
        overrides[el.id] = {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            opacity: el.opacity,
            angle: el.angle,
            backgroundColor: el.backgroundColor,
            strokeColor: el.strokeColor,
            text: el.text
        };
    });

    setStore("states", stateIndex, "overrides", overrides as any);
    showToast(`State updated`, 'success');
};

export const deleteDisplayState = (id: string) => {
    setStore("states", (prev) => prev.filter(s => s.id !== id));
    if (store.activeStateId === id) {
        setStore("activeStateId", undefined);
    }
    showToast(`State deleted`, 'info');
};

export const applyDisplayState = async (id: string, animate: boolean = true) => {
    const targetState = store.states.find(s => s.id === id);
    if (!targetState) return;

    setStore("activeStateId", id);

    if (animate) {
        const { MorphAnimator } = await import("../utils/animation/morph-animator");
        MorphAnimator.morphTo(targetState);
    } else {
        // Immediate apply
        batch(() => {
            Object.entries(targetState.overrides).forEach(([elId, targetProps]) => {
                updateElement(elId, targetProps, false);
            });
        });
    }
};

export const applyNextState = async () => {
    if (store.states.length === 0) return;
    const currentIndex = store.states.findIndex(s => s.id === store.activeStateId);
    const nextIndex = (currentIndex + 1) % store.states.length;
    await applyDisplayState(store.states[nextIndex].id);
};

export const applyPreviousState = async () => {
    if (store.states.length === 0) return;
    const currentIndex = store.states.findIndex(s => s.id === store.activeStateId);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = store.states.length - 1;
    await applyDisplayState(store.states[prevIndex].id);
};

// Helper to clear history (e.g. on new file)
export const clearHistory = () => {
    undoStack.length = 0;
    redoStack.length = 0;
    setStore("undoStackLength", 0);
    setStore("redoStackLength", 0);
};

export const resetToNewDocument = () => {
    const doc = createSlideDocument('Untitled');
    loadDocument(doc);
    showToast('New sketch created', 'info');
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
        points: el.points ? (el.pointsEncoding === 'flat' ? [...(el.points as number[])] : (el.points as any[]).map(p => ({ ...p }))) : undefined,
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

export const groupSelected = () => {
    if (store.selection.length < 2) return;

    pushToHistory();
    const groupId = crypto.randomUUID();

    setStore("elements",
        (el) => store.selection.includes(el.id),
        "groupIds",
        (ids) => {
            const currentIds = ids || [];
            return [...currentIds, groupId];
        }
    );
};

export const ungroupSelected = () => {
    if (store.selection.length === 0) return;

    // 1. Identify outermost group IDs from selection
    const outerGroupIds = new Set<string>();
    store.elements.forEach(el => {
        if (store.selection.includes(el.id) && el.groupIds && el.groupIds.length > 0) {
            outerGroupIds.add(el.groupIds[el.groupIds.length - 1]);
        }
    });

    if (outerGroupIds.size === 0) return;

    pushToHistory();

    // 2. Remove these IDs from ALL elements that have them as outermost
    setStore("elements",
        (el) => {
            if (!el.groupIds || el.groupIds.length === 0) return false;
            const lastId = el.groupIds[el.groupIds.length - 1];
            return outerGroupIds.has(lastId);
        },
        "groupIds",
        (ids) => {
            if (!ids) return ids;
            return ids.slice(0, -1);
        }
    );
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

export const toggleTheme = () => {
    const newTheme = store.theme === 'light' ? 'dark' : 'light';
    setStore('theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
};

export const zoomToFit = () => {
    if (store.elements.length === 0) {
        setStore("viewState", { scale: 1, panX: 0, panY: 0 });
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    store.elements.forEach(el => {
        minX = Math.min(minX, el.x);
        maxX = Math.max(maxX, el.x + el.width);
        minY = Math.min(minY, el.y);
        maxY = Math.max(maxY, el.y + el.height);
    });

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    // Safety check for single point
    if (contentW === 0 && contentH === 0) {
        // Just center on the point
        const cx = minX;
        const cy = minY;
        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;
        setStore("viewState", {
            scale: 1,
            panX: -cx + screenCX,
            panY: -cy + screenCY
        });
        return;
    }

    const margin = 50;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Calculate scale to fit
    const scaleX = (screenW - margin * 2) / contentW;
    const scaleY = (screenH - margin * 2) / contentH;
    let newScale = Math.min(scaleX, scaleY);

    // Clamp scale
    newScale = Math.min(Math.max(newScale, 0.1), 2);

    const contentCX = minX + contentW / 2;
    const contentCY = minY + contentH / 2;

    const screenCX = screenW / 2;
    const screenCY = screenH / 2;

    setStore("viewState", {
        scale: newScale,
        panX: -contentCX * newScale + screenCX,
        panY: -contentCY * newScale + screenCY
    });
};

// Layer Management Functions
export const addLayer = (name?: string, parentId?: string) => {
    if (store.layers.length >= store.maxLayers) {
        console.warn(`Layer limit reached (${store.maxLayers} layers max)`);
        return;
    }
    pushToHistory();
    const newId = crypto.randomUUID();
    const maxOrder = Math.max(...store.layers.map(l => l.order), -1);
    const newLayer: Layer = {
        id: newId,
        name: name || `Layer ${store.layers.length + 1}`,
        visible: true,
        locked: false,
        opacity: 1,
        order: maxOrder + 1,
        backgroundColor: 'transparent',
        colorTag: undefined,
        parentId,
        isGroup: false,
        expanded: true
    };
    setStore('layers', [...store.layers, newLayer]);
    setStore('activeLayerId', newId);
    return newId;
};

export const deleteLayer = (id: string) => {
    // Cannot delete the last layer
    if (store.layers.length <= 1) {
        showToast('Cannot delete the last layer.', 'error');
        return;
    }

    const layer = store.layers.find(l => l.id === id);
    if (!layer) return;

    // Check if layer has elements
    const elementsOnLayer = store.elements.filter(el => el.layerId === id);

    if (elementsOnLayer.length > 0) {
        // Ask user what to do with elements
        const shouldDelete = confirm(
            `Layer "${layer.name}" contains ${elementsOnLayer.length} element(s).\n\n` +
            `Click "OK" to delete the layer AND all its elements.\n` +
            `Click "Cancel" to delete the layer but move elements to another layer.`
        );

        pushToHistory();

        if (shouldDelete) {
            // Delete all elements on this layer
            setStore('elements', store.elements.filter(el => el.layerId !== id));
        } else {
            // Move all elements from this layer to the first remaining layer
            const remainingLayer = store.layers.find(l => l.id !== id);
            if (remainingLayer) {
                store.elements.forEach((el, idx) => {
                    if (el.layerId === id) {
                        setStore('elements', idx, 'layerId', remainingLayer.id);
                    }
                });
            }
        }
    } else {
        // No elements, just delete
        pushToHistory();
    }

    // Remove the layer
    setStore('layers', store.layers.filter(l => l.id !== id));

    // Update active layer if needed
    if (store.activeLayerId === id) {
        setStore('activeLayerId', store.layers[0]?.id || 'default-layer');
    }
};

export const updateLayer = (id: string, updates: Partial<Layer>) => {
    const idx = store.layers.findIndex(l => l.id === id);
    if (idx === -1) return;

    // Don't record history for simple UI toggles
    setStore('layers', idx, updates);
};

export const duplicateLayer = (id: string) => {
    if (store.layers.length >= store.maxLayers) {
        console.warn(`Layer limit reached (${store.maxLayers} layers max)`);
        return;
    }
    const original = store.layers.find(l => l.id === id);
    if (!original) return;

    pushToHistory();

    // Create new layer with incremented name
    const newLayerId = crypto.randomUUID();
    const newLayer: Layer = {
        ...original,
        id: newLayerId,
        name: `${original.name} Copy`,
        opacity: original.opacity ?? 1,
        order: original.order + 0.5, // Place right above original
        backgroundColor: original.backgroundColor || 'transparent',
        parentId: original.parentId,
        isGroup: original.isGroup,
        expanded: original.expanded
    };

    // Duplicate all elements on this layer
    const elementsOnLayer = store.elements.filter(el => el.layerId === id);
    const duplicatedElements = elementsOnLayer.map(el => ({
        ...el,
        id: crypto.randomUUID(),
        layerId: newLayerId,
        // Offset duplicated elements slightly so they're visible
        x: el.x + 10,
        y: el.y + 10
    }));

    // Add new layer and elements
    setStore('layers', [...store.layers, newLayer]);
    setStore('elements', [...store.elements, ...duplicatedElements]);

    // Recalculate layer orders
    const sortedLayers = [...store.layers].sort((a, b) => a.order - b.order);
    sortedLayers.forEach((l, idx) => {
        const layerIdx = store.layers.findIndex(layer => layer.id === l.id);
        setStore('layers', layerIdx, 'order', idx);
    });

    // Set the duplicated layer as active
    setStore('activeLayerId', newLayerId);
};

export const reorderLayers = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    pushToHistory();

    const newLayers = [...store.layers];
    const [movedLayer] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, movedLayer);

    // Update order values
    newLayers.forEach((layer, idx) => {
        layer.order = idx;
    });

    setStore('layers', newLayers);
};

export const setActiveLayer = (id: string) => {
    const layer = store.layers.find(l => l.id === id);
    if (layer) {
        setStore('activeLayerId', id);
    }
};

export const switchLayerByIndex = (index: number) => {
    const sortedLayers = [...store.layers].sort((a, b) => a.order - b.order).reverse(); // Match UI order (top to bottom)
    const target = sortedLayers[index];
    if (target) {
        setActiveLayer(target.id);
    }
};

export const mergeLayerDown = (id: string) => {
    const idx = store.layers.findIndex(l => l.id === id);
    if (idx <= 0) return; // Top layer in array is bottom visually if reversed, but store order 0 is bottom.

    // In our UI, reversedLayers() shows layers.
    // store.layers index 0 is bottom.
    // mergeLayerDown(id) moves elements from store.layers[idx] to store.layers[idx-1]

    const sourceLayer = store.layers[idx];
    const targetLayer = store.layers[idx - 1];

    pushToHistory();

    // Move elements
    setStore('elements',
        (el) => el.layerId === sourceLayer.id,
        'layerId',
        targetLayer.id
    );

    // Remove source layer
    setStore('layers', (ls) => ls.filter(l => l.id !== sourceLayer.id));

    // Update active layer if needed
    if (store.activeLayerId === sourceLayer.id) {
        setStore('activeLayerId', targetLayer.id);
    }
};

export const flattenLayers = () => {
    if (store.layers.length <= 1) return;

    pushToHistory();

    const bottomLayer = store.layers[0];

    // Move all elements from all other layers to bottom layer
    setStore('elements',
        (el) => el.layerId !== bottomLayer.id,
        'layerId',
        bottomLayer.id
    );

    // Remove all layers except bottom
    setStore('layers', [bottomLayer]);
    setStore('activeLayerId', bottomLayer.id);
};


export const isLayerVisible = (layerId: string): boolean => {
    const layer = store.layers.find(l => l.id === layerId);
    if (!layer) return false;
    if (layer.visible === false) return false;
    if (store.layerGroupingModeEnabled && layer.parentId) {
        return isLayerVisible(layer.parentId);
    }
    return true;
};

export const isLayerLocked = (layerId: string): boolean => {
    const layer = store.layers.find(l => l.id === layerId);
    if (!layer) return false;
    if (layer.locked) return true;
    if (store.layerGroupingModeEnabled && layer.parentId) {
        return isLayerLocked(layer.parentId);
    }
    return layer.locked || false;
};

export const isolateLayer = (id: string) => {
    // Hide all other layers
    store.layers.forEach((l, idx) => {
        if (l.id !== id) {
            setStore('layers', idx, 'visible', false);
        } else {
            setStore('layers', idx, 'visible', true);
        }
    });
};

export const showAllLayers = () => {
    store.layers.forEach((_, idx) => {
        setStore('layers', idx, 'visible', true);
    });
};

export const moveElementsToLayer = (elementIds: string[], targetLayerId: string) => {
    const targetLayer = store.layers.find(l => l.id === targetLayerId);
    if (!targetLayer) return;

    pushToHistory();
    elementIds.forEach(elId => {
        const idx = store.elements.findIndex(e => e.id === elId);
        if (idx !== -1) {
            setStore('elements', idx, 'layerId', targetLayerId);
        }
    });
};

//Grid Control Functions
export const toggleGrid = () => {
    setStore('gridSettings', 'enabled', !store.gridSettings.enabled);
};

export const toggleSnapToGrid = () => {
    setStore('gridSettings', 'snapToGrid', !store.gridSettings.snapToGrid);
};

export const updateGridSettings = (updates: Partial<GridSettings>) => {
    setStore('gridSettings', updates as any);
};

export const setCanvasBackgroundColor = (color: string) => {
    setStore('canvasBackgroundColor', color);
};

export const setCanvasTexture = (texture: 'none' | 'dots' | 'grid' | 'graph' | 'paper') => {
    setStore('canvasTexture', texture);
};

export const setSelectedPenType = (penType: 'fineliner' | 'inkbrush' | 'marker') => {
    setStore('selectedPenType', penType);
};

export const setSelectedShapeType = (shapeType: 'triangle' | 'hexagon' | 'octagon' | 'parallelogram' | 'star' | 'cloud' | 'heart' | 'cross' | 'checkmark' | 'arrowLeft' | 'arrowRight' | 'arrowUp' | 'arrowDown' | 'capsule' | 'stickyNote' | 'callout' | 'burst' | 'speechBubble' | 'ribbon' | 'bracketLeft' | 'bracketRight' | 'database' | 'document' | 'predefinedProcess' | 'internalStorage') => {
    setStore('selectedShapeType', shapeType);
};

export const setSelectedInfraType = (infraType: 'server' | 'loadBalancer' | 'firewall' | 'user' | 'messageQueue' | 'lambda' | 'router' | 'browser') => {
    setStore('selectedInfraType', infraType);
};

export const setSelectedMathType = (mathType: 'trapezoid' | 'rightTriangle' | 'pentagon' | 'septagon') => {
    setStore('selectedMathType', mathType);
};

export const setSelectedSketchnoteType = (sketchnoteType: 'starPerson' | 'scroll' | 'wavyDivider' | 'doubleBanner') => {
    setStore('selectedSketchnoteType', sketchnoteType);
};

export const setSelectedWireframeType = (wireframeType: 'browserWindow' | 'mobilePhone' | 'ghostButton' | 'inputField') => {
    setStore('selectedWireframeType', wireframeType);
};

export const setGridStyle = (style: 'lines' | 'dots') => {
    setStore('gridSettings', 'style', style);
};

export const setMaxLayers = (count: number) => {
    setStore('maxLayers', count);
};

// Panel Management
export const togglePropertyPanel = (visible?: boolean) => {
    setStore('showPropertyPanel', (v) => visible ?? !v);
};

export const toggleLayerPanel = (visible?: boolean) => {
    setStore('showLayerPanel', (v) => visible ?? !v);
};

export const minimizePropertyPanel = (minimized?: boolean) => {
    setStore('isPropertyPanelMinimized', (v) => minimized ?? !v);
};

export const minimizeLayerPanel = (minimized?: boolean) => {
    setStore('isLayerPanelMinimized', (v) => minimized ?? !v);
};

export const toggleLayerGroupingMode = () => {
    setStore('layerGroupingModeEnabled', prev => !prev);
};

export const createLayerGroup = (name?: string) => {
    pushToHistory();
    const newId = crypto.randomUUID();
    const maxOrder = Math.max(...store.layers.map(l => l.order), -1);
    const newGroup: Layer = {
        id: newId,
        name: name || `Group ${store.layers.filter(l => l.isGroup).length + 1}`,
        visible: true,
        locked: false,
        opacity: 1,
        order: maxOrder + 1,
        backgroundColor: 'transparent',
        isGroup: true,
        expanded: true
    };
    setStore('layers', [...store.layers, newGroup]);
    setStore('activeLayerId', newId);
    return newId;
};

export const toggleLayerGroupExpansion = (groupId: string) => {
    setStore('layers', l => l.id === groupId, 'expanded', prev => !prev);
};

export const toggleMinimap = (visible?: boolean) => {
    setStore('minimapVisible', (v) => visible ?? !v);
};

export const toggleZenMode = (visible?: boolean) => {
    setStore('zenMode', (v) => visible ?? !v);
};

export const toggleSlideNavigator = (visible?: boolean) => {
    setStore('showSlideNavigator', (v) => visible ?? !v);
};

export const zoomToFitSlide = () => {
    const margin = 40; // Pixels
    const { width: sW, height: sH } = store.dimensions;
    const availableW = window.innerWidth - margin * 2;
    const availableH = window.innerHeight - margin * 2;

    const scaleW = availableW / sW;
    const scaleH = availableH / sH;
    const newScale = Math.min(scaleW, scaleH);

    // Center it
    const panX = (window.innerWidth - sW * newScale) / 2;
    const panY = (window.innerHeight - sH * newScale) / 2;

    setStore('viewState', {
        scale: newScale,
        panX,
        panY
    });
};

export const togglePresentationMode = (visible?: boolean) => {
    const newState = visible ?? !store.presentationMode;
    batch(() => {
        setStore('presentationMode', newState);
        if (newState) {
            // Auto fit on enter
            zoomToFitSlide();
            setStore('selection', []); // Clear selection
        }
    });

    // Handle Fullscreen API
    if (newState) {
        document.documentElement.requestFullscreen?.().catch(e => {
            console.warn("Fullscreen failed:", e);
        });
    } else if (document.fullscreenElement) {
        document.exitFullscreen?.();
    }
};

export const setSelectedTechnicalType = (type: AppState['selectedTechnicalType']) => {
    setStore('selectedTechnicalType', type);
};

export const toggleCommandPalette = (visible?: boolean) => {
    setStore('showCommandPalette', (v) => visible ?? !v);
};

// Initialize theme on load
document.documentElement.setAttribute('data-theme', initialState.theme);

import { calculateAlignment, calculateDistribution, type AlignmentType, type DistributionType } from "../utils/alignment";

export const alignSelectedElements = (type: AlignmentType) => {
    if (store.selection.length < 2) return;
    const updates = calculateAlignment(store.selection, store.elements, type);
    if (updates.length > 0) {
        pushToHistory();
        setStore('elements',
            (el) => updates.some(u => u.id === el.id),
            (el) => {
                const update = updates.find(u => u.id === el.id)?.updates;
                return update ? { ...el, ...update } : el;
            }
        );
    }
};

export const cycleStrokeStyle = () => {
    if (store.selection.length === 0) {
        // Cycle default style
        const styles: DrawingElement['strokeStyle'][] = ['solid', 'dashed', 'dotted'];
        const current = store.defaultElementStyles.strokeStyle || 'solid';
        const next = styles[(styles.indexOf(current) + 1) % styles.length];
        updateDefaultStyles({ strokeStyle: next });
        return;
    }

    pushToHistory();
    setStore('elements', (el) => store.selection.includes(el.id), (el) => {
        const styles: DrawingElement['strokeStyle'][] = ['solid', 'dashed', 'dotted'];
        const current = el.strokeStyle || 'solid';
        const next = styles[(styles.indexOf(current) + 1) % styles.length];
        return { strokeStyle: next };
    });
};

export const cycleFillStyle = () => {
    if (store.selection.length === 0) {
        // Cycle default style
        const styles: DrawingElement['fillStyle'][] = ['hachure', 'solid', 'zigzag', 'cross-hatch', 'dots', 'dashed', 'zigzag-line'];
        const current = store.defaultElementStyles.fillStyle || 'hachure';
        const next = styles[(styles.indexOf(current) + 1) % styles.length];
        updateDefaultStyles({ fillStyle: next });
        return;
    }

    pushToHistory();
    setStore('elements', (el) => store.selection.includes(el.id), (el) => {
        const styles: DrawingElement['fillStyle'][] = ['hachure', 'solid', 'zigzag', 'cross-hatch', 'dots', 'dashed', 'zigzag-line'];
        const current = el.fillStyle || 'hachure';
        const next = styles[(styles.indexOf(current) + 1) % styles.length];
        return { fillStyle: next };
    });
};

export const distributeSelectedElements = (type: DistributionType) => {
    if (store.selection.length < 3) return;
    const updates = calculateDistribution(store.selection, store.elements, type);
    if (updates.length > 0) {
        pushToHistory();
        setStore('elements',
            (el) => updates.some(u => u.id === el.id),
            (el) => {
                const update = updates.find(u => u.id === el.id)?.updates;
                return update ? { ...el, ...update } : el;
            }
        );
    }
};

/**
 * Load a template into the canvas
 * Clears existing content and loads template data
 */
export const loadTemplate = (templateData: {
    elements: DrawingElement[];
    layers: Layer[];
    viewState?: ViewState;
    gridSettings?: GridSettings;
    globalSettings?: GlobalSettings;
    canvasBackgroundColor?: string;
}) => {
    // Clear history and reset canvas
    clearHistory();

    // Load template data
    setStore({
        elements: templateData.elements,
        layers: templateData.layers,
        activeLayerId: templateData.layers[0]?.id || 'default-layer',
        viewState: templateData.viewState || { scale: 1, panX: 0, panY: 0 },
        gridSettings: templateData.gridSettings || store.gridSettings,
        globalSettings: templateData.globalSettings || store.globalSettings,
        canvasBackgroundColor: templateData.canvasBackgroundColor || store.canvasBackgroundColor,
        selection: []
    });
};


export const toggleCollapse = (id: string) => {
    const el = store.elements.find(e => e.id === id);
    if (el) {
        updateElement(id, { isCollapsed: !el.isCollapsed }, true);
    }
};

export const setParent = (childId: string, parentId: string | null) => {
    updateElement(childId, { parentId }, true);
};

export const clearParent = (id: string) => {
    updateElement(id, { parentId: null }, true);
};
export const reorderMindmap = (rootId: string, direction: LayoutDirection) => {
    const engine = new MindmapLayoutEngine();
    const tree = engine.buildTree(rootId, store.elements);
    if (!tree) return;

    pushToHistory();

    if (direction.startsWith('horizontal')) {
        engine.layoutHorizontal(tree, direction === 'horizontal-right' ? 'right' : 'left');
    } else if (direction.startsWith('vertical')) {
        engine.layoutVertical(tree, direction === 'vertical-down' ? 'down' : 'up');
    } else if (direction === 'radial') {
        engine.layoutRadial(tree);
    }

    const updates = engine.getUpdates(tree, store.elements);

    // Batch update elements
    const newElements = store.elements.map(el => {
        const update = updates.get(el.id);
        if (update) {
            return { ...el, ...update };
        }
        return el;
    });

    setStore("elements", newElements);
    showToast(`Mindmap layout updated (${direction})`, 'success');
};

export const applyMindmapStyling = (rootId: string) => {
    const engine = new MindmapLayoutEngine();
    const tree = engine.buildTree(rootId, store.elements);
    if (!tree) return;

    pushToHistory();

    engine.applySemanticStyling(tree, store.elements);

    const updates = engine.getUpdates(tree, store.elements);

    // Batch update elements
    const newElements = store.elements.map(el => {
        const update = updates.get(el.id);
        if (update) {
            return { ...el, ...update };
        }
        return el;
    });

    setStore("elements", newElements);
    showToast(`Semantic styling applied to branch`, 'success');
};

// --- Transient Element Cleanup (Ink Overlay) ---
if (typeof window !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        const expiredIds = store.elements
            .filter(el => el.ttl && now > el.ttl)
            .map(el => el.id);

        if (expiredIds.length > 0) {
            // Delete without history
            setStore("elements", (elements) =>
                elements.filter(el => !expiredIds.includes(el.id))
            );
        }
    }, 500);
}
