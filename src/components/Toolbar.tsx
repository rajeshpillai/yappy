import { type Component } from "solid-js";
import { store, setSelectedTool } from "../store/appStore";
import type { ElementType } from "../types";

const tools: { type: ElementType | 'selection'; label: string }[] = [
    { type: 'selection', label: 'Pointer' },
    { type: 'rectangle', label: 'Rectangle' },
    { type: 'circle', label: 'Circle' },
    { type: 'line', label: 'Line' },
    { type: 'pencil', label: 'Pencil' },
    { type: 'text', label: 'Text' },
];

const Toolbar: Component = () => {
    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '10px',
            padding: '10px',
            background: 'white',
            "border-radius": '8px',
            "box-shadow": '0 2px 10px rgba(0,0,0,0.1)'
        }}>
            {tools.map(tool => (
                <button
                    onClick={() => setSelectedTool(tool.type)}
                    classList={{ active: store.selectedTool === tool.type }}
                >
                    {tool.label}
                </button>
            ))}
        </div>
    );
};

export default Toolbar;
