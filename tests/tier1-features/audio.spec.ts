import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';

test.describe('Real-Time Audio DSP Feature (F3)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject both mocks before page initialization
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    // Wait for the WebGPU context to be fully initialized and ready
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('F3.1: AudioContext initializes and enters running state upon user interaction', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    const trace = await page.evaluate(() => (window as unknown as CustomWindow).__audioMockTrace);
    expect(trace).toBeDefined();
    expect(trace.audioContextCreated).toBe(true);
  });

  test('F3.2: MediaDevices.getUserMedia is requested for microphone capture', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    const trace = await page.evaluate(() => (window as unknown as CustomWindow).__audioMockTrace);
    expect(trace.getUserMediaCalled).toBe(true);
    expect(trace.lastConstraints?.audio).toBe(true);
  });

  test('F3.3: AnalyserNode is created with correct fftSize (256)', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    const trace = await page.evaluate(() => (window as unknown as CustomWindow).__audioMockTrace);
    expect(trace.analyserCreated).toBe(true);
    expect(trace.lastFftSize).toBe(256);
  });

  test('F3.4: Audio FFT pipeline regularly calculates frequency data arrays', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(200);

    const trace = await page.evaluate(() => (window as unknown as CustomWindow).__audioMockTrace);
    expect(trace.getByteFrequencyDataCalls).toBeGreaterThan(0);
  });

  test('F3.5: Frequency data is mapped to uniform buffer fields / store fields', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.8, treble: 0.4 });
    });
    
    await page.waitForTimeout(100);

    const storeState = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(storeState.bassAmplitude).toBeCloseTo(0.8);
    expect(storeState.trebleAmplitude).toBeCloseTo(0.4);
    expect(storeState.frequencyBins).toBeDefined();
    expect(storeState.frequencyBins.length).toBe(128);
  });
});
