import { ShapeRegistry } from "./ShapeRegistry";
import { PolygonRenderer } from "./renderers/PolygonRenderer";
import { RectangleRenderer } from "./renderers/RectangleRenderer";
import { CircleRenderer } from "./renderers/CircleRenderer";
import { DiamondRenderer } from "./renderers/DiamondRenderer";
import { TriangleRenderer } from "./renderers/TriangleRenderer";
import { SimplePolygonRenderer } from "./renderers/SimplePolygonRenderer";
import { StarRenderer } from "./renderers/StarRenderer";
import { PathShapeRenderer } from "./renderers/PathShapeRenderer";
import { LineShapeRenderer } from "./renderers/LineShapeRenderer";
import { DirectionalArrowRenderer } from "./renderers/DirectionalArrowRenderer";
import { BoxWithLinesRenderer } from "./renderers/BoxWithLinesRenderer";
import { StickyNoteRenderer } from "./renderers/StickyNoteRenderer";

/**
 * Register all shape renderers
 * This is called once at application startup
 */
export function registerShapeRenderers(): void {
    // Core shapes
    ShapeRegistry.register('rectangle', new RectangleRenderer());
    ShapeRegistry.register('circle', new CircleRenderer());
    ShapeRegistry.register('diamond', new DiamondRenderer());
    ShapeRegistry.register('triangle', new TriangleRenderer());

    // Simple polygons (fixed point patterns)
    ShapeRegistry.register('parallelogram', SimplePolygonRenderer.parallelogram());
    ShapeRegistry.register('trapezoid', SimplePolygonRenderer.trapezoid());
    ShapeRegistry.register('rightTriangle', SimplePolygonRenderer.rightTriangle());

    // Regular polygons (parametric)
    ShapeRegistry.register('pentagon', new PolygonRenderer(5));
    ShapeRegistry.register('hexagon', new PolygonRenderer(6));
    ShapeRegistry.register('septagon', new PolygonRenderer(7));
    ShapeRegistry.register('octagon', new PolygonRenderer(8));

    // Decorative shapes
    ShapeRegistry.register('star', new StarRenderer());
    ShapeRegistry.register('cloud', PathShapeRenderer.cloud());
    ShapeRegistry.register('heart', PathShapeRenderer.heart());
    ShapeRegistry.register('cross', LineShapeRenderer.cross());
    ShapeRegistry.register('checkmark', LineShapeRenderer.checkmark());

    // Directional arrows
    ShapeRegistry.register('arrowRight', DirectionalArrowRenderer.arrowRight());
    ShapeRegistry.register('arrowLeft', DirectionalArrowRenderer.arrowLeft());
    ShapeRegistry.register('arrowUp', DirectionalArrowRenderer.arrowUp());
    ShapeRegistry.register('arrowDown', DirectionalArrowRenderer.arrowDown());

    // Flowchart shapes
    ShapeRegistry.register('capsule', PathShapeRenderer.capsule());
    ShapeRegistry.register('database', PathShapeRenderer.database());
    ShapeRegistry.register('document', PathShapeRenderer.document());
    ShapeRegistry.register('predefinedProcess', BoxWithLinesRenderer.predefinedProcess());
    ShapeRegistry.register('internalStorage', BoxWithLinesRenderer.internalStorage());

    // UI shapes
    ShapeRegistry.register('stickyNote', new StickyNoteRenderer());
    ShapeRegistry.register('callout', PathShapeRenderer.callout());
    ShapeRegistry.register('speechBubble', PathShapeRenderer.speechBubble());

    // TODO: Infrastructure shapes (composite renderers needed)
    // ShapeRegistry.register('server', ...);
    // ShapeRegistry.register('loadBalancer', ...);
    // etc.
}
