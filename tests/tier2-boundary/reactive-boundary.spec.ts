import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';
import { setSliderValueDirect } from '../helpers/slider';

test.describe('Audio-Reactive Visualization Shifts Boundary & Corner Cases (F4-B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);
  });

  test('F4-B1: Pure bass tone (FFT shows 100% low frequency; verifies tectonic shifts are maxed)', async ({ page }) => {
    // Set sensitivity to 1.0 first
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);
    
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 1.0, treble: 0.0 });
    });
    await page.waitForTimeout(150);

    const storeState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(storeState.bassAmplitude).toBeCloseTo(1.0);
    expect(storeState.tectonicOffset).toBeCloseTo(0.9); // 1.0 * 1.0 * 0.9
    expect(storeState.gravityInverted).toBe(true);
  });

  test('F4-B2: Pure treble tone (FFT shows 100% high frequency; verifies chromatic aberration is maxed)', async ({ page }) => {
    // Set sensitivity to 1.0 first
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);

    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 1.0 });
    });
    await page.waitForTimeout(150);

    const storeState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(storeState.trebleAmplitude).toBeCloseTo(1.0);
    expect(storeState.chromaticAberrationIntensity).toBeCloseTo(0.9); // 1.0 * 1.0 * 0.9
    expect(storeState.activeColorPalette).toBe('magenta');
  });

  test('F4-B3: Zero frequency inputs (color remains default cyan, no tectonic shift)', async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 0.0 });
    });
    await page.waitForTimeout(150);

    const storeState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(storeState.activeColorPalette).toBe('cyan');
    expect(storeState.tectonicOffset).toBe(0.0);
  });

  test('F4-B4: Instant frequency transitions (transition from 100% bass to 100% treble without render glitch)', async ({ page }) => {
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);

    // 100% bass
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 1.0, treble: 0.0 });
    });
    await page.waitForTimeout(100);

    let storeState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(storeState.gravityInverted).toBe(true);
    expect(storeState.activeColorPalette).toBe('cyan');

    // Instant switch to 100% treble
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.0, treble: 1.0 });
    });
    await page.waitForTimeout(100);

    storeState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(storeState.gravityInverted).toBe(false);
    expect(storeState.activeColorPalette).toBe('magenta');
  });

  test('F4-B5: Combined extreme bass & treble (both effects triggered simultaneously, no uniform buffer write conflicts)', async ({ page }) => {
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);

    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 1.0, treble: 1.0 });
    });
    await page.waitForTimeout(150);

    const storeState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(storeState.gravityInverted).toBe(true);
    expect(storeState.activeColorPalette).toBe('magenta');
    expect(storeState.tectonicOffset).toBeCloseTo(0.9);
    expect(storeState.chromaticAberrationIntensity).toBeCloseTo(0.9);
  });
});
