Plan: Add 8 New UML Shapes
Shapes
High Priority
umlComponent — Rectangle with two small tab rectangles on left side
umlState — Rounded rectangle with horizontal divider (name/actions sections)
umlLifeline — Object box at top + dashed vertical line extending down
umlFragment — Rectangle with small operator label tab in top-left (alt/opt/loop)
Medium Priority
umlSignalSend — Pentagon pointing right (chevron)
umlSignalReceive — Concave pentagon (notched left)
umlProvidedInterface — Circle (lollipop)
umlRequiredInterface — Semicircle arc (socket)
Renderer Strategy
umlComponent, umlLifeline, umlFragment → add to existing UmlGeneralRenderer
umlState → new UmlStateRenderer (needs 2-section layout with rounded rect)
umlSignalSend, umlSignalReceive, umlProvidedInterface, umlRequiredInterface → SpecialtyShapeRenderer via geometry in shape-geometry.ts
File Changes (in order)
Step 1: Types — src/types.ts
Add 8 types to ElementType union.

Step 2: Store — src/store/app-store.ts
Expand selectedUmlType union to include all 8 new types.

Step 3: Geometry — src/utils/shape-geometry.ts
Add geometry cases for all 8 shapes:

umlComponent, umlFragment → rect
umlState → rounded rect
umlLifeline → rect (for hit testing/gradients)
umlSignalSend → pentagon points (5-point polygon)
umlSignalReceive → concave pentagon points
umlProvidedInterface → ellipse
umlRequiredInterface → arc path
Step 4: New Renderer — src/shapes/renderers/uml-state-renderer.ts (NEW FILE)
Rounded rectangle with 2-section layout (name + actions via attributesText). Both architectural and sketch modes. Pattern from UmlClassRenderer.

Step 5: Extend Renderer — src/shapes/renderers/uml-general-renderer.ts
Add umlComponent, umlLifeline, umlFragment to both renderArchitectural, renderSketch, and definePath:

Component: main rect + two small tabs on left edge
Lifeline: object box at top + dashed vertical line to bottom
Fragment: main rect + small label tab polygon in top-left
Step 6: Registration — src/shapes/register-shapes.ts
Import UmlStateRenderer, register umlState
Add umlComponent, umlLifeline, umlFragment to umlTypes array
Add umlSignalSend, umlSignalReceive, umlProvidedInterface, umlRequiredInterface to specialtyTypes array
Step 7: Toolbar — src/components/uml-tool-group.tsx
Add 8 entries to umlTools array with verified lucide-solid icons:

Shape	Icon
umlComponent	Component
umlState	RectangleHorizontal
umlLifeline	ArrowDown
umlFragment	Frame
umlSignalSend	ChevronRight
umlSignalReceive	ChevronLeft
umlProvidedInterface	CircleDot
umlRequiredInterface	CircleDashed
Step 8: Properties — src/config/properties.ts
Add all 8 new types to these applicableTo lists:

renderStyle, backgroundColor, fillStyle, fillDensity, strokeWidth, strokeStyle, roughness, fontSize, fontFamily, textAlign, containerText, autoResize
Additionally:

Add umlState to attributesText applicableTo (reuse for "actions")
Add umlFragment to attributesText applicableTo (reuse for guard condition)
Step 9: Canvas — src/components/canvas.tsx
Add 8 types to hit-test shape lists
Add 8 types to double-click text editing handler
Add section-based click detection for umlState (like umlClass)
Verification
npx tsc --noEmit — type check passes
Manually test each shape in both sketch and architectural render styles
Verify: draw shape, add text, toggle fill, enable flow animation
Verify umlState section editing (double-click top = name, bottom = actions)
Verify umlLifeline dashed line renders in both modes
Verify umlRequiredInterface arc renders correctly in sketch mode
User approved the plan
Update Todos

Step 1: Add 8 new UML types to ElementType union in types.ts

Step 2: Expand selectedUmlType in app-store.ts

Step 3: Add geometry cases in shape-geometry.ts

Step 4: Create UmlStateRenderer (new file)

Step 5: Add Component/Lifeline/Fragment to UmlGeneralRenderer

Step 6: Register all 8 shapes in register-shapes.ts

Step 7: Add 8 tools to uml-tool-group.tsx

Step 8: Update applicableTo lists in properties.ts

Step 9: Update canvas.tsx hit-test and text editing

Type-check and verify build
