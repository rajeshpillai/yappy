
import { test, expect } from '@playwright/test';

test.describe('Alignment Tools', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');

        // Reset canvas
        await page.evaluate(() => {
            if (window.Yappy) window.Yappy.clear();
        });
    });

    test('should align elements left', async ({ page }) => {
        // Create 3 rects
        await page.evaluate(() => {
            window.Yappy.createRectangle(100, 100, 100, 100); // id 1
            window.Yappy.createRectangle(200, 200, 100, 100); // id 2
            window.Yappy.createRectangle(50, 300, 100, 100);  // id 3, left-most at 50
        });

        // Select all using API
        await page.evaluate(() => {
            const ids = window.Yappy.state.elements.map(e => e.id);
            window.Yappy.setSelected(ids);
        });

        // Click Align Left button

        // Need to identify button. We can use title="Align Left"
        await page.click('button[title="Align Left"]');

        // Check positions
        const positions = await page.evaluate(() => {
            return window.Yappy.state.elements.map(e => e.x);
        });

        // All should be at x=50
        expect(positions).toEqual([50, 50, 50]);
    });

    test('should distribute elements horizontally', async ({ page }) => {
        // Create 3 rects at 0, 100, 300 (centers at 50, 150, 350)
        // Spacing: 150-50=100. 350-150=200. Not equal.
        // Total span centers: 350 - 50 = 300.
        // Steps: 300 / 2 = 150.
        // New centers: 50, 200, 350.
        // New X: 0, 150, 300.

        await page.evaluate(() => {
            window.Yappy.createRectangle(0, 100, 100, 100); // Center X=50
            window.Yappy.createRectangle(100, 100, 100, 100); // Center X=150
            window.Yappy.createRectangle(300, 100, 100, 100); // Center X=350
        });

        // Select all
        await page.evaluate(() => {
            const ids = window.Yappy.state.elements.map(e => e.id);
            window.Yappy.setSelected(ids);
        });

        // Click Distribute Horizontal
        await page.click('button[title="Distribute Horizontal"]');

        // Check positions
        const xs = await page.evaluate(() => {
            // Sort by x to ensure order
            return window.Yappy.state.elements
                .sort((a, b) => a.x - b.x)
                .map(e => e.x);
        });

        expect(xs).toEqual([0, 150, 300]);
    });
});
