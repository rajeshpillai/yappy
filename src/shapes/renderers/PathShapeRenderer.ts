import { ShapeRenderer } from "../base/ShapeRenderer";
import type { RenderContext, RenderOptions } from "../base/types";

/**
 * PathShapeRenderer - Handles shapes defined by complex SVG paths
 * 
 * Supports: cloud, heart, capsule, database, document, callout
 * These shapes use bezier curves and arcs for organic appearances
 */
export class PathShapeRenderer extends ShapeRenderer {
    private pathGenerator: (x: number, y: number, w: number, h: number) => string;

    constructor(pathGenerator: (x: number, y: number, w: number, h: number) => string) {
        super();
        this.pathGenerator = pathGenerator;
    }

    protected renderArchitectural(context: RenderContext, options: RenderOptions): void {
        const { ctx, element } = context;
        const path = this.pathGenerator(element.x, element.y, element.width, element.height);
        const path2D = new Path2D(path);

        // Fill
        if (options.fill && options.fill !== 'transparent' && options.fill !== 'none' && element.fillStyle !== 'dots') {
            ctx.fillStyle = options.fill;
            ctx.fill(path2D);
        }

        // Stroke
        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
        ctx.stroke(path2D);
    }

    protected renderSketch(context: RenderContext, options: RenderOptions): void {
        const { rc, element } = context;
        const path = this.pathGenerator(element.x, element.y, element.width, element.height);

        rc.path(path, {
            seed: options.seed,
            roughness: options.roughness,
            bowing: options.bowing,
            stroke: options.stroke,
            strokeWidth: options.strokeWidth,
            fill: options.fill,
            fillStyle: options.fillStyle,
            fillWeight: options.fillWeight,
            hachureGap: options.hachureGap,
            strokeLineDash: options.strokeLineDash,
            hachureAngle: -41 + (options.seed % 360),
        });
    }

    /**
     * Static factory methods for common path shapes
     */
    static cloud(): PathShapeRenderer {
        return new PathShapeRenderer((x, y, w, h) => {
            const cy = y + h / 2;
            const r1 = w * 0.2;  // Left circle
            const r2 = w * 0.25; // Top circle
            const r3 = w * 0.2;  // Right circle
            const r4 = w * 0.3;  // Bottom circle

            return `
        M ${x + r1} ${cy}
        A ${r1} ${r1} 0 0 1 ${x + w * 0.3} ${y + r2}
        A ${r2} ${r2} 0 0 1 ${x + w * 0.7} ${y + r2}
        A ${r3} ${r3} 0 0 1 ${x + w - r3} ${cy}
        A ${r4} ${r4} 0 0 1 ${x + w * 0.6} ${y + h - r4 * 0.5}
        A ${r4} ${r4} 0 0 1 ${x + w * 0.3} ${y + h - r4 * 0.5}
        A ${r4} ${r4} 0 0 1 ${x + r1} ${cy}
        Z
      `;
        });
    }

    static heart(): PathShapeRenderer {
        return new PathShapeRenderer((x, y, w, h) => {
            const cx = x + w / 2;

            return `
        M ${cx} ${y + h * 0.3}
        C ${cx} ${y + h * 0.15} ${x + w * 0.3} ${y} ${x + w * 0.5} ${y + h * 0.15}
        C ${x + w * 0.7} ${y} ${x + w} ${y + h * 0.15} ${x + w} ${y + h * 0.35}
        C ${x + w} ${y + h * 0.6} ${cx} ${y + h * 0.8} ${cx} ${y + h}
        C ${cx} ${y + h * 0.8} ${x} ${y + h * 0.6} ${x} ${y + h * 0.35}
        C ${x} ${y + h * 0.15} ${x + w * 0.3} ${y} ${x + w * 0.5} ${y + h * 0.15}
        Z
      `;
        });
    }

    // Flowchart shapes
    static capsule(): PathShapeRenderer {
        return new PathShapeRenderer((x, y, w, h) => {
            const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
            const rX = Math.min(Math.abs(w) / 2, radius);
            const rY = Math.min(Math.abs(h) / 2, radius);
            return `M ${x + rX} ${y} L ${x + w - rX} ${y} Q ${x + w} ${y} ${x + w} ${y + rY} L ${x + w} ${y + h - rY} Q ${x + w} ${y + h} ${x + w - rX} ${y + h} L ${x + rX} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rY} L ${x} ${y + rY} Q ${x} ${y} ${x + rX} ${y}`;
        });
    }

    static database(): PathShapeRenderer {
        return new PathShapeRenderer((x, y, w, h) => {
            const ellipseHeight = h * 0.2;
            return `
        M ${x} ${y + ellipseHeight / 2}
        L ${x} ${y + h - ellipseHeight / 2}
        A ${w / 2} ${ellipseHeight / 2} 0 0 0 ${x + w} ${y + h - ellipseHeight / 2}
        L ${x + w} ${y + ellipseHeight / 2}
        A ${w / 2} ${ellipseHeight / 2} 0 0 0 ${x} ${y + ellipseHeight / 2}
        A ${w / 2} ${ellipseHeight / 2} 0 0 0 ${x + w} ${y + ellipseHeight / 2}
      `;
        });
    }

    static document(): PathShapeRenderer {
        return new PathShapeRenderer((x, y, w, h) => {
            const waveHeight = h * 0.1;
            return `
        M ${x} ${y}
        L ${x + w} ${y}
        L ${x + w} ${y + h - waveHeight}
        Q ${x + w * 0.75} ${y + h - waveHeight * 2} ${x + w * 0.5} ${y + h - waveHeight}
        T ${x} ${y + h - waveHeight}
        Z
      `;
        });
    }

    static callout(): PathShapeRenderer {
        return new PathShapeRenderer((x, y, w, h) => {
            const tailHeight = h * 0.2;
            const rectHeight = h - tailHeight;
            return `
        M ${x} ${y} 
        L ${x + w} ${y} 
        L ${x + w} ${y + rectHeight} 
        L ${x + w * 0.7} ${y + rectHeight} 
        L ${x + w * 0.5} ${y + h} 
        L ${x + w * 0.3} ${y + rectHeight} 
        L ${x} ${y + rectHeight} 
        Z
      `;
        });
    }
}
