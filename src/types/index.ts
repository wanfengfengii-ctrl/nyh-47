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
