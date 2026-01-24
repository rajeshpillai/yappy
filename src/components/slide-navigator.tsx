import { For, Show } from "solid-js";
import { store, setActiveSlide, addSlide, deleteSlide } from "../store/app-store";
import "./slide-navigator.css";

export const SlideNavigator = () => {
    return (
        <Show when={store.docType === 'slides'}>
            <div class="slide-navigator" id="slide-navigator">
                <div class="slide-navigator-header">Slides</div>
                <div class="slide-list-container">
                    <For each={store.slides}>
                        {(slide, index) => (
                            <div class="slide-thumbnail-wrapper">
                                <div class="slide-index">{index() + 1}</div>
                                <div
                                    class={`slide-thumbnail ${store.activeSlideIndex === index() ? 'active' : ''}`}
                                    onClick={() => setActiveSlide(index())}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (confirm(`Delete Slide ${index() + 1}?`)) {
                                            deleteSlide(index());
                                        }
                                    }}
                                >
                                    <div class="slide-preview">
                                        <div class="slide-name-tag">{slide.name || `Slide ${index() + 1}`}</div>
                                    </div>
                                </div>
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
