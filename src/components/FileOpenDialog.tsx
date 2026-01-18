import { type Component, createSignal, onMount, createEffect, For, Show } from "solid-js";
import { storage } from "../storage/FileSystemStorage";
import { X, FileText, Trash2 } from "lucide-solid";
import "./FileOpenDialog.css";

interface FileOpenDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string) => void;
}

const FileOpenDialog: Component<FileOpenDialogProps> = (props) => {
    const [files, setFiles] = createSignal<string[]>([]);
    const [loading, setLoading] = createSignal(false);
    const [activeIndex, setActiveIndex] = createSignal<number>(-1);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const list = await storage.listDrawings();
            const filenames = list.map(f => f.replace('.json', ''));
            setFiles(filenames);
            if (filenames.length > 0) setActiveIndex(0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (file: string, e: Event) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${file}"?`)) {
            try {
                await storage.deleteDrawing(file);
                fetchFiles();
            } catch (err) {
                alert('Failed to delete file');
            }
        }
    };

    onMount(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!props.isOpen) return;

            const fileList = files();
            if (fileList.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (prev + 1) % fileList.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) => (prev - 1 + fileList.length) % fileList.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const currentIdx = activeIndex();
                if (currentIdx >= 0 && currentIdx < fileList.length) {
                    props.onSelect(fileList[currentIdx]);
                }
            } else if (e.key === 'Escape') {
                props.onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    createEffect(() => {
        if (props.isOpen) {
            fetchFiles();
            setActiveIndex(0);
        }
    });

    createEffect(() => {
        const index = activeIndex();
        if (index >= 0 && props.isOpen) {
            // Wait for Solid to update the DOM
            setTimeout(() => {
                const activeEl = document.querySelector('.file-item.active');
                if (activeEl) {
                    activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }, 0);
        }
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
                                {(file, index) => (
                                    <div
                                        class={`file-item ${activeIndex() === index() ? 'active' : ''}`}
                                        onClick={() => props.onSelect(file)}
                                        onMouseEnter={() => setActiveIndex(index())}
                                    >
                                        <div style={{ display: 'flex', "align-items": 'center', gap: '8px', flex: 1 }}>
                                            <FileText size={16} />
                                            <span>{file}</span>
                                        </div>
                                        <button class="delete-file-btn" onClick={(e) => handleDelete(file, e)} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
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
