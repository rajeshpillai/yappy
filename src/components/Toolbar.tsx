import { type Component } from "solid-js";
import { store, setSelectedTool, addElement } from "../store/appStore";
import type { ElementType } from "../types";
import { MousePointer2, Square, Circle, Minus, Type, Pencil, MoveUpRight, Eraser, Hand, Image as ImageIcon, Spline } from "lucide-solid";
import "./Toolbar.css";

const tools: { type: ElementType | 'selection'; icon: Component<{ size?: number; color?: string }>; label: string }[] = [
    { type: 'pan', icon: Hand, label: 'Pan Tool' },
    { type: 'selection', icon: MousePointer2, label: 'Selection' },
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'arrow', icon: MoveUpRight, label: 'Arrow' },
    { type: 'line', icon: Minus, label: 'Line' },
    { type: 'bezier', icon: Spline, label: 'Bezier Curve' },
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
                    // Compression Logic
                    const MAX_DIMENSION = 1500; // Increased max dimension for better quality
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        const ratio = width / height;
                        if (width > height) {
                            width = MAX_DIMENSION;
                            height = width / ratio;
                        } else {
                            height = MAX_DIMENSION;
                            width = height * ratio;
                        }
                    }

                    // Create off-screen canvas for resizing & compression
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);

                        // Compress to JPEG with 0.8 quality
                        // If original was PNG with transparency, this forces white background if using JPEG.
                        // To support transparency, we should check file type.
                        // But JPEG saves the most space for photos.
                        // Let's stick with original mime type if possible, but limit quality/size.
                        // Actually, to ensure space saving, usually WEBP or JPEG is best.
                        // Let's use image/webp if supported (mostly yes), or fallback to jpeg.
                        // WebP supports transparency.

                        const compressedDataURL = canvas.toDataURL('image/webp', 0.8);

                        // Initial display dimensions (visual only, independent of data resolution)
                        // We keep roughly the same 500px limit for initial on-screen size
                        const VISUAL_MAX = 500;
                        let visualW = width;
                        let visualH = height;

                        if (visualW > VISUAL_MAX || visualH > VISUAL_MAX) {
                            const ratio = visualW / visualH;
                            if (visualW > visualH) {
                                visualW = VISUAL_MAX;
                                visualH = visualW / ratio;
                            } else {
                                visualH = VISUAL_MAX;
                                visualW = visualH * ratio;
                            }
                        }

                        addElement({
                            id: crypto.randomUUID(),
                            type: 'image',
                            x: 100,
                            y: 100,
                            width: visualW,
                            height: visualH,
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
                            dataURL: compressedDataURL, // Use stored compressed version
                            mimeType: 'image/webp',
                            layerId: store.activeLayerId
                        });
                    }
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
