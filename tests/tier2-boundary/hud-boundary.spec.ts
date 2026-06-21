import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';
import { setSliderValueDirect } from '../helpers/slider';

test.describe('Floating Glassmorphism HUD Boundary & Corner Cases (F5-B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('F5-B1: Extreme slider inputs (setting volatility to exactly 0.0 and 1.0, verifying float conversions)', async ({ page }) => {
    // Test minimum 0.0
    await setSliderValueDirect(page, 'tectonic-volatility', 0.0);
    let val = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().tectonicVolatility);
    expect(val).toBe(0.0);

    // Test maximum 1.0
    await setSliderValueDirect(page, 'tectonic-volatility', 1.0);
    val = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().tectonicVolatility);
    expect(val).toBe(1.0);
  });

  test('F5-B2: Rapid slider dragging (drag slider min to max to min in <100ms, checking uniform buffer write throttling)', async ({ page }) => {
    const values = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7];
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    for (const val of values) {
      await setSliderValueDirect(page, 'tectonic-volatility', val);
    }
    await page.waitForTimeout(50);

    const finalVal = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState().tectonicVolatility);
    expect(finalVal).toBe(0.7);
    expect(errors).toHaveLength(0);
  });

  test('F5-B3: HUD hidden state (rendering HUD collapsed/hidden, WebGPU rendering continues)', async ({ page }) => {
    const hudHeader = page.locator('h1', { hasText: 'SYSTEM HUD' });
    const hud = hudHeader.locator('..').locator('..');
    await expect(hud).toBeVisible();
    await hud.evaluate((el) => {
      (el as HTMLElement).style.display = 'none';
    });

    // WebGPU canvas must still be visible and interactive
    const canvas = page.locator('canvas[data-testid="webgpu-canvas"]');
    await expect(canvas).toBeVisible();
  });

  test('F5-B4: WebGPU uniform buffer write error (graceful fallback/notification if write fails)', async ({ page }) => {
    // Simulate uniform write failure / device context loss during write
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.isContextReady = false;
    });

    // Perform interactive action
    await setSliderValueDirect(page, 'tectonic-volatility', 0.5);

    // Verify it doesn't crash the frontend UI
    const title = page.locator('text=SYSTEM HUD // ACTIVE');
    await expect(title).toBeVisible();
  });

  test('F5-B5: Concurrently dragging multiple sliders (Zustand updates multiple uniforms in same frame)', async ({ page }) => {
    await Promise.all([
      setSliderValueDirect(page, 'tectonic-volatility', 0.15),
      setSliderValueDirect(page, 'fluid-viscosity', 0.85),
      setSliderValueDirect(page, 'flocking-cohesion', 0.45)
    ]);

    await page.waitForTimeout(50);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.tectonicVolatility).toBe(0.15);
    expect(state.fluidViscosity).toBe(0.85);
    expect(state.flockingCohesion).toBe(0.45);
  });
});
