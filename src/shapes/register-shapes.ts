import { shapeRegistry } from "./shape-registry";
import { RectangleRenderer } from "./renderers/rectangle-renderer";
import { CircleRenderer } from "./renderers/circle-renderer";
import { DiamondRenderer } from "./renderers/diamond-renderer";

export function registerShapes() {
    shapeRegistry.register('rectangle', new RectangleRenderer());
    shapeRegistry.register('circle', new CircleRenderer());
    shapeRegistry.register('diamond', new DiamondRenderer());
}
