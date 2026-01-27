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

        // 2. Check for draw-in/draw-out animation
        const dp = element.drawProgress;
        if (dp !== undefined && dp >= 0 && dp < 100) {
            this.renderDrawProgress(context, cx, cy);
        } else {
            // Normal render path
            // 2b. Apply complex fills (gradients, dots) using ShapeGeometry
            RenderPipeline.applyComplexFills(context, cx, cy);

            // 3. Delegate to specialized rendering methods based on style
            if (element.renderStyle === 'architectural') {
                this.renderArchitectural(context, cx, cy);
            } else {
                this.renderSketch(context, cx, cy);
            }
        }

        // 4. Flow Animation (Marching Ants) for all shapes
        if (element.flowAnimation) {
            this.renderFlowAnimation(context);
        }

        // 5. Restore transformations
        RenderPipeline.restoreTransformations(ctx);
    }

    /**
     * Renders the element with draw-in progress animation.
     *
     * Phases (with slight overlap for organic feel):
     *   0-70%   progress: Stroke traces progressively
     *   65-90%  progress: Fill fades in
     *   85-100% progress: Text fades in
     */
    protected renderDrawProgress(context: RenderContext, cx: number, cy: number) {
        const { ctx, element: el, isDarkMode, layerOpacity } = context;
        const progress = (el.drawProgress ?? 0) / 100;

        // Override globalAlpha: during drawIn the element's opacity is set to 0
        // to hide the normal render. We control visibility via phased rendering instead.
        ctx.globalAlpha = layerOpacity;

        // Phase calculations with overlapping ranges
        const strokeProgress = Math.min(1, progress / 0.70);
        const fillProgress = Math.max(0, Math.min(1, (progress - 0.65) / 0.25));
        const textProgress = Math.max(0, Math.min(1, (progress - 0.85) / 0.15));

        const pathLength = this.estimatePathLength(el);
        const strokeColor = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);

        // --- Phase 1: Progressive stroke ---
        if (strokeProgress > 0) {
            ctx.save();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Set lineDash to [drawLen, pathLength] to reveal stroke progressively
            const drawLen = pathLength * strokeProgress;
            ctx.setLineDash([drawLen, pathLength]);
            ctx.lineDashOffset = 0;

            ctx.beginPath();
            this.definePath(ctx, el);
            ctx.stroke();
            ctx.restore();
        }

        // --- Phase 2: Fill fade-in ---
        if (fillProgress > 0) {
            const fill = el.backgroundColor;
            if (fill && fill !== 'transparent' && fill !== 'none') {
                ctx.save();
                ctx.globalAlpha *= fillProgress;

                const fillStyle = el.fillStyle;
                const useComplexFill = ['linear', 'radial', 'conic', 'dots'].includes(fillStyle as string);

                if (useComplexFill) {
                    RenderPipeline.applyComplexFills(context, cx, cy);
                } else {
                    ctx.fillStyle = RenderPipeline.adjustColor(fill, isDarkMode);
                    ctx.beginPath();
                    this.definePath(ctx, el);
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        // --- Phase 3: Text fade-in ---
        if (textProgress > 0) {
            ctx.save();
            ctx.globalAlpha *= textProgress;
            RenderPipeline.renderText(context, cx, cy);
            ctx.restore();
        }
    }

    /**
     * Estimates the total path length for the shape's outline.
     * Used by drawIn animation to calculate lineDash parameters.
     *
     * Default: bounding box perimeter. Subclasses override for accuracy.
     */
    estimatePathLength(element: any): number {
        return 2 * (Math.abs(element.width) + Math.abs(element.height));
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
