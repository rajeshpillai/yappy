import { type Component, Show, createSignal, createMemo } from "solid-js";
import { store, addChildNode, addSiblingNode, reorderMindmap, applyMindmapStyling, toggleCollapse } from "../store/app-store";
import { Plus, ArrowDown, Wand2, Palette, ChevronUp, ChevronDown, LayoutGrid, LayoutList, Target } from "lucide-solid";
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

        // Has parent/children relationships OR is a common mindmap starting shape
        const startTypes: string[] = ['text', 'cloud', 'circle', 'rectangle', 'stickyNote', 'diamond'];
        return !!el.parentId || hasChildren() || startTypes.includes(el.type);
    });


    return (
        <Show when={isMindmapNode()}>
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

    return (
        <Show when={element()}>
            {(el) => {
                // Calculate position reactively - don't destructure viewState
                const x = () => {
                    const base = (el().x + el().width / 2) * store.viewState.scale + store.viewState.panX - 90;
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
                const y = () => (el().y - 60) * store.viewState.scale + store.viewState.panY;

                return (
                    <div
                        class="mindmap-action-toolbar"
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

                        <Show when={props.isLayoutOpen()}>
                            <div class="dropdown-backdrop" onClick={() => props.setIsLayoutOpen(false)} />
                        </Show>
                    </div>
                );
            }}
        </Show>
    );
};
