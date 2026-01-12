import type { DrawingElement, Point } from "../types";

/**
 * Calculates a simple orthogonal path (elbow) between two points.
 * For now, it returns a 3-segment (4-point) path.
 */
export const calculateElbowRoute = (start: Point, end: Point): Point[] => {
    const midX = (start.x + end.x) / 2;

    return [
        { x: start.x, y: start.y },
        { x: midX, y: start.y },
        { x: midX, y: end.y },
        { x: end.x, y: end.y }
    ];
};

/**
 * A "Smart" router that avoids obstacles using a coarse grid.
 */
export const calculateSmartElbowRoute = (
    start: Point,
    end: Point,
    allElements: DrawingElement[],
    startElement?: DrawingElement,
    endElement?: DrawingElement
): Point[] => {
    // Margin for avoiding shapes
    const MARGIN = 10;

    const obstacles = allElements.filter(el => {
        if (el.type === 'line' || el.type === 'arrow') return false;
        if (el.id === startElement?.id || el.id === endElement?.id) return false;
        // Only avoid visible shapes
        return true;
    });

    // If no obstacles or bound to nothing, simple elbow is often fine
    if (obstacles.length === 0) {
        return calculateElbowRoute(start, end);
    }

    // 1. Build a sparse grid from coordinates
    const xCoords = new Set<number>([start.x, end.x]);
    const yCoords = new Set<number>([start.y, end.y]);

    obstacles.forEach(el => {
        // We add points around the obstacles
        const minX = Math.min(el.x, el.x + el.width);
        const maxX = Math.max(el.x, el.x + el.width);
        const minY = Math.min(el.y, el.y + el.height);
        const maxY = Math.max(el.y, el.y + el.height);

        xCoords.add(minX - MARGIN);
        xCoords.add(maxX + MARGIN);
        yCoords.add(minY - MARGIN);
        yCoords.add(maxY + MARGIN);
    });

    const sortedX = Array.from(xCoords).sort((a, b) => a - b);
    const sortedY = Array.from(yCoords).sort((a, b) => a - b);

    const startIdxX = sortedX.findIndex(x => Math.abs(x - start.x) < 0.1);
    const startIdxY = sortedY.findIndex(y => Math.abs(y - start.y) < 0.1);
    const endIdxX = sortedX.findIndex(x => Math.abs(x - end.x) < 0.1);
    const endIdxY = sortedY.findIndex(y => Math.abs(y - end.y) < 0.1);

    if (startIdxX === -1 || startIdxY === -1 || endIdxX === -1 || endIdxY === -1) {
        return calculateElbowRoute(start, end);
    }

    // A* implementation
    interface Node {
        gx: number;
        gy: number;
        g: number;
        h: number;
        parent: Node | null;
        dir: 'h' | 'v' | null;
    }

    const openSet: Node[] = [{
        gx: startIdxX, gy: startIdxY,
        g: 0, h: Math.abs(start.x - end.x) + Math.abs(start.y - end.y),
        parent: null, dir: null
    }];
    const closedSet = new Set<string>();

    const isObstacleSegment = (x1: number, y1: number, x2: number, y2: number) => {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return obstacles.some(el => {
            const ex1 = Math.min(el.x, el.x + el.width);
            const ex2 = Math.max(el.x, el.x + el.width);
            const ey1 = Math.min(el.y, el.y + el.height);
            const ey2 = Math.max(el.y, el.y + el.height);
            return mx > ex1 && mx < ex2 && my > ey1 && my < ey2;
        });
    };

    let iterations = 0;
    while (openSet.length > 0 && iterations < 300) {
        iterations++;
        openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
        const current = openSet.shift()!;

        if (current.gx === endIdxX && current.gy === endIdxY) {
            const path: Point[] = [];
            let curr: Node | null = current;
            while (curr) {
                path.push({ x: sortedX[curr.gx], y: sortedY[curr.gy] });
                curr = curr.parent;
            }
            return path.reverse();
        }

        closedSet.add(`${current.gx},${current.gy}`);

        const neighbors = [
            { dx: -1, dy: 0, dir: 'h' as const },
            { dx: 1, dy: 0, dir: 'h' as const },
            { dx: 0, dy: -1, dir: 'v' as const },
            { dx: 0, dy: 1, dir: 'v' as const }
        ];

        for (const nb of neighbors) {
            const nx = current.gx + nb.dx;
            const ny = current.gy + nb.dy;

            if (nx < 0 || nx >= sortedX.length || ny < 0 || ny >= sortedY.length) continue;
            if (closedSet.has(`${nx},${ny}`)) continue;

            const xPrev = sortedX[current.gx];
            const yPrev = sortedY[current.gy];
            const xNext = sortedX[nx];
            const yNext = sortedY[ny];

            if (isObstacleSegment(xPrev, yPrev, xNext, yNext)) continue;

            const dist = Math.abs(xNext - xPrev) + Math.abs(yNext - yPrev);
            const turnPenalty = (current.dir && current.dir !== nb.dir) ? 50 : 0;
            const newG = current.g + dist + turnPenalty;

            const existing = openSet.find(n => n.gx === nx && n.gy === ny);
            if (existing) {
                if (newG < existing.g) {
                    existing.g = newG;
                    existing.parent = current;
                    existing.dir = nb.dir;
                }
            } else {
                openSet.push({
                    gx: nx, gy: ny,
                    g: newG, h: Math.abs(xNext - end.x) + Math.abs(yNext - end.y),
                    parent: current,
                    dir: nb.dir
                });
            }
        }
    }

    return calculateElbowRoute(start, end);
};
