
/**
 * Path Utilities
 * Helper functions for SVG path parsing and interpolation
 */

export interface PathPoint {
    x: number;
    y: number;
    angle: number; // radians
}

interface PathCommand {
    type: 'M' | 'L' | 'Q' | 'C' | 'Z';
    points: { x: number; y: number }[]; // Control points and end point
    start: { x: number; y: number }; // Start point of this segment
    length: number; // Approximate length for normalization
}

export class PathUtils {
    /**
     * Parse an SVG path string into computable segments
     * Supports: M, L, Q, C (Absolute coordinates only for simplicity)
     */
    static parsePath(d: string): PathCommand[] {
        const commands: PathCommand[] = [];
        const tokens = d.match(/[a-zA-Z]|[-+]?[0-9]*\.?[0-9]+/g);
        if (!tokens) return [];

        let currentX = 0;
        let currentY = 0;
        let startX = 0; // For Z command
        let startY = 0;

        let i = 0;
        while (i < tokens.length) {
            const type = tokens[i];
            i++;

            switch (type) {
                case 'M': {
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    currentX = x;
                    currentY = y;
                    startX = x;
                    startY = y;
                    // Move doesn't create a segment unless needed for multi-part paths, 
                    // but for animation we usually start at 0 progress.
                    break;
                }
                case 'L': {
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    const length = Math.hypot(x - currentX, y - currentY);
                    commands.push({
                        type: 'L',
                        start: { x: currentX, y: currentY },
                        points: [{ x, y }],
                        length
                    });
                    currentX = x;
                    currentY = y;
                    break;
                }
                case 'Q': {
                    const cx = parseFloat(tokens[i++]);
                    const cy = parseFloat(tokens[i++]);
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    const length = this.estimateBezierLength(currentX, currentY, cx, cy, x, y);
                    commands.push({
                        type: 'Q',
                        start: { x: currentX, y: currentY },
                        points: [{ x: cx, y: cy }, { x, y }],
                        length
                    });
                    currentX = x;
                    currentY = y;
                    break;
                }
                case 'C': {
                    const c1x = parseFloat(tokens[i++]);
                    const c1y = parseFloat(tokens[i++]);
                    const c2x = parseFloat(tokens[i++]);
                    const c2y = parseFloat(tokens[i++]);
                    const x = parseFloat(tokens[i++]);
                    const y = parseFloat(tokens[i++]);
                    const length = this.estimateCubicBezierLength(currentX, currentY, c1x, c1y, c2x, c2y, x, y);
                    commands.push({
                        type: 'C',
                        start: { x: currentX, y: currentY },
                        points: [{ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x, y }],
                        length
                    });
                    currentX = x;
                    currentY = y;
                    break;
                }
                case 'Z': {
                    const length = Math.hypot(startX - currentX, startY - currentY);
                    if (length > 0) {
                        commands.push({
                            type: 'L',
                            start: { x: currentX, y: currentY },
                            points: [{ x: startX, y: startY }],
                            length
                        });
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
                }
            }
        }

        return commands;
    }

    /**
     * Get exact point and angle at progress t (0-1) along the path
     */
    static getPointOnPath(commands: PathCommand[], t: number): PathPoint {
        if (commands.length === 0) return { x: 0, y: 0, angle: 0 };

        const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0);
        const targetLength = t * totalLength;

        let accumulatedLength = 0;

        for (const cmd of commands) {
            if (accumulatedLength + cmd.length >= targetLength || cmd === commands[commands.length - 1]) {
                const segmentT = Math.max(0, Math.min(1, (targetLength - accumulatedLength) / cmd.length));
                return this.interpolateSegment(cmd, segmentT);
            }
            accumulatedLength += cmd.length;
        }

        return this.interpolateSegment(commands[commands.length - 1], 1);
    }

    private static interpolateSegment(cmd: PathCommand, t: number): PathPoint {
        const { start } = cmd;
        let x = 0, y = 0, angle = 0;

        if (cmd.type === 'L') {
            const end = cmd.points[0];
            x = start.x + (end.x - start.x) * t;
            y = start.y + (end.y - start.y) * t;
            angle = Math.atan2(end.y - start.y, end.x - start.x);
        } else if (cmd.type === 'Q') {
            const c = cmd.points[0];
            const end = cmd.points[1];
            // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const mt = 1 - t;
            x = mt * mt * start.x + 2 * mt * t * c.x + t * t * end.x;
            y = mt * mt * start.y + 2 * mt * t * c.y + t * t * end.y;

            // Derivative for tangent
            // x' = 2(1-t)(P1x - P0x) + 2t(P2x - P1x)
            const dx = 2 * mt * (c.x - start.x) + 2 * t * (end.x - c.x);
            const dy = 2 * mt * (c.y - start.y) + 2 * t * (end.y - c.y);
            angle = Math.atan2(dy, dx);
        } else if (cmd.type === 'C') {
            const c1 = cmd.points[0];
            const c2 = cmd.points[1];
            const end = cmd.points[2];
            // Cubic Bezier
            const mt = 1 - t;
            const mt2 = mt * mt;
            const t2 = t * t;

            x = mt2 * mt * start.x + 3 * mt2 * t * c1.x + 3 * mt * t2 * c2.x + t2 * t * end.x;
            y = mt2 * mt * start.y + 3 * mt2 * t * c1.y + 3 * mt * t2 * c2.y + t2 * t * end.y;

            // Derivative
            const dx = 3 * mt2 * (c1.x - start.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t2 * (end.x - c2.x);
            const dy = 3 * mt2 * (c1.y - start.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t2 * (end.y - c2.y);
            angle = Math.atan2(dy, dx);
        }

        return { x, y, angle };
    }

    private static estimateBezierLength(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number {
        // Simple chord estimation (good enough for animation pacing usually)
        // Or subdivide
        const chord = Math.hypot(x2 - x0, y2 - y0);
        const cont_net = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1);
        return (cont_net + chord) / 2;
    }

    private static estimateCubicBezierLength(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
        const chord = Math.hypot(x3 - x0, y3 - y0);
        const cont_net = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
        return (cont_net + chord) / 2;
    }
}
