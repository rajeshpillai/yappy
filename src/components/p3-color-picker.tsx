import { type Component, For } from 'solid-js';
import { store, updateElement, pushToHistory } from '../store/app-store';

const P3_COLORS = [
    { name: 'P3 Red', value: 'color(display-p3 1 0 0)' },
    { name: 'P3 Green', value: 'color(display-p3 0 1 0)' },
    { name: 'P3 Blue', value: 'color(display-p3 0 0 1)' },
    { name: 'P3 Yellow', value: 'color(display-p3 1 1 0)' },
    { name: 'P3 Magenta', value: 'color(display-p3 1 0 1)' },
    { name: 'P3 Cyan', value: 'color(display-p3 0 1 1)' },
    { name: 'P3 Orange', value: 'color(display-p3 1 0.5 0)' },
    { name: 'P3 Purple', value: 'color(display-p3 0.5 0 1)' },
    { name: 'P3 Pink', value: 'color(display-p3 1 0 0.5)' },
    { name: 'P3 Lime', value: 'color(display-p3 0.5 1 0)' },
];

export const P3ColorPicker: Component = () => {
    const applyColor = (color: string) => {
        if (store.selection.length > 0) {
            pushToHistory();
            store.selection.forEach(id => {
                updateElement(id, { backgroundColor: color, fillStyle: 'solid' });
            });
        }
    };

    const handleDragStart = (e: DragEvent, color: string) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', color);
            e.dataTransfer.effectAllowed = 'copy';

            // Create a custom drag image if needed, but standard is fine
            const dragIcon = document.createElement('div');
            dragIcon.style.width = '24px';
            dragIcon.style.height = '24px';
            dragIcon.style.background = color;
            dragIcon.style.borderRadius = '50%';
            dragIcon.style.position = 'absolute';
            dragIcon.style.top = '-1000px';
            document.body.appendChild(dragIcon);
            e.dataTransfer.setDragImage(dragIcon, 12, 12);
            setTimeout(() => document.body.removeChild(dragIcon), 0);
        }
    };

    return (
        <div
            style={{
                display: 'grid',
                'grid-template-columns': 'repeat(5, 1fr)',
                gap: '8px',
                padding: '8px',
            }}
        >
            <For each={P3_COLORS}>
                {(color) => (
                    <div
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, color.value)}
                        onClick={() => applyColor(color.value)}
                        title={`${color.name} (Drag to shape or Click to apply to selection)`}
                        style={{
                            width: '24px',
                            height: '24px',
                            background: color.value,
                            'border-radius': '6px',
                            cursor: 'grab',
                            border: '1px solid rgba(0,0,0,0.1)',
                            'flex-shrink': 0,
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                )}
            </For>
        </div>
    );
};
