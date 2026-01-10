import { type Component, onMount, onCleanup } from 'solid-js';
import { undo, redo } from './store/appStore';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Menu from './components/Menu';
import ZoomControls from './components/ZoomControls';
import Sidebar from './components/Sidebar';
import PropertyPanel from './components/PropertyPanel';


const App: Component = () => {
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <div>
      <Toolbar />
      <Sidebar>
        <PropertyPanel />
      </Sidebar>
      <Menu />
      <ZoomControls />
      <Canvas />
    </div>
  );
};

export default App;
