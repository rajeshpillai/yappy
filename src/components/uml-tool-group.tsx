import { type Component, createSignal, Show, createEffect } from "solid-js";
import { store, setSelectedTool, setSelectedUmlType, setStore } from "../store/app-store";
import type { ElementType } from "../types";
import {
    Layout, Disc, User, Circle, FileText, Folder, ChevronDown,
    Component as ComponentIcon, RectangleHorizontal, ArrowDown, Frame,
    ChevronRight, ChevronLeft, CircleDot, CircleDashed
} from "lucide-solid";
import { clickOutside } from "../utils/click-outside";
import "./pen-tool-group.css"; // Reuse existing styles

const umlTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'umlClass', icon: Layout, label: 'Class' },
    { type: 'umlInterface', icon: Disc, label: 'Interface' },
    { type: 'umlActor', icon: User, label: 'Actor' },
    { type: 'umlUseCase', icon: Circle, label: 'Use Case' },
    { type: 'umlNote', icon: FileText, label: 'Note' },
    { type: 'umlPackage', icon: Folder, label: 'Package' },
    { type: 'umlComponent', icon: ComponentIcon, label: 'Component' },
    { type: 'umlState', icon: RectangleHorizontal, label: 'State' },
    { type: 'umlLifeline', icon: ArrowDown, label: 'Lifeline' },
    { type: 'umlFragment', icon: Frame, label: 'Fragment' },
    { type: 'umlSignalSend', icon: ChevronRight, label: 'Signal Send' },
    { type: 'umlSignalReceive', icon: ChevronLeft, label: 'Signal Receive' },
    { type: 'umlProvidedInterface', icon: CircleDot, label: 'Provided' },
    { type: 'umlRequiredInterface', icon: CircleDashed, label: 'Required' },
];

const UmlToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    let containerRef: HTMLDivElement | undefined;

    const getActiveUmlTool = () => {
        const found = umlTools.find(t => t.type === store.selectedUmlType);
        return found || umlTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedUmlType(type as any);
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

    const activeTool = () => getActiveUmlTool();
    const isActive = () => umlTools.some(t => t.type === store.selectedTool);

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
                title={`UML: ${activeTool().label}`}
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
                    {umlTools.map((tool) => (
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

export default UmlToolGroup;
