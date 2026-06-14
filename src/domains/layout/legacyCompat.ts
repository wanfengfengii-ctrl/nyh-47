import type { RoofParams, TileParams, Tile, LayoutResult } from './types';
import { computeLayoutWithOriginals } from './tilePlacer';
import type { LayoutManualAdjustments } from './types';

export function calculateLayout(
  roof: RoofParams,
  tiles: TileParams,
  manualAdjustments: LayoutManualAdjustments = {}
): LayoutResult {
  return computeLayoutWithOriginals(roof, tiles, manualAdjustments).layout;
}

void 0 as unknown as Tile;
