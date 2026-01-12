import { type Component, Show, createMemo, For, createSignal, createEffect } from "solid-js";
import { store, updateElement, deleteElements, duplicateElement, moveElementZIndex, updateDefaultStyles, moveElementsToLayer, setCanvasBackgroundColor, updateGridSettings, setGridStyle, setShowCanvasProperties } from "../store/appStore";
import { Copy, ChevronsDown, ChevronDown, ChevronUp, ChevronsUp, Trash2, Palette } from "lucide-solid";
import "./PropertyPanel.css";
import { properties, type PropertyConfig } from "../config/properties";

const ColorControl: Component<{ prop: PropertyConfig, value: any, onChange: (val: any) => void }> = (props) => {
    const hasOptions = () => props.prop.options && props.prop.options.length > 0;
    const [showPicker, setShowPicker] = createSignal(false);

    createEffect(() => {
        if (hasOptions() && props.value) {
            const isPreset = props.prop.options?.some(o => o.value === props.value);
            if (!isPreset && !showPicker()) setShowPicker(true);
        }
    });

    return (
        <div class="control-col">
            <label>{props.prop.label}</label>
            <div class="color-picker-container">
                <Show when={hasOptions()}>
                    <div class="swatch-row">
                        <For each={props.prop.options}>
                            {(opt) => (
                                <button
                                    class="swatch-circle"
                                    classList={{ selected: props.value === opt.value }}
                                    style={{ background: opt.value, border: opt.value === '#ffffff' ? '1px solid #e0e0e0' : 'none' }}
                                    title={opt.label}
                                    onClick={() => {
                                        props.onChange(opt.value);
                                        setShowPicker(false);
                                    }}
                                />
                            )}
                        </For>
                        <button
                            class="swatch-circle rainbow"
                            classList={{ active: showPicker() }}
                            title="Custom Color"
                            onClick={() => setShowPicker(!showPicker())}
                        >
                            <Palette size={14} class="rainbow-icon" />
                        </button>
                    </div>
                </Show>

                <Show when={!hasOptions() || showPicker()}>
                    <Show when={!hasOptions()}>
                        <div class="color-grid">
                            <For each={[
                                'transparent', '#ffffff', '#f8f9fa', '#f1f3f5', '#fff5f5', '#fff0f6',
                                '#f3f0ff', '#e03131', '#e8590c', '#fcc419', '#2f9e44', '#1971c2',
                                '#6741d9', '#c2255c', '#343a40'
                            ]}>
                                {(c) => (
                                    <button
                                        class="color-swatch"
                                        classList={{ selected: props.value === c }}
                                        style={{ background: c === 'transparent' ? 'white' : c }}
                                        onClick={() => props.onChange(c)}
                                        title={c}
                                    >
                                        {c === 'transparent' && <div class="diagonal-line-sm"></div>}
                                    </button>
                                )}
                            </For>
                        </div>
                    </Show>

                    <div class="hex-input-row" style={{ "margin-top": hasOptions() ? "12px" : "0" }}>
                        <span class="hash">#</span>
                        <input
                            type="text"
                            class="hex-input"
                            value={props.value?.replace('#', '') || ''}
                            onInput={(e) => props.onChange('#' + e.currentTarget.value)}
                        />
                        <div class="system-picker-wrapper">
                            <input
                                type="color"
                                value={props.value?.startsWith('#') ? props.value : '#000000'}
                                onInput={(e) => props.onChange(e.currentTarget.value)}
                            />
                        </div>
                    </div>
                </Show>
            </div>
        </div>
    );
};

