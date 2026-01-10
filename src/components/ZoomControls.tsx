import { type Component } from "solid-js";
import { store, setViewState } from "../store/appStore";
import { Plus, Minus, Undo2, Redo2 } from "lucide-solid"; // Using lucide-solid
import "./ZoomControls.css";

const ZoomControls: Component = () => {
    const handleZoomIn = () => {
        const newScale = Math.min(store.viewState.scale * 1.1, 10);
        setViewState({ scale: newScale });
    };

    const handleZoomOut = () => {
        const newScale = Math.max(store.viewState.scale * 0.9, 0.1);
        setViewState({ scale: newScale });
    };

    const resetZoom = () => {
        setViewState({ scale: 1 });
    };

    return (
        <div class="zoom-container">
            <div class="zoom-group">
                <button class="zoom-btn" onClick={handleZoomOut} title="Zoom Out">
                    <Minus size={16} />
                </button>
                <button class="zoom-btn text-btn" onClick={resetZoom} title="Reset Zoom">
                    {Math.round(store.viewState.scale * 100)}%
                </button>
                <button class="zoom-btn" onClick={handleZoomIn} title="Zoom In">
                    <Plus size={16} />
                </button>
            </div>

            <div class="zoom-group" style={{ "margin-left": "12px" }}>
                <button class="zoom-btn" title="Undo (Coming Soon)">
                    <Undo2 size={16} />
                </button>
                <button class="zoom-btn" title="Redo (Coming Soon)">
                    <Redo2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default ZoomControls;
