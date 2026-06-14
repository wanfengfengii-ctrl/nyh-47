export type RoofShape = 'rectangle' | 'trapezoid' | 'curved';

export interface RoofParams {
  shape: RoofShape;
  width: number;
  height: number;
  topWidth?: number;
  curveDepth?: number;
}

export interface TileParams {
  tileType: 'round' | 'flat';
  width: number;
  length: number;
  overlapX: number;
  overlapY: number;
  minOverlapX: number;
  minOverlapY: number;
}

export interface Tile {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isFull: boolean;
  isCut: boolean;
  cutType?: 'left' | 'right' | 'top' | 'bottom' | 'both';
  originalWidth?: number;
  originalHeight?: number;
  manuallyAdjusted?: boolean;
  row: number;
  col: number;
}

export interface LayoutResult {
  tiles: Tile[];
  fullTileCount: number;
  cutTileCount: number;
  totalTileCount: number;
  wasteRate: number;
  totalTileArea: number;
  roofArea: number;
}

export interface ProjectData {
  roof: RoofParams;
  tiles: TileParams;
  layout: LayoutResult;
  manualAdjustments: Record<string, { x: number; y: number }>;
  wasteThreshold: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface OverlapViolation {
  tileId: string;
  type: 'horizontal' | 'vertical';
  direction: 'left' | 'right' | 'top' | 'bottom';
  adjacentTileId: string;
  actualOverlap: number;
  requiredOverlap: number;
}

export interface ValidationResult {
  isValid: boolean;
  violations: OverlapViolation[];
  invalidTileIds: string[];
}

export interface TileWithOriginal extends Tile {
  originalX: number;
  originalY: number;
}

export type NumberingScheme = 'slope-row-col' | 'row-col' | 'snake-row';

export type ConstructionDirection = 'bottom-up' | 'top-down' | 'left-right' | 'right-left';

export interface TileNumbering {
  tileId: string;
  displayNumber: string;
  slopeNumber: number;
  rowNumber: number;
  colNumber: number;
  globalSequence: number;
}

export interface MaterialGroup {
  groupKey: string;
  groupName: string;
  isCut: boolean;
  cutType?: Tile['cutType'];
  width: number;
  height: number;
  count: number;
  totalArea: number;
  tileIds: string[];
}

export interface ConstructionStep {
  stepNumber: number;
  tileIds: string[];
  description: string;
  row?: number;
  estimatedArea: number;
}

export interface NumberingResult {
  numberingMap: Record<string, TileNumbering>;
  scheme: NumberingScheme;
  totalTiles: number;
}

export interface MaterialStatsResult {
  groups: MaterialGroup[];
  fullTileGroups: MaterialGroup[];
  cutTileGroups: MaterialGroup[];
  summary: {
    totalGroups: number;
    fullTileCount: number;
    cutTileCount: number;
    totalTileCount: number;
    totalArea: number;
  };
}

export interface ConstructionSequenceResult {
  steps: ConstructionStep[];
  direction: ConstructionDirection;
  totalSteps: number;
}

export interface ConstructionListExportData {
  projectInfo: {
    exportDate: string;
    roofShape: string;
    roofWidth: number;
    roofHeight: number;
    roofArea: number;
    tileType: string;
    tileWidth: number;
    tileHeight: number;
  };
  numbering: NumberingResult;
  materials: MaterialStatsResult;
  sequence: ConstructionSequenceResult;
  tileDetails: Array<Tile & { displayNumber: string; globalSequence: number }>;
}

export type SelectionMode = 'single' | 'multi' | 'box';

export interface ConstructionListFilter {
  includeFullTiles: boolean;
  includeCutTiles: boolean;
  selectedGroups: string[];
  selectedSteps: number[];
  searchKeyword: string;
}

export type HighlightSource = 'none' | 'step' | 'material' | 'selection' | 'numbering';
