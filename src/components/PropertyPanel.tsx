import { type Component, Show, createMemo, For } from "solid-js";
import { store, updateElement, deleteElements, duplicateElement, moveElementZIndex, updateDefaultStyles } from "../store/appStore";
import { Copy, ChevronsDown, ChevronDown, ChevronUp, ChevronsUp, Trash2 } from "lucide-solid";
import "./PropertyPanel.css";
import { properties, type PropertyConfig } from "../config/properties";

const PropertyPanel: Component = () => {

    // Derived state for the active target (selection or defaults)
    const activeTarget = createMemo(() => {
        if (store.selection.length === 1) {
            const el = store.elements.find(e => e.id === store.selection[0]);
            return el ? { type: 'element' as const, data: el } : null;
        } else if (store.selection.length === 0) {
            // No selection -> editing defaults for the currently selected tool? 
            // Or just global defaults. Let's assume global defaults for next shape.
            // But we need to know what "type" we are targeting to show relevant props.
            // If tool is 'rectangle', show rectangle props.
            const tool = store.selectedTool === 'selection' ? 'all' : store.selectedTool;
            return { type: 'default' as const, data: store.defaultElementStyles, toolType: tool };
        }
        return null; // Multiple selection not handled yet for detailed props, just basics maybe?
    });

    const activeProperties = createMemo(() => {
        const target = activeTarget();
        if (!target) return [];

        const targetType = target.type === 'element' ? target.data.type : target.toolType;

        return properties.filter(p => {
            if (p.applicableTo === 'all') return true;
            if (Array.isArray(p.applicableTo) && targetType !== 'all') {
                return p.applicableTo.includes(targetType as any);
            }
            return true;
        });
    });

    const handleChange = (key: string, value: any) => {
        const target = activeTarget();
        if (!target) return;

        if (target.type === 'element') {
            updateElement(target.data.id!, { [key]: value }, true); // record history on change? careful with sliders
        } else {
            updateDefaultStyles({ [key]: value });
        }
    };

    const handleDelete = () => {
        if (store.selection.length > 0) {
            deleteElements(store.selection);
        }
    };

    // Helper to render a control based on config
    const renderControl = (prop: PropertyConfig, currentValue: any) => {
        switch (prop.type) {
            case 'color':
                const predefinedColors = [
                    'transparent', '#ffffff', '#f8f9fa', '#f1f3f5', '#fff5f5', '#fff0f6',
                    '#f3f0ff', '#e03131', '#e8590c', '#fcc419', '#2f9e44', '#1971c2',
                    '#6741d9', '#c2255c', '#343a40'
                ];

                return (
                    <div class="control-col">
                        <label>{prop.label}</label>
                        <div class="color-picker-container">
                            {/* Palette Grid */}
                            <div class="color-grid">
                                <For each={predefinedColors}>
                                    {(c) => (
                                        <button
                                            class={`color-swatch ${currentValue === c ? 'selected' : ''}`}
                                            style={{ background: c === 'transparent' ? 'white' : c }}
                                            onClick={() => handleChange(prop.key, c)}
                                            title={c}
                                        >
                                            {c === 'transparent' && <div class="diagonal-line-sm"></div>}
                                        </button>
                                    )}
                                </For>
                            </div>

                            {/* Hex Input & Picker */}
                            <div class="hex-input-row">
                                <span class="hash">#</span>
                                <input
                                    type="text"
                                    class="hex-input"
                                    value={currentValue?.replace('#', '') || ''}
                                    onInput={(e) => {
                                        let val = e.currentTarget.value;
                                        // Simple validation/formatting could go here
                                        handleChange(prop.key, '#' + val);
                                    }}
                                />
                                <div class="system-picker-wrapper">
                                    <input
                                        type="color"
                                        value={currentValue?.startsWith('#') ? currentValue : '#000000'}
                                        onInput={(e) => handleChange(prop.key, e.currentTarget.value)}
                                        title="Custom Color"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'slider':
                return (
                    <div class="control-row">
                        <label>{prop.label}</label>
                        <div class="slider-wrapper">
                            <input
                                type="range"
                                min={prop.min} max={prop.max} step={prop.step}
                                value={currentValue ?? prop.defaultValue}
                                onInput={(e) => handleChange(prop.key, Number(e.currentTarget.value))}
                            />
                            <span class="value-display">{currentValue}</span>
                        </div>
                    </div>
                );
            case 'select':
                return (
                    <div class="control-row">
                        <label>{prop.label}</label>
                        <select
                            value={currentValue ?? prop.defaultValue}
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
                            checked={!!currentValue}
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
                            value={currentValue || ''}
                            onInput={(e) => handleChange(prop.key, e.currentTarget.value)}
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
                    <h3>{activeTarget()?.type === 'element' ? 'Properties' : 'Defaults'}</h3>
                    <Show when={activeTarget()?.type === 'element'}>
                        <div class="header-actions">
                            <button onClick={() => duplicateElement(activeTarget()!.data.id!)} title="Duplicate">
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
                                    {(prop) => renderControl(prop, (activeTarget()?.data as any)[prop.key])}
                                </For>
                            </div>
                        )}
                    </For>

                    {/* Layers for elements */}
                    <Show when={activeTarget()?.type === 'element'}>
                        <div class="property-group">
                            <div class="group-title">LAYERS</div>
                            <div class="layer-controls">
                                <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'front')} title="To Front"><ChevronsUp size={16} /></button>
                                <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'forward')} title="Forward"><ChevronUp size={16} /></button>
                                <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'backward')} title="Backward"><ChevronDown size={16} /></button>
                                <button onClick={() => moveElementZIndex((activeTarget()!.data as any).id, 'back')} title="To Back"><ChevronsDown size={16} /></button>
                            </div>
                        </div>
                    </Show>
                </div>
            </div>
        </Show>
    );
};

export default PropertyPanel;
