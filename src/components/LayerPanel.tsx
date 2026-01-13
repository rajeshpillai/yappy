import { type Component, For, createSignal, Show } from 'solid-js';
import { store, addLayer, setActiveLayer, updateLayer, deleteLayer, duplicateLayer, reorderLayers, toggleLayerPanel, minimizeLayerPanel } from '../store/appStore';
import { X, Minus, ChevronUp } from 'lucide-solid';
import LayerContextMenu from './LayerContextMenu';
import './LayerPanel.css';

const LayerPanel: Component = () => {
    const [editingId, setEditingId] = createSignal<string | null>(null);
    const [editingName, setEditingName] = createSignal('');
    const [draggedId, setDraggedId] = createSignal<string | null>(null);
    const [dragOverId, setDragOverId] = createSignal<string | null>(null);
    const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; layerId: string } | null>(null);
    let longPressTimer: number | null = null;

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

    const handleDuplicateLayer = (id: string, e: MouseEvent) => {
        e.stopPropagation();
        duplicateLayer(id);
    };

    const startEditing = (id: string, currentName: string, e: Event) => {
        e.stopPropagation();
        setEditingId(id);
        setEditingName(currentName);
    };

    const saveRename = (id: string) => {
        const newName = editingName().trim();
        if (newName && newName !== store.layers.find(l => l.id === id)?.name) {
            updateLayer(id, { name: newName });
        }
        setEditingId(null);
        setEditingName('');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleRenameKeyDown = (e: KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename(id);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditing();
        }
    };

    const handlePointerDown = (id: string, name: string, e: PointerEvent) => {
        longPressTimer = window.setTimeout(() => {
            startEditing(id, name, e);
        }, 500);
    };

    const handlePointerUp = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    const handleDragStart = (id: string, e: DragEvent) => {
        setDraggedId(id);
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', id);
        setTimeout(() => {
            (e.target as HTMLElement).style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
        setDraggedId(null);
        setDragOverId(null);
    };

    const handleDragOver = (id: string, e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        setDragOverId(id);
    };

    const handleDragLeave = () => {
        setDragOverId(null);
    };

    const handleDrop = (targetId: string, e: DragEvent) => {
        e.preventDefault();
        const sourceId = draggedId();

        if (sourceId && sourceId !== targetId) {
            const reversedList = [...store.layers].reverse();
            const sourceIndex = reversedList.findIndex(l => l.id === sourceId);
            const targetIndex = reversedList.findIndex(l => l.id === targetId);

            if (sourceIndex !== -1 && targetIndex !== -1) {
                const normalSourceIndex = store.layers.length - 1 - sourceIndex;
                const normalTargetIndex = store.layers.length - 1 - targetIndex;
                reorderLayers(normalSourceIndex, normalTargetIndex);
            }
        }

        setDraggedId(null);
        setDragOverId(null);
    };

    const reversedLayers = () => [...store.layers].reverse();

    return (
        <Show when={store.showLayerPanel}>
            <div
                class="layer-panel"
                classList={{ minimized: store.isLayerPanelMinimized }}
            >
                <div class="layer-panel-header">
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                        <Show when={store.isLayerPanelMinimized}>
                            <button class="minimize-btn" onClick={() => minimizeLayerPanel(false)} title="Expand">
                                <ChevronUp size={16} />
                            </button>
                        </Show>
                        <h3>Layers</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <Show when={!store.isLayerPanelMinimized}>
                            <button
                                class="layer-add-btn"
                                onClick={handleAddLayer}
                                title="Add new layer"
                            >
                                +
                            </button>
                            <button
                                class="minimize-btn"
                                onClick={() => minimizeLayerPanel(true)}
                                title="Minimize"
                            >
                                <Minus size={16} />
                            </button>
                        </Show>
                        <button
                            class="close-btn"
                            onClick={() => toggleLayerPanel(false)}
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <Show when={!store.isLayerPanelMinimized}>
                    <div class="layer-properties">
                        <div class="opacity-control">
                            <span class="label">Opacity</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={store.layers.find(l => l.id === store.activeLayerId)?.opacity ?? 1}
                                onInput={(e) => {
                                    const val = parseFloat(e.currentTarget.value);
                                    updateLayer(store.activeLayerId, { opacity: val });
                                }}
                                title={`Opacity: ${Math.round((store.layers.find(l => l.id === store.activeLayerId)?.opacity ?? 1) * 100)}%`}
                            />
                        </div>
                        <div class="background-control">
                            <span class="label">Background</span>
                            <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                                <button
                                    class={`color-swatch-mini ${store.layers.find(l => l.id === store.activeLayerId)?.backgroundColor === 'transparent' ? 'transparent' : ''}`}
                                    style={{
                                        background: store.layers.find(l => l.id === store.activeLayerId)?.backgroundColor === 'transparent'
                                            ? 'white'
                                            : (store.layers.find(l => l.id === store.activeLayerId)?.backgroundColor || 'transparent')
                                    }}
                                    onClick={() => {
                                        const current = store.layers.find(l => l.id === store.activeLayerId)?.backgroundColor;
                                        if (current === 'transparent') {
                                            updateLayer(store.activeLayerId, { backgroundColor: '#ffffff' });
                                        } else {
                                            updateLayer(store.activeLayerId, { backgroundColor: 'transparent' });
                                        }
                                    }}
                                    title="Toggle transparent / color"
                                />
                                <Show when={store.layers.find(l => l.id === store.activeLayerId)?.backgroundColor !== 'transparent'}>
                                    <input
                                        type="color"
                                        class="color-picker-mini-visible"
                                        style={{ width: '24px', height: '20px', padding: '0', border: 'none', cursor: 'pointer' }}
                                        value={store.layers.find(l => l.id === store.activeLayerId)?.backgroundColor || '#ffffff'}
                                        onInput={(e) => {
                                            updateLayer(store.activeLayerId, { backgroundColor: e.currentTarget.value });
                                        }}
                                    />
                                </Show>
                            </div>
                        </div>
                    </div>
                    <div class="layer-list">
                        <For each={reversedLayers()}>
                            {(layer) => (
                                <div
                                    class={`layer-item ${store.activeLayerId === layer.id ? 'active' : ''} ${dragOverId() === layer.id ? 'drag-over' : ''}`}
                                    onClick={() => handleLayerClick(layer.id)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenu({ x: e.clientX, y: e.clientY, layerId: layer.id });
                                    }}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(layer.id, e)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(layer.id, e)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(layer.id, e)}
                                >
                                    <span class="drag-handle" title="Drag to reorder">
                                        ⋮⋮
                                    </span>
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

                                    {editingId() === layer.id ? (
                                        <input
                                            type="text"
                                            class="layer-name-input"
                                            value={editingName()}
                                            onInput={(e) => setEditingName(e.currentTarget.value)}
                                            onKeyDown={(e) => handleRenameKeyDown(e, layer.id)}
                                            onBlur={() => saveRename(layer.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            ref={(el) => setTimeout(() => el?.select(), 0)}
                                        />
                                    ) : (
                                        <span
                                            class="layer-name"
                                            onDblClick={(e) => startEditing(layer.id, layer.name, e)}
                                            onPointerDown={(e) => handlePointerDown(layer.id, layer.name, e)}
                                            onPointerUp={handlePointerUp}
                                            onPointerCancel={handlePointerUp}
                                            title="Double-click or long-press to rename"
                                        >
                                            {layer.name}
                                        </span>
                                    )}

                                    <button
                                        class="layer-duplicate-btn"
                                        onClick={(e) => handleDuplicateLayer(layer.id, e)}
                                        title="Duplicate layer"
                                    >
                                        ⎘
                                    </button>
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
                </Show>
                <Show when={contextMenu()}>
                    <LayerContextMenu
                        x={contextMenu()!.x}
                        y={contextMenu()!.y}
                        layerId={contextMenu()!.layerId}
                        onClose={() => setContextMenu(null)}
                        onRename={(id) => {
                            const layer = store.layers.find(l => l.id === id);
                            if (layer) startEditing(id, layer.name, new MouseEvent('click'));
                            setContextMenu(null);
                        }}
                    />
                </Show>
            </div>
        </Show>
    );
};

export default LayerPanel;
