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
                    style={{
                        background: store.selectedTool === tool.type ? '#e0efff' : 'transparent',
                        border: store.selectedTool === tool.type ? '1px solid #007acc' : '1px solid transparent',
                        padding: '8px',
                        "border-radius": '4px',
                        cursor: 'pointer'
                    }}
                >
                    {tool.label}
                </button>
            ))}
        </div>
    );
};

export default Toolbar;
