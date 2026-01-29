import { ShapeRenderer } from "../base/shape-renderer";
import { RenderPipeline } from "../base/render-pipeline";
import type { RenderContext } from "../base/types";
import { normalizePoints } from "../../utils/render-element";

export class FreehandRenderer extends ShapeRenderer {
    /**
     * Override base render to bypass the custom points check for freehand elements.
     * Freehand elements use points for their base geometry, not as a morph target.
     */
    render(context: RenderContext) {
        const { ctx, element, layerOpacity } = context;

        // Apply universal transformations
        const { cx, cy } = RenderPipeline.applyTransformations(ctx, element, layerOpacity);

        // Standard freehand render path
        if (element.renderStyle === 'architectural') {
            this.renderArchitectural(context, cx, cy);
        } else {
            this.renderSketch(context, cx, cy);
        }

        // Restore transformations
        RenderPipeline.restoreTransformations(ctx);
    }

    protected renderArchitectural(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    protected renderSketch(context: RenderContext, _cx: number, _cy: number): void {
        this.renderCommon(context);
    }

    private renderCommon(context: RenderContext): void {
        const { ctx, element: el, isDarkMode, layerOpacity } = context;
        if (!el.points || el.points.length === 0) return;

        let absPoints = normalizePoints(el.points).map(p => ({ x: el.x + p.x, y: el.y + p.y }));

        // Apply smoothing if property exists
        if (el.smoothing && el.smoothing > 0) {
            absPoints = this.smoothPoints(absPoints, el.smoothing);
        }

        const strokeColor = RenderPipeline.adjustColor(el.strokeColor, isDarkMode);

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;

        if (el.type === 'fineliner') {
            this.renderFineliner(ctx, absPoints, el.strokeWidth);
        } else if (el.type === 'inkbrush') {
            this.renderInkbrush(ctx, absPoints, el.strokeWidth, el.taperAmount, el.velocitySensitivity);
        } else if (el.type === 'marker') {
            this.renderMarker(ctx, absPoints, el.strokeWidth, el.opacity, layerOpacity);
        } else if (el.type === 'ink') {
            this.renderFineliner(ctx, absPoints, el.strokeWidth);
        }

        ctx.restore();
    }

    private smoothPoints(pts: any[], intensity: number): any[] {
        if (pts.length < 3) return pts;
        const smoothed = [pts[0]];
        const windowSize = Math.floor(intensity / 2) || 1;

        for (let i = 1; i < pts.length - 1; i++) {
            let sumX = 0, sumY = 0, count = 0;
            for (let j = Math.max(0, i - windowSize); j <= Math.min(pts.length - 1, i + windowSize); j++) {
                sumX += pts[j].x;
                sumY += pts[j].y;
                count++;
            }
            smoothed.push({ x: sumX / count, y: sumY / count });
        }
        smoothed.push(pts[pts.length - 1]);
        return smoothed;
    }

    private renderFineliner(ctx: CanvasRenderingContext2D, pts: any[], width: number) {
        if (pts.length < 6) {
            ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2); ctx.fill();
            return;
        }
        ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 2; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2, midY = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts.length - 1;
        ctx.quadraticCurveTo(pts[last - 1].x, pts[last - 1].y, pts[last].x, pts[last].y);
        ctx.stroke();
    }

    private renderInkbrush(ctx: CanvasRenderingContext2D, pts: any[], baseWidth: number, taperAmount = 0.15, velocitySensitivity = 0.5) {
        if (pts.length < 2) {
            ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, baseWidth / 2, 0, Math.PI * 2); ctx.fill();
            return;
        }

        // Calculate velocities (distances) between consecutive points
        const velocities: number[] = [0];
        for (let i = 1; i < pts.length; i++) {
            const dx = pts[i].x - pts[i - 1].x;
            const dy = pts[i].y - pts[i - 1].y;
            velocities.push(Math.sqrt(dx * dx + dy * dy));
        }

        // Smooth velocities with a moving average
        const smoothedVelocities: number[] = [];
        const smoothWindow = 3;
        for (let i = 0; i < velocities.length; i++) {
            let sum = 0, count = 0;
            for (let j = Math.max(0, i - smoothWindow); j <= Math.min(velocities.length - 1, i + smoothWindow); j++) {
                sum += velocities[j];
                count++;
            }
            smoothedVelocities.push(sum / count);
        }

        // Find max velocity for normalization
        const maxVelocity = Math.max(...smoothedVelocities, 1);

        // Calculate widths: slower = thicker, faster = thinner
        // Also apply taper at start and end
        const minWidth = baseWidth * (1 - velocitySensitivity * 0.7);
        const maxWidth = baseWidth * (1 + velocitySensitivity * 0.5);
        const widths: number[] = [];

        for (let i = 0; i < pts.length; i++) {
            // Velocity factor: 0 (slow) to 1 (fast)
            const velocityFactor = smoothedVelocities[i] / maxVelocity;
            // Invert: slow = thick, fast = thin
            let width = maxWidth - (maxWidth - minWidth) * velocityFactor;

            // Apply taper at start and end
            const taperLength = Math.min(pts.length * taperAmount, 20); // Scale with taperAmount
            if (taperLength > 0) {
                if (i < taperLength) {
                    width *= (i / taperLength) * 0.9 + 0.1; // Start at 10%, grow to 100%
                }
                if (i > pts.length - taperLength - 1) {
                    const endPos = pts.length - 1 - i;
                    width *= (endPos / taperLength) * 0.9 + 0.1;
                }
            }

            widths.push(Math.max(width, 0.5));
        }

