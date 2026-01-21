import { test, expect } from '@playwright/test';

test.describe('Smart Spacing Guides', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');
        await page.click('body');
        await page.evaluate(() => {
            if (window.Yappy) {
                window.Yappy.clear();
                // Ensure object snapping is on as spacing depends on it
                window.Yappy.updateGridSettings({ objectSnapping: true });
            }
        });
    });

    test('should maintain equal gaps between three elements', async ({ page }) => {
        // Create two static rectangles with a 50px gap
        // R1: (100, 100, 100, 100) -> right at 200
        // R2: (350, 100, 100, 100) -> left at 350, right at 450. Gap is 150.
        // Wait, let's make it more obvious.
        // R1: x:100, w:100 => right: 200
        // R2: x:400, w:100 => left: 400. Gap is 200.
        await page.evaluate(() => {
            window.Yappy.createRectangle(100, 100, 100, 100);
            window.Yappy.createRectangle(400, 100, 100, 100);
        });

        // Moving R3 (center) at (250, 300) -> width 100.
        // Gap1 = x3 - x1(200)
        // Gap2 = x2(400) - (x3+100)
        // If x3 = 250: Gap1 = 50, Gap2 = 50. Equal!
        const movingId = await page.evaluate(() => {
            return window.Yappy.createRectangle(250, 300, 100, 100);
        });
        await page.evaluate((id) => window.Yappy.setSelected([id]), movingId);

        // Move it close to y:100 to trigger vertical overlap and spacing check
        // Drag from (300, 350) to (300, 150)
        await page.mouse.move(300, 350);
        await page.mouse.down();
        // Move near the target x:250. 
        // If we move to 253, it should snap to 250.
        await page.mouse.move(303, 150);

        const currentX = await page.evaluate((id) => {
            return window.Yappy.getElement(id).x;
        }, movingId);

        expect(currentX).toBe(250);
        await page.mouse.up();
    });

    test('should snap to successive gap (equal distance sequence)', async ({ page }) => {
        // R1: x:100, w:50 => right: 150
        // R2: x:250, w:50 => left: 250, right: 300. Gap = 100.
        await page.evaluate(() => {
            window.Yappy.createRectangle(100, 100, 50, 50);
            window.Yappy.createRectangle(250, 100, 50, 50);
        });

        // Moving R3 to match the 100px gap.
        // Needs to be at x = 300 + 100 = 400.
        const movingId = await page.evaluate(() => {
            return window.Yappy.createRectangle(600, 100, 50, 50);
        });
        await page.evaluate((id) => window.Yappy.setSelected([id]), movingId);

        // Drag from 625, 125 to 427, 125 (Target x=400, so target center 425. 427 is +2 offset, within 5px threshold)
        await page.mouse.move(625, 125);
        await page.mouse.down();
        await page.mouse.move(427, 125);

        const currentX = await page.evaluate((id) => {
            return window.Yappy.getElement(id).x;
        }, movingId);

        expect(currentX).toBe(400);
        await page.mouse.up();
    });
});
