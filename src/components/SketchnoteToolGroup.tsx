import { type Component, createSignal, Show } from "solid-js";
import { store, setSelectedTool, setSelectedSketchnoteType } from "../store/appStore";
import type { ElementType } from "../types";
import {
    ChevronDown
} from "lucide-solid";
import "./PenToolGroup.css"; // Reuse the same CSS

// Custom Icons for specialized sketchnote shapes
const StarPersonIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="3" />
        <path d="M 12,10 L 5,13 L 12,15 L 19,13 L 12,10" />
        <path d="M 12,15 L 9,21" />
        <path d="M 12,15 L 15,21" />
    </svg>
);

const ScrollIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 6,4 L 18,4 L 18,20 L 6,20 Z" />
        <path d="M 6,4 C 4,4 4,2 6,2 L 18,2 C 20,2 20,4 18,4" />
        <path d="M 6,20 C 4,20 4,22 6,22 L 18,22 C 20,22 20,20 18,20" />
    </svg>
);

const WavyDividerIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 2,12 C 5,8 8,16 11,12 C 14,8 17,16 20,12" />
    </svg>
);

const DoubleBannerIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 5,6 L 19,6 L 19,14 L 5,14 Z" />
        <path d="M 5,8 L 2,10 L 5,12" />
        <path d="M 19,8 L 22,10 L 19,12" />
        <path d="M 5,14 L 5,16 L 3,16" />
        <path d="M 19,14 L 19,16 L 21,16" />
    </svg>
);

const sketchnoteTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'starPerson', icon: StarPersonIcon, label: 'Star Person (Character)' },
    { type: 'scroll', icon: ScrollIcon, label: 'Scroll Container' },
    { type: 'wavyDivider', icon: WavyDividerIcon, label: 'Wavy Divider' },
    { type: 'doubleBanner', icon: DoubleBannerIcon, label: 'Double Banner' },
];

const SketchnoteToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);

    const getActiveTool = () => {
        const found = sketchnoteTools.find(t => t.type === store.selectedSketchnoteType);
        return found || sketchnoteTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedSketchnoteType(type as any);
        setSelectedTool(type);
        setIsOpen(false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveTool();
    const isActive = () => sketchnoteTools.some(t => t.type === store.selectedTool);

    return (
        <div class="pen-tool-group">
            <button
                class={`toolbar-btn ${isActive() ? 'active' : ''}`}
                onClick={toggleMenu}
                title={activeTool().label}
            >
                <div style="position: relative;">
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
                    {sketchnoteTools.map((tool) => (
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

export default SketchnoteToolGroup;
