# Offline HTML Export (Standalone Player)

Yappy allows you to export your slide presentations as a single, standalone HTML file. This file contains everything needed to view and present your slides without an internet connection or the Yappy editor.

## Features

- **Single File**: All assets, styles, and drawing instructions are bundled into one `.html` file.
- **Offline Ready**: Works completely offline.
- **Embedded Player**: Includes a streamlined version of the Yappy engine optimized for presentation.
- **Interactive Tools**: 
  - **Navigation**: Use the on-screen buttons or arrow keys to move between slides.
  - **Laser Pointer**: Use the laser tool to highlight areas during your talk.
  - **Ink Highlighter**: Draw directly on slides for live annotations (annotations are transient and not saved to the file).
- **Auto-Sync**: The player automatically centers on the first slide and scales to fit your screen.

## How to Export

1. Open a Slide Document in Yappy.
2. Go to the **Menu** (top left).
3. Select **Export**.
4. Choose **Export as HTML (Standalone Player)**.
5. Save the file to your computer.

## Technical Details

The standalone player uses a pre-compiled bundle of the engine that is injected into a template. When you export, your document data is embedded as a global variable (`window.__PRESENTATION_DATA__`) which the player then loads.

### Performance

The player is optimized for fast loading and smooth transitions. It uses the same rendering logic as the main editor but with all editing features stripped out for a clean "presentation-only" experience.

### Browser Support

The exported file is compatible with all modern browsers (Chrome, Firefox, Safari, Edge).
