import { type Component, Show, createMemo, For, createSignal, createEffect } from "solid-js";
import { store, updateElement, deleteElements, duplicateElement, moveElementZIndex, updateDefaultStyles, moveElementsToLayer, setCanvasBackgroundColor, updateGridSettings, setGridStyle, alignSelectedElements, distributeSelectedElements, togglePropertyPanel, minimizePropertyPanel } from "../store/appStore";
import {
    Copy, ChevronsDown, ChevronDown, ChevronUp, ChevronsUp, Trash2, Palette,
    AlignLeft, AlignCenterHorizontal, AlignRight,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
    Minus, X
} from "lucide-solid";
import "./PropertyPanel.css";
import { properties, type PropertyConfig } from "../config/properties";

const AlignmentControls: Component = () => (
    <div class="property-group">
        <div class="group-title">ALIGNMENT</div>
        <div class="alignment-row">
            <button class="icon-btn" onClick={() => alignSelectedElements('left')} title="Align Left"><AlignLeft size={18} /></button>
            <button class="icon-btn" onClick={() => alignSelectedElements('center')} title="Align Horizontal Center"><AlignCenterHorizontal size={18} /></button>
            <button class="icon-btn" onClick={() => alignSelectedElements('right')} title="Align Right"><AlignRight size={18} /></button>
            <button class="icon-btn" onClick={() => distributeSelectedElements('horizontal')} title="Distribute Horizontal"><AlignHorizontalDistributeCenter size={18} /></button>
        </div>
        <div class="alignment-row">
            <button class="icon-btn" onClick={() => alignSelectedElements('top')} title="Align Top"><AlignStartVertical size={18} /></button>
            <button class="icon-btn" onClick={() => alignSelectedElements('middle')} title="Align Vertical Center"><AlignCenterVertical size={18} /></button>
            <button class="icon-btn" onClick={() => alignSelectedElements('bottom')} title="Align Bottom"><AlignEndVertical size={18} /></button>
            <button class="icon-btn" onClick={() => distributeSelectedElements('vertical')} title="Distribute Vertical"><AlignVerticalDistributeCenter size={18} /></button>
        </div>
    </div>
);

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
            if (el) {
                return { type: 'element' as const, data: el };
            }
            // If element is missing (stale selection), fall through to defaults
        } else if (store.selection.length > 1) {
            return { type: 'multi' as const, data: null };
        }

        // Only show Canvas properties if explicitly requested
        if (store.showCanvasProperties) {
            return { type: 'canvas' as const, data: null };
        }
        // Show defaults for the current tool
        return { type: 'defaults' as const, data: null };
    });

    const activeProperties = createMemo(() => {
        const target = activeTarget();
        if (!target) return [];

        if (target.type === 'multi') return [];

        let targetType: string;
        if (target.type === 'canvas') {
            targetType = 'canvas';
        } else if (target.type === 'defaults') {
            const tool = store.selectedTool;
            // If selection/pan/eraser, show generic "shape" defaults (approx. rectangle)
            // This allows setting default colors/fills for any future shape.
            if (tool === 'selection' || tool === 'pan' || tool === 'eraser') {
                targetType = 'rectangle';
            } else if (tool === 'bezier') {
                targetType = 'line';
            } else {
                targetType = tool;
            }
        } else {
            targetType = target.data!.type;
        }

        return properties.filter(p => {
            // Filter out properties that don't make sense for defaults (like locked, link, angle, width/height?)
            if (target.type === 'defaults') {
                if (['locked', 'link', 'angle', 'containerText', 'text'].includes(p.key)) return false;
            }

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
            else if (key === 'objectSnapping') updateGridSettings({ objectSnapping: value });
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
            if (['snapToGrid', 'gridColor', 'gridOpacity', 'objectSnapping'].includes(prop.key)) {
                return (store.gridSettings as any)[prop.key];
            }
            return (store as any)[prop.key];
        }
        if (target.type === 'element') return (target.data as any)[prop.key];
        if (target.type === 'defaults') return (store.defaultElementStyles as any)[prop.key];
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
        <Show when={store.showPropertyPanel}>
            <div
                class="property-panel-container"
                classList={{ minimized: store.isPropertyPanelMinimized }}
            >
                <Show when={activeTarget()} fallback={<div class="property-panel empty"><div class="panel-header"><h3>Properties</h3></div><div class="panel-content">No Selection</div></div>}>
                    <div class="property-panel">
                        <div class="panel-header">
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                                <Show when={store.isPropertyPanelMinimized}>
                                    <button class="minimize-btn" onClick={() => minimizePropertyPanel(false)} title="Expand">
                                        <ChevronUp size={16} />
                                    </button>
                                </Show>
                                <h3>{activeTarget()?.type === 'element' ? 'Properties' : activeTarget()?.type === 'canvas' ? 'Canvas' : activeTarget()?.type === 'multi' ? 'Selection' : 'Defaults'}</h3>
                            </div>

                            <div class="header-actions">
                                <Show when={activeTarget()?.type === 'element' && !store.isPropertyPanelMinimized}>
                                    <button onClick={() => duplicateElement(activeTarget()!.data!.id!)} title="Duplicate">
                                        <Copy size={16} />
                                    </button>
                                    <button class="delete-btn" onClick={handleDelete} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                    <div class="vertical-separator"></div>
                                </Show>

                                <Show when={!store.isPropertyPanelMinimized}>
                                    <button onClick={() => minimizePropertyPanel(true)} title="Minimize">
                                        <Minus size={16} />
                                    </button>
                                </Show>

                                <button class="close-btn" onClick={() => togglePropertyPanel(false)} title="Close">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <Show when={!store.isPropertyPanelMinimized}>
                            <div class="property-content">
                                <Show when={activeTarget()?.type === 'multi'}>
                                    <AlignmentControls />
                                </Show>
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
                        </Show>
                    </div>
                </Show>
            </div>
        </Show>
    );
};

export default PropertyPanel;
