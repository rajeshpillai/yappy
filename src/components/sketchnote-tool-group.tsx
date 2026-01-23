import { type Component, createSignal, Show, createEffect } from "solid-js";
import { store, setSelectedTool, setSelectedSketchnoteType } from "../store/app-store";
import type { ElementType } from "../types";
import {
    ChevronDown
} from "lucide-solid";
import { clickOutside } from "../utils/click-outside";
import "./pen-tool-group.css"; // Reuse the same CSS

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

const LightbulbIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="9" y1="18" x2="15" y2="18" />
        <line x1="10" y1="22" x2="14" y2="22" />
        <path d="M 15.09,14 C 15.09,14 17,12.5 17,10.6 C 17,7.5 14.5,5 11,5 C 7.5,5 5,7.5 5,10.6 C 5,12.5 6.91,14 6.91,14" />
    </svg>
);

const SignpostIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="3" x2="12" y2="22" />
        <path d="M 4,6 L 18,6 L 21,9 L 18,12 L 4,12 Z" />
        <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
    </svg>
);

const BurstBlobIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 12,2 L 14.5,8 L 21,9 L 16.5,14 L 18,21 L 12,17 L 6,21 L 7.5,14 L 3,9 L 9.5,8 Z" />
    </svg>
);

const sketchnoteTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'starPerson', icon: StarPersonIcon, label: 'Star Person (Character)' },
    { type: 'lightbulb', icon: LightbulbIcon, label: 'Lightbulb (Idea)' },
    { type: 'signpost', icon: SignpostIcon, label: 'Signpost (Direction)' },
    { type: 'burstBlob', icon: BurstBlobIcon, label: 'Jagged Burst (Impact)' },
    { type: 'scroll', icon: ScrollIcon, label: 'Scroll Container' },
    { type: 'wavyDivider', icon: WavyDividerIcon, label: 'Wavy Divider' },
    { type: 'doubleBanner', icon: DoubleBannerIcon, label: 'Double Banner' },
];

const SketchnoteToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    let containerRef: HTMLDivElement | undefined;

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
        </div>
    );
};

export default SketchnoteToolGroup;
