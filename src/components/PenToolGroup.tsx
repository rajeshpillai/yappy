import { type Component, createSignal, Show, For, onMount, onCleanup } from "solid-js";
import { store, setSelectedTool, setSelectedPenType } from "../store/appStore";
import type { ElementType } from "../types";
import { Pen, Brush, ChevronDown } from "lucide-solid";

export type PenType = 'fineliner' | 'inkbrush';

const penTools: { type: PenType; icon: Component<{ size?: number }>; label: string }[] = [
    { type: 'fineliner', icon: Pen, label: 'Fine Liner' },
    { type: 'inkbrush', icon: Brush, label: 'Ink Brush' },
];

const PenToolGroup: Component = () => {
    const [showMenu, setShowMenu] = createSignal(false);
    let longPressTimer: number | null = null;
    let menuRef: HTMLDivElement | undefined;

    const getCurrentPenTool = () => {
        return penTools.find(t => t.type === store.selectedPenType) || penTools[0]; // Default to fineliner
    };

    const isPenToolActive = () => {
        return ['fineliner', 'inkbrush'].includes(store.selectedTool);
    };

    const handleClick = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        // Select the current pen type
        setSelectedTool(store.selectedPenType as ElementType);
    };

    const handleMouseDown = () => {
        longPressTimer = window.setTimeout(() => {
            setShowMenu(true);
            longPressTimer = null;
        }, 400);
    };

    const handleMouseUp = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        setShowMenu(true);
    };

    const handleSelectPen = (penType: PenType) => {
        setSelectedPenType(penType);
        setSelectedTool(penType as ElementType);
        setShowMenu(false);
    };

    // Close menu when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
        if (menuRef && !menuRef.contains(e.target as Node)) {
            setShowMenu(false);
        }
    };

    onMount(() => {
        document.addEventListener('click', handleClickOutside);
    });

    onCleanup(() => {
        document.removeEventListener('click', handleClickOutside);
        if (longPressTimer) {
            clearTimeout(longPressTimer);
        }
    });

    return (
        <div class="pen-tool-group" ref={menuRef} style="position: relative;">
            <button
                class={`toolbar-btn ${isPenToolActive() ? 'active' : ''}`}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                title={`${getCurrentPenTool().label} (Right-click for more)`}
            >
                <div style="position: relative;">
                    {(() => {
                        const Icon = getCurrentPenTool().icon;
                        return <Icon size={20} />;
                    })()}
                    <ChevronDown
                        size={8}
                        style="position: absolute; bottom: -2px; right: -4px; opacity: 0.6;"
                    />
                </div>
            </button>

            <Show when={showMenu()}>
                <div
                    class="pen-tool-menu"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        background: 'var(--surface-color, #fff)',
                        border: '1px solid var(--border-color, #e5e5e5)',
                        'border-radius': '8px',
                        'box-shadow': '0 4px 12px rgba(0,0,0,0.15)',
                        'z-index': '1000',
                        padding: '4px',
                        'min-width': '140px',
                        'margin-top': '4px'
                    }}
                >
                    <For each={penTools}>
                        {(tool) => (
                            <button
                                class={`pen-menu-item ${store.selectedPenType === tool.type ? 'active' : ''}`}
                                onClick={() => handleSelectPen(tool.type)}
                                style={{
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    width: '100%',
                                    border: 'none',
                                    background: store.selectedPenType === tool.type ? 'var(--primary-color, #007bff)' : 'transparent',
                                    color: store.selectedPenType === tool.type ? '#fff' : 'inherit',
                                    'border-radius': '4px',
                                    cursor: 'pointer',
                                    'font-size': '13px'
                                }}
                            >
                                <tool.icon size={16} />
                                {tool.label}
                            </button>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
};

export default PenToolGroup;
