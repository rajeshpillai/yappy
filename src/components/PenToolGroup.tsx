import { type Component, createSignal, Show, For } from "solid-js";
import { store, setSelectedTool, setSelectedPenType } from "../store/appStore";
import type { ElementType } from "../types";
import { Pen, Brush, ChevronDown } from "lucide-solid";
import "./PenToolGroup.css";

export type PenType = 'fineliner' | 'inkbrush' | 'marker';

// Custom Marker Icon
const CustomMarkerIcon: Component<{ size?: number }> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-marker"
  >
    <path d="M12 2l7 7-9 9-4-4L12 2z"></path>
    <path d="M7 13l-1.5 1.5"></path>
  </svg>
);

const penTools: { type: PenType; icon: Component<{ size?: number }>; label: string }[] = [
    { type: 'fineliner', icon: Pen, label: 'Fine Liner' },
    { type: 'inkbrush', icon: Brush, label: 'Ink Brush' },
    { type: 'marker', icon: CustomMarkerIcon, label: 'Marker' }, // Updated to use custom marker icon
];

const PenToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);

    const getCurrentPenTool = () => {
        return penTools.find(t => t.type === store.selectedPenType) || penTools[0];
    };

    const isPenToolActive = () => {
        return ['fineliner', 'inkbrush', 'marker'].includes(store.selectedTool);
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
                <div class="tool-icon-wrapper">
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
