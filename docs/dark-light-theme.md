# Dark / Light Theme

## Architecture

Theme toggle affects **UI chrome only** — shape colors on canvas are always WYSIWYG.

### What changes with theme

| Layer | Dark | Light |
|-------|------|-------|
| UI (menus, toolbars, panels) | CSS variables via `[data-theme="dark"]` | CSS variables via `:root` |
| Workspace background | `#1a1a1b` | `#e2e8f0` |
| Slide default background | `#121212` (fallback only) | `#ffffff` (fallback only) |
| Grid / texture overlays | Light-on-dark colors | Dark-on-light colors |
| Slide boundary labels | Themed chrome | Themed chrome |
| **Default stroke for new shapes** | `#ffffff` | `#000000` |

### What does NOT change with theme

- **Shape stroke/fill colors** — always rendered as stored
- **User-set slide backgrounds** — rendered as stored, no inversion
- **Text colors** — rendered as stored
- **Gradient colors** — rendered as stored

## How it works

### State

- `store.theme: 'light' | 'dark'` — persisted to `localStorage`
- `store.defaultElementStyles.strokeColor` — swapped on theme toggle

### Toggle (`toggleTheme()` in `app-store.ts`)

1. Flips `store.theme` and persists to `localStorage`
2. Sets `document.documentElement.setAttribute('data-theme', newTheme)` for CSS
3. Swaps `defaultElementStyles.strokeColor` (`#000000` ↔ `#ffffff`)
4. Updates all cached `toolStyles` entries that had the old default stroke color

### CSS

- `:root` defines light theme CSS variables
- `[data-theme="dark"]` overrides with dark theme variables
- Located in `src/index.css`

### Canvas rendering

- `RenderPipeline.adjustColor()` is a **no-op** — returns the color unchanged
- `renderWorkspaceBackground()` uses themed background
- `renderSlideBackground()` uses themed **fallback** only; user-set colors pass through
- `renderCanvasTexture()` and `renderGrid()` use themed overlay colors

### Element creation

- New elements spread `store.defaultElementStyles` which includes the theme-appropriate `strokeColor`
- Per-tool cached styles (`toolStyles`) also get their stroke colors swapped on theme change
- Exception: sticky notes always default to `#000000` stroke; ink annotations use `#ef4444`

## Design rationale

Previous approach inverted shape colors at render time (`adjustColor` swapped black↔white), which caused bugs where user-chosen white rendered as black in dark mode. The current approach matches Figma/Miro: theme affects the environment, not the content.
