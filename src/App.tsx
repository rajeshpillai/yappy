import type { Component } from 'solid-js';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Menu from './components/Menu';
import ZoomControls from './components/ZoomControls';
import Sidebar from './components/Sidebar';
import PropertyPanel from './components/PropertyPanel';

const App: Component = () => {
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
