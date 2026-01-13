import { test, expect } from '@playwright/test';

test.describe('Productivity Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');
        await page.evaluate(() => {
            if (window.Yappy) {
                window.Yappy.clear();
            }
        });
    });

    test.describe('Command Palette', () => {
        test('should open with Ctrl+K and search for tools', async ({ page }) => {
            // Ensure focus
            await page.click('body');
            await page.waitForTimeout(500);

            // Open palette
            await page.keyboard.down('Control');
            await page.keyboard.press('k');
            await page.keyboard.up('Control');
            await expect(page.locator('.command-palette-container')).toBeVisible({ timeout: 5000 });

            const input = page.locator('.command-palette-search input');
            await input.fill('rect');

            const items = page.locator('.command-palette-item');
            await expect(items.first()).toBeVisible();

            // Check that at least one item contains "Rectangle"
            const rectItem = items.filter({ hasText: /Rectangle/i }).first();
            await expect(rectItem).toBeVisible();

            // If it's not the first, we might want to navigate to it, 
            // but for now let's just ensure it's there and selectable.
            await rectItem.click();

            // Execute
            await page.keyboard.press('Enter');
            await expect(page.locator('.command-palette-container')).not.toBeVisible();

            // Verify tool is selected in UI (Toolbar)
            // The title attribute in Toolbar.tsx is just the label (e.g., "Rectangle")
            const rectBtn = page.locator('button[title="Rectangle"]');
            await expect(rectBtn).toHaveClass(/active/, { timeout: 5000 });
        });

        test('should search and execute global actions', async ({ page }) => {
            await page.click('body');
            await page.waitForTimeout(500);
            await page.keyboard.down('Control');
            await page.keyboard.press('k');
            await page.keyboard.up('Control');
            const input = page.locator('.command-palette-search input');
            await input.fill('theme');

            await expect(page.locator('.command-palette-item')).toContainText('Toggle Theme');
            await page.keyboard.press('Enter');

            // Verify theme toggle (data-theme attribute on body or html)
            const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            expect(theme).toBe('dark'); // Assuming it starts light
        });
    });

    test.describe('Layer Context Menu', () => {
        test('should isolate a layer', async ({ page }) => {
            // Create 3 layers
            await page.evaluate(() => {
                window.Yappy.addLayer('Layer 2');
                window.Yappy.addLayer('Layer 3');
            });

            // Open Layer Panel
            await page.keyboard.press('Alt+l');
            await expect(page.locator('.layer-panel')).toBeVisible();

            // Right click Layer 3 (reversed list, so it's the top item)
            const layerItems = page.locator('.layer-item');
            await layerItems.nth(0).click({ button: 'right' });

            await expect(page.locator('.context-menu')).toBeVisible();
            await page.locator('.context-menu-item').filter({ hasText: 'Isolate Layer' }).click();

            // Verify Layer 1 and 2 are hidden
            const visibilityStates = await page.evaluate(() => {
                return window.Yappy.state.layers.map(l => l.visible);
            });
            // store.layers index 0 is Layer 1, 1 is Layer 2, 2 is Layer 3
            expect(visibilityStates).toEqual([false, false, true]);
        });

        test('should merge layer down', async ({ page }) => {
            await page.evaluate(() => {
                const l2Id = window.Yappy.addLayer('Layer 2');
                window.Yappy.createRectangle(10, 10, 50, 50, { layerId: l2Id });
            });

            await page.keyboard.press('Alt+l');
            const layerItems = page.locator('.layer-item');
            await layerItems.nth(0).click({ button: 'right' });

            await page.locator('.context-menu-item').filter({ hasText: 'Merge Down' }).click();

            // Verify Layer 2 is gone and its element is now in Layer 1
            const layerCount = await page.evaluate(() => window.Yappy.state.layers.length);
            expect(layerCount).toBe(1);

            const elementLayerId = await page.evaluate(() => window.Yappy.state.elements[0].layerId);
            const l1Id = await page.evaluate(() => window.Yappy.state.layers[0].id);
            expect(elementLayerId).toBe(l1Id);
        });
    });
});
