import { type Component, For, createSignal, Show } from 'solid-js';
import { store, addLayer, setActiveLayer, updateLayer, deleteLayer, duplicateLayer, reorderLayers } from '../store/appStore';
import './LayerPanel.css';

const LayerPanel: Component = () => {
    const [editingId, setEditingId] = createSignal<string | null>(null);
    const [editingName, setEditingName] = createSignal('');
    const [isCollapsed, setIsCollapsed] = createSignal(false);
    const [draggedId, setDraggedId] = createSignal<string | null>(null);
    const [dragOverId, setDragOverId] = createSignal<string | null>(null);
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

    // Start editing layer name
    const startEditing = (id: string, currentName: string, e: Event) => {
        e.stopPropagation();
        setEditingId(id);
        setEditingName(currentName);
    };

    // Save layer rename
    const saveRename = (id: string) => {
        const newName = editingName().trim();
        if (newName && newName !== store.layers.find(l => l.id === id)?.name) {
            updateLayer(id, { name: newName });
        }
        setEditingId(null);
        setEditingName('');
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingId(null);
        setEditingName('');
    };

    // Handle keyboard in rename input
    const handleRenameKeyDown = (e: KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveRename(id);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditing();
        }
    };

    // Long press for mobile
    const handlePointerDown = (id: string, name: string, e: PointerEvent) => {
        longPressTimer = window.setTimeout(() => {
            startEditing(id, name, e);
        }, 500); // 500ms long press
    };

    const handlePointerUp = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    // Drag and drop handlers
    const handleDragStart = (id: string, e: DragEvent) => {
        setDraggedId(id);
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', id);
        // Add visual feedback
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
            // Find indices in current layer order
            const reversedList = [...store.layers].reverse();
            const sourceIndex = reversedList.findIndex(l => l.id === sourceId);
            const targetIndex = reversedList.findIndex(l => l.id === targetId);

            if (sourceIndex !== -1 && targetIndex !== -1) {
                // Convert back to normal order indices
                const normalSourceIndex = store.layers.length - 1 - sourceIndex;
                const normalTargetIndex = store.layers.length - 1 - targetIndex;
                reorderLayers(normalSourceIndex, normalTargetIndex);
            }
        }

        setDraggedId(null);
        setDragOverId(null);
    };

    // Reverse to show top layers first
    const reversedLayers = () => [...store.layers].reverse();

    return (
        <div class={`layer-panel ${isCollapsed() ? 'collapsed' : ''}`}>
            <div class="layer-panel-header">
                <h3>Layers</h3>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        class="layer-collapse-btn"
                        onClick={() => setIsCollapsed(!isCollapsed())}
                        title={isCollapsed() ? 'Expand layers' : 'Collapse layers'}
                    >
                        {isCollapsed() ? '▲' : '▼'}
                    </button>
                    <button
                        class="layer-add-btn"
                        onClick={handleAddLayer}
                        title="Add new layer"
                    >
                        +
                    </button>
                </div>
            </div>
            <Show when={!isCollapsed()}>
                <div class="layer-list">
                    <For each={reversedLayers()}>
                        {(layer) => (
                            <div
                                class={`layer-item ${store.activeLayerId === layer.id ? 'active' : ''} ${dragOverId() === layer.id ? 'drag-over' : ''}`}
                                onClick={() => handleLayerClick(layer.id)}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(layer.id, e)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(layer.id, e)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(layer.id, e)}
                            >
                                {/* Drag Handle */}
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
        </div>
    );
};

export default LayerPanel;
