import { type Component, createSignal, Show, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { store, setSelectedTool, setSelectedShapeType, setStore } from "../store/app-store";
import type { ElementType } from "../types";
import {
    Triangle, Hexagon, Octagon, Square, Star, Cloud, Heart, X, Check,
    ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronDown,
    Pill, StickyNote, MessageSquare, MessageCircle, Zap, Bookmark, ChevronLeft, ChevronRight,
    Database, FileText, Columns, Layers, Pentagon
} from "lucide-solid";
import "./pen-tool-group.css"; // Reuse the same CSS

// Shape tools to group
const shapeTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'database', icon: Database, label: 'Database' },
    { type: 'document', icon: FileText, label: 'Document' },
    { type: 'predefinedProcess', icon: Columns, label: 'Predefined Process' },
    { type: 'internalStorage', icon: Layers, label: 'Internal Storage' },
    { type: 'capsule', icon: Pill, label: 'Capsule (Node)' },
    { type: 'stickyNote', icon: StickyNote, label: 'Sticky Note' },
    { type: 'callout', icon: MessageSquare, label: 'Callout (Thought)' },
    { type: 'speechBubble', icon: MessageCircle, label: 'Speech Bubble' },
    { type: 'burst', icon: Zap, label: 'Burst (Impact)' },
    { type: 'ribbon', icon: Bookmark, label: 'Ribbon (Title)' },
    { type: 'bracketLeft', icon: ChevronLeft, label: 'Left Bracket' },
    { type: 'bracketRight', icon: ChevronRight, label: 'Right Bracket' },
    { type: 'triangle', icon: Triangle, label: 'Triangle' },
    { type: 'hexagon', icon: Hexagon, label: 'Hexagon' },
    { type: 'octagon', icon: Octagon, label: 'Octagon' },
    { type: 'parallelogram', icon: Square, label: 'Parallelogram' },
    { type: 'star', icon: Star, label: 'Star' },
    { type: 'polygon', icon: Pentagon, label: 'Polygon (Parametric)' },
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

    // Use selectedShapeType from store instead of checking selectedTool
    const getActiveShapeTool = () => {
        const found = shapeTools.find(t => t.type === store.selectedShapeType);
        return found || shapeTools[0]; // Default to triangle
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedShapeType(type as any); // Update the stored shape type
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
            setSelectedTool(store.selectedShapeType);
        }
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveShapeTool();
    const isActive = () => shapeTools.some(t => t.type === store.selectedTool);

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
                title={`${activeTool().label} (Click for more)`}
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
                        {shapeTools.map((tool) => (
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

export default ShapeToolGroup;
