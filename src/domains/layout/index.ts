export * from './types';
export * from './roofGeometry';
export * from './tilePlacer';
export * from './constraintValidator';

import { computeLayoutWithOriginals } from './tilePlacer';
import { validateOverlapConstraints, validateSingleTileAdjustment } from './constraintValidator';
import { calculateRoofArea, getRoofWidthAtY, getRoofLeftOffsetAtY, getRoofBoundaryPoints, isPointInRoof, validateRoofParams, validateTileParams } from './roofGeometry';
import type { LayoutComputationResult, LayoutManualAdjustments, OriginalPositionMap, RoofParams, TileParams } from './types';

export interface FullLayoutDerivationInput {
  roof: RoofParams;
  tiles: TileParams;
  manualAdjustments?: LayoutManualAdjustments;
}

export interface FullLayoutDerivationResult extends LayoutComputationResult {
  validation: ReturnType<typeof validateOverlapConstraints>;
}

export function deriveFullLayoutState(input: FullLayoutDerivationInput): FullLayoutDerivationResult {
  const { roof, tiles, manualAdjustments = {} } = input;
  const computation = computeLayoutWithOriginals(roof, tiles, manualAdjustments);
  const validation = validateOverlapConstraints(computation.layout.tiles, tiles);
  return {
    ...computation,
    validation,
  };
}

export const layoutDomain = {
  calculateRoofArea,
  getRoofWidthAtY,
  getRoofLeftOffsetAtY,
  getRoofBoundaryPoints,
  isPointInRoof,
  validateRoofParams,
  validateTileParams,
  computeLayoutWithOriginals,
  validateOverlapConstraints,
  validateSingleTileAdjustment,
  deriveFullLayoutState,
};
