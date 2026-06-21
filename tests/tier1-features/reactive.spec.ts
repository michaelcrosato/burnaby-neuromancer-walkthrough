import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';

test.describe('Audio-Reactive Visualization Shifts Feature (F4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    // Wait for the WebGPU context to be fully initialized and ready
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);
  });

  test('F4.1: Injecting bass frequency triggers tectonic offset in store/uniforms', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.9, treble: 0.0 });
    });

    await page.waitForTimeout(150);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.bassAmplitude).toBeCloseTo(0.9);
    expect(state.tectonicOffset).toBeCloseTo(0.648);
  });

  test('F4.2: Injecting bass triggers gravity inversion flag in compute uniforms', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.8, treble: 0.0 });
    });

    await page.waitForTimeout(150);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.gravityInverted).toBe(true);

    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.2, treble: 0.0 });
    });

    await page.waitForTimeout(150);

    const updatedState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(updatedState.gravityInverted).toBe(false);
  });

  test('F4.3: Injecting treble triggers chromatic aberration intensity change', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 0.85 });
    });

    await page.waitForTimeout(150);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.trebleAmplitude).toBeCloseTo(0.85);
    expect(state.chromaticAberrationIntensity).toBeCloseTo(0.612);
  });

  test('F4.4: Treble triggers entity color shift from cyan to magenta based on velocity', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 0.9 });
    });

    await page.waitForTimeout(150);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.activeColorPalette).toBe('magenta');

    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 0.3 });
    });

    await page.waitForTimeout(150);

    const updatedState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(updatedState.activeColorPalette).toBe('cyan');
  });

  test('F4.5: Color transition shader uniforms interpolate smoothly under frequency changes', async ({ page }) => {
    const chromaticIntensityHistory: number[] = [];

    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 0.5 });
    });
    await page.waitForTimeout(100);
    let state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    chromaticIntensityHistory.push(state.chromaticAberrationIntensity);

    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 0.9 });
    });
    await page.waitForTimeout(100);
    state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    chromaticIntensityHistory.push(state.chromaticAberrationIntensity);

    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 0.0 });
    });
    await page.waitForTimeout(100);
    state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    chromaticIntensityHistory.push(state.chromaticAberrationIntensity);

    expect(chromaticIntensityHistory[1]).toBeGreaterThan(chromaticIntensityHistory[0]);
    expect(chromaticIntensityHistory[2]).toBeLessThan(chromaticIntensityHistory[1]);
    expect(chromaticIntensityHistory[2]).toBe(0.0);
  });
});
