import type { RoofParams, Point, TileParams } from './types';

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
