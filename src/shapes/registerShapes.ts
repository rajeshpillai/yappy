import { ShapeRegistry } from "./ShapeRegistry";
import { PolygonRenderer } from "./renderers/PolygonRenderer";
import { RectangleRenderer } from "./renderers/RectangleRenderer";
import { CircleRenderer } from "./renderers/CircleRenderer";
import { DiamondRenderer } from "./renderers/DiamondRenderer";
import { TriangleRenderer } from "./renderers/TriangleRenderer";
import { SimplePolygonRenderer } from "./renderers/SimplePolygonRenderer";

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

    // TODO: Register other shape renderers as they are migrated
    // ShapeRegistry.register('star', new StarRenderer());
    // etc.
}
