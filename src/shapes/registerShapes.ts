import { ShapeRegistry } from "./ShapeRegistry";
import { PolygonRenderer } from "./renderers/PolygonRenderer";

/**
 * Register all shape renderers
 * This is called once at application startup
 */
export function registerShapeRenderers(): void {
    // Polygon family
    ShapeRegistry.register('pentagon', new PolygonRenderer(5));
    ShapeRegistry.register('hexagon', new PolygonRenderer(6));
    ShapeRegistry.register('septagon', new PolygonRenderer(7));
    ShapeRegistry.register('octagon', new PolygonRenderer(8));

    // TODO: Register other shape renderers as they are migrated
    // ShapeRegistry.register('rectangle', new RectangleRenderer());
    // ShapeRegistry.register('circle', new CircleRenderer());
    // etc.
}
