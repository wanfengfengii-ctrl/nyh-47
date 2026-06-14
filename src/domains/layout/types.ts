import type { RoofParams, TileParams, Tile, LayoutResult, Point, OverlapViolation, ValidationResult } from '@/types';

export type LayoutManualAdjustments = Record<string, { x: number; y: number }>;

export type OriginalPositionMap = Record<string, { x: number; y: number }>;

export interface LayoutComputationInput {
  roof: RoofParams;
  tiles: TileParams;
  manualAdjustments?: LayoutManualAdjustments;
}

export interface LayoutComputationResult {
  layout: LayoutResult;
  originalPositions: OriginalPositionMap;
}

export interface SingleTileAdjustmentValidation {
  isValid: boolean;
  violations: OverlapViolation[];
  message: string;
}

export {
  type RoofParams,
  type TileParams,
  type Tile,
  type LayoutResult,
  type Point,
  type ValidationResult,
  type OverlapViolation,
};
