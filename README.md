# Yappy

**Yappy** is an infinite canvas drawing and diagramming application built with SolidJS, inspired by Excalidraw. Create beautiful hand-drawn style diagrams, sketches, and whiteboard illustrations with a powerful set of drawing tools.

## Features

### Core Drawing Tools
- **Shapes** - Rectangle, Circle, Line, Arrow
- **Freehand** - Pencil tool for organic sketches
- **Text** - Add and style text with custom fonts and sizing
- **Images** - Insert PNG/JPG images into your canvas

### Interactions
- **Infinite Canvas** - Pan and zoom across unlimited space
- **Select & Transform** - Move, resize (with side and corner handles), and rotate elements
- **Multi-Select** - Group and manipulate multiple elements together
- **Eraser** - Click or drag to remove elements
- **Pan Tool** - Hand tool for easy canvas navigation

### Styling & Rendering
- **RoughJS Integration** - Hand-drawn, sketchy aesthetic
- **Dual Render Modes** - Switch between 'sketch' and 'architectural' styles
- **Property Panel** - Comprehensive sidebar for editing colors, stroke width, fill styles, opacity, and more
- **Enhanced Color Picker** - Palette presets, hex input, and system color picker
- **Dark Mode** - Full theme support

### File Management
- **Save/Load** - JSON-based storage with shareable links
- **Local Files** - Import/export drawings from your local disk
- **File Browser** - Modal dialog to manage your saved drawings
- **Export** - Download as PNG or SVG images

### Advanced Features
- **Undo/Redo** - Full history stack with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Auto-Scroll** - Intelligent viewport scrolling when dragging near edges
- **Scroll to Content** - Quick button to return to your drawing
- **Mobile & Pen Support** - Touch and stylus input via Pointer Events API
- **Delete** - Keyboard shortcuts (Delete/Backspace) for quick removal

## Tech Stack

- **Framework**: [SolidJS](https://solidjs.com) - Reactive JavaScript framework
- **Rendering**: HTML5 Canvas API + [RoughJS](https://roughjs.com) for sketchy rendering
- **Build Tool**: [Vite](https://vitejs.dev)
- **State Management**: Centralized reactive store (`appStore.ts`)
- **Styling**: Custom CSS organized per component
- **Deployment**: GitHub Pages with static build configuration

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm, pnpm, yarn, or bun

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd yappy

# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start the development server
npm run dev
# or
bun dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Build

```bash
# Build for production
npm run build
# or
bun run build
```

Builds the app to the `dist` folder, optimized for production deployment.

### Deploy

The project is configured for GitHub Pages deployment:

```bash
npm run deploy
```

This builds the app with the correct base path and pushes to the `gh-pages` branch.

## Project Structure

```
yappy/
├── src/
│   ├── components/     # UI components (Canvas, Toolbar, PropertyPanel, etc.)
│   ├── store/          # Application state management (appStore.ts)
│   ├── utils/          # Utility functions and helpers
│   └── App.tsx         # Main application component
├── public/             # Static assets
├── task.md             # Development roadmap and progress tracking
└── vite.config.ts      # Vite configuration
```

## Keyboard Shortcuts

- **Ctrl+Z** - Undo
- **Ctrl+Y** / **Ctrl+Shift+Z** - Redo
- **Delete** / **Backspace** - Delete selected element(s)
- **V** - Select tool
- **H** - Pan (Hand) tool
- **R** - Rectangle
- **C** - Circle
- **L** - Line
- **A** - Arrow
- **T** - Text
- **P** - Pencil
- **E** - Eraser

## Roadmap

### Completed ✓
- [x] Core drawing tools and infinite canvas
- [x] File management and shareable links
- [x] Undo/Redo system
- [x] Property panel with advanced styling options
- [x] RoughJS integration with dual render modes
- [x] Export to PNG/SVG
- [x] Dark mode support
- [x] Multi-select and grouping
- [x] Image insertion
- [x] Mobile and pen support
- [x] Local file save/load

### Planned
- [ ] Layer system (like Procreate/Figma/Krita)
- [ ] Viewport culling optimization
- [ ] API-based programmatic drawing
- [ ] Animation system

## Contributing

This is a personal learning project. Feel free to fork and experiment!

## Learn More

- [SolidJS Documentation](https://solidjs.com)
- [RoughJS Documentation](https://roughjs.com)
- [Vite Documentation](https://vitejs.dev)

## License

MIT
