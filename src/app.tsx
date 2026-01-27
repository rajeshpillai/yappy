import { type Component, onMount, onCleanup, Show, lazy, Suspense } from 'solid-js';
import {
  undo, redo, store, deleteElements, togglePropertyPanel, toggleLayerPanel,
  toggleMinimap, toggleZenMode, toggleCommandPalette, moveSelectedElements,
  switchLayerByIndex, cycleStrokeStyle, cycleFillStyle,
  addChildNode, addSiblingNode, toggleCollapseSelection, togglePresentationMode,
  applyNextState, applyPreviousState, applyDisplayState, advancePresentation, retreatPresentation,
  setSelectedTool, setStore, groupSelected, ungroupSelected,
  bringToFront, sendToBack, reorderLayers, toggleGrid, toggleSnapToGrid, addLayer, toggleSlideNavigator,
  setIsExportOpen, setActiveSlide
} from './store/app-store';
import Canvas from './components/canvas';
import Toolbar from './components/toolbar';
import {
  copyToClipboard, cutToClipboard, pasteFromClipboard,
  copyStyle, pasteStyle
} from './utils/object-context-actions';
const PropertyPanel = lazy(() => import('./components/property-panel'));
const LayerPanel = lazy(() => import('./components/layer-panel'));
const CommandPalette = lazy(() => import('./components/command-palette'));
const StatePanel = lazy(() => import('./components/state-panel').then(m => ({ default: m.StatePanel })));
const Toast = lazy(() => import('./components/toast'));
const MindmapActionToolbar = lazy(() => import('./components/mindmap-action-toolbar').then(m => ({ default: m.MindmapActionToolbar })));
const SlideNavigator = lazy(() => import('./components/slide-navigator').then(m => ({ default: m.SlideNavigator })));
const SlideControlToolbar = lazy(() => import('./components/slide-control-toolbar').then(m => ({ default: m.SlideControlToolbar })));
const PresentationControls = lazy(() => import('./components/presentation-controls').then(m => ({ default: m.PresentationControls })));

import Menu, {
  handleNew, handleSaveRequest, setIsDialogOpen, setShowHelp
} from './components/menu';
import ZoomControls from './components/zoom-controls';
import { initAPI } from './api';
import { Settings } from 'lucide-solid';
import { registerShapes } from './shapes/register-shapes';
import { addSlide } from './store/app-store';
import pkg from '../package.json';

