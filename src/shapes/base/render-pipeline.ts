import type { Options } from "roughjs/bin/core";
import type { DrawingElement } from "../../types";
import { getShapeGeometry } from "../../utils/shape-geometry";
import { getFontString, measureContainerText } from "../../utils/text-utils";
import type { RenderContext } from "./types";

export class RenderPipeline {
    static adjustColor(color: string, isDarkMode: boolean) {
        if (!isDarkMode) return color;
        if (color === '#000000' || color === 'black' || color === '#000') return '#ffffff';
        return color;
    }

    /**
     * Applies standard transformations (opacity, blend mode, rotation) to the context.
     * Returns the center coordinates (cx, cy) for further use.
     */
    static applyTransformations(ctx: CanvasRenderingContext2D, el: DrawingElement, layerOpacity: number): { cx: number; cy: number } {
        ctx.save();
        ctx.globalAlpha = ((el.opacity ?? 100) / 100) * layerOpacity;

        // Apply Blend Mode
        if (el.blendMode) {
            ctx.globalCompositeOperation = el.blendMode === 'normal'
                ? 'source-over'
                : el.blendMode as GlobalCompositeOperation;
        }

        // Apply Drop Shadow
        if (el.shadowEnabled) {
            ctx.shadowColor = el.shadowColor || 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = el.shadowBlur || 10;
            ctx.shadowOffsetX = el.shadowOffsetX || 5;
            ctx.shadowOffsetY = el.shadowOffsetY || 5;
        } else {
            ctx.shadowColor = 'transparent';
        }

        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;

        if (el.angle) {
            ctx.translate(cx, cy);
            ctx.rotate(el.angle);
            ctx.translate(-cx, -cy);
        }

        return { cx, cy };
    }

    static restoreTransformations(ctx: CanvasRenderingContext2D) {
        ctx.restore();
    }

    /**
     * Builds RoughJS options based on element properties.
     */
    static buildRenderOptions(el: DrawingElement, isDarkMode: boolean): Options {
        const stroke = this.adjustColor(el.strokeColor, isDarkMode);
        let fill = el.backgroundColor === 'transparent' ? undefined : this.adjustColor(el.backgroundColor, isDarkMode);

        // Suppress RoughJS fill if complex fill (gradient/dots) is active
        if (['linear', 'radial', 'conic', 'dots'].includes(el.fillStyle as string)) {
            fill = undefined;
        }

        const density = el.fillDensity || 1;
        const baseGap = 5;
        const hachureGap = Math.max(0.5, baseGap / density);

        return {
            stroke,
            fill,
            fillStyle: el.fillStyle as any,
            strokeWidth: el.strokeWidth,
            hachureAngle: 60,
            hachureGap: hachureGap,
            roughness: el.roughness ?? 1,
            seed: el.seed || 1,
            disableMultiStroke: el.roughness === 0,
            strokeLineDash: el.strokeStyle === 'dashed' ? [8, 8] : el.strokeStyle === 'dotted' ? [2, 4] : undefined,
        };
    }

    /**
     * Applies gradient or complex fills using ShapeGeometry.
     */
    static applyComplexFills(context: RenderContext, cx: number, cy: number) {
        const { ctx, element: el } = context;
        const fillStyle = el.fillStyle;

        const useGradient = (['linear', 'radial', 'conic'].includes(fillStyle as string)) ||
            ((el.gradientType as any) !== 'none' && el.gradientType !== undefined);
        const useDots = fillStyle === 'dots';

        if (!useGradient && !useDots) return;

        ctx.save();
        ctx.translate(cx, cy);

        if (useGradient) {
            ctx.beginPath();
            this.applyGradient(ctx, el);
        } else if (useDots) {
            ctx.beginPath();
            this.applyDotsFill(ctx, el, context.isDarkMode);
        }

        const geometry = getShapeGeometry(el);
        if (geometry) {
            this.renderGeometry(ctx, geometry);
            ctx.fill();
        }

        ctx.restore();
    }

