/**
 * Burnaby Terrain Generator
 * Returns a 16x16 elevation grid (256 vertices total)
 */
let cachedDefaultTerrain: number[] | null = null;

export function generateBurnabyTerrain(): number[] {
  if (typeof window !== 'undefined' && Array.isArray((window as any).__terrain_override) && (window as any).__terrain_override.length === 256) {
    return (window as any).__terrain_override;
  }

  if (cachedDefaultTerrain) {
    return cachedDefaultTerrain;
  }

  const H_base = 1.0;
  
  const computeElevation = (u: number, v: number): number => {
    // H_mtn centered at (0.7415, 0.7562) with amplitude 12.0, slopes sigma_u = 0.14, sigma_v = 0.16
    const H_mtn = 12.0 * Math.exp(
      -(Math.pow(u - 0.7415, 2) / (2.0 * Math.pow(0.14, 2)) +
        Math.pow(v - 0.7562, 2) / (2.0 * Math.pow(0.16, 2)))
    );

    // H_inlet north depression (v > 0.8)
    const H_inlet = v > 0.8
      ? -4.0 * Math.exp(-Math.pow(v - 0.92, 2) / (2.0 * Math.pow(0.08, 2)))
      : 0.0;

    // H_lake center-left depression at (0.38, 0.54)
    const H_lake = -2.5 * Math.exp(
      -(Math.pow(u - 0.38, 2) / (2.0 * Math.pow(0.06, 2)) +
        Math.pow(v - 0.54, 2) / (2.0 * Math.pow(0.04, 2)))
    );

    // H_river winding south channel
    const H_river = -3.0 * Math.exp(
      -Math.pow(v - (0.05 + 0.05 * Math.sin(Math.PI * u)), 2) / (2.0 * Math.pow(0.03, 2))
    );

    return Math.max(0.0, H_base + H_mtn + H_inlet + H_lake + H_river);
  };

  const cols = 16;
  const rows = 16;
  const computedData: number[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const v = r / (rows - 1);
      computedData.push(computeElevation(u, v));
    }
  }

  cachedDefaultTerrain = computedData;
  return computedData;
}

if (typeof window !== 'undefined') {
  (window as any).generateBurnabyTerrain = generateBurnabyTerrain;
}
