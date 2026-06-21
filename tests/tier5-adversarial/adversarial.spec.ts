import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';

test.describe('Tier 5 Adversarial Coverage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    // Wait for the WebGPU context to be fully initialized and ready
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('Adversarial 1: Audio sample rate invariance under 96kHz simulated context', async ({ page }) => {
    // 1. Set simulated sample rate to 96kHz and activate microphone
    await page.evaluate(() => {
      (window as any).__mockSampleRate = 96000;
    });

    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // 2. Inject a high-frequency (treble) FFT pulse inside the [4000, 16000] Hz range.
    // Under 96kHz, binWidth = 96000 / 256 = 375 Hz.
    // Target treble range is 4000 to 16000 Hz, which corresponds to bins 10 to 43.
    // We inject a pulse at bin index 20 (corresponding to 20 * 375 = 7500 Hz).
    await page.evaluate(() => {
      const mockBins = Array(128).fill(0);
      mockBins[20] = 0.85; // Inject treble pulse at 7500 Hz
      (window as unknown as CustomWindow).__injectMockFFT({ bins: mockBins });
    });

    await page.waitForTimeout(150);

    // Verify treble reactivity successfully triggered
    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.trebleAmplitude).toBeCloseTo(0.85);
    expect(state.activeColorPalette).toBe('magenta');

    // 3. Inject a pulse outside the [4000, 16000] Hz range (e.g. at index 80, which is 80 * 375 = 30000 Hz)
    await page.evaluate(() => {
      const mockBins = Array(128).fill(0);
      mockBins[80] = 0.85; // Out of range high frequency
      (window as unknown as CustomWindow).__injectMockFFT({ bins: mockBins });
    });

    await page.waitForTimeout(150);

    // Verify treble amplitude evaluates to zero (or very close) and color shifts back to cyan
    const state2 = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state2.trebleAmplitude).toBeLessThan(0.1);
    expect(state2.activeColorPalette).toBe('cyan');
  });

  test('Adversarial 2: Real WebGPU device lost recovery and reconstruction', async ({ page }) => {
    // 1. Enable mic to get active animation and check initial context ready status
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    let isReady = await page.evaluate(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    });
    expect(isReady).toBe(true);

    // 2. Simulate device lost by triggering the device.lost promise resolution
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.triggerDeviceLost('Mock GPU context loss');
    });

    await page.waitForTimeout(150);

    // 3. Verify context was recovered successfully and is ready again
    isReady = await page.evaluate(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    });
    expect(isReady).toBe(true);
  });

  test('Adversarial 3: Safe fallback screen displayed when pipeline compilation/initialization fails', async ({ page }) => {
    // 1. Navigate to page with fail-compilation parameter
    await page.goto('/?fail-compilation=true');
    await page.waitForTimeout(200);

    // 2. Verify fallback screen is shown and loading screen does not freeze permanently
    const fallbackText = await page.locator('[data-testid="webgpu-fallback"]').textContent();
    expect(fallbackText).toContain('WebGPU Initialization Failed');
  });

  test('Adversarial 4: Store parameter sanitization and NaN protection', async ({ page }) => {
    // 1. Inject invalid/NaN/out-of-bounds parameters into the store
    await page.evaluate(() => {
      const store = (window as unknown as CustomWindow).__store;
      store.getState().setTectonicVolatility(NaN);
      store.getState().setFluidViscosity(1.5); // Out of bounds high
      store.getState().setFlockingCohesion(-0.5); // Out of bounds low
      store.getState().setAudioSensitivity(Infinity);
    });

    // 2. Verify that they are clamped or fall back safely to valid ranges [0, 1] without crashing
    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    
    // NaN should fall back to previous state value (which was 0.5)
    expect(state.tectonicVolatility).toBe(0.5);
    // Out of bounds high should clamp to 1.0
    expect(state.fluidViscosity).toBe(1.0);
    // Out of bounds low should clamp to 0.0
    expect(state.flockingCohesion).toBe(0.0);
    // Infinity should fall back to previous state value (which was 0.8)
    expect(state.audioSensitivity).toBe(0.8);
  });
});
