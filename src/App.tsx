import type { Component } from 'solid-js';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Menu from './components/Menu';
import ZoomControls from './components/ZoomControls';

const App: Component = () => {
  return (
    <div>
      <Toolbar />
      <Menu />
      <ZoomControls />
      <Canvas />
    </div>
  );
};

export default App;