const PropertyPanel: Component = () => {

    // Derived state for the active target (selection or defaults)
    const activeTarget = createMemo(() => {
        if (store.selection.length === 1) {
            const el = store.elements.find(e => e.id === store.selection[0]);
            return el ? { type: 'element' as const, data: el } : null;
        } else if (store.selection.length > 1) {
            return { type: 'multi' as const, data: null };
        } else {
            // Only show Canvas properties if explicitly requested
            if (store.showCanvasProperties) {
                return { type: 'canvas' as const, data: null };
            }
            return null;
        }

        return null; // Unreachable now but keeps types happy if needed
    });

    const activeProperties = createMemo(() => {
        const target = activeTarget();
        if (!target) return [];

        if (target.type === 'multi') return [];

        const targetType = target.type === 'canvas' ? 'canvas' : target.data!.type;

        return properties.filter(p => {
            if (p.applicableTo === 'all') return true;
            if (Array.isArray(p.applicableTo)) {
                return p.applicableTo.includes(targetType as any);
            }
            return true;
        });
    });

    const handleChange = (key: string, value: any) => {
        const target = activeTarget();
        if (!target) return;

        if (target.type === 'element') {
            updateElement(target.data.id!, { [key]: value }, true);
        } else if (target.type === 'canvas') {
            if (key === 'canvasBackgroundColor') setCanvasBackgroundColor(value);
            else if (key === 'gridEnabled') updateGridSettings({ enabled: value });
            else if (key === 'snapToGrid') updateGridSettings({ snapToGrid: value });
            else if (key === 'gridStyle') setGridStyle(value);
            else if (key === 'gridColor') updateGridSettings({ gridColor: value });
            else if (key === 'gridOpacity') updateGridSettings({ gridOpacity: value });
        } else {
            updateDefaultStyles({ [key]: value });
        }
    };

    const getPropertyValue = (prop: PropertyConfig) => {
        const target = activeTarget();
        if (!target) return undefined;

        if (target.type === 'canvas') {
            if (prop.key === 'canvasBackgroundColor') return store.canvasBackgroundColor;
            if (prop.key === 'gridEnabled') return store.gridSettings.enabled;
            if (prop.key === 'gridStyle') return store.gridSettings.style;
            if (['snapToGrid', 'gridColor', 'gridOpacity'].includes(prop.key)) {
                return (store.gridSettings as any)[prop.key];
            }
            return (store as any)[prop.key];
        }
        if (target.type === 'element') return (target.data as any)[prop.key];
        return undefined;
    };

    const handleDelete = () => {
        if (store.selection.length > 0) {
            deleteElements(store.selection);
        }
    };

    // Helper to render a control based on config
    const renderControl = (prop: PropertyConfig) => {
        switch (prop.type) {
            case 'color':
                return (
                    <ColorControl
                        prop={prop}
                        value={getPropertyValue(prop)}
                        onChange={(val) => handleChange(prop.key, val)}
                    />
                );
            case 'slider':
                return (
                    <div class="control-row">
                        <label>{prop.label}</label>
                        <div class="slider-wrapper">
                            <input
                                type="range"
                                min={prop.min} max={prop.max} step={prop.step}
                                value={getPropertyValue(prop) ?? prop.defaultValue}
                                onInput={(e) => handleChange(prop.key, Number(e.currentTarget.value))}
                            />
                            <span class="value-display">{getPropertyValue(prop)}</span>
                        </div>
                    </div>
                );
            case 'select':
                return (
                    <div class="control-row">
                        <label>{prop.label}</label>
                        <select
                            value={getPropertyValue(prop) ?? prop.defaultValue}
                            onChange={(e) => {
                                const val = e.currentTarget.value;
                                // Try to parse number if options are numbers
                                const isNum = prop.options?.some(o => typeof o.value === 'number');
                                handleChange(prop.key, isNum ? Number(val) : val);
                            }}
                        >
                            <For each={prop.options}>
                                {(opt) => <option value={opt.value ?? ''}>{opt.label}</option>}
                            </For>
                        </select>
                    </div>
                );
            case 'toggle':
                return (
                    <div class="control-row">
                        <label>{prop.label}</label>
                        <input
                            type="checkbox"
                            checked={!!getPropertyValue(prop)}
                            onChange={(e) => handleChange(prop.key, e.currentTarget.checked)}
                        />
                    </div>
                );
            case 'input':
                return (
                    <div class="control-row">
                        <label>{prop.label}</label>
                        <input
                            type="text"
                            value={getPropertyValue(prop) || ''}
                            onInput={(e) => handleChange(prop.key, e.currentTarget.value)}
                        />
                    </div>
                );
            case 'textarea':
                return (
                    <div class="control-col">
                        <label>{prop.label}</label>
                        <div class="textarea-wrapper">
                            <textarea
                                value={getPropertyValue(prop) || ''}
                                onInput={(e) => handleChange(prop.key, e.currentTarget.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                );
            case 'number':
                return (
                    <div class="control-row">
                        <label>{prop.label}</label>
                        <input
                            type="number"
                            value={getPropertyValue(prop) ?? 0}
                            onInput={(e) => handleChange(prop.key, Number(e.currentTarget.value))}
                        />
                    </div>
                );
            default:
                return null;
        }
    };


    // Group properties
    const groupedProperties = createMemo(() => {
        const groups: Record<string, PropertyConfig[]> = {};
        activeProperties().forEach(p => {
            if (!groups[p.group]) groups[p.group] = [];
            groups[p.group].push(p);
        });
        return groups;
    });

    return (
        <Show when={activeTarget()}>
            <div class="property-panel-container">
                <div class="property-header">
                    <h3>{activeTarget()?.type === 'element' ? 'Properties' : activeTarget()?.type === 'canvas' ? 'Canvas' : 'Defaults'}</h3>
                    <Show when={activeTarget()?.type === 'element'}>
                        <div class="header-actions">
                            <button onClick={() => duplicateElement(activeTarget()!.data!.id!)} title="Duplicate">
                                <Copy size={16} />
                            </button>
                            <button class="delete-btn" onClick={handleDelete} title="Delete">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </Show>
                </div>

                <div class="property-content">
                    <For each={Object.entries(groupedProperties())}>
                        {([group, props]) => (
                            <div class="property-group">
                                <div class="group-title">{group.toUpperCase()}</div>
                                <For each={props}>
                                    {(prop) => renderControl(prop)}
                                </For>
                            </div>
                        )}
                    </For>

                    {/* Layers for elements */}
                    <Show when={activeTarget() && (activeTarget()!.type === 'element' || activeTarget()!.type === 'multi')}>
                        <div class="property-group">
                            <div class="group-title">LAYERS</div>

                            {/* Layer Selection Dropdown */}
                            <div class="control-row">
                                <label>Layer</label>
                                <select
                                    value={(() => {
                                        const target = activeTarget();
                                        if (target?.type === 'element') {
                                            return (target.data as any).layerId;
                                        }
                                        if (target?.type === 'multi') {
                                            // Check if all have same layer
                                            const ids = store.selection;
                                            const elements = store.elements.filter(e => ids.includes(e.id));
                                            const firstLayer = elements[0]?.layerId;
                                            const allSame = elements.every(e => e.layerId === firstLayer);
                                            return allSame ? firstLayer : "";
                                        }
                                        return "";
                                    })()}
                                    onChange={(e) => {
                                        const targetLayerId = e.currentTarget.value;
                                        if (!targetLayerId) return; // mixed selection placeholder selected?

                                        const target = activeTarget();
                                        if (target?.type === 'element') {
                                            const elementId = (target.data as any).id;
                                            updateElement(elementId, { layerId: targetLayerId }, true);
                                        } else if (target?.type === 'multi') {
                                            // Move all selected to this layer
                                            moveElementsToLayer(store.selection, targetLayerId);
                                        }
                                    }}
                                >
                                    <Show when={activeTarget()?.type === 'multi' &&
                                        !store.elements.filter(e => store.selection.includes(e.id))
                                            .every((e, _, arr) => e.layerId === arr[0].layerId)}>
                                        <option value="">(Mixed)</option>
                                    </Show>
                                    <For each={store.layers}>
                                        {(layer) => (
                                            <option value={layer.id}>
                                                {layer.name}
                                                {!layer.visible ? ' (hidden)' : ''}
                                                {layer.locked ? ' (locked)' : ''}
                                            </option>
                                        )}
                                    </For>
                                </select>
                            </div>

                            {/* Z-Index Controls - Only for single selection or if we want to implement multi-z moves later */}
                            <Show when={activeTarget()?.type === 'element'}>
                                <div class="control-row">
                                    <label>Z-Order</label>
                                </div>
                                <div class="layer-controls">
                                    <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'front')} title="To Front"><ChevronsUp size={16} /></button>
                                    <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'forward')} title="Forward"><ChevronUp size={16} /></button>
                                    <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'backward')} title="Backward"><ChevronDown size={16} /></button>
                                    <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'back')} title="To Back"><ChevronsDown size={16} /></button>
                                </div>
                            </Show>
                        </div>
                    </Show>
                </div>
            </div>
        </Show>
    );
};

export default PropertyPanel;