    private static applyGradient(ctx: CanvasRenderingContext2D, el: DrawingElement) {
        const w = el.width;
        const h = el.height;
        const mw = w / 2;
        const mh = h / 2;
        const gType = el.gradientType || el.fillStyle || 'linear';

        let grad: CanvasGradient;

        if (gType === 'linear') {
            const angleRad = (el.gradientDirection || 45) * (Math.PI / 180);
            const r = Math.sqrt(mw ** 2 + mh ** 2);
            const x1 = -Math.cos(angleRad) * r;
            const y1 = -Math.sin(angleRad) * r;
            const x2 = Math.cos(angleRad) * r;
            const y2 = Math.sin(angleRad) * r;
            grad = ctx.createLinearGradient(x1, y1, x2, y2);
        } else if (gType === 'radial') {
            grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) / 2);
        } else if (gType === 'conic') {
            const angleRad = (el.gradientDirection || 0) * (Math.PI / 180);
            grad = (ctx as any).createConicGradient(angleRad, 0, 0);
        } else {
            grad = ctx.createLinearGradient(-mw, -mh, mw, mh);
        }

        if (el.gradientStops && el.gradientStops.length > 0) {
            [...el.gradientStops]
                .sort((a, b) => a.offset - b.offset)
                .forEach(stop => grad.addColorStop(stop.offset, stop.color));
        } else if (el.gradientStart && el.gradientEnd) {
            grad.addColorStop(0, el.gradientStart);
            grad.addColorStop(1, el.gradientEnd);
        }

        ctx.fillStyle = grad;
    }

    private static applyDotsFill(ctx: CanvasRenderingContext2D, el: DrawingElement, isDarkMode: boolean) {
        const density = el.fillDensity || 1;
        const color = isDarkMode ? '#ffffff' : '#000000';

        // Simple deterministic pattern
        const dotCanvas = document.createElement('canvas');
        const gap = Math.max(5, 20 / density);
        dotCanvas.width = gap;
        dotCanvas.height = gap;
        const dotCtx = dotCanvas.getContext('2d');
        if (dotCtx) {
            dotCtx.fillStyle = color;
            dotCtx.beginPath();
            dotCtx.arc(gap / 2, gap / 2, el.strokeWidth / 2 || 1, 0, Math.PI * 2);
            dotCtx.fill();
            const pattern = ctx.createPattern(dotCanvas, 'repeat');
            if (pattern) ctx.fillStyle = pattern;
        }
    }

    static renderGeometry(ctx: CanvasRenderingContext2D, geo: any) {
        if (geo.type === 'rect') {
            ctx.roundRect(geo.x, geo.y, geo.w, geo.h, geo.r || 0);
        } else if (geo.type === 'ellipse') {
            ctx.ellipse(geo.cx, geo.cy, geo.rx, geo.ry, 0, 0, Math.PI * 2);
        } else if (geo.type === 'points') {
            if (geo.points.length > 0) {
                ctx.moveTo(geo.points[0].x, geo.points[0].y);
                for (let i = 1; i < geo.points.length; i++) ctx.lineTo(geo.points[i].x, geo.points[i].y);
                ctx.closePath();
            }
        } else if (geo.type === 'path') {
            ctx.fill(new Path2D(geo.path));
        } else if (geo.type === 'multi') {
            geo.shapes.forEach((s: any) => this.renderGeometry(ctx, s));
        }
    }

    static renderText(context: RenderContext, cx: number, cy: number) {
        const { ctx, element: el, isDarkMode } = context;
        if (el.isEditing) return; // Don't render text if we're currently editing it

        const textStr = el.containerText || el.text;
        if (!textStr) return;

        ctx.save();

        let maxWidth = el.width - 20;
        let startYOffset = 0;

        // Specialized offsets for different shapes
        if (el.type === 'doubleBanner') {
            maxWidth = el.width * 0.65;
            startYOffset = - (el.height * 0.1);
        } else if (el.type === 'starPerson') {
            startYOffset = el.height * 0.15;
        } else if (el.type === 'lightbulb') {
            maxWidth = el.width * 0.7;
            startYOffset = - (el.height * 0.1);
        } else if (el.type === 'signpost') {
            maxWidth = el.width * 0.8;
            startYOffset = - (el.height * 0.15);
        } else if (el.type === 'browserWindow') {
            const headerH = Math.min(el.height * 0.15, 30);
            startYOffset = headerH / 2;
        } else if (el.type === 'mobilePhone') {
            startYOffset = - (el.height * 0.05);
        }

        const metrics = measureContainerText(ctx, el, textStr, maxWidth);

        ctx.font = getFontString(el);

        // Resolve Text Color
        const textColorRaw = el.textColor || el.strokeColor;
        const textColor = this.adjustColor(textColorRaw, isDarkMode);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const startY = cy - metrics.textHeight / 2 + metrics.lineHeight / 2 + startYOffset;

        // Render Highlight
        if (el.textHighlightEnabled) {
            const highlightColor = el.textHighlightColor || 'rgba(255, 255, 0, 0.4)';
            ctx.fillStyle = this.adjustColor(highlightColor, isDarkMode);

            metrics.lines.forEach((line, index) => {
                const y = startY + index * metrics.lineHeight;
                const lineWidth = ctx.measureText(line).width;
                const hPadding = 4;
                const vPadding = 2;

                ctx.fillRect(
                    cx - lineWidth / 2 - hPadding,
                    y - metrics.lineHeight / 2 + vPadding,
                    lineWidth + hPadding * 2,
                    metrics.lineHeight - vPadding * 2
                );
            });
        }

        // Render Lines
        ctx.fillStyle = textColor;
        metrics.lines.forEach((line, index) => {
            const y = startY + index * metrics.lineHeight;
            ctx.fillText(line, cx, y, el.width - 10);
        });

        ctx.restore();
    }
}
