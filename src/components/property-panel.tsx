import { type Component, Show, createMemo, For, createSignal, createEffect, Index } from "solid-js";
import { store, updateElement, deleteElements, duplicateElement, moveElementZIndex, updateDefaultStyles, updateGlobalSettings, moveElementsToLayer, setCanvasBackgroundColor, updateGridSettings, setGridStyle, alignSelectedElements, distributeSelectedElements, togglePropertyPanel, minimizePropertyPanel, setMaxLayers, setCanvasTexture, pushToHistory, addChildNode, addSiblingNode, reorderMindmap, applyMindmapStyling, toggleCollapse } from "../store/app-store";
import {
    Copy, ChevronsDown, ChevronDown, ChevronUp, ChevronsUp, Trash2, Palette,
    AlignLeft, AlignCenterHorizontal, AlignRight,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
    Plus, ArrowDown, LayoutGrid, LayoutList, Target,
    Minus, X, Play
} from "lucide-solid";
import "./property-panel.css";
import { properties, type PropertyConfig } from "../config/properties";
import { playSequence } from "../utils/animation/orchestrator";
import { AnimationPanel } from "./animation-panel";

const MindmapActions: Component<{ elementId: string }> = (props) => {
    const el = () => store.elements.find(e => e.id === props.elementId);

    const hasChildren = createMemo(() => {
        return store.elements.some(e => e.parentId === props.elementId);
    });

    const isMindmapNode = createMemo(() => {
        const e = el();
        if (!e) return false;
        const startTypes: string[] = ['text', 'cloud', 'circle', 'rectangle', 'stickyNote', 'diamond'];
        return !!e.parentId || hasChildren() || startTypes.includes(e.type);
    });

    const handlePresent = async () => {
        const rootId = props.elementId;
        const rootEl = el();
        if (!rootEl) return;

        const children = store.elements.filter(e => e.parentId === rootId);
        const childIds = children.map(c => c.id);

        // Robust connector discovery for mindmaps
        const connectors = store.elements.filter(e => {
            const isConnector = e.type === 'line' || e.type === 'arrow' || e.type === 'organicBranch';
            if (!isConnector) return false;

            // Connectors between root and its children
            const connectsToRoot = e.startBinding?.elementId === rootId || e.endBinding?.elementId === rootId;
            const connectsToChild = (e.startBinding?.elementId && childIds.includes(e.startBinding.elementId)) ||
                (e.endBinding?.elementId && childIds.includes(e.endBinding.elementId));

            return connectsToRoot && connectsToChild;
        });

        const allToReveal = [...children, ...connectors];

        // Hide all first and enable flow
        allToReveal.forEach(c => {
            updateElement(c!.id, { opacity: 0 });
        });

        const steps: any[] = [];
        children.forEach((child, i) => {
            // Find connector to this specific child
            const conn = connectors.find(c =>
                c.startBinding?.elementId === child.id ||
                c.endBinding?.elementId === child.id
            );

            if (conn) {
                steps.push({
                    elementId: conn.id,
                    target: { opacity: 100, flowAnimation: true },
                    config: { duration: 400, easing: 'easeOutQuad' },
                    delay: i === 0 ? 0 : 150
                });
            }

            steps.push({
                elementId: child.id,
                target: { opacity: 100 },
                config: { duration: 500, easing: 'easeOutBack' },
                delay: conn ? 0 : 0 // Sequential for now
            });
        });

        playSequence(steps);
    };

    return (
        <Show when={isMindmapNode()}>
            <div class="property-group">
                <div class="group-title">MINDMAP ACTIONS</div>
                <div class="alignment-row">
                    <button class="icon-btn" onClick={() => addChildNode(props.elementId)} title="Add Child (Tab)"><Plus size={18} /></button>
                    <Show when={el()?.parentId}>
                        <button class="icon-btn" onClick={() => addSiblingNode(props.elementId)} title="Add Sibling (Enter)"><ArrowDown size={18} /></button>
                    </Show>
                    <button class="icon-btn" onClick={() => applyMindmapStyling(props.elementId)} title="Auto Style Branch"><Palette size={18} /></button>
                    <button class="icon-btn" onClick={handlePresent} title="Present Branch"><Play size={18} /></button>
                    <Show when={hasChildren()}>
                        <button class="icon-btn" onClick={() => toggleCollapse(props.elementId)} title={el()?.isCollapsed ? 'Expand' : 'Collapse'}>
                            {el()?.isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </Show>
                </div>
                <div class="group-title" style={{ "margin-top": "12px", "margin-bottom": "8px" }}>AUTO LAYOUT</div>
                <div class="alignment-row">
                    <button class="icon-btn" onClick={() => reorderMindmap(props.elementId, 'horizontal-right')} title="Horizontal Right"><LayoutList size={18} /></button>
                    <button class="icon-btn" onClick={() => reorderMindmap(props.elementId, 'vertical-down')} title="Vertical Down"><LayoutGrid size={18} /></button>
                    <button class="icon-btn" onClick={() => reorderMindmap(props.elementId, 'radial')} title="Radial"><Target size={18} /></button>
                </div>
            </div>
        </Show>
    );
};

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

const GradientEditor: Component<{ target: any, onChange: (key: string, val: any, history?: boolean) => void }> = (props) => {

    // Helper to get current stops or defaults
    const stops = createMemo(() => {
        const targetData = props.target?.data;
        if (!targetData) return [];

        const s = targetData.gradientStops;
        if (s && s.length > 0) return s;

        // Fallback to start/end if available
        if (targetData.gradientStart && targetData.gradientEnd) {
            return [
                { offset: 0, color: targetData.gradientStart },
                { offset: 1, color: targetData.gradientEnd }
            ];
        }
        return [
            { offset: 0, color: '#ffffff' },
            { offset: 1, color: '#000000' }
        ];
    });

    const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
    let barRef: HTMLDivElement | undefined;

    const updateStops = (newStops: any[], recordHistory = true) => {
        props.onChange('gradientStops', newStops, recordHistory);
    };

    const handleBarMouseDown = (e: MouseEvent) => {
        // Only if clicking the bar background, not a thumb
        if ((e.target as HTMLElement).closest('.val-thumb')) return;

        if (!barRef) return;
        const rect = barRef.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percent = Math.min(Math.max(offsetX / rect.width, 0), 1);

        const newStop = { offset: percent, color: '#ffffff' };
        const newStops = [...stops(), newStop];
        // Sort explicitly when adding? No, append is fine.
        // Canvas will handle it.
        updateStops(newStops, true);
        setSelectedIndex(newStops.length - 1);
    };

    const handleThumbMouseDown = (e: MouseEvent, index: number) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedIndex(index);

        const onMove = (ev: MouseEvent) => {
            if (!barRef) return;
            const rect = barRef.getBoundingClientRect();
            const offsetX = ev.clientX - rect.left;
            const percent = Math.min(Math.max(offsetX / rect.width, 0), 1);

            const current = [...stops()];
            current[index] = { ...current[index], offset: percent };
            updateStops(current, false);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            pushToHistory();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // Render gradient preview string (sorted for display)
    const renderGradientString = createMemo(() => {
        const sorted = [...stops()].sort((a: any, b: any) => a.offset - b.offset);
        return `linear-gradient(90deg, ${sorted.map((s: any) => `${s.color} ${s.offset * 100}%`).join(', ')})`;
    });

    return (
        <div class="gradient-editor">
            <div
                class="gradient-bar-container"
                ref={barRef}
                onMouseDown={handleBarMouseDown}
                style={{
                    height: '24px',
                    "border-radius": '4px',
                    position: 'relative',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    background: 'conic-gradient(#eee 0.25turn, transparent 0.25turn 0.5turn, #eee 0.5turn 0.75turn, transparent 0.75turn) top left / 10px 10px repeat'
                }}
            >
                <div style={{ position: 'absolute', inset: 0, background: renderGradientString(), "border-radius": '3px' }}></div>

                <Index each={stops()}>
                    {(stop, i) => (
                        <div
                            class="val-thumb"
                            onMouseDown={(e) => handleThumbMouseDown(e, i)}
                            title={`Stop ${i + 1}: ${(stop().offset * 100).toFixed(0)}%`}
                            style={{
                                position: 'absolute',
                                left: `${stop().offset * 100}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '12px',
                                height: '12px',
                                "border-radius": '50%',
                                border: '2px solid white',
                                "box-shadow": '0 0 2px rgba(0,0,0,0.5)',
                                background: stop().color,
                                "z-index": selectedIndex() === i ? 10 : 1,
                                outline: selectedIndex() === i ? '2px solid var(--accent-color)' : 'none'
                            }}
                        />
                    )}
                </Index>
            </div>

            <Show when={selectedIndex() !== null && stops()[selectedIndex()!]}>
                <div class="control-row" style={{ "margin-top": '8px', "align-items": 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', "border-radius": '4px' }}>
                    <div class="color-wrapper" style={{ "width": '24px', "height": '24px', position: 'relative', overflow: 'hidden', "border-radius": '50%', border: '1px solid var(--border-color)' }}>
                        <input type="color"
                            value={stops()[selectedIndex()!].color}
                            onInput={(e) => {
                                const current = [...stops()];
                                current[selectedIndex()!] = { ...current[selectedIndex()!], color: e.currentTarget.value };
                                updateStops(current, false);
                            }}
                            onChange={() => pushToHistory()}
                            style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', padding: 0, border: 'none', cursor: 'pointer' }}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', "align-items": 'center', gap: '4px' }}>
                        <input type="range"
                            min="0" max="100" step="1"
                            value={Math.round(stops()[selectedIndex()!].offset * 100)}
                            onInput={(e) => {
                                const val = parseInt(e.currentTarget.value) / 100;
                                const current = [...stops()];
                                current[selectedIndex()!] = { ...current[selectedIndex()!], offset: val };
                                updateStops(current, false); // Dragging slider
                            }}
                            onChange={() => pushToHistory()}
                            style={{ flex: 1 }}
                        />
                        <span style={{ "font-size": '11px', width: '28px', "text-align": 'right' }}>{Math.round(stops()[selectedIndex()!].offset * 100)}%</span>
                    </div>
                    <button class="icon-btn small" onClick={() => {
                        const current = stops();
                        if (current.length > 2) {
                            const newStops = current.filter((_: any, idx: number) => idx !== selectedIndex());
                            updateStops(newStops, true);
                            setSelectedIndex(null);
                        }
                    }} disabled={stops().length <= 2} title="Delete Stop">
                        <Trash2 size={14} />
                    </button>
                </div>
            </Show>
            <div style={{ "margin-top": '4px', "font-size": '10px', color: 'var(--text-secondary)', "text-align": 'center' }}>
                Click bar to add · Drag to move
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
        const tool = store.selectedTool;
        if (tool === 'selection' || tool === 'pan' || tool === 'eraser') {
            return null;
        }
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
                if (['locked', 'link', 'angle', 'containerText', 'text', 'shadowOffsetX', 'shadowOffsetY'].includes(p.key)) return false;
            }

            if (p.applicableTo !== 'all') {
                if (Array.isArray(p.applicableTo) && !p.applicableTo.includes(targetType as any)) {
                    return false;
                }
            }

            // Dependency Check
            if (p.dependsOn) {
                const depKey = typeof p.dependsOn === 'string' ? p.dependsOn : p.dependsOn.key;
                const requiredVal = typeof p.dependsOn === 'string' ? true : p.dependsOn.value;

                let currentValue: any;

                if (target.type === 'element') {
                    currentValue = (target.data as any)[depKey];
                } else if (target.type === 'defaults') {
                    currentValue = (store.defaultElementStyles as any)[depKey];
                } else if (target.type === 'canvas') {
                    // Not handled yet for canvas deps
                }

                // If it depends on a toggle (boolean) and requiredVal is boolean
                if (typeof requiredVal === 'boolean') {
                    if (!!currentValue !== requiredVal) return false;
                }
                // If requiredVal is array (one of)
                else if (Array.isArray(requiredVal)) {
                    if (!requiredVal.includes(currentValue)) return false;
                }
                // Exact match
                else {
                    if (currentValue !== requiredVal) return false;
                }
            }

            return true;
        });
    });

    const handleChange = (key: string, value: any, recordHistory = true) => {
        const target = activeTarget();
        if (!target) return;

        // Roundness conversion (boolean -> object or null)
        let finalValue = value;
        if (key === 'roundness') {
            finalValue = value ? { type: 1 } : null;
        }

        if (target.type === 'element') {
            updateElement(target.data.id!, { [key]: finalValue }, recordHistory);
        } else if (target.type === 'canvas') {
            if (key === 'canvasBackgroundColor') setCanvasBackgroundColor(value);
            else if (key === 'gridEnabled') updateGridSettings({ enabled: value });
            else if (key === 'snapToGrid') updateGridSettings({ snapToGrid: value });
            else if (key === 'gridStyle') setGridStyle(value);
            else if (key === 'gridColor') updateGridSettings({ gridColor: value });
            else if (key === 'gridOpacity') updateGridSettings({ gridOpacity: value });
            else if (key === 'objectSnapping') updateGridSettings({ objectSnapping: value });
            else if (key === 'maxLayers') setMaxLayers(parseInt(value));
            else if (key === 'canvasTexture') setCanvasTexture(value);
            else if (key === 'renderStyle') updateGlobalSettings({ renderStyle: value });
            else if (key === 'showMindmapToolbar') updateGlobalSettings({ showMindmapToolbar: value });
        } else {
            updateDefaultStyles({ [key]: finalValue });
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
            if (prop.key === 'maxLayers') return store.maxLayers;
            if (prop.key === 'renderStyle') return store.globalSettings.renderStyle;
            if (prop.key === 'showMindmapToolbar') return store.globalSettings.showMindmapToolbar;
            return (store as any)[prop.key];
        }
        if (target.type === 'element') {
            const val = (target.data as any)[prop.key];
            if (prop.key === 'roundness') return !!val; // Convert to boolean for toggle
            return val;
        }
        if (target.type === 'defaults') {
            const val = (store.defaultElementStyles as any)[prop.key];
            if (prop.key === 'roundness') return !!val;
            return val;
        }
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
                        <div class="slider-group">
                            <div class="slider-wrapper">
                                <input
                                    type="range"
                                    min={prop.min} max={prop.max} step={prop.step}
                                    value={getPropertyValue(prop) ?? prop.defaultValue}
                                    onInput={(e) => handleChange(prop.key, Number(e.currentTarget.value))}
                                />
                            </div>
                            <input
                                type="number"
                                class="precise-number-input"
                                min={prop.min} max={prop.max} step={prop.step}
                                value={getPropertyValue(prop) ?? prop.defaultValue}
                                onInput={(e) => handleChange(prop.key, Number(e.currentTarget.value))}
                            />
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
        <Show when={store.showPropertyPanel && activeTarget()}>
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
                                <Show when={activeTarget()?.type === 'element'}>
                                    <MindmapActions elementId={activeTarget()!.data!.id} />
                                </Show>
                                <For each={Object.keys(groupedProperties())}>
                                    {(group) => (
                                        <div class="property-group">
                                            <div class="group-title">{group.toUpperCase()}</div>
                                            <Show when={group === 'gradient' && activeTarget()?.type === 'element'}>
                                                <GradientEditor
                                                    target={activeTarget()}
                                                    onChange={handleChange}
                                                />
                                            </Show>
                                            <For each={groupedProperties()[group]}>
                                                {(prop) => {
                                                    if (group === 'gradient' && (prop.key === 'gradientStart' || prop.key === 'gradientEnd')) return null;
                                                    return renderControl(prop);
                                                }}
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

                                {/* Animation Section - Only for single element */}
                                <Show when={activeTarget()?.type === 'element'}>
                                    <div class="property-group">
                                        <AnimationPanel />
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
