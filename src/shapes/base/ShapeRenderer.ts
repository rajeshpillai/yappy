import type { DrawingElement } from "../../types";
import type { RenderContext, RenderOptions } from "./types";
import { RenderPipeline } from "./RenderPipeline";

/**
 * Abstract base class for all shape renderers
 * 
 * Each shape type should extend this class and implement the required methods.
 * This enforces a consistent API and allows sharing common rendering logic.
 */
export abstract class ShapeRenderer {
    /**
     * Main render method - orchestrates the rendering pipeline
     */
    render(context: RenderContext): void {
        const { ctx, element, isDarkMode, layerOpacity } = context;

        // Apply common transformations (opacity, rotation, shadows, blend modes)
        RenderPipeline.applyTransformations(ctx, element, layerOpacity);

        // Build rendering options
        const options = RenderPipeline.buildRenderOptions(element, isDarkMode);

        // Handle gradient fills if applicable
        const gradientInfo = RenderPipeline.applyGradient(ctx, element, options);

        // If gradient was applied, modify options to prevent double-fill
        if (gradientInfo.hasGradient) {
            options.fill = 'transparent';
            options.fillStyle = 'solid';
        }

        // Delegate to specific rendering method based on render style
        if (element.renderStyle === 'architectural') {
            this.renderArchitectural(context, options);
        } else {
            this.renderSketch(context, options);
        }


        // Render text (container text or line labels)
        RenderPipeline.renderText(ctx, element, isDarkMode);

        // Restore canvas state
        RenderPipeline.restore(ctx);
    }

    /**
     * Render the shape in architectural style (clean, precise lines)
     * Subclasses must implement this
     */
    protected abstract renderArchitectural(context: RenderContext, options: RenderOptions): void;

    /**
     * Render the shape in sketch style (hand-drawn, using RoughJS)
     * Subclasses must implement this
     */
    protected abstract renderSketch(context: RenderContext, options: RenderOptions): void;

    /**
     * Helper: Apply dots fill pattern with clipping
     * Subclasses can override to customize clipping path
     */
    protected applyDotsFillWithClip(
        ctx: CanvasRenderingContext2D,
        element: DrawingElement,
        options: RenderOptions,
        clipPathFn: () => void
    ): void {
        if (element.fillStyle !== 'dots') return;

        RenderPipeline.applyDotsFill(ctx, element, options, clipPathFn);
    }

    /**
     * Helper: Draw inner border if configured
     * Subclasses can call this to add inner border support
     */
    protected renderInnerBorder?(context: RenderContext, options: RenderOptions): void;
}
