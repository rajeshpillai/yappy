import { type Component } from "solid-js";
import { store, setSelectedTool } from "../store/appStore";
import type { ElementType } from "../types";
import { MousePointer2, Square, Circle, Minus, Type, Pencil, MoveUpRight, Eraser, Hand } from "lucide-solid";
import "./Toolbar.css";

const tools: { type: ElementType | 'selection'; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'pan', icon: Hand, label: 'Pan Tool' },
    { type: 'selection', icon: MousePointer2, label: 'Selection' },
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'arrow', icon: MoveUpRight, label: 'Arrow' },
    { type: 'line', icon: Minus, label: 'Line' },
    { type: 'pencil', icon: Pencil, label: 'Pencil' },
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'eraser', icon: Eraser, label: 'Eraser' },
];

const Toolbar: Component = () => {
    return (
        <div class="toolbar-container">
            {tools.map(tool => (
                <button
                    class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                    onClick={() => setSelectedTool(tool.type)}
                    title={tool.label}
                >
                    <tool.icon size={20} />
                </button>
            ))}
        </div>
    );
};

export default Toolbar;
