import { type Component, createSignal, onMount, Show } from "solid-js";
import { showToast } from "./toast";
import { storage } from "../storage/file-system-storage";
import {
    store, deleteElements, toggleTheme, zoomToFit,
    togglePropertyPanel, toggleLayerPanel, toggleMinimap, toggleStatePanel, loadTemplate,
    loadDocument, resetToNewDocument, saveActiveSlide
} from "../store/app-store";
import {
    Menu as MenuIcon, FolderOpen, Share2, FilePlus, Trash2, Maximize,
    Moon, Sun, Download, Layout,
    Layers, Check, Play, Square, Camera
} from "lucide-solid";
import { sequenceAnimator } from "../utils/animation/sequence-animator";
import HelpDialog from "./help-dialog";
import LoadExportDialog from "./load-export-dialog";
import FileOpenDialog from "./file-open-dialog";
import ExportDialog from "./export-dialog";
import SaveDialog from "./save-dialog";
import { migrateToSlideFormat, isSlideDocument } from "../utils/migration";
import type { SlideDocument } from "../types/slide-types";
import TemplateBrowser from "./template-browser";
import type { Template } from "../types/template-types";
import "./menu.css";

// Exported signals for App.tsx integration
export const [drawingId, setDrawingId] = createSignal('default');
export const [isDialogOpen, setIsDialogOpen] = createSignal(false);
export const [isExportOpen, setIsExportOpen] = createSignal(false);
export const [isSaveOpen, setIsSaveOpen] = createSignal(false);
export const [isLoadExportOpen, setIsLoadExportOpen] = createSignal(false);
export const [showHelp, setShowHelp] = createSignal(false);

// Exported handlers for App.tsx integration
let sharedSetSaveIntent: (intent: 'workspace' | 'disk') => void;
export const handleSaveRequest = (intent: 'workspace' | 'disk') => {
    sharedSetSaveIntent(intent);
    setIsSaveOpen(true);
};

export const handleNew = () => {
    if (confirm('Start new sketch? Unsaved changes will be lost.')) {
        resetToNewDocument();
        setDrawingId('untitled');
    }
};

