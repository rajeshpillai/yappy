import { type Component, createSignal, onMount, Show, onCleanup } from "solid-js";
import { storage } from "../storage/FileSystemStorage";
import { store, setStore, undo, redo, deleteElements, clearHistory, toggleTheme, zoomToFit } from "../store/appStore";
import { Menu as MenuIcon, Save, FolderOpen, Share2, FilePlus, Undo2, Redo2, Trash2, Maximize, Moon, Sun, Image as ImageIcon } from "lucide-solid";
import FileOpenDialog from "./FileOpenDialog";
import ExportDialog from "./ExportDialog";
import "./Menu.css";

const Menu: Component = () => {
    const [drawingId, setDrawingId] = createSignal('default');
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);
    const [isExportOpen, setIsExportOpen] = createSignal(false);
    const [isMenuOpen, setIsMenuOpen] = createSignal(false);

    const handleSave = async () => {
        try {
            await storage.saveDrawing(drawingId(), {
                elements: store.elements,
                viewState: store.viewState
            });
            alert('Drawing saved!');
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
        setIsMenuOpen(false);
    };

    const handleLoad = async (id?: string) => {
        const targetId = id || drawingId();
        try {
            const data = await storage.loadDrawing(targetId);
            if (data) {
                setStore({
                    elements: data.elements || [],
                    viewState: data.viewState || { scale: 1, panX: 0, panY: 0 }
                });
                setDrawingId(targetId);
            } else {
                alert('Drawing not found');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to load');
        }
    };

    const handleNew = () => {
        if (confirm('Clear canvas?')) {
            setStore("elements", []);
            setStore("viewState", { scale: 1, panX: 0, panY: 0 });
            setStore("selection", []);
            clearHistory();
            setDrawingId('untitled');
        }
        setIsMenuOpen(false);
    };

    const handleResetView = () => {
        zoomToFit();
    };

    const handleShare = () => {
        const url = `${window.location.origin}${window.location.pathname}?id=${drawingId()}`;
        navigator.clipboard.writeText(url);
        alert(`Link copied: ${url}`);
    };

    onMount(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (id) {
            setDrawingId(id);
            handleLoad(id);
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey) {
                if (e.key === 'o') {
                    e.preventDefault();
                    setIsDialogOpen(true);
                } else if (e.key.toLowerCase() === 'e' && e.shiftKey) { // Ctrl+Shift+E
                    e.preventDefault();
                    setIsExportOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
    });

    return (
        <>
            <Show when={isMenuOpen()}>
                <div class="menu-backdrop" onClick={() => setIsMenuOpen(false)}></div>
            </Show>

            {/* Open File Dialog */}
            <FileOpenDialog
                isOpen={isDialogOpen()}
                onClose={() => setIsDialogOpen(false)}
                onSelect={(id) => {
                    handleLoad(id);
                    setIsDialogOpen(false);
                }}
            />

            <ExportDialog
                isOpen={isExportOpen()}
                onClose={() => setIsExportOpen(false)}
            />

            {/* Top Left Menu */}
            <div style={{ position: 'fixed', top: '12px', left: '12px', "z-index": 1001 }}>
                <div class="menu-container" style={{ position: 'relative' }}>
                    <button class={`menu-btn ${isMenuOpen() ? 'active' : ''}`} title="Menu" onClick={() => setIsMenuOpen(!isMenuOpen())}>
                        <MenuIcon size={20} />
                    </button>

                    <Show when={isMenuOpen()}>
                        <div class="menu-dropdown">
                            <button class="menu-item" onClick={() => { setIsDialogOpen(true); setIsMenuOpen(false); }}>
                                <FolderOpen size={16} />
                                <span class="label">Open</span>
                                <span class="shortcut">Ctrl+O</span>
                            </button>
                            <button class="menu-item" onClick={handleSave}>
                                <Save size={16} />
                                <span class="label">Save to...</span>
                            </button>
                            <button class="menu-item" onClick={() => { setIsExportOpen(true); setIsMenuOpen(false); }}>
                                <ImageIcon size={16} />
                                <span class="label">Export image...</span>
                                <span class="shortcut">Ctrl+Shift+E</span>
                            </button>
                            <div class="menu-separator"></div>
                            <button class="menu-item" onClick={handleNew}>
                                <FilePlus size={16} />
                                <span class="label">Reset Canvas</span>
                            </button>
                            <div class="menu-separator"></div>
                            <div style={{ padding: '4px 12px', "font-size": '12px', color: 'var(--text-secondary)' }}>
                                Found a bug? <a href="https://github.com/rajeshpillai/yappy/issues" target="_blank" rel="noopener noreferrer">Report</a>
                            </div>
                        </div>
                    </Show>

                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                    <button class="menu-btn" onClick={undo} title="Undo (Ctrl+Z)">
                        <Undo2 size={18} />
                    </button>
                    <button class="menu-btn" onClick={redo} title="Redo (Ctrl+Y)">
                        <Redo2 size={18} />
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                    <button class="menu-btn" onClick={() => deleteElements(store.selection)} title="Delete" disabled={store.selection.length === 0}>
                        <Trash2 size={18} />
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                    <button class="menu-btn" onClick={handleResetView} title="Zoom to Fit">
                        <Maximize size={18} />
                    </button>
                </div>
            </div>

            {/* Top Right Controls */}
            <div style={{ position: 'fixed', top: '12px', right: '300px', "z-index": 100 }}>
                <div class="menu-container">
                    <input
                        type="text"
                        class="title-input"
                        value={drawingId()}
                        onInput={(e) => setDrawingId(e.currentTarget.value)}
                    />

                    <button class="menu-btn primary" onClick={handleShare} title="Share">
                        <Share2 size={18} />
                        <span style={{ "margin-left": "4px" }}>Share</span>
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                    <button class="menu-btn" onClick={toggleTheme} title="Toggle Theme">
                        {store.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Menu;
