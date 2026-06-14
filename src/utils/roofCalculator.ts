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
  const stepX = tileWidth - tiles.overlapX;
  const stepY = tileLength - tiles.overlapY;

  const tileList: Tile[] = [];
  const roofArea = calculateRoofArea(roof);

  let row = 0;
  let currentY = 0;

  while (currentY < roof.height) {
    const leftOffset = getRoofLeftOffsetAtY(roof, currentY);
    const rowWidth = getRoofWidthAtY(roof, currentY);
    const rowRightEdge = leftOffset + rowWidth;

    const nextY = currentY + stepY;
    const nextLeftOffset = getRoofLeftOffsetAtY(roof, Math.min(nextY, roof.height));
    const nextRowWidth = getRoofWidthAtY(roof, Math.min(nextY, roof.height));
    const nextRowRightEdge = nextLeftOffset + nextRowWidth;

    const effectiveLeft = Math.min(leftOffset, nextLeftOffset);
    const effectiveRight = Math.max(rowRightEdge, nextRowRightEdge);

    const tilesInRow = Math.ceil((effectiveRight - effectiveLeft) / stepX) + 1;

    let col = 0;
    for (let i = 0; i < tilesInRow; i++) {
      const tileX = effectiveLeft + i * stepX;
      const tileY = currentY;

      const tileLeftEdge = tileX;
      const tileRightEdge = tileX + tileWidth;
      const tileTopEdge = tileY;
      const tileBottomEdge = tileY + tileLength;

      const midY = tileY + tileLength / 2;
      const midLeftOffset = getRoofLeftOffsetAtY(roof, Math.min(midY, roof.height));
      const midRowWidth = getRoofWidthAtY(roof, Math.min(midY, roof.height));
      const midRightEdge = midLeftOffset + midRowWidth;

      const tileCenterX = tileX + tileWidth / 2;
      const isInsideRoof = tileCenterX >= midLeftOffset && tileCenterX <= midRightEdge;

      if (!isInsideRoof && tileRightEdge < midLeftOffset) continue;
      if (!isInsideRoof && tileLeftEdge > midRightEdge) continue;

      let finalX = tileX;
      let finalY = tileY;
      let finalWidth = tileWidth;
      let finalHeight = tileLength;
      let isCut = false;
      let cutType: Tile['cutType'];
      let originalWidth = tileWidth;
      let originalHeight = tileLength;

      const leftOverlap = tileLeftEdge - midLeftOffset;
      const rightOverlap = midRightEdge - tileRightEdge;
      const topOverlap = tileTopEdge;
      const bottomOverlap = roof.height - tileBottomEdge;

      if (leftOverlap < 0) {
        finalX = midLeftOffset;
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

    currentY = nextY;
    row++;
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
