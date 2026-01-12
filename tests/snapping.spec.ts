import { test, expect } from '@playwright/test';

test.describe('Object Snapping and Smart Guides', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');
        await page.evaluate(() => {
            if (window.Yappy) {
                window.Yappy.clear();
                window.Yappy.updateGridSettings({ objectSnapping: true });
            }
        });
    });

    test('should snap to edge of another element', async ({ page }) => {
        // Create a static rectangle at (100, 100)
        await page.evaluate(() => {
            window.Yappy.createRectangle(100, 100, 100, 100);
        });

        // Create another rectangle at (300, 300) and select it
        const movingId = await page.evaluate(() => {
            return window.Yappy.createRectangle(300, 300, 100, 100);
        });
        await page.evaluate((id) => window.Yappy.setSelected([id]), movingId);

        // Move it close to the first rect's right edge (which is at x=200)
        // Moving from 300 to 204 (within threshold)
        // Dragging from (350, 350) - middle of movingId
        await page.mouse.move(350, 350);
        await page.mouse.down();
        // Move to 254, 350 (Center of movingId would be 204 if width is 100)
        // Actually, if we want the left edge (300) to snap to right edge (200), we need to move it by -100.
        // If we move it to 204, it should snap to 200.
        await page.mouse.move(254, 350);

        const currentPos = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return { x: el.x, y: el.y };
        }, movingId);

        // Should have snapped to 200
        expect(currentPos.x).toBe(200);

        await page.mouse.up();
    });

    test('should snap to center of another element', async ({ page }) => {
        // Static rect at (100, 100) -> Center is (150, 150)
        await page.evaluate(() => {
            window.Yappy.createRectangle(100, 100, 100, 100);
        });

        // Moving rect at (300, 100) -> Center is (350, 150)
        const movingId = await page.evaluate(() => {
            return window.Yappy.createRectangle(300, 100, 100, 100);
        });
        await page.evaluate((id) => window.Yappy.setSelected([id]), movingId);

        // Drag from middle (350, 150)
        await page.mouse.move(350, 150);
        await page.mouse.down();
        // Move so center (currently 350) goes near 150.
        // Move by -196 -> target center 154. Threshold is 5. Should snap to 150.
        await page.mouse.move(350 - 196, 150);

        const currentPos = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return { x: el.x, center: el.x + el.width / 2 };
        }, movingId);

        expect(currentPos.center).toBe(150);

        await page.mouse.up();
    });

    test('should NOT snap when objectSnapping is disabled', async ({ page }) => {
        await page.evaluate(() => {
            window.Yappy.updateGridSettings({ objectSnapping: false });
            window.Yappy.createRectangle(100, 100, 100, 100);
        });

        const movingId = await page.evaluate(() => {
            return window.Yappy.createRectangle(300, 300, 100, 100);
        });
        await page.evaluate((id) => window.Yappy.setSelected([id]), movingId);

        await page.mouse.move(350, 350);
        await page.mouse.down();
        await page.mouse.move(254, 350); // Should be at 204, not 200

        const currentPos = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el.x;
        }, movingId);

        expect(currentPos).toBe(204);
        await page.mouse.up();
    });

    test('should disable snapping when Shift is held', async ({ page }) => {
        await page.evaluate(() => {
            window.Yappy.createRectangle(100, 100, 100, 100);
        });

        const movingId = await page.evaluate(() => {
            return window.Yappy.createRectangle(300, 300, 100, 100);
        });
        await page.evaluate((id) => window.Yappy.setSelected([id]), movingId);

        await page.mouse.move(350, 350);
        await page.mouse.down();
        await page.keyboard.down('Shift');
        await page.mouse.move(254, 350);

        const currentPos = await page.evaluate((id) => {
            const el = window.Yappy.getElement(id);
            return el.x;
        }, movingId);

        expect(currentPos).toBe(204);
        await page.keyboard.up('Shift');
        await page.mouse.up();
    });
});
