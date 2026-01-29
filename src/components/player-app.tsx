import { createSignal, onMount, Show } from "solid-js";
import type { Component } from "solid-js";
import Canvas from "./canvas";
import { loadDocument, setStore, store } from "../store/app-store";
import { PresentationControls } from "./presentation-controls";
import type { SlideDocument } from "../types/slide-types";
import { showToast } from "./toast";
import Toast from "./toast";
import "./player-app.css";

// Declare global variable for injected data
declare global {
    interface Window {
        __PRESENTATION_DATA__: SlideDocument;
    }
}

const PlayerApp: Component = () => {
    const [isReady, setIsReady] = createSignal(false);

    onMount(() => {
        // Load data from injected global variable
        if (window.__PRESENTATION_DATA__) {
            try {
                // Initialize store with document data
                loadDocument(window.__PRESENTATION_DATA__);

                // Force presentation mode settings
                setStore("appMode", "presentation");
                setStore("showMainToolbar", false);
                setStore("showPropertyPanel", false);
                setStore("showLayerPanel", false);
                setStore("showSlideNavigator", false); // Hidden by default in player
                setStore("showSlideToolbar", true); // Show controls
                setStore("readOnly", false); // Allow Ink tool interactions

                // FIX: Ensure we start at Slide 0 and load its elements
                // loadDocument sets store.elements to what was saved, which might be a random slide
                // We need to sync to Slide 0 for the start of presentation
                if (store.docType === 'slides' && store.slides.length > 0) {
                    setStore("activeSlideIndex", 0);
                    // Crucial: Set view state to match slide 0 position
                    const firstSlide = store.slides[0];
                    setStore("viewState", {
                        scale: 1,
                        panX: -firstSlide.spatialPosition.x,
                        panY: -firstSlide.spatialPosition.y
                    });

                    // Debug / Validation: Ensure layers exist
                    let activeLayerId = store.activeLayerId;
                    if (store.layers.length === 0) {
                        const defaultLayer = { id: 'default', name: 'Layer 1', visible: true, locked: false, opacity: 1, order: 0, backgroundColor: 'transparent' };
                        setStore("layers", [defaultLayer]);
                        activeLayerId = 'default';
                        setStore("activeLayerId", 'default');
                    } else {
                        // Ensure active layer is valid
                        if (!store.layers.find(l => l.id === activeLayerId)) {
                            activeLayerId = store.layers[0].id;
                            setStore("activeLayerId", activeLayerId);
                        }
                    }

                    // Fix orphaned elements (elements on non-existent layers)
                    setStore("elements", (el) => {
                        return !store.layers.some(l => l.id === el.layerId);
                    }, (el) => ({ layerId: activeLayerId }));

                    // Force all layers visible and 100% opaque for the player
                    setStore("layers", {}, { visible: true, opacity: 1 });

                }

                setIsReady(true);

                // Detailed Debug Info
                const firstSlide = store.slides[0];
                const view = store.viewState;
                const firstEl = store.elements[0];
                const masterLayer = store.layers.find(l => l.isMaster);
                const activeLayer = store.layers.find(l => l.id === store.activeLayerId);

                // Cleanest Debug Toast
                showToast(`Player Ready (${store.elements.length} els)`, 'success');
            } catch (e) {
                console.error("Failed to load presentation data:", e);
                showToast("Failed to load presentation data", "error");
            }
        } else {
            showToast("No presentation data found", "error");
        }
    });

    return (
        <div class="player-app">
            <Show when={isReady()}>
                <div class="canvas-container">
                    <Canvas />
                </div>

                {/* Presentation Controls Overlay */}
                <div class="player-controls">
                    <PresentationControls />
                </div>
            </Show>

            <Toast />
        </div>
    );
};

export default PlayerApp;
