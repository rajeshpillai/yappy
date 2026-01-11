import { type Component, For } from 'solid-js';
import { store, addLayer, setActiveLayer, updateLayer, deleteLayer } from '../store/appStore';
import './LayerPanel.css';

const LayerPanel: Component = () => {
    const handleAddLayer = () => {
        addLayer();
    };

    const handleLayerClick = (id: string) => {
        setActiveLayer(id);
    };

    const handleToggleVisibility = (id: string, e: MouseEvent) => {
        e.stopPropagation();
        const layer = store.layers.find(l => l.id === id);
        if (layer) {
            updateLayer(id, { visible: !layer.visible });
        }
    };

    const handleToggleLock = (id: string, e: MouseEvent) => {
        e.stopPropagation();
        const layer = store.layers.find(l => l.id === id);
        if (layer) {
            updateLayer(id, { locked: !layer.locked });
        }
    };

    const handleDeleteLayer = (id: string, e: MouseEvent) => {
        e.stopPropagation();
        if (store.layers.length > 1) {
            deleteLayer(id);
        }
    };

    // Reverse to show top layers first
    const reversedLayers = () => [...store.layers].reverse();

    return (
        <div class="layer-panel">
            <div class="layer-panel-header">
                <h3>Layers</h3>
                <button
                    class="layer-add-btn"
                    onClick={handleAddLayer}
                    title="Add new layer"
                >
                    +
                </button>
            </div>
            <div class="layer-list">
                <For each={reversedLayers()}>
                    {(layer) => (
                        <div
                            class={`layer-item ${store.activeLayerId === layer.id ? 'active' : ''}`}
                            onClick={() => handleLayerClick(layer.id)}
                        >
                            <button
                                class={`layer-visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
                                onClick={(e) => handleToggleVisibility(layer.id, e)}
                                title={layer.visible ? 'Hide layer' : 'Show layer'}
                            >
                                {layer.visible ? '👁️' : '🚫'}
                            </button>
                            <button
                                class={`layer-lock-btn ${layer.locked ? 'locked' : ''}`}
                                onClick={(e) => handleToggleLock(layer.id, e)}
                                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                            >
                                {layer.locked ? '🔒' : '🔓'}
                            </button>
                            <span class="layer-name">{layer.name}</span>
                            <button
                                class="layer-delete-btn"
                                onClick={(e) => handleDeleteLayer(layer.id, e)}
                                title="Delete layer"
                                disabled={store.layers.length <= 1}
                            >
                                ×
                            </button>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};

export default LayerPanel;
