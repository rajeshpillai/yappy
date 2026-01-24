import { type Component, Show, createSignal, onMount, onCleanup, createMemo } from 'solid-js';
import { store, setActiveSlide, togglePresentationMode, applyNextState, applyPreviousState } from '../store/app-store';
import { ChevronLeft, ChevronRight, X } from 'lucide-solid';

export const PresentationControls: Component = () => {
    const [isVisible, setIsVisible] = createSignal(true);
    let hideTimeout: number;

    const resetHideTimeout = () => {
        setIsVisible(true);
        window.clearTimeout(hideTimeout);
        hideTimeout = window.setTimeout(() => {
            if (store.presentationMode) setIsVisible(false);
        }, 3000);
    };

    onMount(() => {
        window.addEventListener('mousemove', resetHideTimeout);
        resetHideTimeout();
    });

    onCleanup(() => {
        window.removeEventListener('mousemove', resetHideTimeout);
        window.clearTimeout(hideTimeout);
    });

    const slideInfo = createMemo(() => {
        return `Slide ${store.activeSlideIndex + 1} of ${store.slides.length}`;
    });

    const handleNext = () => {
        const currentIndex = store.states.findIndex(s => s.id === store.activeStateId);
        if (currentIndex < store.states.length - 1) {
            applyNextState();
        } else {
            setActiveSlide(store.activeSlideIndex + 1);
        }
        resetHideTimeout();
    };

    const handlePrev = () => {
        const currentIndex = store.states.findIndex(s => s.id === store.activeStateId);
        if (currentIndex > 0) {
            applyPreviousState();
        } else {
            setActiveSlide(store.activeSlideIndex - 1);
        }
        resetHideTimeout();
    };

    return (
        <Show when={isVisible()}>
            <div
                class="presentation-hud"
                style={{
                    position: 'fixed',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '12px',
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    'backdrop-filter': 'blur(12px)',
                    'border-radius': '100px',
                    'box-shadow': '0 10px 25px rgba(0, 0, 0, 0.2)',
                    'z-index': '10000',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'opacity 0.3s ease',
                    'font-family': 'Inter, sans-serif'
                }}
            >
                <button
                    onClick={handlePrev}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#1e293b',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '8px',
                        'border-radius': '50%',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                    <ChevronLeft size={20} />
                </button>

                <div style={{
                    color: '#64748b',
                    'font-size': '13px',
                    'font-weight': '600',
                    'min-width': '100px',
                    'text-align': 'center',
                    'user-select': 'none'
                }}>
                    {slideInfo()}
                </div>

                <button
                    onClick={handleNext}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#1e293b',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '8px',
                        'border-radius': '50%',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                    <ChevronRight size={20} />
                </button>

                <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)', 'margin': '0 4px' }}></div>

                <button
                    onClick={() => togglePresentationMode(false)}
                    style={{
                        background: '#f1f5f9',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '8px',
                        'border-radius': '50%',
                        transition: 'transform 0.2s'
                    }}
                    title="Exit Presentation"
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <X size={18} />
                </button>
            </div>
        </Show>
    );
};
