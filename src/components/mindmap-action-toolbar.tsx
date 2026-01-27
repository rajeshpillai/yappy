import { type Component, Show, createSignal, createMemo, createEffect } from "solid-js";
import { store, addChildNode, addSiblingNode, reorderMindmap, applyMindmapStyling, toggleCollapse } from "../store/app-store";
import { getElementPreviewBaseState, isElementAnimating } from "../utils/animation/element-animator";
import { Plus, ArrowDown, Wand2, Palette, ChevronUp, ChevronDown, LayoutGrid, LayoutList, Target } from "lucide-solid";
import { P3ColorPicker } from "./p3-color-picker";
import { clickOutside } from "../utils/click-outside";
import "./mindmap-action-toolbar.css";

export const MindmapActionToolbar: Component = () => {
    const [isLayoutOpen, setIsLayoutOpen] = createSignal(false);

    const selectedElement = () => {
        if (store.selection.length !== 1) return null;
        return store.elements.find(e => e.id === store.selection[0]);
    };

    const hasChildren = () => {
        const el = selectedElement();
        if (!el) return false;
        return store.elements.some(e => e.parentId === el.id);
    };

    const isMindmapNode = createMemo(() => {
        const el = selectedElement();
        if (!el) return false;

        // Exclude types that don't make sense for mindmaps
        const excludedTypes = ['line', 'arrow', 'image', 'fineliner', 'inkbrush', 'marker', 'bezier'];
        if (excludedTypes.includes(el.type)) return false;

        // Show for any shape (they can all be mindmap nodes)
        return true;
    });

    const shouldShowToolbar = createMemo(() => {
        const el = selectedElement();
        if (!el) return false;

        // Hide if user has disabled the toolbar in settings
        if (!store.globalSettings.showMindmapToolbar) return false;

        // Hide if element is currently animating
        if (isElementAnimating(el.id)) return false;

        return isMindmapNode();
    });

    return (
        <Show when={shouldShowToolbar()}>
            <ToolbarContent
                hasChildren={hasChildren}
                isLayoutOpen={isLayoutOpen}
                setIsLayoutOpen={setIsLayoutOpen}
            />
        </Show>
    );
};

const ToolbarContent: Component<{
    hasChildren: () => boolean;
    isLayoutOpen: () => boolean;
    setIsLayoutOpen: (value: boolean) => void;
}> = (props) => {
    // Make element reactive so it updates when selection changes
    const element = createMemo(() => {
        if (store.selection.length !== 1) return null;
        return store.elements.find(e => e.id === store.selection[0]);
    });

    let containerRef: HTMLDivElement | undefined;

    // Register click outside for layout dropdown
    createEffect(() => {
        if (props.isLayoutOpen() && containerRef) {
            clickOutside(containerRef, () => () => props.setIsLayoutOpen(false));
        }
    });

    return (
        <Show when={element()}>
            {(el) => {
                // Calculate position reactively - don't destructure viewState
                const x = () => {
                    const baseState = getElementPreviewBaseState(el().id);
                    const elX = baseState ? baseState.x : el().x;
                    const elW = baseState ? baseState.width : el().width;

                    const base = (elX + elW / 2) * store.viewState.scale + store.viewState.panX - 90;
                    // Collision avoidance with Property Panel
                    if (store.showPropertyPanel && !store.isPropertyPanelMinimized) {
                        const panelStart = window.innerWidth - 280; // Property panel width
                        const toolbarWidth = 200; // conservative estimate
                        const padding = 20;
                        if (base + toolbarWidth > panelStart - padding) {
                            return panelStart - toolbarWidth - padding;
                        }
                    }
                    return base;
                };
                const y = () => {
                    const baseState = getElementPreviewBaseState(el().id);
                    const elY = baseState ? baseState.y : el().y;
                    // Position toolbar above element with 70px gap (accounts for toolbar height ~50px + 20px margin)
                    const toolbarHeight = 50;
                    const margin = 20;
                    const calculated = elY * store.viewState.scale + store.viewState.panY - toolbarHeight - margin;
                    // Ensure minimum margin from top (60px for main toolbar)
                    return Math.max(calculated, 60);
                };

                return (
                    <div
                        class="mindmap-action-toolbar"
                        ref={containerRef}
                        style={{
                            top: `${Math.round(y())}px`,
                            left: `${Math.round(x())}px`,
                        }}
                    >
                        <div class="toolbar-content">
                            <button
                                class="toolbar-btn"
                                onClick={() => addChildNode(el().id)}
                                title="Add Child (Tab)"
                            >
                                <Plus size={18} />
                            </button>

                            <Show when={el().parentId}>
                                <button
                                    class="toolbar-btn"
                                    onClick={() => addSiblingNode(el().id)}
                                    title="Add Sibling (Enter)"
                                >
                                    <ArrowDown size={18} />
                                </button>
                            </Show>

                            <div class="toolbar-divider" />

                            <button
                                class={`toolbar-btn ${props.isLayoutOpen() ? 'active' : ''}`}
                                onClick={() => props.setIsLayoutOpen(!props.isLayoutOpen())}
                                title="Auto Layout"
                            >
                                <Wand2 size={18} />
                            </button>

                            <Show when={props.isLayoutOpen()}>
                                <div class="layout-dropdown">
                                    <button
                                        class="layout-btn"
                                        onClick={() => { reorderMindmap(el().id, 'horizontal-right'); props.setIsLayoutOpen(false); }}
                                        title="Horizontal Right"
                                    >
                                        <LayoutList size={16} />
                                    </button>
                                    <button
                                        class="layout-btn"
                                        onClick={() => { reorderMindmap(el().id, 'vertical-down'); props.setIsLayoutOpen(false); }}
                                        title="Vertical Down"
                                    >
                                        <LayoutGrid size={16} />
                                    </button>
                                    <button
                                        class="layout-btn"
                                        onClick={() => { reorderMindmap(el().id, 'radial'); props.setIsLayoutOpen(false); }}
                                        title="Radial"
                                    >
                                        <Target size={16} />
                                    </button>
                                </div>
                            </Show>

                            <button
                                class="toolbar-btn"
                                onClick={() => applyMindmapStyling(el().id)}
                                title="Auto Style Branch"
                            >
                                <Palette size={18} />
                            </button>

                            <div class="toolbar-divider" />

                            <P3ColorPicker />

                            <Show when={props.hasChildren()}>
                                <div class="toolbar-divider" />
                                <button
                                    class="toolbar-btn"
                                    onClick={() => toggleCollapse(el().id)}
                                    title={el().isCollapsed ? 'Expand' : 'Collapse'}
                                >
                                    {el().isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </button>
                            </Show>
                        </div>
                    </div>
                );
            }}
        </Show>
    );
};

