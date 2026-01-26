import type { RenderContext } from "./types";
import { RenderPipeline } from "./render-pipeline";
import { globalTime } from "../../utils/animation/animation-engine";

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

        // 4. Flow Animation (Marching Ants) for all shapes
        if (element.flowAnimation) {
            this.renderFlowAnimation(context);
        }

        // 5. Restore transformations
        RenderPipeline.restoreTransformations(ctx);
    }

    /**
     * Renders an animated dashed border for any shape.
     */
    protected renderFlowAnimation(context: RenderContext) {
        const { ctx, element: el, isDarkMode } = context;
        const speed = el.flowSpeed !== undefined ? el.flowSpeed : 1;
        const time = globalTime();
        const offset = (time / 20) * speed;

        ctx.save();
        ctx.strokeStyle = RenderPipeline.adjustColor(el.flowColor || el.strokeColor, isDarkMode);
        ctx.lineWidth = Math.max(1, el.strokeWidth * 0.8);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const style = el.flowStyle || 'dashes';
        if (style === 'dots') {
            ctx.setLineDash([2, 8]);
        } else if (style === 'pulse') {
            const pulse = Math.sin(time / 200) * 0.5 + 0.5;
            ctx.globalAlpha *= pulse;
            ctx.setLineDash([]);
        } else {
            ctx.setLineDash([8, 8]);
        }

        ctx.lineDashOffset = -offset;

        ctx.beginPath();
        this.definePath(ctx, el);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Define the geometry path of the shape for the flow animation.
     * This should calls ctx.moveTo, ctx.lineTo, etc. but NOT ctx.beginPath or ctx.stroke/fill.
     */
    protected abstract definePath(ctx: CanvasRenderingContext2D, element: any): void;

    /**
     * Renders the shape with clean, precise lines and solid/gradient fills.
     */
    protected abstract renderArchitectural(context: RenderContext, cx: number, cy: number): void;

    /**
     * Renders the shape with a hand-drawn look using RoughJS.
     */
    protected abstract renderSketch(context: RenderContext, cx: number, cy: number): void;
}
