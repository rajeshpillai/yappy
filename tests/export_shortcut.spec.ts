
import { test, expect } from '@playwright/test';

test('Ctrl+Shift+E should open Export Dialog', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('canvas');

    // Ensure dialog is hidden initially
    await expect(page.locator('.export-modal')).toBeHidden();

    // Press shortcut
    await page.keyboard.press('Control+Shift+E');


    // Verify dialog appears
    await expect(page.locator('.export-modal')).toBeVisible();
});

test('Menu item should open Export Dialog', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('canvas');

    // Open Menu
    await page.click('button[title="Menu"]');
    await expect(page.locator('.menu-dropdown')).toBeVisible();

    // Click Export Animation
    await page.click('text=Export Animation');

    // Verify dialog appears
    await expect(page.locator('.export-modal')).toBeVisible();
});

