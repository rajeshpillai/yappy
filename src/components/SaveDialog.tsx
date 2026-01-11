import { type Component, createSignal, Show, createEffect } from "solid-js";
import { X } from "lucide-solid";
import "./SaveDialog.css";

interface SaveDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (filename: string) => void;
    initialFilename?: string;
}

const SaveDialog: Component<SaveDialogProps> = (props) => {
    const [filename, setFilename] = createSignal("");

    createEffect(() => {
        if (props.isOpen) {
            setFilename(props.initialFilename || "untitled");
        }
    });

    const handleSave = () => {
        if (filename().trim()) {
            props.onSave(filename().trim());
            props.onClose();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            props.onClose();
        }
    };

    return (
        <Show when={props.isOpen}>
            <div class="save-overlay" onClick={props.onClose}>
                <div class="save-modal" onClick={e => e.stopPropagation()}>
                    <div class="save-header">
                        <h2>Save Drawing</h2>
                        <button class="close-btn" onClick={props.onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div class="save-content">
                        <div class="input-group">
                            <label>Filename</label>
                            <input
                                type="text"
                                class="filename-input"
                                value={filename()}
                                onInput={(e) => setFilename(e.currentTarget.value)}
                                onKeyDown={handleKeyDown}
                                autofocus
                            />
                        </div>

                        <div class="save-actions">
                            <button class="cancel-btn" onClick={props.onClose}>Cancel</button>
                            <button class="confirm-btn" onClick={handleSave}>Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default SaveDialog;