        // Render as filled polygon with variable width
        ctx.beginPath();

        // Build left and right edges of the stroke
        const leftEdge: { x: number; y: number }[] = [];
        const rightEdge: { x: number; y: number }[] = [];

        for (let i = 0; i < pts.length; i++) {
            // Calculate perpendicular direction
            let perpX: number, perpY: number;

            if (i === 0) {
                const dx = pts[1].x - pts[0].x;
                const dy = pts[1].y - pts[0].y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else if (i === pts.length - 1) {
                const dx = pts[i].x - pts[i - 1].x;
                const dy = pts[i].y - pts[i - 1].y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                perpX = -dy / len;
                perpY = dx / len;
            } else {
                // Average of before and after
                const dx1 = pts[i].x - pts[i - 1].x;
                const dy1 = pts[i].y - pts[i - 1].y;
                const dx2 = pts[i + 1].x - pts[i].x;
                const dy2 = pts[i + 1].y - pts[i].y;
                const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
                const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                perpX = -(dy1 / len1 + dy2 / len2) / 2;
                perpY = (dx1 / len1 + dx2 / len2) / 2;
                const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                perpX /= perpLen;
                perpY /= perpLen;
            }

            const halfWidth = widths[i] / 2;
            leftEdge.push({ x: pts[i].x + perpX * halfWidth, y: pts[i].y + perpY * halfWidth });
            rightEdge.push({ x: pts[i].x - perpX * halfWidth, y: pts[i].y - perpY * halfWidth });
        }

        // Draw the filled shape with smooth curves
        if (leftEdge.length >= 2) {
            // Start cap (rounded)
            ctx.moveTo(leftEdge[0].x, leftEdge[0].y);

            // Left edge (forward)
            for (let i = 1; i < leftEdge.length - 1; i++) {
                const midX = (leftEdge[i].x + leftEdge[i + 1].x) / 2;
                const midY = (leftEdge[i].y + leftEdge[i + 1].y) / 2;
                ctx.quadraticCurveTo(leftEdge[i].x, leftEdge[i].y, midX, midY);
            }
            ctx.lineTo(leftEdge[leftEdge.length - 1].x, leftEdge[leftEdge.length - 1].y);

            // End cap (rounded)
            const endIdx = pts.length - 1;
            ctx.arc(pts[endIdx].x, pts[endIdx].y, widths[endIdx] / 2,
                Math.atan2(leftEdge[endIdx].y - pts[endIdx].y, leftEdge[endIdx].x - pts[endIdx].x),
                Math.atan2(rightEdge[endIdx].y - pts[endIdx].y, rightEdge[endIdx].x - pts[endIdx].x),
                false);

            // Right edge (backward)
            for (let i = rightEdge.length - 2; i > 0; i--) {
                const midX = (rightEdge[i].x + rightEdge[i - 1].x) / 2;
                const midY = (rightEdge[i].y + rightEdge[i - 1].y) / 2;
                ctx.quadraticCurveTo(rightEdge[i].x, rightEdge[i].y, midX, midY);
            }
            ctx.lineTo(rightEdge[0].x, rightEdge[0].y);

            // Start cap (rounded)
            ctx.arc(pts[0].x, pts[0].y, widths[0] / 2,
                Math.atan2(rightEdge[0].y - pts[0].y, rightEdge[0].x - pts[0].x),
                Math.atan2(leftEdge[0].y - pts[0].y, leftEdge[0].x - pts[0].x),
                false);
        }

        ctx.closePath();
        ctx.fill();
    }

    private renderMarker(ctx: CanvasRenderingContext2D, pts: any[], width: number, opacity: number | undefined, layerOpacity: number) {
        ctx.globalAlpha = ((opacity ?? 100) / 100) * layerOpacity * 0.5;
        ctx.globalCompositeOperation = 'multiply';
        this.renderFineliner(ctx, pts, width * 4);
    }

    protected definePath(ctx: CanvasRenderingContext2D, el: any): void {
        const pts = normalizePoints(el.points).map(p => ({ x: el.x + p.x, y: el.y + p.y }));
        if (pts.length < 2) return;

        // Use similar logic to fineliner for smooth path
        if (pts.length < 6) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            return;
        }

        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 2; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2, midY = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts.length - 1;
        ctx.quadraticCurveTo(pts[last - 1].x, pts[last - 1].y, pts[last].x, pts[last].y);
    }

    estimatePathLength(element: any): number {
        const pts = normalizePoints(element.points);
        if (pts.length < 2) return 0;
        let total = 0;
        for (let i = 1; i < pts.length; i++) {
            const dx = pts[i].x - pts[i - 1].x;
            const dy = pts[i].y - pts[i - 1].y;
            total += Math.sqrt(dx * dx + dy * dy);
        }
        return total;
    }
}
