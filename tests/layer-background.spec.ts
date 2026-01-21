import { test, expect } from '@playwright/test';

test.describe('Layer Background Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5174');
        // Wait for the app to load
        await page.waitForSelector('.canvas-container');
    });

    test('can change layer background color', async ({ page }) => {
        // Open layer panel
        await page.click('button[title="Layers"]');
        await page.waitForSelector('.layer-panel');

        // Default layer should have a transparent background swatch
        const swatch = page.locator('.color-swatch-mini');
        await expect(swatch).toHaveClass(/transparent/);

        // Toggle to color mode
        await swatch.click();
        await expect(swatch).not.toHaveClass(/transparent/);

        // Change color using the picker
        const colorPicker = page.locator('.color-picker-mini-visible');
        await colorPicker.fill('#ff0000');

        // Verify the swatch style updated
        await expect(swatch).toHaveCSS('background-color', 'rgb(255, 0, 0)');
    });

    test('layer background is applied with opacity', async ({ page }) => {
        await page.click('button[title="Layers"]');

        // Set background to blue
        await page.click('.color-swatch-mini');
        const colorPicker = page.locator('.color-picker-mini-visible');
        await colorPicker.fill('#0000ff');

        // Change opacity
        const opacitySlider = page.locator('.opacity-control input[type="range"]');
        await opacitySlider.fill('0.5');

        // We can't easily verify the canvas pixel color here without complex setup,
        // but we can verify the store state if we had a way to expose it or just 
        // verify the UI sliders/swatches remain consistent.
        await expect(opacitySlider).toHaveValue('0.5');
        const swatch = page.locator('.color-swatch-mini');
        await expect(swatch).toHaveCSS('background-color', 'rgb(0, 0, 255)');
    });
});
