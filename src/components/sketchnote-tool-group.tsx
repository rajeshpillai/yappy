import { type Component, createSignal, Show, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { store, setSelectedTool, setSelectedSketchnoteType, setStore } from "../store/app-store";
import type { ElementType } from "../types";
import {
    ChevronDown
} from "lucide-solid";
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

const TrophyIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 7,3 L 17,3 L 17,11 C 17,14 14.5,16 12,16 C 9.5,16 7,14 7,11 Z" />
        <path d="M 7,5 C 4,5 3,7 4,9 C 5,11 7,11 7,11" />
        <path d="M 17,5 C 20,5 21,7 20,9 C 19,11 17,11 17,11" />
        <line x1="12" y1="16" x2="12" y2="19" />
        <path d="M 8,19 L 16,19 L 16,21 L 8,21 Z" />
    </svg>
);

const ClockIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
    </svg>
);

const GearIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M 12,1 L 13.5,4 L 15.5,3 L 15,6 L 18,5.5 L 16.5,8 L 19.5,9 L 17,11 L 19.5,13 L 16.5,14 L 18,16.5 L 15,16 L 15.5,19 L 13.5,18 L 12,21 L 10.5,18 L 8.5,19 L 9,16 L 6,16.5 L 7.5,14 L 4.5,13 L 7,11 L 4.5,9 L 7.5,8 L 6,5.5 L 9,6 L 8.5,3 L 10.5,4 Z" />
    </svg>
);

const TargetIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const RocketIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 12,2 C 12,2 7,7 7,14 L 17,14 C 17,7 12,2 12,2 Z" />
        <path d="M 7,14 L 4,17 L 7,16" />
        <path d="M 17,14 L 20,17 L 17,16" />
        <path d="M 9,18 L 12,22 L 15,18" />
        <circle cx="12" cy="10" r="2" />
    </svg>
);

const FlagIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="3" x2="5" y2="22" />
        <path d="M 5,3 C 9,1 13,5 19,3 L 19,14 C 13,16 9,12 5,14" />
    </svg>
);

const sketchnoteTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'starPerson', icon: StarPersonIcon, label: 'Star Person (Character)' },
    { type: 'lightbulb', icon: LightbulbIcon, label: 'Lightbulb (Idea)' },
    { type: 'signpost', icon: SignpostIcon, label: 'Signpost (Direction)' },
    { type: 'burstBlob', icon: BurstBlobIcon, label: 'Jagged Burst (Impact)' },
    { type: 'trophy', icon: TrophyIcon, label: 'Trophy (Achievement)' },
    { type: 'clock', icon: ClockIcon, label: 'Clock (Time)' },
    { type: 'gear', icon: GearIcon, label: 'Gear (Process)' },
    { type: 'target', icon: TargetIcon, label: 'Target (Goal)' },
    { type: 'rocket', icon: RocketIcon, label: 'Rocket (Launch)' },
    { type: 'flag', icon: FlagIcon, label: 'Flag (Milestone)' },
    { type: 'scroll', icon: ScrollIcon, label: 'Scroll Container' },
    { type: 'wavyDivider', icon: WavyDividerIcon, label: 'Wavy Divider' },
    { type: 'doubleBanner', icon: DoubleBannerIcon, label: 'Double Banner' },
];

const SketchnoteToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    let buttonRef: HTMLButtonElement | undefined;
    let dropdownRef: HTMLDivElement | undefined;

    createEffect(() => {
        if (isOpen()) {
            const handler = (e: MouseEvent) => {
                const target = e.target as Node;
                if (buttonRef?.contains(target) || dropdownRef?.contains(target)) return;
                setIsOpen(false);
            };
            document.addEventListener('pointerdown', handler);
            onCleanup(() => document.removeEventListener('pointerdown', handler));
        }
    });

    const getActiveTool = () => {
        const found = sketchnoteTools.find(t => t.type === store.selectedSketchnoteType);
        return found || sketchnoteTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedSketchnoteType(type as any);
        setSelectedTool(type);
        setIsOpen(false);
    };

    const handleRightClick = (e: MouseEvent) => {
        e.preventDefault();
        setStore("showPropertyPanel", true);
        setStore("isPropertyPanelMinimized", false);
    };

    const toggleMenu = () => {
        if (!isActive()) {
            setSelectedTool(store.selectedSketchnoteType);
        }
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveTool();
    const isActive = () => sketchnoteTools.some(t => t.type === store.selectedTool);

    const getDropdownPosition = () => {
        if (!buttonRef) return {};
        const rect = buttonRef.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            return { top: `${rect.bottom + 8}px`, left: '50%', transform: 'translateX(-50%)' };
        }
        return { top: `${rect.bottom + 4}px`, left: `${rect.left}px` };
    };

    return (
        <div class="pen-tool-group">
            <button
                ref={buttonRef}
                class={`toolbar-btn ${isActive() ? 'active' : ''}`}
                onClick={toggleMenu}
                onContextMenu={handleRightClick}
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
                <Portal>
                    <div ref={dropdownRef} class="pen-tool-dropdown" style={getDropdownPosition()}>
                        {sketchnoteTools.map((tool) => (
                            <button
                                class={`dropdown-item ${store.selectedTool === tool.type ? 'active' : ''}`}
                                on:click={() => handleToolClick(tool.type)}
                                title={tool.label}
                            >
                                <tool.icon size={18} />
                            </button>
                        ))}
                    </div>
                </Portal>
            </Show>
        </div>
    );
};

export default SketchnoteToolGroup;
