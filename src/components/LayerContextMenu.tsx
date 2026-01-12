import { type Component, onCleanup, onMount } from "solid-js";
import { duplicateLayer, deleteLayer } from "../store/appStore";
import "./ContextMenu.css"; // Reuse existing styles or create new ones

interface Props {
    x: number;
    y: number;
    layerId: string;
    onClose: () => void;
}

const LayerContextMenu: Component<Props> = (props) => {
    let menuRef: HTMLDivElement | undefined;

    const handleClickOutside = (e: MouseEvent) => {
        if (menuRef && !menuRef.contains(e.target as Node)) {
            props.onClose();
        }
    };

    onMount(() => {
        document.addEventListener('mousedown', handleClickOutside);
        onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
    });

    const handleAction = (action: () => void) => {
        action();
        props.onClose();
    };

    return (
        <div
            ref={menuRef}
            class="context-menu"
            style={{
                top: `${props.y}px`,
                left: `${props.x}px`,
            }}
        >
            <button class="context-menu-item" onClick={() => handleAction(() => duplicateLayer(props.layerId))}>
                <span class="icon">⎘</span>
                <span class="label">Duplicate</span>
            </button>

            {/* Rename could be triggered here but it requires UI logic in LayerPanel to focus input. 
                For now, let's keep Rename to double-click. */}

            <div class="context-menu-separator"></div>

            <button class="context-menu-item delete" onClick={() => handleAction(() => deleteLayer(props.layerId))}>
                <span class="icon">🗑️</span>
                <span class="label">Delete</span>
            </button>
        </div>
    );
};

export default LayerContextMenu;
