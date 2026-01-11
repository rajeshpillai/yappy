import { type Component, Show, createMemo, createSignal } from "solid-js";
import { store, updateElement, deleteElements, duplicateElement, moveElementZIndex } from "../store/appStore";
import { SlidersHorizontal, Layers, Copy, ChevronsDown, ChevronDown, ChevronUp, ChevronsUp, Trash2 } from "lucide-solid";
import "./PropertyPanel.css";

const PropertyPanel: Component = () => {
    const selectedElement = createMemo(() => {
        if (store.selection.length === 1) {
            return store.elements.find(e => e.id === store.selection[0]);
        }
        return null;
    });

    const [activePopover, setActivePopover] = createSignal<'stroke' | 'background' | 'properties' | 'layers' | null>(null);

    const togglePopover = (type: 'stroke' | 'background' | 'properties' | 'layers') => {
        if (activePopover() === type) {
            setActivePopover(null);
        } else {
            setActivePopover(type);
        }
    };

    const handleChange = (key: string, value: any) => {
        const id = selectedElement()?.id;
        if (id) {
            updateElement(id, { [key]: value });
        }
    };

    const handleDelete = () => {
        if (store.selection.length > 0) {
            deleteElements(store.selection);
        }
    };

    const strokeColors = ['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#862e9c', '#fcc419'];
    const bgColors = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#eebefa', '#fff4e6'];

    return (
        <Show when={selectedElement()}>
            {(_) => {
                const el = selectedElement()!;
                return (
                    <div class="property-sidebar-container" style={{ position: 'relative' }}>
                        {/* Main Vertical Toolbar */}
                        <div class="property-sidebar">
                            {/* Stroke Color Icon */}
                            <button
                                class={`sidebar-btn ${activePopover() === 'stroke' ? 'active' : ''}`}
                                onClick={() => togglePopover('stroke')}
                                title="Stroke Color"
                            >
                                <div class="color-preview stroke" style={{ background: el.strokeColor }}></div>
                            </button>

                            {/* Background Color Icon */}
                            <button
                                class={`sidebar-btn ${activePopover() === 'background' ? 'active' : ''}`}
                                onClick={() => togglePopover('background')}
                                title="Background Color"
                            >
                                <div class="color-preview bg" style={{ background: el.backgroundColor === 'transparent' ? 'white' : el.backgroundColor }}>
                                    {el.backgroundColor === 'transparent' && <div class="diagonal-line"></div>}
                                </div>
                            </button>

                            {/* Properties Icon */}
                            <button
                                class={`sidebar-btn ${activePopover() === 'properties' ? 'active' : ''}`}
                                onClick={() => togglePopover('properties')}
                                title="Properties"
                            >
                                <SlidersHorizontal size={20} />
                            </button>

                            <div class="separator"></div>

                            {/* Duplicate */}
                            <button class="sidebar-btn" onClick={() => duplicateElement(el.id)} title="Duplicate">
                                <Copy size={20} />
                            </button>

                            {/* Layers */}
                            <button
                                class={`sidebar-btn ${activePopover() === 'layers' ? 'active' : ''}`}
                                onClick={() => togglePopover('layers')}
                                title="Layers"
                            >
                                <Layers size={20} />
                            </button>

                            {/* Delete */}
                            <button class="sidebar-btn delete-btn" onClick={handleDelete} title="Delete">
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {/* POPOVERS */}
                        <Show when={activePopover()}>
                            <div class="popover-panel">
                                <Show when={activePopover() === 'stroke'}>
                                    <div class="panel-section">
                                        <label>Stroke Color</label>
                                        <div class="color-grid">
                                            {strokeColors.map(c => (
                                                <button
                                                    class={`color-cell ${el.strokeColor === c ? 'selected' : ''}`}
                                                    style={{ background: c }}
                                                    onClick={() => handleChange('strokeColor', c)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </Show>

                                <Show when={activePopover() === 'background'}>
                                    <div class="panel-section">
                                        <label>Background Color</label>
                                        <div class="color-grid">
                                            {bgColors.map(c => (
                                                <button
                                                    class={`color-cell ${el.backgroundColor === c ? 'selected' : ''}`}
                                                    style={{ background: c === 'transparent' ? 'white' : c }}
                                                    onClick={() => handleChange('backgroundColor', c)}
                                                >
                                                    {c === 'transparent' && <div class="diagonal-line-sm"></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </Show>

                                <Show when={activePopover() === 'properties'}>
                                    <div class="panel-section">
                                        <label>Stroke Width</label>
                                        <div class="flex-row">
                                            {[1, 2, 4].map(w => (
                                                <button
                                                    class={`prop-btn ${el.strokeWidth === w ? 'selected' : ''}`}
                                                    onClick={() => handleChange('strokeWidth', w)}
                                                >
                                                    <div style={{ height: w + 'px', width: '20px', background: 'currentColor' }}></div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div class="panel-section">
                                        <label>Stroke Style</label>
                                        <div class="flex-row">
                                            <button
                                                class={`prop-btn ${(!el.strokeStyle || el.strokeStyle === 'solid') ? 'selected' : ''}`}
                                                onClick={() => handleChange('strokeStyle', 'solid')}
                                                title="Solid"
                                            >
                                                <div class="style-preview solid"></div>
                                            </button>
                                            <button
                                                class={`prop-btn ${el.strokeStyle === 'dashed' ? 'selected' : ''}`}
                                                onClick={() => handleChange('strokeStyle', 'dashed')}
                                                title="Dashed"
                                            >
                                                <div class="style-preview dashed"></div>
                                            </button>
                                            <button
                                                class={`prop-btn ${el.strokeStyle === 'dotted' ? 'selected' : ''}`}
                                                onClick={() => handleChange('strokeStyle', 'dotted')}
                                                title="Dotted"
                                            >
                                                <div class="style-preview dotted"></div>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="panel-section">
                                        <label>Opacity</label>
                                        <input
                                            type="range"
                                            min="0" max="100"
                                            value={el.opacity}
                                            onInput={(e) => handleChange('opacity', parseInt(e.currentTarget.value))}
                                        />
                                    </div>
                                </Show>

                                <Show when={activePopover() === 'layers'}>
                                    <div class="panel-section">
                                        <label>Layers</label>
                                        <div class="flex-row">
                                            <button class="prop-btn" onClick={() => moveElementZIndex(el.id, 'front')} title="Bring to Front">
                                                <ChevronsUp size={20} />
                                            </button>
                                            <button class="prop-btn" onClick={() => moveElementZIndex(el.id, 'forward')} title="Bring Forward">
                                                <ChevronUp size={20} />
                                            </button>
                                            <button class="prop-btn" onClick={() => moveElementZIndex(el.id, 'backward')} title="Send Backward">
                                                <ChevronDown size={20} />
                                            </button>
                                            <button class="prop-btn" onClick={() => moveElementZIndex(el.id, 'back')} title="Send to Back">
                                                <ChevronsDown size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </Show>
                            </div>
                        </Show>
                    </div>
                );
            }}
        </Show>
    );
};

export default PropertyPanel;
