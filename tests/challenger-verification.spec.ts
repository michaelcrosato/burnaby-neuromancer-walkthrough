import { test, expect } from '@playwright/test';
import { injectWebGPUMock } from './mocks/webgpu-mock';

test.describe('WebGPU Feature Check Failure Paths', () => {
  test('handles missing navigator.gpu gracefully', async ({ page }) => {
    // Inject undefined navigator.gpu
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'gpu', {
        value: undefined,
        configurable: true
      });
    });

    await page.goto('/');

    // Wait for the status checking to complete
    const errorHeading = page.locator('h2');
    await expect(errorHeading).toHaveText('WebGPU Initialization Failed');

    const errorMessage = page.locator('p').first();
    await expect(errorMessage).toContainText('navigator.gpu is undefined');
  });

  test('handles requestAdapter returning null gracefully', async ({ page }) => {
    // Inject mock GPU with requestAdapter returning null
    await page.addInitScript(() => {
      const mockGpu = {
        requestAdapter: async () => null,
      };
      Object.defineProperty(navigator, 'gpu', {
        value: mockGpu,
        configurable: true
      });
    });

    await page.goto('/');

    const errorHeading = page.locator('h2');
    await expect(errorHeading).toHaveText('WebGPU Initialization Failed');

    const errorMessage = page.locator('p').first();
    await expect(errorMessage).toContainText('no compatible GPU adapter was found');
  });

  test('handles requestDevice throwing error gracefully', async ({ page }) => {
    // Inject mock GPU with requestDevice throwing an error
    await page.addInitScript(() => {
      const mockAdapter = {
        requestDevice: async () => {
          throw new Error('Simulated GPU connection failure');
        }
      };
      const mockGpu = {
        requestAdapter: async () => mockAdapter,
      };
      Object.defineProperty(navigator, 'gpu', {
        value: mockGpu,
        configurable: true
      });
    });

    await page.goto('/');

    const errorHeading = page.locator('h2');
    await expect(errorHeading).toHaveText('WebGPU Initialization Failed');

    const errorMessage = page.locator('p').first();
    await expect(errorMessage).toContainText('Simulated GPU connection failure');
  });
});

test.describe('Layout Responsiveness & Bounding Boxes', () => {
  test('verifies HUD position and checks for viewport overflow on mobile SE (320px)', async ({ page }) => {
    // Set mobile viewport width
    await page.setViewportSize({ width: 320, height: 568 });

    // Mock WebGPU to pass so HUD is rendered
    await page.addInitScript(injectWebGPUMock);

    await page.goto('/');

    // Wait for the HUD to load
    const hud = page.locator('text=SYSTEM HUD // ACTIVE').locator('..').locator('..');
    await expect(hud).toBeVisible();

    // Get bounding boxes
    const hudBox = await hud.boundingBox();
    expect(hudBox).not.toBeNull();

    if (hudBox) {
      console.log(`Mobile Viewport (320x568) - HUD Bounding Box:`, hudBox);
      
      const hudRight = hudBox.x + hudBox.width;
      const hudBottom = hudBox.y + hudBox.height;

      // Verify width and height bounds
      console.log(`HUD Right Edge: ${hudRight}px, Viewport Width: 320px`);
      console.log(`HUD Bottom Edge: ${hudBottom}px, Viewport Height: 568px`);

      // Check for horizontal overflow
      const horizontalOverflow = hudRight > 320;
      console.log(`Horizontal Overflow Detected: ${horizontalOverflow}`);
    }
  });

  test('verifies HUD does not overflow on standard desktop (1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.addInitScript(injectWebGPUMock);

    await page.goto('/');

    const hud = page.locator('text=SYSTEM HUD // ACTIVE').locator('..').locator('..');
    await expect(hud).toBeVisible();

    const hudBox = await hud.boundingBox();
    expect(hudBox).not.toBeNull();

    if (hudBox) {
      const hudRight = hudBox.x + hudBox.width;
      const hudBottom = hudBox.y + hudBox.height;

      expect(hudRight).toBeLessThanOrEqual(1280);
      expect(hudBottom).toBeLessThanOrEqual(720);
    }
  });

  test('verifies HUD behavior on short landscape viewport (640x320) - check for vertical overflow', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 320 });

    await page.addInitScript(injectWebGPUMock);

    await page.goto('/');

    const hud = page.locator('text=SYSTEM HUD // ACTIVE').locator('..').locator('..');
    await expect(hud).toBeVisible();

    const hudBox = await hud.boundingBox();
    expect(hudBox).not.toBeNull();

    if (hudBox) {
      console.log(`Landscape Viewport (640x320) - HUD Bounding Box:`, hudBox);
      const hudBottom = hudBox.y + hudBox.height;
      console.log(`HUD Bottom Edge: ${hudBottom}px, Viewport Height: 320px`);
      const verticalOverflow = hudBottom > 320;
      console.log(`Vertical Overflow Detected: ${verticalOverflow}`);
    }
  });
});
