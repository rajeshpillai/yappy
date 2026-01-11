import { type Component, createSignal, onMount } from "solid-js";
import { storage } from "../storage/FileSystemStorage";
import { store, setStore, undo, redo, deleteElements, clearHistory, toggleTheme, zoomToFit } from "../store/appStore";
import { Menu as MenuIcon, Save, FolderOpen, Share2, FilePlus, Undo2, Redo2, Trash2, Maximize, Moon, Sun } from "lucide-solid";
import FileOpenDialog from "./FileOpenDialog";
import "./Menu.css";

const Menu: Component = () => {
    const [drawingId, setDrawingId] = createSignal('default');
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);

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
    });

    return (
        <>
            {/* Open File Dialog */}
            <FileOpenDialog
                isOpen={isDialogOpen()}
                onClose={() => setIsDialogOpen(false)}
                onSelect={(id) => {
                    handleLoad(id);
                    setIsDialogOpen(false);
                }}
            />

            {/* Top Left Menu */}
            <div style={{ position: 'fixed', top: '12px', left: '12px', "z-index": 100 }}>
                <div class="menu-container">
                    <button class="menu-btn" title="Menu">
                        <MenuIcon size={20} />
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                    <button class="menu-btn" onClick={undo} title="Undo">
                        <Undo2 size={18} />
                    </button>
                    <button class="menu-btn" onClick={redo} title="Redo">
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
                    <button class="menu-btn" onClick={handleSave} title="Save">
                        <Save size={18} />
                    </button>
                    <button class="menu-btn" onClick={() => setIsDialogOpen(true)} title="Open">
                        <FolderOpen size={18} />
                    </button>
                    <button class="menu-btn primary" onClick={handleShare} title="Share">
                        <Share2 size={18} />
                        <span style={{ "margin-left": "4px" }}>Share</span>
                    </button>
                    <button class="menu-btn" onClick={handleNew} title="New">
                        <FilePlus size={18} />
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
