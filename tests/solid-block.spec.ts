import { test, expect } from '@playwright/test';
import { getShapeGeometry } from '../src/utils/shape-geometry';

test('Solid Block Geometry', () => {
    const el = {
        id: 'block1',
        type: 'solidBlock',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        depth: 50,
        viewAngle: 0, // Right extrusion
        // other required props mocked
        roundness: 0
    } as any;

    const geo0 = getShapeGeometry(el);
    expect(geo0?.type).toBe('multi');
    if (geo0?.type !== 'multi') return;

    // Angle 0 -> dx = 50, dy = 0.
    // Back Face Center: 100 + 50 = 150 (relative to x?).
    // No, inside getShapeGeometry, x = -50, y = -50 (centered).
    // dx = 50, dy = 0.
    // Back Face TL: -50 + 50 = 0.
    // Front Face TL: -50.

    // Just verify we get a multi-shape result.
    expect(geo0.shapes.length).toBe(6); // Back, 4 Sides, Front

    // Test Handle Logic Simulation
    // Rotating to 90 degrees (Down)
    const el90 = { ...el, viewAngle: 90 };
    const geo90 = getShapeGeometry(el90);
    // dx = 0, dy = 50.
    expect(geo90).toBeDefined();
});
