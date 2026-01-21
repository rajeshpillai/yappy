import type { RenderContext } from "./types";
import { RenderPipeline } from "./render-pipeline";

export abstract class ShapeRenderer {
    /**
     * Main entry point for rendering an element.
     * Handles universal transformations and delegates to specialized methods.
     */
    render(context: RenderContext) {
        const { ctx, element, layerOpacity } = context;

        // 1. Apply universal transformations (rotation, opacity, shadow)
        const { cx, cy } = RenderPipeline.applyTransformations(ctx, element, layerOpacity);

        // 2. Apply complex fills (gradients, dots) using ShapeGeometry
        RenderPipeline.applyComplexFills(context, cx, cy);

        // 3. Delegate to specialized rendering methods based on style
        if (element.renderStyle === 'architectural') {
            this.renderArchitectural(context, cx, cy);
        } else {
            this.renderSketch(context, cx, cy);
        }

        // 4. Restore transformations
        RenderPipeline.restoreTransformations(ctx);
    }

    /**
     * Renders the shape with clean, precise lines and solid/gradient fills.
     */
    protected abstract renderArchitectural(context: RenderContext, cx: number, cy: number): void;

    /**
     * Renders the shape with a hand-drawn look using RoughJS.
     */
    protected abstract renderSketch(context: RenderContext, cx: number, cy: number): void;
}
