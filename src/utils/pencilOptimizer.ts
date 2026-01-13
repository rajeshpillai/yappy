import type { Point } from "../types";

/**
 * Stabilizer for real-time pointer movement.
 * Uses a weighted moving average to reduce jitter.
 */
export class PointerStabilizer {
    private points: Point[] = [];
    private windowSize: number;

    constructor(windowSize: number = 3) {
        this.windowSize = windowSize;
    }

    setWindowSize(size: number) {
        this.windowSize = size;
    }

    add(point: Point): Point {
        this.points.push(point);
        if (this.points.length > this.windowSize) {
            this.points.shift();
        }

        const sum = this.points.reduce((acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y,
            p: (acc.p || 0) + (p.p || 0)
        }), { x: 0, y: 0, p: 0 });

        const count = this.points.length;
        return {
            x: sum.x / count,
            y: sum.y / count,
            p: sum.p !== undefined ? sum.p / count : undefined
        };
    }

    clear() {
        this.points = [];
    }
}

/**
 * Simplifies a polyline using the Ramer-Douglas-Peucker algorithm.
 */
export function simplifyPoints(points: Point[], tolerance: number = 1): Point[] {
    if (points.length <= 2) return points;

    const sqTolerance = tolerance * tolerance;


    function getSqSegDist(p: Point, p1: Point, p2: Point) {
        let x = p1.x,
            y = p1.y,
            dx = p2.x - x,
            dy = p2.y - y;

        if (dx !== 0 || dy !== 0) {
            let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = p.x - x;
        dy = p.y - y;

        return dx * dx + dy * dy;
    }

    function simplifyDPStep(points: Point[], first: number, last: number, sqTolerance: number, simplified: Point[]) {
        let maxSqDist = sqTolerance;
        let index = -1;

        for (let i = first + 1; i < last; i++) {
            const sqDist = getSqSegDist(points[i], points[first], points[last]);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (index !== -1) {
            if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
            simplified.push(points[index]);
            if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
        }
    }

    const last = points.length - 1;
    const simplified: Point[] = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
}

/**
 * Chaikin's algorithm to smooth a polyline.
 * Iteratively cuts corners.
 */
export function smoothPoints(points: Point[], iterations: number = 2): Point[] {
    if (points.length < 3) return points;
    let smoothed = [...points];

    for (let i = 0; i < iterations; i++) {
        const next: Point[] = [smoothed[0]];
        for (let j = 0; j < smoothed.length - 1; j++) {
            const p0 = smoothed[j];
            const p1 = smoothed[j + 1];

            // 1/4 and 3/4 points
            const q = {
                x: 0.75 * p0.x + 0.25 * p1.x,
                y: 0.75 * p0.y + 0.25 * p1.y,
                p: p0.p !== undefined && p1.p !== undefined ? 0.75 * p0.p + 0.25 * p1.p : p0.p
            };
            const r = {
                x: 0.25 * p0.x + 0.75 * p1.x,
                y: 0.25 * p0.y + 0.75 * p1.y,
                p: p0.p !== undefined && p1.p !== undefined ? 0.25 * p0.p + 0.75 * p1.p : p1.p
            };
            next.push(q, r);
        }
        next.push(smoothed[smoothed.length - 1]);
        smoothed = next;
    }
    return smoothed;
}

/**
 * Converts points to a smooth SVG path using Quadratic Bezier curves.
 */
export function pointsToSvgPath(points: Point[]): string {
    if (points.length < 2) return "";
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        path += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }

    // Connect to the last point
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;

    return path;
}
