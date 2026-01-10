import type { Component } from 'solid-js';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Menu from './components/Menu';

const App: Component = () => {
  return (
    <div>
      <Toolbar />
      <Menu />
      <Canvas />
    </div>
  );
};

export default App;
