import { type Component, createSignal, onMount, createEffect, For, Show } from "solid-js";
import { storage } from "../storage/FileSystemStorage";
import { X, FileText } from "lucide-solid";
import "./FileOpenDialog.css";

interface FileOpenDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string) => void;
}

const FileOpenDialog: Component<FileOpenDialogProps> = (props) => {
    const [files, setFiles] = createSignal<string[]>([]);
    const [loading, setLoading] = createSignal(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const list = await storage.listDrawings();
            setFiles(list.map(f => f.replace('.json', '')));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    onMount(() => {
        if (props.isOpen) fetchFiles();
    });

    createEffect(() => {
        if (props.isOpen) fetchFiles();
    });

    return (
        <Show when={props.isOpen}>
            <div class="modal-overlay" onClick={props.onClose}>
                <div class="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div class="modal-header">
                        <h3>Open Drawing</h3>
                        <button class="close-btn" onClick={props.onClose}>
                            <X size={20} />
                        </button>
                    </div>
                    <div class="modal-body">
                        <Show when={loading()}>
                            <div class="loading">Loading...</div>
                        </Show>
                        <Show when={!loading() && files().length === 0}>
                            <div class="empty">No saved drawings found.</div>
                        </Show>
                        <div class="file-list">
                            <For each={files()}>
                                {(file) => (
                                    <div class="file-item" onClick={() => props.onSelect(file)}>
                                        <FileText size={16} />
                                        <span>{file}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default FileOpenDialog;
