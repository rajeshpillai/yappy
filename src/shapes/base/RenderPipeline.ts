import type { DrawingElement } from "../../types";
import type { RenderOptions, GradientInfo } from "./types";
import { getShapeGeometry } from "../../utils/shapeGeometry";

/**
 * RenderPipeline - Handles common rendering setup and transformations
 * Extracts the boilerplate from the monolithic renderElement function
 */
export class RenderPipeline {
    /**
     * Apply canvas transformations (opacity, rotation, shadows)
     */
    static applyTransformations(ctx: CanvasRenderingContext2D, el: DrawingElement, layerOpacity: number): void {
        ctx.save();
        ctx.globalAlpha = ((el.opacity ?? 100) / 100) * layerOpacity;

        // Apply Drop Shadow
        if (el.shadowEnabled) {
            ctx.shadowColor = el.shadowColor || 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = el.shadowBlur || 10;
            ctx.shadowOffsetX = el.shadowOffsetX || 5;
            ctx.shadowOffsetY = el.shadowOffsetY || 5;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Apply rotation (center based)
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;

        if (el.angle) {
            ctx.translate(cx, cy);
            ctx.rotate(el.angle);
            ctx.translate(-cx, -cy);
        }

        // Apply Blend Mode
        if (el.blendMode) {
            if (el.blendMode === 'normal') {
                ctx.globalCompositeOperation = 'source-over';
            } else {
                ctx.globalCompositeOperation = el.blendMode as GlobalCompositeOperation;
            }
        }
    }

    /**
     * Restore canvas state after rendering
     */
    static restore(ctx: CanvasRenderingContext2D): void {
        ctx.restore();
    }

    /**
     * Adjust colors for dark mode
     */
    static adjustColor(color: string, isDarkMode: boolean): string {
        if (!isDarkMode) return color;
        if (color === '#000000' || color === 'black') return '#ffffff';
        return color;
    }

    /**
     * Build RoughJS options from element properties
     */
    static buildRenderOptions(el: DrawingElement, isDarkMode: boolean): RenderOptions {
        const strokeColor = this.adjustColor(el.strokeColor, isDarkMode);
        const backgroundColor = el.backgroundColor === 'transparent'
            ? undefined
            : this.adjustColor(el.backgroundColor, isDarkMode);

        const density = el.fillDensity || 1;
        const baseGap = 5;
        const hachureGap = Math.max(0.5, baseGap / density);

        return {
            seed: el.seed || 1,
            roughness: el.renderStyle === 'architectural' ? 0 : (el.roughness ?? 1),
            bowing: el.renderStyle === 'architectural' ? 0 : 1,
            stroke: strokeColor,
            strokeColor,
            backgroundColor,
            strokeWidth: el.strokeWidth || 1,
            fill: backgroundColor,
            fillStyle: el.fillStyle || 'hachure',
            fillWeight: el.fillDensity ? el.fillDensity / 2 : undefined,
            hachureGap,
            strokeLineDash: el.strokeStyle === 'dashed' ? [10, 10] : (el.strokeStyle === 'dotted' ? [5, 10] : undefined),
            strokeLineJoin: (el.strokeLineJoin as CanvasLineJoin) || 'round',
            strokeLineCap: ((el.strokeLineJoin === 'miter' || el.strokeLineJoin === 'bevel') ? 'butt' : 'round') as CanvasLineCap,
        };
    }

    /**
     * Apply gradient fill to a shape using shapeGeometry
     * Returns GradientInfo with gradient object and success flag
     */
    static applyGradient(
        ctx: CanvasRenderingContext2D,
        el: DrawingElement,
        _options: RenderOptions
    ): GradientInfo {
        const useGradient = (
            el.fillStyle === 'linear' ||
            el.fillStyle === 'radial' ||
            el.fillStyle === 'conic' ||
            (el.gradientType && el.gradientType !== 'linear' && el.gradientType !== 'radial')
        );

        const hasStops = el.gradientStops && el.gradientStops.length > 0;
        const hasLegacyGradient = el.gradientStart && el.gradientEnd;

        if (!useGradient || (!hasStops && !hasLegacyGradient)) {
            return { gradient: null as any, hasGradient: false };
        }

        ctx.save();

        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;

        // Move to element center for local coordinates
        ctx.translate(cx, cy);

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

        // Add color stops
        if (hasStops && el.gradientStops) {
            [...el.gradientStops]
                .sort((a, b) => a.offset - b.offset)
                .forEach(stop => {
                    grad.addColorStop(stop.offset, stop.color);
                });
        } else if (hasLegacyGradient && el.gradientStart && el.gradientEnd) {
            grad.addColorStop(0, el.gradientStart);
            grad.addColorStop(1, el.gradientEnd);
        }

        ctx.fillStyle = grad;

        // Use shapeGeometry to apply gradient
        const geometry = getShapeGeometry(el);
        if (geometry) {
            this.drawGeometry(ctx, geometry);
        }

        ctx.restore();

        return { gradient: grad, hasGradient: true };
    }

    /**
     * Helper to draw geometry from shapeGeometry
     */
    private static drawGeometry(ctx: CanvasRenderingContext2D, geo: any): void {
        const drawGeo = (g: any) => {
            if (g.type === 'rect') {
                ctx.roundRect(g.x, g.y, g.w, g.h, g.r || 0);
            } else if (g.type === 'ellipse') {
                ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, Math.PI * 2);
            } else if (g.type === 'points') {
                if (g.points.length > 0) {
                    ctx.moveTo(g.points[0].x, g.points[0].y);
                    for (let i = 1; i < g.points.length; i++) {
                        ctx.lineTo(g.points[i].x, g.points[i].y);
                    }
                    ctx.closePath();
                }
            } else if (g.type === 'path') {
                ctx.fill(new Path2D(g.path));
            } else if (g.type === 'multi') {
                g.shapes.forEach((s: any) => drawGeo(s));
            }
        };

        ctx.beginPath();
        if (geo.type === 'multi') {
            drawGeo(geo);
            ctx.fill();
        } else if (geo.type === 'path') {
            drawGeo(geo);
        } else {
            drawGeo(geo);
            ctx.fill();
        }
    }

    /**
     * Apply deterministic dots fill pattern
     */
    static applyDotsFill(
        ctx: CanvasRenderingContext2D,
        el: DrawingElement,
        _options: RenderOptions,
        clipPath?: () => void
    ): void {
        const dotColor = _options.backgroundColor;
        if (!dotColor) return;

        // Simple LCG for deterministic seeding
        let currentSeed = (el.seed || 1) >>> 0;
        const nextRandom = () => {
            currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
            return currentSeed / 4294967296;
        };

        const density = el.fillDensity || 1;
        const baseDotGap = 4 * (el.strokeWidth || 1) + 6;
        const gap = Math.max(2, baseDotGap / density);
        const radius = el.strokeWidth || 1;

        ctx.save();

        // Apply clipping path if provided
        if (clipPath) {
            clipPath();
            ctx.clip();
        }

        ctx.fillStyle = dotColor;

        const cols = Math.ceil(el.width / gap);
        const rows = Math.ceil(el.height / gap);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const dx = (nextRandom() - 0.5) * gap;
                const dy = (nextRandom() - 0.5) * gap;

                if (nextRandom() > 0.8) continue;

                const x = el.x + i * gap + dx + gap / 2;
                const y = el.y + j * gap + dy + gap / 2;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
