import { type Component, createSignal, Show, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { store, setSelectedTool, setSelectedPeopleType, setStore } from "../store/app-store";
import type { ElementType } from "../types";
import {
    ChevronDown
} from "lucide-solid";
import "./pen-tool-group.css"; // Reuse the same CSS

// Custom SVG Icons for People & Expressions shapes

const StickFigureIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="4" r="3" />
        <line x1="12" y1="7" x2="12" y2="15" />
        <line x1="5" y1="10" x2="19" y2="10" />
        <line x1="8" y1="22" x2="12" y2="15" />
        <line x1="12" y1="15" x2="16" y2="22" />
    </svg>
);

const SittingPersonIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="4" r="3" />
        <line x1="12" y1="7" x2="12" y2="14" />
        <line x1="6" y1="10" x2="18" y2="10" />
        <line x1="12" y1="14" x2="18" y2="14" />
        <line x1="18" y1="14" x2="18" y2="22" />
    </svg>
);

const PresentingPersonIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="4" r="3" />
        <line x1="8" y1="7" x2="8" y2="15" />
        <line x1="8" y1="9" x2="3" y2="14" />
        <line x1="8" y1="9" x2="18" y2="3" />
        <line x1="5" y1="22" x2="8" y2="15" />
        <line x1="8" y1="15" x2="11" y2="22" />
        <rect x="14" y="1" width="9" height="11" rx="1" />
    </svg>
);

const HandPointRightIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {/* Wrist/palm */}
        <path d="M 2,10 L 2,16 Q 2,18 4,18 L 8,18 L 8,16" />
        {/* Curled fingers */}
        <path d="M 8,16 Q 6,17 6,15 Q 6,13 8,14" />
        <path d="M 8,14 Q 6,14.5 6,12.5 Q 6,11 8,11.5" />
        {/* Index finger pointing right */}
        <path d="M 8,11.5 L 8,9 Q 8,7 10,7 L 20,7 Q 22,7 22,9 L 22,11 Q 22,13 20,13 L 10,13 L 8,13" />
        {/* Thumb */}
        <path d="M 6,10 L 4,8 Q 3,6 5,5 Q 7,5 7,7 L 8,9" />
    </svg>
);

const ThumbsUpIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        {/* Thumb */}
        <path d="M 10,12 L 10,4 Q 10,2 12,2 Q 14,2 14,4 L 14,12" />
        {/* Fist body */}
        <path d="M 7,12 L 19,12 Q 20,12 20,13 L 20,21 Q 20,22 19,22 L 7,22 Q 6,22 6,21 L 6,13 Q 6,12 7,12 Z" />
        {/* Finger lines */}
        <line x1="10" y1="15" x2="18" y2="15" />
        <line x1="10" y1="18" x2="18" y2="18" />
    </svg>
);

const FaceHappyIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="9" cy="10" r="1" fill="currentColor" />
        <circle cx="15" cy="10" r="1" fill="currentColor" />
        <path d="M 8,15 Q 12,19 16,15" />
    </svg>
);

const FaceSadIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="9" cy="10" r="1" fill="currentColor" />
        <circle cx="15" cy="10" r="1" fill="currentColor" />
        <path d="M 8,18 Q 12,14 16,18" />
    </svg>
);

const FaceConfusedIcon: Component<{ size?: number; color?: string }> = (props) => (
    <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="9" cy="10" r="1" fill="currentColor" />
        <circle cx="15" cy="10" r="1" fill="currentColor" />
        <line x1="14" y1="8" x2="16" y2="7" />
        <path d="M 8,16 Q 10,15 12,16 Q 14,17 16,16" />
    </svg>
);

const peopleTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'stickFigure', icon: StickFigureIcon, label: 'Stick Figure (Person)' },
    { type: 'sittingPerson', icon: SittingPersonIcon, label: 'Sitting Person' },
    { type: 'presentingPerson', icon: PresentingPersonIcon, label: 'Presenting Person' },
    { type: 'handPointRight', icon: HandPointRightIcon, label: 'Pointing Hand (Right)' },
    { type: 'thumbsUp', icon: ThumbsUpIcon, label: 'Thumbs Up (Approval)' },
    { type: 'faceHappy', icon: FaceHappyIcon, label: 'Happy Face (Positive)' },
    { type: 'faceSad', icon: FaceSadIcon, label: 'Sad Face (Negative)' },
    { type: 'faceConfused', icon: FaceConfusedIcon, label: 'Confused Face (Question)' },
];

const PeopleToolGroup: Component = () => {
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
        const found = peopleTools.find(t => t.type === store.selectedPeopleType);
        return found || peopleTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedPeopleType(type as any);
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
            setSelectedTool(store.selectedPeopleType);
        }
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveTool();
    const isActive = () => peopleTools.some(t => t.type === store.selectedTool);

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
                        {peopleTools.map((tool) => (
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

export default PeopleToolGroup;
