import { ShapeRegistry } from "./ShapeRegistry";
import { PolygonRenderer } from "./renderers/PolygonRenderer";
import { RectangleRenderer } from "./renderers/RectangleRenderer";

/**
 * Register all shape renderers
 * This is called once at application startup
 */
export function registerShapeRenderers(): void {
    // Core shapes
    ShapeRegistry.register('rectangle', new RectangleRenderer());

    // Polygon family
    ShapeRegistry.register('pentagon', new PolygonRenderer(5));
    ShapeRegistry.register('hexagon', new PolygonRenderer(6));
    ShapeRegistry.register('septagon', new PolygonRenderer(7));
    ShapeRegistry.register('octagon', new PolygonRenderer(8));

    // TODO: Register other shape renderers as they are migrated
    // ShapeRegistry.register('circle', new CircleRenderer());
    // etc.
}

