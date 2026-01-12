import { type Component, createSignal, onMount, Show, onCleanup } from "solid-js";
import { storage } from "../storage/FileSystemStorage";
import { store, setStore, deleteElements, clearHistory, toggleTheme, zoomToFit, addLayer, reorderLayers, bringToFront, sendToBack } from "../store/appStore";
import { Menu as MenuIcon, Save, FolderOpen, Share2, FilePlus, Trash2, Maximize, Moon, Sun, Image as ImageIcon, Download, Upload } from "lucide-solid";

// ... (in component)

import HelpDialog from "./HelpDialog";
import FileOpenDialog from "./FileOpenDialog";
import ExportDialog from "./ExportDialog";
import SaveDialog from "./SaveDialog";
import { migrateDrawingData } from "../utils/migration";
import "./Menu.css";

const Menu: Component = () => {
    const [drawingId, setDrawingId] = createSignal('default');
    const [isDialogOpen, setIsDialogOpen] = createSignal(false);
    const [isExportOpen, setIsExportOpen] = createSignal(false);
    const [isSaveOpen, setIsSaveOpen] = createSignal(false);
    const [isMenuOpen, setIsMenuOpen] = createSignal(false);
    const [showHelp, setShowHelp] = createSignal(false);
    let fileInputRef: HTMLInputElement | undefined;

    const [saveIntent, setSaveIntent] = createSignal<'workspace' | 'disk'>('workspace');
    const [clipboard, setClipboard] = createSignal<any[]>([]);

    const handleSaveRequest = (intent: 'workspace' | 'disk') => {
        setSaveIntent(intent);
        setIsSaveOpen(true);
        setIsMenuOpen(false);
    };

    const performSave = async (filename: string) => {
        // Update drawing title
        setDrawingId(filename);

        if (saveIntent() === 'workspace') {
            try {
                await storage.saveDrawing(filename, {
                    elements: store.elements,
                    viewState: store.viewState,
                    layers: store.layers,
                    gridSettings: store.gridSettings,
                    canvasBackgroundColor: store.canvasBackgroundColor
                });
                alert(`Drawing saved as "${filename}"!`);
            } catch (e) {
                console.error(e);
                alert('Failed to save to workspace');
            }
        } else {
            // Save to Disk (Download/Share)
            const data = JSON.stringify({
                elements: store.elements,
                viewState: store.viewState,
                layers: store.layers,
                gridSettings: store.gridSettings,
                canvasBackgroundColor: store.canvasBackgroundColor,
                version: 1
            }, null, 2);

            const blob = new Blob([data], { type: 'application/json' });
            const fileNameWithExt = `${filename}.json`;
            const file = new File([blob], fileNameWithExt, { type: 'application/json' });

            // Try using Web Share API first (great for mobile)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Yappy Drawing',
                        text: 'Save your drawing JSON'
                    });
                    return;
                } catch (err) {
                    if ((err as Error).name !== 'AbortError') {
                        console.error('Share failed:', err);
                    }
                }
            }

            // Fallback to standard download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileNameWithExt;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleLoad = async (id?: string) => {
        const targetId = id || drawingId();
        try {
            const data = await storage.loadDrawing(targetId);
            if (data) {
                const migrated = migrateDrawingData(data);
                setStore({
                    elements: migrated.elements,
                    viewState: data.viewState || { scale: 1, panX: 0, panY: 0 },
                    layers: migrated.layers,
                    activeLayerId: migrated.layers[0]?.id || 'default-layer',
                    gridSettings: migrated.gridSettings || { enabled: false, snapToGrid: false, gridSize: 20, gridColor: '#e0e0e0', gridOpacity: 0.5, style: 'lines' },
                    canvasBackgroundColor: migrated.canvasBackgroundColor || '#fafafa'
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
        if (confirm('Start new sketch? Unsaved changes will be lost.')) {
            setStore("elements", []);
            setStore("viewState", { scale: 1, panX: 0, panY: 0 });
            setStore("selection", []);
            setStore("layers", [
                {
                    id: 'default-layer',
                    name: 'Layer 1',
                    visible: true,
                    locked: false,
                    opacity: 1,
                    order: 0
                }
            ]);
            setStore("activeLayerId", 'default-layer');
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

    const handleOpenJson = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.elements) {
                    const migrated = migrateDrawingData(json);
                    setStore({
                        elements: migrated.elements,
                        viewState: json.viewState || { scale: 1, panX: 0, panY: 0 },
                        layers: migrated.layers,
                        activeLayerId: migrated.layers[0]?.id || 'default-layer',
                        gridSettings: migrated.gridSettings || { enabled: false, snapToGrid: false, gridSize: 20, gridColor: '#e0e0e0', gridOpacity: 0.5, style: 'lines' },
                        canvasBackgroundColor: migrated.canvasBackgroundColor || '#fafafa'
                    });
                    // Set title from filename without extension
                    const name = file.name.replace(/\.json$/i, '');
                    setDrawingId(name);
                } else {
                    alert('Invalid file format');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse JSON');
            }
        };
        reader.readAsText(file);
        setIsMenuOpen(false);
        // Reset input
        (e.target as HTMLInputElement).value = '';
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
                } else if (e.key === 's') { // Ctrl+S
                    e.preventDefault();
                    handleSaveRequest('workspace');
                } else if (e.key.toLowerCase() === 'e' && e.shiftKey) { // Ctrl+Shift+E
                    e.preventDefault();
                    setIsExportOpen(true);
                } else if (e.key === 'a') { // Ctrl+A - Select All
                    // Don't select all if user is typing in an input/textarea
                    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        setStore('selection', store.elements.map(el => el.id));
                    }
                } else if (e.key === 'c') { // Ctrl+C - Copy
                    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const selectedElements = store.elements.filter(el => store.selection.includes(el.id));
                        setClipboard(selectedElements);
                    }
                } else if (e.key === 'v') { // Ctrl+V - Paste
                    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const copiedElements = clipboard();
                        if (copiedElements.length > 0) {
                            const offset = 20;
                            const newElements = copiedElements.map(el => ({
                                ...el,
                                id: crypto.randomUUID(),
                                x: el.x + offset,
                                y: el.y + offset
                            }));
                            setStore('elements', [...store.elements, ...newElements]);
                            setStore('selection', newElements.map(el => el.id));
                        }
                    }
                } else if (e.key === 'd') { // Ctrl+D - Duplicate
                    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const selectedElements = store.elements.filter(el => store.selection.includes(el.id));
                        if (selectedElements.length > 0) {
                            const offset = 20;
                            const newElements = selectedElements.map(el => ({
                                ...el,
                                id: crypto.randomUUID(),
                                x: el.x + offset,
                                y: el.y + offset
                            }));
                            setStore('elements', [...store.elements, ...newElements]);
                            setStore('selection', newElements.map(el => el.id));
                        }
                    }
                } else if (e.key === 'x') { // Ctrl+X - Cut
                    if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const selectedElements = store.elements.filter(el => store.selection.includes(el.id));
                        setClipboard(selectedElements);
                        if (selectedElements.length > 0) {
                            deleteElements(store.selection);
                        }
                    }
                }
            } else if (e.ctrlKey) {
                if (e.key === ']') { // Ctrl+] - Bring to Front
                    e.preventDefault();
                    if (store.selection.length > 0) {
                        bringToFront(store.selection);
                    }
                } else if (e.key === '[') { // Ctrl+[ - Send to Back
                    e.preventDefault();
                    if (store.selection.length > 0) {
                        sendToBack(store.selection);
                    }
                }
            } else if (e.key === '?' && e.shiftKey) { // Shift+?
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    setShowHelp(true);
                }
            } else if (e.shiftKey && e.key.toLowerCase() === 'n') { // Shift+N = New Layer
                e.preventDefault();
                addLayer();
            } else if (e.altKey) {
                if (e.key === '[') { // Alt + [ = Move Layer Down
                    e.preventDefault();
                    const layers = store.layers;
                    const idx = layers.findIndex(l => l.id === store.activeLayerId);
                    if (idx > 0) {
                        reorderLayers(idx, idx - 1);
                    }
                } else if (e.key === ']') { // Alt + ] = Move Layer Up
                    e.preventDefault();
                    const layers = store.layers;
                    const idx = layers.findIndex(l => l.id === store.activeLayerId);
                    if (idx !== -1 && idx < layers.length - 1) {
                        reorderLayers(idx, idx + 1);
                    }
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

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleOpenJson}
            />

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

            <SaveDialog
                isOpen={isSaveOpen()}
                onClose={() => setIsSaveOpen(false)}
                onSave={performSave}
                initialFilename={drawingId()}
            />

            <HelpDialog isOpen={showHelp()} onClose={() => setShowHelp(false)} />

            {/* App Title */}
            <div class="app-title">
                {drawingId()}
            </div>

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
                                <span class="label">Open from Workspace...</span>
                                <span class="shortcut">Ctrl+O</span>
                            </button>
                            <button class="menu-item" onClick={() => handleSaveRequest('workspace')}>
                                <Save size={16} />
                                <span class="label">Save to Workspace...</span>
                                <span class="shortcut">Ctrl+S</span>
                            </button>
                            <div class="menu-separator"></div>
                            <button class="menu-item" onClick={() => { fileInputRef?.click(); setIsMenuOpen(false); }}>
                                <Upload size={16} />
                                <span class="label">Open from Disk...</span>
                            </button>
                            <button class="menu-item" onClick={() => handleSaveRequest('disk')}>
                                <Download size={16} />
                                <span class="label">Save to Disk...</span>
                            </button>
                            <div class="menu-separator"></div>
                            <button class="menu-item" onClick={() => { setIsExportOpen(true); setIsMenuOpen(false); }}>
                                <ImageIcon size={16} />
                                <span class="label">Export image...</span>
                                <span class="shortcut">Ctrl+Shift+E</span>
                            </button>
                            <div class="menu-separator"></div>
                            <button class="menu-item" onClick={handleNew}>
                                <FilePlus size={16} />
                                <span class="label">New Sketch</span>
                            </button>
                            <div class="menu-separator"></div>
                            <div style={{ padding: '4px 12px', "font-size": '12px', color: 'var(--text-secondary)' }}>
                                Found a bug? <a href="https://github.com/rajeshpillai/yappy/issues" target="_blank" rel="noopener noreferrer">Report</a>
                            </div>
                        </div>
                    </Show>

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
            <div style={{ position: 'fixed', top: '12px', right: '12px', "z-index": 100 }}>
                <div class="menu-container">
                    <button class="menu-btn primary" onClick={handleShare} title="Share">
                        <Share2 size={18} />
                        <span style={{ "margin-left": "4px" }}>Share</span>
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                    <button class="menu-btn" onClick={() => setShowHelp(true)} title="Help & Shortcuts (?)">
                        <div style={{
                            width: '20px',
                            height: '20px',
                            "border-radius": '50%',
                            border: '2px solid currentColor',
                            display: 'flex',
                            "align-items": 'center',
                            "justify-content": 'center',
                            "font-weight": 'bold',
                            "font-size": '14px'
                        }}>?</div>
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
