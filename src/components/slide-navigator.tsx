import { For, Show, createSignal } from "solid-js";
import { store, setActiveSlide, addSlide, deleteSlide } from "../store/app-store";
import { X, Zap } from "lucide-solid";
import { SlideTransitionPicker } from "./slide-transition-picker";
import "./slide-navigator.css";

export const SlideNavigator = () => {
    const [activePickerIndex, setActivePickerIndex] = createSignal<number | null>(null);
    const [pickerPosition, setPickerPosition] = createSignal({ top: 0, left: 0 });

    const togglePicker = (e: MouseEvent, index: number) => {
        e.stopPropagation();
        if (activePickerIndex() === index) {
            setActivePickerIndex(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setPickerPosition({
                top: rect.top,
                left: rect.right + 10
            });
            setActivePickerIndex(index);
        }
    };

    return (
        <Show when={store.docType === 'slides'}>
            <div class="slide-navigator" id="slide-navigator" onClick={() => setActivePickerIndex(null)}>
                <div class="slide-navigator-header">Slides</div>
                <div class="slide-list-container">
                    <For each={store.slides}>
                        {(slide, index) => (
                            <div class="slide-thumbnail-wrapper">
                                <div class="slide-index">{index() + 1}</div>
                                <div
                                    class={`slide-thumbnail ${store.activeSlideIndex === index() ? 'active' : ''}`}
                                    onClick={() => setActiveSlide(index())}
                                >
                                    <button
                                        class="slide-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete Slide ${index() + 1}?`)) {
                                                deleteSlide(index());
                                            }
                                        }}
                                        title="Delete Slide"
                                    >
                                        <X size={14} />
                                    </button>

                                    <button
                                        class={`transition-toggle-btn ${activePickerIndex() === index() ? 'active' : ''}`}
                                        onClick={(e) => togglePicker(e, index())}
                                        title="Slide Transition"
                                    >
                                        <Zap size={14} />
                                    </button>

                                    <div class="slide-preview">
                                        <Show when={slide.thumbnail} fallback={
                                            <div class="slide-name-tag">{slide.name || `Slide ${index() + 1}`}</div>
                                        }>
                                            <img src={slide.thumbnail} class="slide-thumbnail-img" />
                                        </Show>
                                    </div>
                                </div>

                                <Show when={activePickerIndex() === index()}>
                                    <SlideTransitionPicker
                                        index={index()}
                                        onClose={() => setActivePickerIndex(null)}
                                        position={pickerPosition()}
                                    />
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
                <div class="add-slide-container">
                    <button
                        class="add-slide-btn"
                        onClick={() => addSlide()}
                        title="Add Slide (Ctrl+M)"
                    >
                        <span class="icon">+ Add Slide</span>
                    </button>
                </div>
            </div>
        </Show>
    );
};
