import { type Component } from "solid-js";
import { store, setSelectedTool, addElement } from "../store/appStore";
import type { ElementType } from "../types";
import { MousePointer2, Square, Circle, Minus, Type, Pencil, MoveUpRight, Eraser, Hand, Image as ImageIcon } from "lucide-solid";
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
    { type: 'image', icon: ImageIcon, label: 'Insert Image' },
    { type: 'eraser', icon: Eraser, label: 'Eraser' },
];

const Toolbar: Component = () => {
    let fileInputRef: HTMLInputElement | null = null;

    const handleToolClick = (type: ElementType | 'selection') => {
        if (type === 'image') {
            fileInputRef?.click();
        } else {
            setSelectedTool(type as ElementType);
        }
    };

    const handleImageUpload = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataURL = event.target?.result as string;
            if (dataURL) {
                const img = new Image();
                img.src = dataURL;
                img.onload = () => {
                    // Limit initial size
                    const maxSize = 500;
                    let width = img.width;
                    let height = img.height;
                    if (width > maxSize || height > maxSize) {
                        const ratio = width / height;
                        if (width > height) {
                            width = maxSize;
                            height = width / ratio;
                        } else {
                            height = maxSize;
                            width = height * ratio;
                        }
                    }

                    addElement({
                        id: crypto.randomUUID(),
                        type: 'image',
                        x: 100,
                        y: 100,
                        width: width,
                        height: height,
                        strokeColor: "transparent",
                        backgroundColor: "transparent",
                        fillStyle: "solid",
                        strokeWidth: 0,
                        strokeStyle: "solid",
                        roughness: 0,
                        opacity: 100,
                        angle: 0,
                        renderStyle: "sketch",
                        seed: Math.floor(Math.random() * 2 ** 31),
                        roundness: null,
                        locked: false,
                        link: null,
                        dataURL: dataURL,
                        mimeType: file.type,
                        layerId: store.activeLayerId
                    });
                };
            }
        };
        reader.readAsDataURL(file);

        // Reset input
        (e.target as HTMLInputElement).value = '';
    };

    return (
        <div class="toolbar-container">
            <input
                type="file"
                ref={el => fileInputRef = el}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
            />
            {tools.map(tool => (
                <button
                    class={`toolbar-btn ${store.selectedTool === tool.type ? 'active' : ''}`}
                    onClick={() => handleToolClick(tool.type)}
                    title={tool.label}
                >
                    <tool.icon size={20} />
                </button>
            ))}
        </div>
    );
};

export default Toolbar;
