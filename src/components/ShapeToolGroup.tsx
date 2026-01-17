import { type Component, createSignal, Show } from "solid-js";
import { store, setSelectedTool } from "../store/appStore";
import type { ElementType } from "../types";
import {
    Triangle, Hexagon, Octagon, Square, Star, Cloud, Heart, X, Check,
    ArrowLeft, ArrowRight, ArrowUp, ArrowDown
} from "lucide-solid";
import "./PenToolGroup.css"; // Reuse the same CSS

// Shape tools to group
const shapeTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'triangle', icon: Triangle, label: 'Triangle' },
    { type: 'hexagon', icon: Hexagon, label: 'Hexagon' },
    { type: 'octagon', icon: Octagon, label: 'Octagon' },
    { type: 'parallelogram', icon: Square, label: 'Parallelogram' },
    { type: 'star', icon: Star, label: 'Star' },
    { type: 'cloud', icon: Cloud, label: 'Cloud' },
    { type: 'heart', icon: Heart, label: 'Heart' },
    { type: 'cross', icon: X, label: 'Cross (X)' },
    { type: 'checkmark', icon: Check, label: 'Checkmark' },
    { type: 'arrowLeft', icon: ArrowLeft, label: 'Arrow Left' },
    { type: 'arrowRight', icon: ArrowRight, label: 'Arrow Right' },
    { type: 'arrowUp', icon: ArrowUp, label: 'Arrow Up' },
    { type: 'arrowDown', icon: ArrowDown, label: 'Arrow Down' },
];

const ShapeToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);

    // Find the currently selected shape tool, default to triangle
    const getActiveShapeTool = () => {
        const found = shapeTools.find(t => t.type === store.selectedTool);
        return found || shapeTools[0]; // Default to triangle
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedTool(type);
        setIsOpen(false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveShapeTool();
    const isActive = () => shapeTools.some(t => t.type === store.selectedTool);

    return (
        <div class="pen-tool-group">
            <button
                class={`toolbar-btn ${isActive() ? 'active' : ''}`}
                onClick={toggleMenu}
                title={activeTool().label}
            >
                {(() => {
                    const Icon = activeTool().icon;
                    return <Icon size={20} />;
                })()}
                <span class="dropdown-indicator">▼</span>
            </button>

            <Show when={isOpen()}>
                <div class="pen-tool-dropdown">
                    {shapeTools.map((tool) => (
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

export default ShapeToolGroup;
