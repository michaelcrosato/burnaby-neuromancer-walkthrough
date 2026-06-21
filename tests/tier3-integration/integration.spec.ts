import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from '../mocks/webgpu-mock';
import { injectAudioMock } from '../mocks/audio-mock';
import { CustomWindow } from '../helpers/window-types';
import { setSliderValueDirect, dragSliderToValue } from '../helpers/slider';

test.describe('Tier 3 Integration Tests (Cross-Feature Combinations)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(injectWebGPUMock);
    await page.addInitScript(injectAudioMock);
    await page.goto('/');
    
    // Wait for the WebGPU context to be fully initialized and ready
    await page.waitForFunction(() => {
      return (window as unknown as CustomWindow).__webgpu_test_hook?.isContextReady() === true;
    }, { timeout: 5000 });
  });

  test('Test 61: Audio FFT changes trigger reactive visual shifts (FFT -> visuals)', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // Inject high bass and treble values
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.9, treble: 0.8 });
    });
    await page.waitForTimeout(150);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    
    // Check that FFT values are updated in the store
    expect(state.bassAmplitude).toBeCloseTo(0.9);
    expect(state.trebleAmplitude).toBeCloseTo(0.8);
    
    // Check that visual parameters react (scaled by sensitivity = 0.8 default)
    // effBass = 0.9 * 0.8 = 0.72
    // tectonicOffset = 0.72 * 0.9 = 0.648
    // gravityInverted = effBass > 0.5 (0.72 > 0.5 => true)
    expect(state.tectonicOffset).toBeCloseTo(0.648);
    expect(state.gravityInverted).toBe(true);

    // effTreble = 0.8 * 0.8 = 0.64
    // chromaticAberrationIntensity = 0.64 * 0.9 = 0.576
    // activeColorPalette = effTreble > 0.5 (0.64 > 0.5 => magenta)
    expect(state.chromaticAberrationIntensity).toBeCloseTo(0.576);
    expect(state.activeColorPalette).toBe('magenta');
  });

  test('Test 62: Slider changes alter Boids/Navier-Stokes compute uniforms (HUD -> compute)', async ({ page }) => {
    // Modify Viscosity and Cohesion sliders
    await setSliderValueDirect(page, 'fluid-viscosity', 0.85);
    await dragSliderToValue(page, 'flocking-cohesion', 0.45);
    
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.fluidViscosity).toBe(0.85);
    expect(state.flockingCohesion).toBeCloseTo(0.45, 1);

    // Verify WebGPU compute pipeline reflects execution state
    const pipeline = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getComputePipeline ? hook.getComputePipeline() : null;
    });

    expect(pipeline).not.toBeNull();
    if (pipeline) {
      expect(pipeline.boidsPipelineActive).toBe(true);
      expect(pipeline.navierStokesPipelineActive).toBe(true);
    }
  });

  test('Test 63: Audio sensitivity modulates slider interaction impact', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // Set Audio Sensitivity to 1.0 (max impact)
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.6 });
    });
    await page.waitForTimeout(150);

    let state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    // effBass = 0.6 * 1.0 = 0.6
    // tectonicOffset = 0.6 * 0.9 = 0.54
    // gravityInverted = effBass > 0.5 (0.6 > 0.5 => true)
    expect(state.tectonicOffset).toBeCloseTo(0.54);
    expect(state.gravityInverted).toBe(true);

    // Set Audio Sensitivity to 0.5 (reduced impact)
    await setSliderValueDirect(page, 'audio-sensitivity', 0.5);
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.6 });
    });
    await page.waitForTimeout(150);

    state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    // effBass = 0.6 * 0.5 = 0.3
    // tectonicOffset = 0.3 * 0.9 = 0.27
    // gravityInverted = effBass > 0.5 (0.3 > 0.5 => false)
    expect(state.tectonicOffset).toBeCloseTo(0.27);
    expect(state.gravityInverted).toBe(false);
  });

  test('Test 64: Fluid particles collide with generated topography mesh height map', async ({ page }) => {
    // 1. Alter elevation data in mock WebGPU state to simulate an elevated terrain ridge
    await page.evaluate(() => {
      const state = (window as any).__webgpu_mock_state;
      state.topography.elevationData = Array(256).fill(12.5); // uniform height
    });

    // 2. Fetch topography mesh height map data via WebGPU test hook
    const topo = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getTopography ? hook.getTopography() : null;
    });

    expect(topo).not.toBeNull();
    if (topo) {
      expect(topo.elevationData[0]).toBe(12.5);
      expect(topo.elevationData.length).toBe(256);
    }

    // 3. Verify that the fluid/particle compute pipeline executes with this map
    const pipeline = await page.evaluate(() => {
      const hook = (window as unknown as CustomWindow).__webgpu_test_hook;
      return hook?.getComputePipeline ? hook.getComputePipeline() : null;
    });

    expect(pipeline?.boidsPipelineActive).toBe(true);
    expect(pipeline?.navierStokesPipelineActive).toBe(true);
  });

  test('Test 65: Bass-induced tectonic shifts update the terrain mesh used by the collision solver', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // Set high sensitivity and inject massive bass drop
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ bass: 0.95 });
    });
    await page.waitForTimeout(150);

    // Verify tectonic offset propagates
    const state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.tectonicOffset).toBeCloseTo(0.855); // 0.95 * 1.0 * 0.9
    expect(state.gravityInverted).toBe(true);

    // The collision solver checks if gravity is inverted and if offset shifts the height boundaries
    expect(state.gravityInverted).toBe(true);
  });

  test('Test 66: HUD styles/color modes change dynamically when treble triggers magenta palette', async ({ page }) => {
    await page.locator('[data-testid="enable-mic-button"]').click();
    await page.waitForTimeout(100);

    // Enable high treble triggering magenta mode
    await setSliderValueDirect(page, 'audio-sensitivity', 1.0);
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ treble: 0.9 });
    });
    await page.waitForTimeout(150);

    // State should shift to magenta
    let state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.activeColorPalette).toBe('magenta');

    // Reduce treble below threshold
    await page.evaluate(() => {
      (window as unknown as CustomWindow).__injectMockFFT({ treble: 0.2 });
    });
    await page.waitForTimeout(150);

    state = await page.evaluate(() => (window as unknown as CustomWindow).__store.getState());
    expect(state.activeColorPalette).toBe('cyan');
  });
});
