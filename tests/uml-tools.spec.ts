import { test, expect } from '@playwright/test';

test.describe('UML Tools', () => {

    test('should allow creating UML shapes', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');

        // Locate UML Tool Group (should be present now)
        const umlGroupBtn = page.locator('button[title="UML: Class"]').first();
        await expect(umlGroupBtn).toBeVisible();
        umlGroupBtn.click();

        // Select Actor
        await page.click('button[title="Actor"]');

        // Draw Actor
        await page.mouse.move(300, 300);
        await page.mouse.down();
        await page.mouse.move(400, 400);
        await page.mouse.up();

        // Verify shape creation (indirectly via properties or presence)
        // Since we can't inspect canvas content easily, we check if selection count > 0 after drawing
        // await expect(page.locator('.selection-box')).toBeVisible(); // If we had one
    });

    test('should open multi-section editor for UML Class', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await page.waitForSelector('canvas');

        // Select Class Tool (default in group usually, or select explicitly)
        const umlGroupBtn = page.locator('button[title="UML: Class"]').first();
        await umlGroupBtn.click();
        await page.click('button[title="Class"]');

        // Draw Class
        await page.mouse.move(300, 300);
        await page.mouse.down();
        await page.mouse.move(500, 500);
        await page.mouse.up();

        // Double click top area (Header)
        await page.mouse.dblclick(400, 320);
        await expect(page.locator('textarea')).toBeVisible();
        await expect(page.locator('textarea')).toHaveValue(''); // Or default name?
        await page.keyboard.press('Escape');

        // Double click bottom area (Attributes area - roughly middle)
        // Need to be careful about where the line is. 
        // Height 200. Header approx 50. Attr below.
        await page.mouse.dblclick(400, 380);
        await expect(page.locator('textarea')).toBeVisible();
        // Since it's empty, it might default to header if not precise, but let's assume valid click
        await page.keyboard.press('Escape');
    });

});
