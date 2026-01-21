import { type Component, createSignal, Show } from "solid-js";
import { store, setSelectedTool, setSelectedInfraType } from "../store/app-store";
import type { ElementType } from "../types";
import {
    Server, Shield, User, Zap, Router, Globe, Shuffle, Rows, ChevronDown, Database
} from "lucide-solid";
import "./pen-tool-group.css"; // Reuse the same CSS

const infraTools: { type: ElementType; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'database', icon: Database, label: 'Database' },
    { type: 'server', icon: Server, label: 'Server' },
    { type: 'loadBalancer', icon: Shuffle, label: 'Load Balancer' },
    { type: 'firewall', icon: Shield, label: 'Firewall' },
    { type: 'user', icon: User, label: 'User / Client' },
    { type: 'messageQueue', icon: Rows, label: 'Message Queue' },
    { type: 'lambda', icon: Zap, label: 'Lambda / Function' },
    { type: 'router', icon: Router, label: 'Router' },
    { type: 'browser', icon: Globe, label: 'Browser / Web' },
];

const InfraToolGroup: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);

    const getActiveTool = () => {
        const found = infraTools.find(t => t.type === store.selectedInfraType);
        return found || infraTools[0];
    };

    const handleToolClick = (type: ElementType) => {
        setSelectedInfraType(type as any);
        setSelectedTool(type);
        setIsOpen(false);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen());
    };

    const activeTool = () => getActiveTool();
    const isActive = () => infraTools.some(t => t.type === store.selectedTool);

    return (
        <div class="pen-tool-group">
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
                    {infraTools.map((tool) => (
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

export default InfraToolGroup;
