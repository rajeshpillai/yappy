import { type Component, createSignal, Show } from "solid-js";
import { store, setSelectedTool, setSelectedMathType } from "../store/appStore";
import type { ElementType } from "../types";
import {
    Pentagon, ChevronDown
} from "lucide-solid";
import "./PenToolGroup.css"; // Reuse the same CSS

// Custom Icons for specialized math shapes
const TrapezoidIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg
        width={props.size || 20}
        height={props.size || 20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M 4,18 L 8,6 L 16,6 L 20,18 Z" />
    </svg>
);

const RightTriangleIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg
        width={props.size || 20}
        height={props.size || 20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M 6,6 L 6,18 L 18,18 Z" />
    </svg>
);

const SeptagonIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg
        width={props.size || 20}
        height={props.size || 20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M 12,2 L 19,5 L 22,12 L 19,19 L 12,22 L 5,19 L 2,12 L 5,5 Z" />
    </svg>
);

const mathTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'trapezoid', icon: TrapezoidIcon, label: 'Trapezoid' },
    { type: 'rightTriangle', icon: RightTriangleIcon, label: 'Right-Angle Triangle' },
    { type: 'pentagon', icon: Pentagon, label: 'Pentagon' },
    { type: 'septagon', icon: SeptagonIcon, label: 'Septagon (Heptagon)' },
];

const MathToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);

    const getActiveTool = () => {
        const found = mathTools.find(t => t.type === store.selectedMathType);
        return found || mathTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedMathType(type as any);
        setSelectedTool(type);
        setIsOpen(false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveTool();
    const isActive = () => mathTools.some(t => t.type === store.selectedTool);

    return (
        <div class="pen-tool-group">
            <button
                class={`toolbar-btn ${isActive() ? 'active' : ''}`}
                onClick={toggleMenu}
                title={activeTool().label}
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
                    {mathTools.map((tool) => (
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

            <Show when={isOpen()}>
                <div class="dropdown-backdrop" onClick={() => setIsOpen(false)} />
            </Show>
        </div>
    );
};

export default MathToolGroup;
