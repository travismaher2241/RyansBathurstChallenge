// Shared visual/physical dimensions. These do not alter the centreline or road widths.
export const ROAD_KERB_WIDTH_M = 1.35;
export const CAR_HALF_WIDTH_M = 1.05;

export function getCuttingWallHeight(s: number): number {
  if (s < 1440 || s > 1960) return 0;
  if (s < 1510) return 1.2 + 6.6 * (s - 1440) / 70;
  if (s <= 1920) return 7.8 + Math.sin(s * 0.11) * 0.45;
  return 7.8 - 6.6 * (s - 1920) / 40;
}

export function getCuttingWallOffset(roadWidthM: number): number {
  return roadWidthM / 2 + ROAD_KERB_WIDTH_M + 0.35;
}
