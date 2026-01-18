# Yappy Development Guidelines for AI Agents

This file contains guidelines for AI agents working on the Yappy infinite canvas drawing application.

## Development Environment

### Setup Commands
```bash
# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev

# Start backend only
npm run server

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

### Testing Commands
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/comprehensive_features.spec.ts

# Run tests with UI
npx playwright test --ui

# View test reports
npx playwright show-report
```

## Project Architecture

### Core Technologies
- **Frontend**: SolidJS (v1.9.10) with TypeScript
- **Rendering**: HTML5 Canvas with RoughJS for sketchy aesthetic
- **Backend**: Express.js (v5.2.1) for file operations
- **Testing**: Playwright for E2E testing
- **Build**: Vite with SolidJS plugin

### Key Directories
- `src/components/` - UI components (PascalCase.tsx)
- `src/store/` - Centralized state management
- `src/utils/` - Utility functions (camelCase.ts)
- `src/types.ts` - Global type definitions
- `tests/` - Playwright E2E tests
- `data/` - Sample drawings and JSON files

## Code Style Guidelines

### File Naming
- Components: `PascalCase.tsx` (e.g., `PropertyPanel.tsx`)
- Utilities: `camelCase.ts` (e.g., `renderElement.ts`)
- Types: `camelCase.ts` (e.g., `templateTypes.ts`)
- Tests: `kebab-case.spec.ts` (e.g., `comprehensive_features.spec.ts`)

### Naming Conventions
- Variables/Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS Classes: `kebab-case` with BEM patterns

### Component Structure
```typescript
// 1. Imports
import { createSignal } from "solid-js";

// 2. Type definitions
interface ComponentProps {
  // props
}

// 3. Component logic
export function ComponentName(props: ComponentProps) {
  const [state, setState] = createSignal();
  
  // 4. JSX return
  return (
    <div class="component-name">
      {/* content */}
    </div>
  );
}
```

### SolidJS Patterns
- Use `createSignal` for reactive state
- Use `createEffect` for side effects
- Use `<Show>` for conditional rendering
- Use `<For>` for list rendering
- Mutate state through action functions in store

## Development Guidelines

### Component Development
- Follow existing component patterns in `src/components/`
- Use TypeScript strict mode (already configured)
- Implement proper error boundaries
- Add keyboard shortcuts where appropriate
- Use RoughJS for sketchy rendering aesthetic

### State Management
- Use centralized store in `src/store/appStore.ts`
- Create action functions for state mutations
- Implement proper TypeScript types for all state
- Use signals for reactive state, derived values for computed state

### API Development
- Extend browser API in `src/api.ts`
- Add corresponding backend endpoints in `server.js`
- Update TypeScript types for new API methods
- Update `docs/api.md` when API changes
- Add E2E tests for new API functionality

### Testing Requirements
- All new features must have E2E tests
- Test using `window.Yappy` browser API
- Include visual assertions with screenshots
- Test keyboard shortcuts and accessibility
- Group tests logically by feature area

## Performance Guidelines

### Canvas Rendering
- Implement viewport culling for large drawings
- Use efficient rendering patterns
- Cache expensive calculations
- Optimize redraw cycles

### Memory Management
- Clean up event listeners in `onCleanup`
- Use proper disposal patterns
- Avoid memory leaks in long-running sessions

## Code Quality Standards

### TypeScript
- Use strict mode (already configured)
- Provide proper type annotations
- Avoid `any` types
- Use interfaces for object shapes

### Error Handling
- Implement proper error boundaries
- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors appropriately

### Documentation
- Update README.md for user-facing features
- Document new API methods
- Add inline comments for complex logic
- Update `history.md` for major changes

## Common Patterns

### Adding New Drawing Tools
1. Create tool component in `src/components/`
2. Add tool to toolbar configuration
3. Implement drawing logic in `src/utils/`
4. Add keyboard shortcut
5. Write E2E tests
6. Update documentation

### Templates
- Follow the template system described in `docs/templates.md`
- Define all required element properties explicitly (avoid relying on normalization)
- Add templates in `src/templates/data/`, export in index, and register in `src/templates/registry.ts`
- Ensure connected elements include `boundElements` on shapes and bindings on arrows
- Best practices: meaningful IDs, semantic colors, consistent spacing, and grid settings that match the diagram

### Adding New Shape Types
1. Update types in `src/types.ts`
2. Add rendering logic to `src/utils/renderElement.ts`
3. Update hit testing in `src/components/Canvas.tsx`
4. Update intersection logic in `src/utils/geometry.ts` for connector binding
5. Add property support in `src/config/properties.ts`
6. Add API helper in `src/api.ts`
7. Write comprehensive tests
8. Update `docs/shape.md` with attribute support details

### File Operations
- Use Express backend for file I/O
- Implement proper error handling
- Add file validation
- Test with various file sizes
- Consider security implications

## Deployment

### Build Process
- Run `npm run build` for production
- Test build locally with `npm run preview`
- Use `npm run deploy` for GitHub Pages
- Verify all functionality in production build

### Environment Variables
- No environment variables currently used
- Backend runs on port 3000
- Frontend dev server on port 5173

## Security Considerations

- Validate all user inputs
- Sanitize file operations
- Implement proper CORS
- Avoid eval() and similar dangerous patterns
- Test for XSS vulnerabilities

## Browser Compatibility

- Target modern browsers (ES2022)
- Test in Chrome, Firefox, Safari
- Consider mobile touch events
- Ensure responsive design

## Getting Help

- Check existing documentation in `docs/`
- Review similar components for patterns
- Consult `history.md` for architectural decisions
- Check `todo.md` for planned features