const Menu: Component = () => {
    const [isMenuOpen, setIsMenuOpen] = createSignal(false);
    const [loadExportInitialTab, setLoadExportInitialTab] = createSignal<'load' | 'save'>('load');
    let fileInputRef: HTMLInputElement | undefined;

    const [saveIntent, setSaveIntent] = createSignal<'workspace' | 'disk'>('workspace');
    sharedSetSaveIntent = setSaveIntent;
    const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = createSignal(false);

    (window as any).triggerImageUpload = () => fileInputRef?.click();

    const performSave = async (filename: string) => {
        setDrawingId(filename);

        // 1. Ensure current slide data is synced to slides array
        saveActiveSlide();

        // 2. Prepare SlideDocument v3
        const slideDoc: SlideDocument = {
            version: 3,
            metadata: {
                name: filename,
                updatedAt: new Date().toISOString(),
                docType: 'slides'
            },
            slides: JSON.parse(JSON.stringify(store.slides)),
            globalSettings: JSON.parse(JSON.stringify(store.globalSettings))
        };

        if (saveIntent() === 'workspace') {
            try {
                await storage.saveDrawing(filename, slideDoc);
                showToast(`Drawing saved as "${filename}"!`, 'success');
            } catch (e) {
                console.error(e);
                showToast('Failed to save to workspace', 'error');
            }
        } else {
            const data = JSON.stringify(slideDoc, null, 2);

            const blob = new Blob([data], { type: 'application/json' });
            const fileNameWithExt = `${filename}.json`;
            const file = new File([blob], fileNameWithExt, { type: 'application/json' });

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
                // Ensure data is in SlideDocument format (migrate if v2)
                const doc = isSlideDocument(data) ? data : migrateToSlideFormat(data);
                loadDocument(doc);
                setDrawingId(targetId);
                showToast('Drawing loaded successfully', 'success');
            } else {
                showToast('Drawing not found', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Failed to load drawing', 'error');
        }
    };

    const handleResetView = () => {
        zoomToFit();
    };

    const handleShare = () => {
        const url = `${window.location.origin}${window.location.pathname}?id=${drawingId()}`;
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard', 'success');
    };

    const handleTemplateSelect = (template: Template) => {
        if (store.elements.length > 0) {
            if (!confirm('Loading a template will clear the current canvas. Continue?')) {
                return;
            }
        }
        loadTemplate(template.data);
        setIsTemplateBrowserOpen(false);
        showToast(`Template "${template.metadata.name}" loaded`, 'success');
    };

    const handleOpenJson = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);

                // Ensure data is in SlideDocument format (migrate if v2)
                const doc = isSlideDocument(json) ? json : migrateToSlideFormat(json);
                loadDocument(doc);

                const name = file.name.replace(/\.json$/i, '');
                setDrawingId(name);
                showToast('File loaded successfully', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to parse JSON', 'error');
            }
        };
        reader.readAsText(file);
        setIsMenuOpen(false);
        (e.target as HTMLInputElement).value = '';
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

            <LoadExportDialog
                isOpen={isLoadExportOpen()}
                initialTab={loadExportInitialTab()}
                onClose={() => setIsLoadExportOpen(false)}
                onLoadWorkspace={() => { setIsLoadExportOpen(false); setIsDialogOpen(true); }}
                onLoadDisk={() => { setIsLoadExportOpen(false); fileInputRef?.click(); }}
                onSaveWorkspace={() => { setIsLoadExportOpen(false); handleSaveRequest('workspace'); }}
                onSaveDisk={() => { setIsLoadExportOpen(false); handleSaveRequest('disk'); }}
                onExportImage={() => { setIsLoadExportOpen(false); setIsExportOpen(true); }}
            />

            <TemplateBrowser
                isOpen={isTemplateBrowserOpen()}
                onClose={() => setIsTemplateBrowserOpen(false)}
                onSelectTemplate={handleTemplateSelect}
            />

            <Show when={!store.zenMode}>
                <div class="app-title">
                    {drawingId()}
                </div>
            </Show>

            <Show when={!store.zenMode}>
                <>
                    <div style={{ position: 'fixed', top: '12px', left: '12px', "z-index": 1001 }}>
                        <div class="menu-container" style={{ position: 'relative' }}>
                            <button class={`menu-btn ${isMenuOpen() ? 'active' : ''}`} title="Menu" onClick={() => setIsMenuOpen(!isMenuOpen())}>
                                <MenuIcon size={20} />
                            </button>

                            <Show when={isMenuOpen()}>
                                <div class="menu-dropdown">
                                    <button class="menu-item" onClick={() => { setLoadExportInitialTab('load'); setIsLoadExportOpen(true); setIsMenuOpen(false); }}>
                                        <FolderOpen size={16} />
                                        <span class="label">Load Sketch...</span>
                                    </button>
                                    <button class="menu-item" onClick={() => { setLoadExportInitialTab('save'); setIsLoadExportOpen(true); setIsMenuOpen(false); }}>
                                        <Download size={16} />
                                        <span class="label">Export / Save...</span>
                                    </button>
                                    <div class="menu-separator"></div>
                                    <div class="menu-item" onClick={() => { togglePropertyPanel(); setIsMenuOpen(false); }}>
                                        <Layout size={16} />
                                        <span class="label">Properties Panel</span>
                                        <div class="menu-item-right">
                                            <Show when={store.showPropertyPanel}><Check size={14} class="check-icon" /></Show>
                                            <span class="shortcut">Alt+Enter</span>
                                        </div>
                                    </div>
                                    <div class="menu-item" onClick={() => { toggleLayerPanel(); setIsMenuOpen(false); }}>
                                        <Layers size={16} />
                                        <span class="label">Layers Panel</span>
                                        <div class="menu-item-right">
                                            <Show when={store.showLayerPanel}><Check size={14} class="check-icon" /></Show>
                                            <span class="shortcut">Alt+L</span>
                                        </div>
                                    </div>
                                    <div class="menu-item" onClick={() => { toggleStatePanel(); setIsMenuOpen(false); }}>
                                        <Camera size={16} />
                                        <span class="label">Display States</span>
                                        <div class="menu-item-right">
                                            <Show when={store.showStatePanel}><Check size={14} class="check-icon" /></Show>
                                        </div>
                                    </div>
                                    <div class="menu-item" onClick={() => { toggleMinimap(); setIsMenuOpen(false); }}>
                                        <Maximize size={16} />
                                        <span class="label">Minimap</span>
                                        <div class="menu-item-right">
                                            <Show when={store.minimapVisible}><Check size={14} class="check-icon" /></Show>
                                            <span class="shortcut">Alt+M</span>
                                        </div>
                                    </div>
                                    <div class="menu-separator"></div>
                                    <button class="menu-item" onClick={() => { handleNew(); setIsMenuOpen(false); }}>
                                        <FilePlus size={16} />
                                        <span class="label">New Sketch</span>
                                    </button>
                                    <button class="menu-item" onClick={() => { setIsTemplateBrowserOpen(true); setIsMenuOpen(false); }}>
                                        <Layout size={16} />
                                        <span class="label">Templates</span>
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

                    <div style={{ position: 'fixed', top: '12px', right: '12px', "z-index": 100 }}>
                        <div class="menu-container">
                            <button class="menu-btn" onClick={() => sequenceAnimator.playAll('programmatic')} title="Play All Animations">
                                <Play size={18} color="#10b981" fill="#10b981" />
                                <span style={{ "margin-left": "4px", color: '#10b981', "font-weight": "bold" }}>Play All</span>
                            </button>
                            <button class="menu-btn" onClick={() => sequenceAnimator.stopAll()} title="Stop All Animations">
                                <Square size={18} color="#ef4444" fill="#ef4444" />
                            </button>
                            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>
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
            </Show>
        </>
    );
};

export default Menu;
