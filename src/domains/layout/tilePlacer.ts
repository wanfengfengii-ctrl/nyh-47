import type { RoofParams, TileParams, Tile, LayoutResult } from './types';
import type { LayoutComputationResult, LayoutManualAdjustments, OriginalPositionMap } from './types';
import { calculateRoofArea, getRoofLeftOffsetAtY, getRoofWidthAtY } from './roofGeometry';

interface PlacementRowContext {
  row: number;
  currentY: number;
  leftOffset: number;
  rowWidth: number;
  rowRightEdge: number;
  tilesInRow: number;
  actualStepX: number;
  tileWidth: number;
  tileLength: number;
}

function createPlacementContext(
  roof: RoofParams,
  tiles: TileParams
): { totalRows: number; actualStepY: number } & Pick<TileParams, 'width' | 'length'> {
  const tileWidth = tiles.width;
  const tileLength = tiles.length;
  const targetStepX = tileWidth - tiles.overlapX;
  const targetStepY = tileLength - tiles.overlapY;
  const minStepX = tileWidth - tiles.minOverlapX;
  const minStepY = tileLength - tiles.minOverlapY;

  const targetRows = Math.ceil((roof.height - tileLength) / targetStepY) + 1;
  const minRows = Math.ceil((roof.height - tileLength) / minStepY) + 1;
  const totalRows = Math.max(targetRows, minRows);
  const actualStepY = totalRows > 1 ? (roof.height - tileLength) / (totalRows - 1) : 0;

  void targetStepX;
  void minStepX;

  return { totalRows, actualStepY, width: tileWidth, length: tileLength };
}

function buildRowContext(
  roof: RoofParams,
  row: number,
  ctx: ReturnType<typeof createPlacementContext>,
  tiles: TileParams
): PlacementRowContext {
  const targetStepX = ctx.width - tiles.overlapX;
  const minStepX = ctx.width - tiles.minOverlapX;

  const currentY = ctx.totalRows > 1 ? row * ctx.actualStepY : 0;
  const midY = currentY + ctx.length / 2;
  const leftOffset = getRoofLeftOffsetAtY(roof, Math.min(midY, roof.height));
  const rowWidth = getRoofWidthAtY(roof, Math.min(midY, roof.height));
  const rowRightEdge = leftOffset + rowWidth;

  const targetTilesInRow = Math.ceil((rowWidth - ctx.width) / targetStepX) + 1;
  const minTilesInRow = Math.ceil((rowWidth - ctx.width) / minStepX) + 1;
  const tilesInRow = Math.max(targetTilesInRow, minTilesInRow);
  const actualStepX = tilesInRow > 1 ? (rowWidth - ctx.width) / (tilesInRow - 1) : 0;

  return {
    row,
    currentY,
    leftOffset,
    rowWidth,
    rowRightEdge,
    tilesInRow,
    actualStepX,
    tileWidth: ctx.width,
    tileLength: ctx.length,
  };
}

function placeTileInRow(
  rowCtx: PlacementRowContext,
  colIndex: number,
  roof: RoofParams
): Tile | null {
  const { row, currentY, leftOffset, rowRightEdge, tilesInRow, actualStepX, tileWidth, tileLength } = rowCtx;

  const tileX = leftOffset + (tilesInRow > 1 ? colIndex * actualStepX : 0);
  const tileY = currentY;

  const tileLeftEdge = tileX;
  const tileRightEdge = tileX + tileWidth;
  const tileTopEdge = tileY;
  const tileBottomEdge = tileY + tileLength;

  let finalX = tileX;
  let finalY = tileY;
  let finalWidth = tileWidth;
  let finalHeight = tileLength;
  let isCut = false;
  let cutType: Tile['cutType'];
  const originalWidth = tileWidth;
  const originalHeight = tileLength;

  const leftOverlap = tileLeftEdge - leftOffset;
  const rightOverlap = rowRightEdge - tileRightEdge;
  const topOverlap = tileTopEdge;
  const bottomOverlap = roof.height - tileBottomEdge;

  if (leftOverlap < 0) {
    finalX = leftOffset;
    finalWidth = tileWidth + leftOverlap;
    isCut = true;
    cutType = 'left';
  }

  if (rightOverlap < 0) {
    finalWidth = finalWidth + rightOverlap;
    isCut = true;
    cutType = cutType === 'left' ? 'both' : 'right';
  }

  if (topOverlap < 0) {
    finalY = 0;
    finalHeight = tileLength + topOverlap;
    isCut = true;
  }

  if (bottomOverlap < 0) {
    finalHeight = finalHeight + bottomOverlap;
    isCut = true;
  }

  if (finalWidth <= 0 || finalHeight <= 0) return null;

  return {
    id: `${row}-${colIndex}`,
    x: finalX,
    y: finalY,
    width: finalWidth,
    height: finalHeight,
    isFull: !isCut,
    isCut,
    cutType,
    originalWidth,
    originalHeight,
    manuallyAdjusted: false,
    row,
    col: colIndex,
  };
}

function buildLayoutResult(tiles: Tile[], roofArea: number): LayoutResult {
  const fullTileCount = tiles.filter((t) => t.isFull).length;
  const cutTileCount = tiles.filter((t) => t.isCut).length;
  const totalTileCount = tiles.length;

  const totalTileArea = tiles.reduce((sum, t) => {
    const w = t.originalWidth ?? t.width;
    const h = t.originalHeight ?? t.height;
    return sum + w * h;
  }, 0);

  const wasteRate = totalTileArea > 0 ? (totalTileArea - roofArea) / totalTileArea : 0;

  return {
    tiles,
    fullTileCount,
    cutTileCount,
    totalTileCount,
    wasteRate: Math.max(0, wasteRate),
    totalTileArea,
    roofArea,
  };
}

export function computeLayoutWithOriginals(
  roof: RoofParams,
  tiles: TileParams,
  manualAdjustments: LayoutManualAdjustments = {}
): LayoutComputationResult {
  const ctx = createPlacementContext(roof, tiles);
  const tileList: Tile[] = [];
  const originalPositions: OriginalPositionMap = {};
  const roofArea = calculateRoofArea(roof);

  for (let row = 0; row < ctx.totalRows; row++) {
    const rowCtx = buildRowContext(roof, row, ctx, tiles);
    let col = 0;

    for (let i = 0; i < rowCtx.tilesInRow; i++) {
      const placed = placeTileInRow(rowCtx, i, roof);
      if (!placed) continue;

      originalPositions[placed.id] = { x: placed.x, y: placed.y };

      const adjustment = manualAdjustments[placed.id];
      if (adjustment) {
        placed.x = adjustment.x;
        placed.y = adjustment.y;
        placed.manuallyAdjusted = true;
      }

      tileList.push(placed);
      col++;
    }
  }

  return {
    layout: buildLayoutResult(tileList, roofArea),
    originalPositions,
  };
}
