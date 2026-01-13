import { type Component, onMount, onCleanup, Show } from 'solid-js';
import { undo, redo, store, deleteElements, togglePropertyPanel, toggleLayerPanel, toggleMinimap, toggleZenMode } from './store/appStore';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Menu from './components/Menu';
import ZoomControls from './components/ZoomControls';
import PropertyPanel from './components/PropertyPanel';
import LayerPanel from './components/LayerPanel';
import { initAPI } from './api';

const App: Component = () => {
  // Removed showHelp state as it is now in Menu.tsx

  onMount(() => {
    initAPI();

    const handleKeyDown = (e: KeyboardEvent) => {
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
        }
        return; // Handle Alt and exit
      }

      // Don't handle other shortcuts if typing in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
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
      // Delete
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (store.selection.length > 0) {
          deleteElements(store.selection);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <div>
      <Toolbar />
      <Show when={!store.zenMode}>
        <PropertyPanel />
        <LayerPanel />
        <ZoomControls />
      </Show>
      <Menu />
      <Canvas />
    </div>
  );
};

export default App;
