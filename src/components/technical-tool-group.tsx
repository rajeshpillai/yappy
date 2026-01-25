import { type Component, createSignal, Show, createEffect } from "solid-js";
import { store, setSelectedTool, setSelectedTechnicalType, setStore } from "../store/app-store";
import type { ElementType } from "../types";
import {
    Box, Database, ChevronDown, Binary, HardDrive, Circle, CircleDot, Minus, GripVertical, Layers
} from "lucide-solid";
import { clickOutside } from "../utils/click-outside";
import "./pen-tool-group.css"; // Reuse the same CSS

const technicalTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'dfdProcess', icon: Binary, label: 'DFD Process' },
    { type: 'dfdDataStore', icon: HardDrive, label: 'DFD Data Store' },
    { type: 'isometricCube', icon: Box, label: 'Isometric Cube' },
    { type: 'cylinder', icon: Database, label: 'Cylinder' },
    { type: 'stateStart', icon: Circle, label: 'Initial State' },
    { type: 'stateEnd', icon: CircleDot, label: 'Final State' },
    { type: 'stateSync', icon: Minus, label: 'Sync Bar' },
    { type: 'activationBar', icon: GripVertical, label: 'Activation Bar' },
    { type: 'externalEntity', icon: Layers, label: 'External Entity' },
];

const TechnicalToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    let containerRef: HTMLDivElement | undefined;

    const getActiveTool = () => {
        const found = technicalTools.find(t => t.type === store.selectedTechnicalType);
        return found || technicalTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedTechnicalType(type as any);
        setSelectedTool(type);
        setIsOpen(false);
    };

    const handleRightClick = (e: MouseEvent) => {
        e.preventDefault();
        setStore("showPropertyPanel", true);
        setStore("isPropertyPanelMinimized", false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveTool();
    const isActive = () => technicalTools.some(t => t.type === store.selectedTool);

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
                <div class="pen-tool-dropdown">
                    {technicalTools.map((tool) => (
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

export default TechnicalToolGroup;
