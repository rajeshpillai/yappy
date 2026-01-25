import { type Component, createSignal, Show, createEffect } from "solid-js";
import { store, setSelectedTool, setStore } from "../store/app-store";
import type { ElementType } from "../types";
import {
    Brain, Leaf, Share2, ChevronDown
} from "lucide-solid";
import { clickOutside } from "../utils/click-outside";
import "./pen-tool-group.css"; // Reuse styling

// Mindmap-specific tools
const mindmapTools: { type: ElementType | 'organicBranch' | 'mindmapNode'; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'organicBranch', icon: Leaf, label: 'Organic Branch' },
    // We can alias existing shapes for semantic meaning in this group
    { type: 'cloud', icon: Brain, label: 'Central Topic (Cloud)' },
    { type: 'circle', icon: Share2, label: 'Topic (Circle)' },
];

const MindmapToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    let containerRef: HTMLDivElement | undefined;

    // Determines which icon to show on the main button
    const getActiveMindmapTool = () => {
        // If the current tool is in our list, show it
        const current = mindmapTools.find(t => t.type === store.selectedTool);
        if (current) return current;

        // Otherwise show the last selected one from this group, or default
        const lastSelected = mindmapTools.find(t => t.type === store.selectedShapeType);
        return lastSelected || mindmapTools[0];
    };

    const handleToolClick = (type: string) => {
        // If it's a standard shape, update selectedShapeType so ShapeGroup reflects it too?
        // Actually, let's just stick to setting the tool.
        // Special case: organicBranch is a connector, not a shape like rect.
        setSelectedTool(type as ElementType);
        setIsOpen(false);
    };

    const handleRightClick = (e: MouseEvent) => {
        e.preventDefault();
        setStore("showPropertyPanel", true);
        setStore("isPropertyPanelMinimized", false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveMindmapTool();
    const isActive = () => mindmapTools.some(t => t.type === store.selectedTool);

    // Register click outside
    createEffect(() => {
        if (isOpen() && containerRef) {
            clickOutside(containerRef, () => () => setIsOpen(false));
        }
    });

    return (
        <div class="pen-tool-group" ref={containerRef}>
            <button
                class={`toolbar-btn ${isActive() ? 'active' : ''}`}
                onClick={toggleMenu}
                onContextMenu={handleRightClick}
                title="Mindmap Tools"
            >
                <div class="tool-icon-wrapper">
                    {(() => {
                        const Icon = activeTool().icon;
                        return <Icon size={20} />;
                    })()}
                    <ChevronDown
                        size={10}
                        class="submenu-indicator"
                    />
                </div>
            </button>

            <Show when={isOpen()}>
                <div class="pen-tool-dropdown">
                    {mindmapTools.map((tool) => (
                        <button
                            class={`dropdown-item ${store.selectedTool === tool.type ? 'active' : ''}`}
                            onClick={() => handleToolClick(tool.type)}
                            title={tool.label}
                        >
                            <tool.icon size={18} />
                        </button>
                    ))}
                </div>
            </Show>
        </div>
    );
};

export default MindmapToolGroup;
