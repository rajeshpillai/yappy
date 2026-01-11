import { type Component, For, Show, createSignal, onMount, onCleanup } from 'solid-js';
import './ContextMenu.css';

export interface MenuItem {
    label: string;
    shortcut?: string;
    onClick: () => void;
    checked?: boolean;
    separator?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
}

const ContextMenu: Component<ContextMenuProps> = (props) => {
    let menuRef: HTMLDivElement | undefined;
    const [position, setPosition] = createSignal({ x: props.x, y: props.y });

    onMount(() => {
        // Adjust position if menu would go off-screen
        if (menuRef) {
            const rect = menuRef.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = props.x;
            let adjustedY = props.y;

            // Adjust horizontal position
            if (props.x + rect.width > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10;
            }

            // Adjust vertical position
            if (props.y + rect.height > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10;
            }

            setPosition({ x: adjustedX, y: adjustedY });
        }

        // Close on click outside
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef && !menuRef.contains(e.target as Node)) {
                props.onClose();
            }
        };

        // Close on ESC key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                props.onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        onCleanup(() => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        });
    });

    const handleItemClick = (item: MenuItem) => {
        if (!item.disabled && !item.separator) {
            item.onClick();
            props.onClose();
        }
    };

    return (
        <div
            ref={menuRef}
            class="context-menu"
            style={{
                left: `${position().x}px`,
                top: `${position().y}px`
            }}
        >
            <For each={props.items}>
                {(item) => (
                    <Show
                        when={!item.separator}
                        fallback={<div class="context-menu-separator"></div>}
                    >
                        <button
                            class={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
                            onClick={() => handleItemClick(item)}
                            disabled={item.disabled}
                        >
                            <span class="menu-item-check">
                                {item.checked ? '✓' : ''}
                            </span>
                            <span class="menu-item-label">{item.label}</span>
                            <Show when={item.shortcut}>
                                <span class="menu-item-shortcut">{item.shortcut}</span>
                            </Show>
                        </button>
                    </Show>
                )}
            </For>
        </div>
    );
};

export default ContextMenu;
