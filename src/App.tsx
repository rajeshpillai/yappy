import { type Component, onMount, onCleanup } from 'solid-js';
import { undo, redo, store, deleteElements } from './store/appStore';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Menu from './components/Menu';
import ZoomControls from './components/ZoomControls';
import PropertyPanel from './components/PropertyPanel';
import LayerPanel from './components/LayerPanel';

const App: Component = () => {
  // Removed showHelp state as it is now in Menu.tsx

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Delete
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (store.selection.length > 0) {
            deleteElements(store.selection);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <div>
      <Toolbar />
      <PropertyPanel />
      <LayerPanel />
      <Menu />
      <ZoomControls />
      <Canvas />
    </div>
  );
};

export default App;
