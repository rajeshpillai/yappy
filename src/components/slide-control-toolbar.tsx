import { type Component, createSignal, Show } from 'solid-js';
import {
    store, togglePresentationMode, toggleSlideToolbar,
    setSlideToolbarPosition, setIsPreviewing
} from '../store/app-store';
import { sequenceAnimator } from '../utils/animation/sequence-animator';
import { getElementsOnSlide } from '../utils/slide-utils';
import {
    Zap, GripVertical, X,
    MonitorPlay
} from 'lucide-solid';
import { P3ColorPicker } from './p3-color-picker';

export const SlideControlToolbar: Component = () => {
    let toolbarRef: HTMLDivElement | undefined;
    const [isDragging, setIsDragging] = createSignal(false);
    let offset = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) {
            setIsDragging(true);
            const rect = toolbarRef!.getBoundingClientRect();
            offset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (!isDragging()) return;

        const x = e.clientX - offset.x;
        const y = e.clientY - offset.y;

        setSlideToolbarPosition(x, y);
    };

    const handlePointerUp = (_: PointerEvent) => {
        setIsDragging(false);
    };

    const handlePlayAnimations = () => {
        const slideElements = getElementsOnSlide(store.activeSlideIndex, store.elements, store.slides);
        const elementIds = slideElements.map(el => el.id);

        // Enable persistent animations for the preview
        setIsPreviewing(true);
        sequenceAnimator.playAll('on-load', elementIds);

        // Auto-disable preview after a reasonable time (e.g. 10s or when stopped)
        // For simplicity, let's just allow it until they interact or mode changes
        setTimeout(() => setIsPreviewing(false), 10000);
    };

    return (
        <Show when={store.docType === 'slides' && store.showSlideToolbar && store.appMode !== 'presentation'}>
            <div
                ref={toolbarRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{
                    position: 'fixed',
                    left: `${store.slideToolbarPosition.x}px`,
                    top: `${store.slideToolbarPosition.y}px`,
                    display: 'flex',
                    'align-items': 'center',
                    gap: '4px',
                    padding: '6px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    'backdrop-filter': 'blur(12px) saturate(180%)',
                    '-webkit-backdrop-filter': 'blur(12px) saturate(180%)',
                    'border-radius': '12px',
                    'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    'z-index': '10002',
                    transition: isDragging() ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    cursor: isDragging() ? 'grabbing' : 'default',
                    'user-select': 'none'
                }}
            >
                {/* Drag Handle */}
                <div
                    class="drag-handle"
                    style={{
                        padding: '8px 4px',
                        cursor: 'grab',
                        color: '#94a3b8',
                        display: 'flex',
                        'align-items': 'center'
                    }}
                >
                    <GripVertical size={16} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    <ToolbarButton
                        onClick={() => togglePresentationMode(true)}
                        icon={<MonitorPlay size={18} />}
                        label="Play Presentation"
                        color="#3b82f6"
                    />
                    <ToolbarButton
                        onClick={handlePlayAnimations}
                        icon={<Zap size={18} />}
                        label="Preview Animations"
                        color="#f59e0b"
                    />
                </div>

                <div class="toolbar-divider" style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

                <P3ColorPicker />


                {/* Close */}
                <button
                    onClick={() => toggleSlideToolbar(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        padding: '6px',
                        cursor: 'pointer',
                        'border-radius': '6px',
                        display: 'flex',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 44, 44, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                    <X size={16} />
                </button>
            </div>
        </Show>
    );
};

interface ToolbarButtonProps {
    onClick: () => void;
    icon: any;
    label: string;
    color: string;
}

const ToolbarButton: Component<ToolbarButtonProps> = (props) => {
    const [isHovered, setIsHovered] = createSignal(false);

    return (
        <button
            onClick={props.onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={props.label}
            style={{
                background: isHovered() ? 'rgba(0, 0, 0, 0.05)' : 'none',
                border: 'none',
                color: isHovered() ? props.color : '#475569',
                padding: '8px',
                'border-radius': '8px',
                cursor: 'pointer',
                display: 'flex',
                'align-items': 'center',
                gap: '8px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered() ? 'translateY(-1px)' : 'none'
            }}
        >
            {props.icon}
        </button>
    );
};
