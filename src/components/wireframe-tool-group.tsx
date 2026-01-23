import { type Component, createSignal, Show, createEffect } from "solid-js";
import { store, setSelectedTool, setSelectedWireframeType } from "../store/app-store";
import type { ElementType } from "../types";
import {
    ChevronDown
} from "lucide-solid";
import { clickOutside } from "../utils/click-outside";
import "./pen-tool-group.css"; // Reuse the same CSS

// Custom Icons for specialized wireframe shapes
const BrowserWindowIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
        <line x1="2" y1="8" x2="22" y2="8" />
        <circle cx="5" cy="5.5" r="0.5" fill="currentColor" />
        <circle cx="7" cy="5.5" r="0.5" fill="currentColor" />
        <circle cx="9" cy="5.5" r="0.5" fill="currentColor" />
    </svg>
);

const MobilePhoneIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <path d="M10 4h4" />
        <path d="M11 19h2" />
    </svg>
);

const GhostButtonIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2">
        <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
    </svg>
);

const InputFieldIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="7" width="18" height="10" rx="1" />
        <line x1="7" y1="10" x2="7" y2="14" />
    </svg>
);

const wireframeTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'browserWindow', icon: BrowserWindowIcon, label: 'Browser Window' },
    { type: 'mobilePhone', icon: MobilePhoneIcon, label: 'Mobile Phone' },
    { type: 'ghostButton', icon: GhostButtonIcon, label: 'Ghost Button' },
    { type: 'inputField', icon: InputFieldIcon, label: 'Input Field' },
];

const WireframeToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    let containerRef: HTMLDivElement | undefined;

    const getActiveTool = () => {
        const found = wireframeTools.find(t => t.type === store.selectedWireframeType);
        return found || wireframeTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedWireframeType(type as any);
        setSelectedTool(type);
        setIsOpen(false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveTool();
    const isActive = () => wireframeTools.some(t => t.type === store.selectedTool);

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
                    {wireframeTools.map((tool) => (
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

export default WireframeToolGroup;
