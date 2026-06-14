import type { RoofParams, TileParams, Tile, LayoutResult, Point } from '@/types';

export function calculateRoofArea(roof: RoofParams): number {
  switch (roof.shape) {
    case 'rectangle':
      return roof.width * roof.height;
    case 'trapezoid': {
      const topWidth = roof.topWidth ?? roof.width * 0.6;
      return ((topWidth + roof.width) * roof.height) / 2;
    }
    case 'curved': {
      const curveDepth = roof.curveDepth ?? roof.height * 0.2;
      return roof.width * roof.height * (1 + curveDepth / roof.height * 0.5);
    }
    default:
      return roof.width * roof.height;
  }
}

export function getRoofWidthAtY(roof: RoofParams, y: number): number {
  const t = y / roof.height;
  switch (roof.shape) {
    case 'rectangle':
      return roof.width;
    case 'trapezoid': {
      const topWidth = roof.topWidth ?? roof.width * 0.6;
      return roof.width + (topWidth - roof.width) * t;
    }
    case 'curved': {
      const curveDepth = roof.curveDepth ?? roof.height * 0.2;
      const midY = roof.height / 2;
      const bulge = Math.sin((y / roof.height) * Math.PI) * curveDepth;
      return roof.width + bulge * 2;
    }
    default:
      return roof.width;
  }
}

export function getRoofLeftOffsetAtY(roof: RoofParams, y: number): number {
  const widthAtY = getRoofWidthAtY(roof, y);
  return (roof.width - widthAtY) / 2;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function validateTileParams(tiles: TileParams): string[] {
  const errors: string[] = [];
  if (tiles.width <= 0) errors.push('瓦片宽度必须大于零');
  if (tiles.length <= 0) errors.push('瓦片长度必须大于零');
  if (tiles.overlapX <= 0) errors.push('横向搭接距离必须大于零');
  if (tiles.overlapY <= 0) errors.push('纵向搭接距离必须大于零');
  if (tiles.overlapX >= tiles.width) errors.push('横向搭接距离不能大于等于瓦片宽度');
  if (tiles.overlapY >= tiles.length) errors.push('纵向搭接距离不能大于等于瓦片长度');
  if (tiles.minOverlapX > tiles.overlapX) errors.push('最小横向搭接不能大于设定搭接距离');
  if (tiles.minOverlapY > tiles.overlapY) errors.push('最小纵向搭接不能大于设定搭接距离');
  return errors;
}

export function validateRoofParams(roof: RoofParams): string[] {
  const errors: string[] = [];
  if (roof.width <= 0) errors.push('屋面宽度必须大于零');
  if (roof.height <= 0) errors.push('屋面高度必须大于零');
  if (roof.shape === 'trapezoid' && roof.topWidth !== undefined && roof.topWidth <= 0) {
    errors.push('屋面顶宽必须大于零');
  }
  if (roof.shape === 'curved' && roof.curveDepth !== undefined && roof.curveDepth < 0) {
    errors.push('屋面起拱高度不能为负');
  }
  return errors;
}

export function calculateLayout(
  roof: RoofParams,
  tiles: TileParams,
  manualAdjustments: Record<string, { x: number; y: number }> = {}
): LayoutResult {
  const tileWidth = tiles.width;
  const tileLength = tiles.length;
  const targetStepX = tileWidth - tiles.overlapX;
  const targetStepY = tileLength - tiles.overlapY;
  const minStepX = tileWidth - tiles.minOverlapX;
  const minStepY = tileLength - tiles.minOverlapY;

  const tileList: Tile[] = [];
  const roofArea = calculateRoofArea(roof);

  const targetRows = Math.ceil((roof.height - tileLength) / targetStepY) + 1;
  const minRows = Math.ceil((roof.height - tileLength) / minStepY) + 1;
  const totalRows = Math.max(targetRows, minRows);

  const actualStepY = totalRows > 1 ? (roof.height - tileLength) / (totalRows - 1) : 0;

  for (let row = 0; row < totalRows; row++) {
    const currentY = totalRows > 1 ? row * actualStepY : 0;

    const midY = currentY + tileLength / 2;
    const leftOffset = getRoofLeftOffsetAtY(roof, Math.min(midY, roof.height));
    const rowWidth = getRoofWidthAtY(roof, Math.min(midY, roof.height));
    const rowRightEdge = leftOffset + rowWidth;

    const targetTilesInRow = Math.ceil((rowWidth - tileWidth) / targetStepX) + 1;
    const minTilesInRow = Math.ceil((rowWidth - tileWidth) / minStepX) + 1;
    const tilesInRow = Math.max(targetTilesInRow, minTilesInRow);

    const actualStepX = tilesInRow > 1 ? (rowWidth - tileWidth) / (tilesInRow - 1) : 0;

    let col = 0;
    for (let i = 0; i < tilesInRow; i++) {
      const tileX = leftOffset + (tilesInRow > 1 ? i * actualStepX : 0);
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
      let originalWidth = tileWidth;
      let originalHeight = tileLength;

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

      if (finalWidth <= 0 || finalHeight <= 0) continue;

      const tileId = `${row}-${col}`;
      const adjustment = manualAdjustments[tileId];

      if (adjustment) {
        finalX = adjustment.x;
        finalY = adjustment.y;
      }

      tileList.push({
        id: tileId,
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight,
        isFull: !isCut,
        isCut,
        cutType,
        originalWidth,
        originalHeight,
        manuallyAdjusted: !!adjustment,
        row,
        col,
      });

      col++;
    }
  }

  const fullTileCount = tileList.filter((t) => t.isFull).length;
  const cutTileCount = tileList.filter((t) => t.isCut).length;
  const totalTileCount = tileList.length;

  const totalTileArea = tileList.reduce((sum, t) => {
    const w = t.originalWidth ?? t.width;
    const h = t.originalHeight ?? t.height;
    return sum + w * h;
  }, 0);

  const wasteRate = totalTileArea > 0 ? (totalTileArea - roofArea) / totalTileArea : 0;

  return {
    tiles: tileList,
    fullTileCount,
    cutTileCount,
    totalTileCount,
    wasteRate: Math.max(0, wasteRate),
    totalTileArea,
    roofArea,
  };
}

export function getRoofBoundaryPoints(roof: RoofParams, segments = 50): Point[] {
  const points: Point[] = [];

  for (let i = 0; i <= segments; i++) {
    const y = (i / segments) * roof.height;
    const leftOffset = getRoofLeftOffsetAtY(roof, y);
    points.push({ x: leftOffset, y });
  }

  for (let i = segments; i >= 0; i--) {
    const y = (i / segments) * roof.height;
    const leftOffset = getRoofLeftOffsetAtY(roof, y);
    const widthAtY = getRoofWidthAtY(roof, y);
    points.push({ x: leftOffset + widthAtY, y });
  }

  return points;
}

export function isPointInRoof(roof: RoofParams, x: number, y: number): boolean {
  if (y < 0 || y > roof.height) return false;
  const leftOffset = getRoofLeftOffsetAtY(roof, y);
  const widthAtY = getRoofWidthAtY(roof, y);
  return x >= leftOffset && x <= leftOffset + widthAtY;
}
