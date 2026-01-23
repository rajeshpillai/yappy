import { type Component, onMount, onCleanup, Show } from 'solid-js';
import {
  undo, redo, store, deleteElements, togglePropertyPanel, toggleLayerPanel,
  toggleMinimap, toggleZenMode, toggleCommandPalette, moveSelectedElements,
  switchLayerByIndex, cycleStrokeStyle, cycleFillStyle,
  addChildNode, addSiblingNode, toggleCollapseSelection, togglePresentationMode
} from './store/app-store';
import Canvas from './components/canvas';
import Toolbar from './components/toolbar';
import Menu from './components/menu';
import ZoomControls from './components/zoom-controls';
import PropertyPanel from './components/property-panel';
import LayerPanel from './components/layer-panel';
import CommandPalette from './components/command-palette';
import { StatePanel } from './components/state-panel';
import { initAPI } from './api';
import { Settings } from 'lucide-solid';
import Toast from './components/toast';
import { MindmapActionToolbar } from './components/mindmap-action-toolbar';
import { registerShapes } from './shapes/register-shapes';

const App: Component = () => {
  // Removed showHelp state as it is now in Menu.tsx

  onMount(() => {
    console.log('App: Registering shapes...');
    registerShapes();
    initAPI();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Presentation Mode shortcuts (highest priority)
      if (e.key === 'F5') {
        e.preventDefault();
        togglePresentationMode(true);
        return;
      }
      if (e.key === 'Escape' && store.presentationMode) {
        e.preventDefault();
        togglePresentationMode(false);
        return;
      }

      // Allow Alt shortcuts (Commands) even if focused on inputs
      if (e.altKey) {
        // Use e.code for layout-independent checking where possible, fall back to key
        const code = e.code;
        const key = e.key.toLowerCase();

        if (code === 'Enter' || key === 'enter') {
          e.preventDefault();
          togglePropertyPanel();
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          toggleLayerPanel();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleMinimap();
        } else if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          toggleZenMode();
        } else if (key >= '1' && key <= '9') {
          // Layer Switching: Alt + 1-9
          e.preventDefault();
          const index = parseInt(key) - 1;
          switchLayerByIndex(index);
        }
        return; // Handle Alt and exit
      }

      // Don't handle other shortcuts if typing in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      // Style Cycling
      if (key === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        cycleStrokeStyle();
      } else if (key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        cycleFillStyle();
      }
      // Undo/Redo
      else if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
      }
      // Command Palette (Ctrl+K)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette(true);
      }
      // Delete
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (store.selection.length > 0) {
          deleteElements(store.selection);
        }
      }
      // Nudging
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (store.selection.length > 0) {
          e.preventDefault();
          const nudgeAmount = e.shiftKey ? 10 : 1;
          let dx = 0, dy = 0;
          if (e.key === 'ArrowUp') dy = -nudgeAmount;
          else if (e.key === 'ArrowDown') dy = nudgeAmount;
          else if (e.key === 'ArrowLeft') dx = -nudgeAmount;
          else if (e.key === 'ArrowRight') dx = nudgeAmount;

          moveSelectedElements(dx, dy, true);
        }
      }
      // Mindmap Shortcuts
      else if (key === 'tab') {
        if (store.selection.length === 1) {
          e.preventDefault();
          addChildNode(store.selection[0]);
        }
      } else if (key === 'enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (store.selection.length === 1) {
          e.preventDefault();
          addSiblingNode(store.selection[0]);
        }
      } else if (key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (store.selection.length > 0) {
          e.preventDefault();
          toggleCollapseSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <div>
      <Show when={!store.presentationMode}>
        <Toolbar />
        <Show when={!store.zenMode}>
          <PropertyPanel />
          <LayerPanel />
          <ZoomControls />
        </Show>
        <Menu />
      </Show>
      <Canvas />
      <CommandPalette />
      <StatePanel />

      {/* Floating Property Panel Toggle (bottom-right corner) */}
      <Show when={!store.presentationMode}>
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
        <MindmapActionToolbar />
      </Show>
      <Toast />
    </div>
  );
};

export default App;
