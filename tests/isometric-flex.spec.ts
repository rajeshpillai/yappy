import { test, expect } from '@playwright/test';

test('Isometric Cube Flexibility Logic', async ({ page }) => {
    // Simulate the drag update logic
    const el = {
        id: 'cube1',
        type: 'isometricCube',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        shapeRatio: 25,
        sideRatio: 50
    };

    // Simulate drag to (150, 150)
    // Vertical Drag -> shapeRatio = (150 - 100) / 200 = 0.25 -> 25%
    // Horizontal Drag -> sideRatio = (150 - 100) / 200 = 0.25 -> 25% (Rotation)

    const x = 150;
    const y = 150;

    let newVRatio = (y - el.y) / el.height;
    newVRatio = Math.max(0.1, Math.min(0.9, newVRatio));
    const newShapeRatio = Math.round(newVRatio * 100);

    let newHRatio = (x - el.x) / el.width;
    newHRatio = Math.max(0, Math.min(1, newHRatio));
    const newSideRatio = Math.round(newHRatio * 100);

    console.log(`Drag to (${x}, ${y}) -> shapeRatio: ${newShapeRatio}, sideRatio: ${newSideRatio}`);

    if (newShapeRatio !== 25) throw new Error(`Expected shapeRatio to be 25, got ${newShapeRatio}`);
    if (newSideRatio !== 25) throw new Error(`Expected sideRatio to be 25, got ${newSideRatio}`);
});