const App: Component = () => {
  // Removed showHelp state as it is now in Menu.tsx

  onMount(() => {
    console.log('App: Registering shapes...');
    registerShapes();
    initAPI();

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Presentation Mode shortcuts (highest priority)
      if (e.key === 'F5') {
        e.preventDefault();
        togglePresentationMode(true);
        return;
      }
      if (e.key === 'Escape' && store.appMode === 'presentation') {
        e.preventDefault();
        togglePresentationMode(false);
        return;
      }

      const code = e.code;
      const key = e.key.toLowerCase();

      // 1. Ctrl/Meta Shortcuts (Work even if focused on inputs, e.g. Ctrl+S)
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
          return;
        } else if (key === 'y') {
          e.preventDefault();
          redo();
          return;
        } else if (key === 'k') {
          e.preventDefault();
          toggleCommandPalette(true);
          return;
        } else if (key === 'a') {
          e.preventDefault();
          setStore('selection', store.elements.map(el => el.id));
          return;
        } else if (key === 'o') {
          e.preventDefault();
          setIsDialogOpen(true);
          return;
        } else if (key === 's') {
          e.preventDefault();
          handleSaveRequest('workspace');
          return;
        } else if (key === 'e' && e.shiftKey) {
          e.preventDefault();
          setIsExportOpen(true);
          return;
        }
      }

      if (e.defaultPrevented) return;

      // 2. Ignore hotkeys when typing in input fields, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return; // Let the user type normally
      }

      // 3. Alt + Key shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (code === 'Enter' || key === 'enter') {
          e.preventDefault();
          togglePropertyPanel();
        } else if (code === 'KeyL' || key === 'l') {
          e.preventDefault();
          toggleLayerPanel();
        } else if (code === 'KeyM' || key === 'm') {
          e.preventDefault();
          toggleMinimap();
        } else if (code === 'KeyZ' || key === 'z') {
          e.preventDefault();
          const nextZen = !store.zenMode;
          toggleZenMode(nextZen);
          toggleSlideNavigator(!nextZen);
        } else if (code === 'KeyI' || key === 'i') {
          e.preventDefault();
          setSelectedTool('ink');
        } else if (key === '\\' || code === 'Backslash') {
          e.preventDefault();
          const anyVisible = store.showPropertyPanel || store.showLayerPanel;
          togglePropertyPanel(!anyVisible);
          toggleLayerPanel(!anyVisible);
        } else if (key === '[' || code === 'BracketLeft') {
          e.preventDefault();
          const layers = store.layers;
          const idx = layers.findIndex(l => l.id === store.activeLayerId);
          if (idx > 0) reorderLayers(idx, idx - 1);
        } else if (key === ']' || code === 'BracketRight') {
          e.preventDefault();
          const layers = store.layers;
          const idx = layers.findIndex(l => l.id === store.activeLayerId);
          if (idx !== -1 && idx < layers.length - 1) reorderLayers(idx, idx + 1);
        } else if (key === 'n' || code === 'KeyN') {
          e.preventDefault();
          handleNew();
        } else if (key >= '1' && key <= '9') {
          e.preventDefault();
          const index = parseInt(key) - 1;
          switchLayerByIndex(index);
        } else if (code === 'ArrowRight') {
          e.preventDefault();
          applyNextState();
        } else if (code === 'ArrowLeft') {
          e.preventDefault();
          applyPreviousState();
        }
      }

      // 4. Ctrl/Meta but lower priority than inputs (Grouping/Duplicate)
      if (e.ctrlKey || e.metaKey) {
        if (key === 'g') {
          e.preventDefault();
          if (e.shiftKey) ungroupSelected(); else groupSelected();
        } else if (key === 'm') {
          e.preventDefault();
          addSlide();
        } else if (key === 'c' || code === 'KeyC') {
          e.preventDefault();
          if (e.altKey) copyStyle(); else await copyToClipboard();
        } else if (key === 'v' || code === 'KeyV') {
          e.preventDefault();
          if (e.altKey) pasteStyle(); else await pasteFromClipboard();
        } else if (key === 'x' || code === 'KeyX') {
          e.preventDefault();
          await cutToClipboard();
        } else if (key === ']') {
          e.preventDefault();
          if (store.selection.length > 0) bringToFront(store.selection);
        } else if (key === '[') {
          e.preventDefault();
          if (store.selection.length > 0) sendToBack(store.selection);
        } else if (key === 'd') {
          e.preventDefault();
          const selectedElements = store.elements.filter(el => store.selection.includes(el.id));
          if (selectedElements.length > 0) {
            const groupMapping = new Map<string, string>();
            selectedElements.forEach(el => {
              el.groupIds?.forEach((gid: string) => {
                if (!groupMapping.has(gid)) groupMapping.set(gid, crypto.randomUUID());
              });
            });
            const offset = 20;
            const newElements = selectedElements.map(el => ({
              ...el,
              id: crypto.randomUUID(),
              x: el.x + offset,
              y: el.y + offset,
              groupIds: el.groupIds?.map((gid: string) => groupMapping.get(gid)!)
            }));
            setStore('elements', [...store.elements, ...newElements]);
            setStore('selection', newElements.map(el => el.id));
          }
        }
        return;
      }

      // 5. Shared Global Shortcuts (No Alt/Ctrl)
      if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        // Presentation Navigation
        if (store.appMode === 'presentation') {
          if (code === 'PageDown' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space' || code === 'ArrowRight') {
            e.preventDefault();
            advancePresentation();
            return;
          } else if (code === 'ArrowLeft' || code === 'PageUp' || code === 'Backspace') {
            e.preventDefault();
            retreatPresentation();
            return;
          }
        }

        if (code === 'Home') {
          e.preventDefault();
          if (store.states.length > 0) {
            applyDisplayState(store.states[0].id);
          } else {
            setActiveSlide(0);
          }
          return;
        }

        // Tool Cycling and Single Key Shortcuts
        if (key === 's') {
          e.preventDefault();
          cycleStrokeStyle();
        } else if (key === 'f') {
          e.preventDefault();
          cycleFillStyle();
        } else if (key === '?' && e.shiftKey) {
          e.preventDefault();
          setShowHelp(true);
        } else if (key === '"' || (key === "'" && e.shiftKey)) {
          e.preventDefault();
          toggleGrid();
        } else if (key === ':' || (key === ';' && e.shiftKey)) {
          e.preventDefault();
          toggleSnapToGrid();
        } else if (key === 'delete' || key === 'backspace') {
          e.preventDefault();
          if (store.selection.length > 0) deleteElements(store.selection);
        } else if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
          if (store.selection.length > 0) {
            e.preventDefault();
            const nudgeAmount = e.shiftKey ? 10 : 1;
            let dx = 0, dy = 0;
            if (key === 'arrowup') dy = -nudgeAmount;
            else if (key === 'arrowdown') dy = nudgeAmount;
            else if (key === 'arrowleft') dx = -nudgeAmount;
            else if (key === 'arrowright') dx = nudgeAmount;
            moveSelectedElements(dx, dy, true);
          }
        } else if (key === 'tab') {
          if (store.selection.length === 1) {
            e.preventDefault();
            addChildNode(store.selection[0]);
          }
        } else if (key === 'enter') {
          if (store.selection.length === 1) {
            e.preventDefault();
            addSiblingNode(store.selection[0]);
          }
        } else if (key === ' ') {
          if (store.selection.length > 0) {
            e.preventDefault();
            toggleCollapseSelection();
          }
        } else if (e.shiftKey && key === 'n') {
          e.preventDefault();
          addLayer();
        } else if (e.shiftKey && key === 'p') {
          e.preventDefault();
          setSelectedTool('laser');
        }
        else {
          if (key === 'v' || key === '1') setSelectedTool('selection');
          else if (key === 'r' || key === '2') setSelectedTool('rectangle');
          else if (key === 'o' || key === '3') setSelectedTool('circle');
          else if (key === 'l' || key === '4') setSelectedTool('line');
          else if (key === 'a' || key === '5') setSelectedTool('arrow');
          else if (key === 't' || key === '6') setSelectedTool('text');
          else if (key === 'e' || key === '7') setSelectedTool('eraser');
          else if (key === 'p' || key === '8') setSelectedTool('fineliner');
          else if (key === '9' || key === 'i') {
            (window as any).triggerImageUpload?.();
          }
          else if (key === 'b' || key === '0') setSelectedTool('bezier');
          else if (key === 'd') setSelectedTool('diamond');
          else if (key === 'h') setSelectedTool('pan');
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && store.appMode === 'presentation') {
        togglePresentationMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });
  });

  return (
    <div>
      <Suspense fallback={null}>
        <Show when={store.appMode !== 'presentation'}>
          <Toolbar />
          <Show when={!store.zenMode}>
            <PropertyPanel />
            <LayerPanel />
            <ZoomControls />
          </Show>
          <Menu />
        </Show>
        <Canvas />
        <Show when={store.docType === 'slides'}>
          <Show when={store.appMode !== 'presentation' && !store.zenMode && store.showSlideNavigator} fallback={
            <Show when={store.appMode === 'presentation'}>
              <PresentationControls />
            </Show>
          }>
            <SlideNavigator />
          </Show>
        </Show>

        {/* Panels hidden in Presentation Mode */}
        <Show when={store.appMode !== 'presentation'}>
          <CommandPalette />
          <StatePanel />
        </Show>

        {/* Floating Property Panel Toggle (bottom-right corner) */}
        <Show when={store.appMode !== 'presentation'}>
          <button
            class="floating-settings-btn"
            classList={{ 'active': store.showPropertyPanel }}
            onClick={() => togglePropertyPanel()}
            title="Toggle Properties (Alt+Enter)"
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              width: '48px',
              height: '48px',
              'border-radius': '50%',
              border: 'none',
              background: '#ffffff',
              color: '#4b5563',
              'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'z-index': '1000',
              transition: 'all 0.2s ease'
            }}
          >
            <Settings size={24} />
          </button>
          <SlideControlToolbar />
          <MindmapActionToolbar />
        </Show>
        <Toast />
        <div
          style={{
            position: 'fixed',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            'font-size': '11px',
            color: 'var(--text-secondary, #6b7280)',
            'pointer-events': 'none',
            'user-select': 'none',
            'z-index': '999',
            opacity: '0.9'
          }}
        >
          v{pkg.version}
        </div>
      </Suspense>
    </div>
  );
};

export default App;
