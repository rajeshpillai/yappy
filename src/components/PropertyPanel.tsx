import { type Component, Show, createMemo } from "solid-js";
import { store, updateElement } from "../store/appStore";
import "./PropertyPanel.css";

const PropertyPanel: Component = () => {
    const selectedElement = createMemo(() => {
        if (store.selection.length === 1) {
            return store.elements.find(e => e.id === store.selection[0]);
        }
        return null;
    });

    const handleChange = (key: string, value: any) => {
        const id = selectedElement()?.id;
        if (id) {
            updateElement(id, { [key]: value });
        }
    };

    return (
        <Show when={selectedElement()}>
            {(_) => {
                const el = selectedElement()!;
                return (
                    <div class="property-panel">
                        <div class="panel-section">
                            <label>Stroke</label>
                            <div class="color-picker-row">
                                {['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00'].map(c => (
                                    <button
                                        class={`color-btn ${el.strokeColor === c ? 'active' : ''}`}
                                        style={{ background: c }}
                                        onClick={() => handleChange('strokeColor', c)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div class="panel-section">
                            <label>Background</label>
                            <div class="color-picker-row">
                                {['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99'].map(c => (
                                    <button
                                        class={`color-btn ${el.backgroundColor === c ? 'active' : ''}`}
                                        style={{ background: c === 'transparent' ? 'white' : c, position: 'relative' }}
                                        onClick={() => handleChange('backgroundColor', c)}
                                    >
                                        {c === 'transparent' && <div class="cross-line"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div class="panel-section">
                            <label>Stroke Width</label>
                            <div class="button-row">
                                {[1, 2, 4].map(w => (
                                    <button
                                        class={`option-btn ${el.strokeWidth === w ? 'active' : ''}`}
                                        onClick={() => handleChange('strokeWidth', w)}
                                    >
                                        {w === 1 ? 'Thin' : w === 2 ? 'Bold' : 'Extra Bold'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div class="panel-section">
                            <label>Opacity {el.opacity ?? 100}%</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={el.opacity ?? 100}
                                onInput={(e) => handleChange('opacity', parseInt(e.currentTarget.value))}
                            />
                        </div>
                    </div>
                );
            }}
        </Show>
    );
};

export default PropertyPanel;
