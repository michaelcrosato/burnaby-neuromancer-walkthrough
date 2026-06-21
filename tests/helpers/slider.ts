import { Page, expect } from '@playwright/test';

/**
 * Helper to resolve an identifier to a CSS selector.
 * If the identifier looks like a CSS selector (starts with [, ., #, or contains input), it is returned directly.
 * Otherwise, it is treated as a data-testid value.
 */
function resolveSelector(identifier: string): string {
  if (
    identifier.startsWith('[') ||
    identifier.startsWith('.') ||
    identifier.startsWith('#') ||
    identifier.includes('input')
  ) {
    return identifier;
  }
  return `[data-testid="${identifier}"]`;
}

/**
 * Drags a slider element to a specific target value using mouse pointer emulation.
 */
export async function dragSliderToValue(page: Page, identifier: string, targetValue: number): Promise<void> {
  const selector = resolveSelector(identifier);
  const slider = page.locator(selector);
  await expect(slider).toBeVisible();

  const min = Number(await slider.getAttribute('min') || '0');
  const max = Number(await slider.getAttribute('max') || '100');
  
  const clampedValue = Math.max(min, Math.min(max, targetValue));
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error(`Could not find bounding box for slider: ${identifier}`);
  }

  // Calculate coordinates relative to the track percentage
  const percentage = (clampedValue - min) / (max - min);
  const targetX = box.x + (box.width * percentage);
  const targetY = box.y + (box.height / 2);

  // Move mouse to slider center, press down, drag to target, and release
  const startX = box.x + (box.width / 2);
  const startY = box.y + (box.height / 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();

  // Wait briefly for state synchronization
  await page.waitForTimeout(50);
}

/**
 * Directly modifies the DOM slider value and triggers React/Zustand event listeners.
 */
export async function setSliderValueDirect(page: Page, identifier: string, targetValue: number): Promise<void> {
  const selector = resolveSelector(identifier);
  await page.waitForSelector(selector);

  await page.evaluate(({ sel, val }) => {
    const slider = document.querySelector(sel) as HTMLInputElement;
    if (!slider) throw new Error(`Slider not found: ${sel}`);
    
    // React 16+ value setter override bypass
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(slider, String(val));
    } else {
      slider.value = String(val);
    }
    
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, val: targetValue });
}
