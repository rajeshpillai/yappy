import { type Component, createSignal, Show, For } from "solid-js";
import { store, setSelectedTool, setSelectedPenType } from "../store/appStore";
import type { ElementType } from "../types";
import { Pen, Brush, ChevronDown } from "lucide-solid";
import "./PenToolGroup.css";

export type PenType = 'fineliner' | 'inkbrush';

const penTools: { type: PenType; icon: Component<{ size?: number }>; label: string }[] = [
    { type: 'fineliner', icon: Pen, label: 'Fine Liner' },
    { type: 'inkbrush', icon: Brush, label: 'Ink Brush' },
];

const PenToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);

    const getCurrentPenTool = () => {
        return penTools.find(t => t.type === store.selectedPenType) || penTools[0];
    };

    const isPenToolActive = () => {
        return ['fineliner', 'inkbrush'].includes(store.selectedTool);
    };

    const handleSelectPen = (penType: PenType) => {
        setSelectedPenType(penType);
        setSelectedTool(penType as ElementType);
        setIsOpen(false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    return (
        <div class="pen-tool-group">
            <button
                class={`toolbar-btn ${isPenToolActive() ? 'active' : ''}`}
                onClick={toggleMenu}
                title={`${getCurrentPenTool().label} (Click for more)`}
            >
                <div style="position: relative;">
                    {(() => {
                        const Icon = getCurrentPenTool().icon;
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
                    <For each={penTools}>
                        {(tool) => (
                            <button
                                class={`dropdown-item ${store.selectedPenType === tool.type ? 'active' : ''}`}
                                onClick={() => handleSelectPen(tool.type)}
                                title={tool.label}
                            >
                                <tool.icon size={18} />
                            </button>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={isOpen()}>
                <div class="dropdown-backdrop" onClick={() => setIsOpen(false)} />
            </Show>
        </div>
    );
};

export default PenToolGroup;
