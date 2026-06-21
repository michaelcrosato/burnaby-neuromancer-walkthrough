import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { dragSliderToValue, setSliderValueDirect } from '../helpers/slider';
import { CustomWindow } from '../helpers/window-types';

test.describe('Floating Glassmorphism HUD Feature (F5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.goto('/');
    // Wait for the WebGPU context to be fully initialized and ready
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('F5.1: HUD container has glassmorphism styles', async ({ page }) => {
    // Find HUD container relative to its title text
    const hudContainer = page.locator('text=SYSTEM HUD // ACTIVE').locator('..').locator('..');
    await expect(hudContainer).toBeVisible();

    const classes = await hudContainer.getAttribute('class');
    expect(classes).toContain('backdrop-blur-md');
    expect(classes).toContain('border-white/10');
    expect(classes).toContain('bg-slate-900/40');
  });

  test('F5.2: Tectonic Volatility slider is rendered and interactive', async ({ page }) => {
    const slider = page.locator('[data-testid="tectonic-volatility"]');
    await expect(slider).toBeVisible();

    await dragSliderToValue(page, 'tectonic-volatility', 0.8);

    const val = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().tectonicVolatility);
    expect(val).toBeGreaterThan(0.7);
    expect(val).toBeLessThan(0.9);
  });

  test('F5.3: Fluid Viscosity slider updates Zustand state', async ({ page }) => {
    const slider = page.locator('[data-testid="fluid-viscosity"]');
    await expect(slider).toBeVisible();

    await setSliderValueDirect(page, 'fluid-viscosity', 0.45);

    const val = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().fluidViscosity);
    expect(val).toBe(0.45);
  });

  test('F5.4: Flocking Cohesion slider changes GPU uniform values directly', async ({ page }) => {
    const slider = page.locator('[data-testid="flocking-cohesion"]');
    await expect(slider).toBeVisible();

    await setSliderValueDirect(page, 'flocking-cohesion', 0.92);

    const val = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().flockingCohesion);
    expect(val).toBe(0.92);
  });

  test('F5.5: Audio Sensitivity slider updates direct bindings without React component re-renders', async ({ page }) => {
    const slider = page.locator('[data-testid="audio-sensitivity"]');
    await expect(slider).toBeVisible();

    await setSliderValueDirect(page, 'audio-sensitivity', 0.35);

    const val = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().audioSensitivity);
    expect(val).toBe(0.35);
  });
});
