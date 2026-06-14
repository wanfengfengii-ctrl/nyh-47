import type { RoofParams, TileParams, Tile, LayoutResult, Point, OverlapViolation, ValidationResult, NumberingScheme, NumberingResult, TileNumbering, MaterialStatsResult, MaterialGroup, ConstructionDirection, ConstructionSequenceResult, ConstructionStep, ConstructionListExportData } from '@/types';

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

export function calculateLayoutWithOriginal(
  roof: RoofParams,
  tiles: TileParams,
  manualAdjustments: Record<string, { x: number; y: number }> = {}
): { layout: LayoutResult; originalPositions: Record<string, { x: number; y: number }> } {
  const tileWidth = tiles.width;
  const tileLength = tiles.length;
  const targetStepX = tileWidth - tiles.overlapX;
  const targetStepY = tileLength - tiles.overlapY;
  const minStepX = tileWidth - tiles.minOverlapX;
  const minStepY = tileLength - tiles.minOverlapY;

  const tileList: Tile[] = [];
  const originalPositions: Record<string, { x: number; y: number }> = {};
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

      if (finalWidth <= 0 || finalHeight <= 0) continue;

      const tileId = `${row}-${col}`;
      originalPositions[tileId] = { x: finalX, y: finalY };

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
    layout: {
      tiles: tileList,
      fullTileCount,
      cutTileCount,
      totalTileCount,
      wasteRate: Math.max(0, wasteRate),
      totalTileArea,
      roofArea,
    },
    originalPositions,
  };
}

export function validateOverlapConstraints(
  tiles: Tile[],
  tileParams: TileParams
): ValidationResult {
  const violations: OverlapViolation[] = [];
  const tileMap = new Map<string, Tile>();
  
  tiles.forEach((tile) => {
    tileMap.set(tile.id, tile);
  });

  const tilesByRow = new Map<number, Tile[]>();
  const tilesByCol = new Map<number, Tile[]>();

  tiles.forEach((tile) => {
    if (!tilesByRow.has(tile.row)) {
      tilesByRow.set(tile.row, []);
    }
    tilesByRow.get(tile.row)!.push(tile);

    if (!tilesByCol.has(tile.col)) {
      tilesByCol.set(tile.col, []);
    }
    tilesByCol.get(tile.col)!.push(tile);
  });

  tilesByRow.forEach((rowTiles) => {
    rowTiles.sort((a, b) => a.x - b.x);
    
    for (let i = 0; i < rowTiles.length - 1; i++) {
      const current = rowTiles[i];
      const next = rowTiles[i + 1];
      
      const currentRight = current.x + current.width;
      const nextLeft = next.x;
      const horizontalOverlap = currentRight - nextLeft;
      
      if (horizontalOverlap < tileParams.minOverlapX) {
        violations.push({
          tileId: current.id,
          type: 'horizontal',
          direction: 'right',
          adjacentTileId: next.id,
          actualOverlap: horizontalOverlap,
          requiredOverlap: tileParams.minOverlapX,
        });
        
        violations.push({
          tileId: next.id,
          type: 'horizontal',
          direction: 'left',
          adjacentTileId: current.id,
          actualOverlap: horizontalOverlap,
          requiredOverlap: tileParams.minOverlapX,
        });
      }
    }
  });

  tilesByCol.forEach((colTiles) => {
    colTiles.sort((a, b) => a.y - b.y);
    
    for (let i = 0; i < colTiles.length - 1; i++) {
      const current = colTiles[i];
      const next = colTiles[i + 1];
      
      const currentBottom = current.y + current.height;
      const nextTop = next.y;
      const verticalOverlap = currentBottom - nextTop;
      
      if (verticalOverlap < tileParams.minOverlapY) {
        violations.push({
          tileId: current.id,
          type: 'vertical',
          direction: 'bottom',
          adjacentTileId: next.id,
          actualOverlap: verticalOverlap,
          requiredOverlap: tileParams.minOverlapY,
        });
        
        violations.push({
          tileId: next.id,
          type: 'vertical',
          direction: 'top',
          adjacentTileId: current.id,
          actualOverlap: verticalOverlap,
          requiredOverlap: tileParams.minOverlapY,
        });
      }
    }
  });

  const invalidTileIds = [...new Set(violations.map((v) => v.tileId))];

  return {
    isValid: violations.length === 0,
    violations,
    invalidTileIds,
  };
}

export function validateSingleTileAdjustment(
  tileId: string,
  newX: number,
  newY: number,
  allTiles: Tile[],
  tileParams: TileParams
): { isValid: boolean; violations: OverlapViolation[]; message: string } {
  const modifiedTiles = allTiles.map((t) =>
    t.id === tileId ? { ...t, x: newX, y: newY } : t
  );

  const result = validateOverlapConstraints(modifiedTiles, tileParams);
  
  const tileViolations = result.violations.filter(
    (v) => v.tileId === tileId
  );

  let message = '';
  if (tileViolations.length > 0) {
    const horizontalViolations = tileViolations.filter((v) => v.type === 'horizontal');
    const verticalViolations = tileViolations.filter((v) => v.type === 'vertical');
    
    const messages: string[] = [];
    if (horizontalViolations.length > 0) {
      const minActual = Math.min(...horizontalViolations.map((v) => v.actualOverlap));
      messages.push(`横向搭接不足（实际: ${minActual.toFixed(1)}mm，最小要求: ${tileParams.minOverlapX}mm）`);
    }
    if (verticalViolations.length > 0) {
      const minActual = Math.min(...verticalViolations.map((v) => v.actualOverlap));
      messages.push(`纵向搭接不足（实际: ${minActual.toFixed(1)}mm，最小要求: ${tileParams.minOverlapY}mm）`);
    }
    message = messages.join('；');
  }

  return {
    isValid: result.isValid,
    violations: tileViolations,
    message,
  };
}

export function generateTileNumbering(
  tiles: Tile[],
  scheme: NumberingScheme = 'slope-row-col'
): NumberingResult {
  const numberingMap: Record<string, TileNumbering> = {};
  const sortedTiles = [...tiles].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  let globalSeq = 1;
  const maxRow = Math.max(...tiles.map(t => t.row), 0);

  sortedTiles.forEach((tile) => {
    let displayNumber: string;
    const displayRow = tile.row + 1;
    const displayCol = tile.col + 1;

    switch (scheme) {
      case 'slope-row-col':
        displayNumber = `S1-R${displayRow}-C${displayCol}`;
        break;
      case 'row-col':
        displayNumber = `R${displayRow}-C${displayCol}`;
        break;
      case 'snake-row': {
        const isEvenRow = tile.row % 2 === 0;
        const rowTiles = sortedTiles.filter(t => t.row === tile.row);
        const colCount = rowTiles.length;
        const snakeCol = isEvenRow ? displayCol : (colCount - tile.col);
        displayNumber = `R${displayRow}-C${snakeCol}`;
        break;
      }
      default:
        displayNumber = `R${displayRow}-C${displayCol}`;
    }

    numberingMap[tile.id] = {
      tileId: tile.id,
      displayNumber,
      slopeNumber: 1,
      rowNumber: displayRow,
      colNumber: displayCol,
      globalSequence: globalSeq++,
    };
  });

  void maxRow;
  return {
    numberingMap,
    scheme,
    totalTiles: tiles.length,
  };
}

export function calculateMaterialStats(tiles: Tile[]): MaterialStatsResult {
  const groupMap = new Map<string, MaterialGroup>();

  tiles.forEach((tile) => {
    const w = Math.round(tile.width * 10) / 10;
    const h = Math.round(tile.height * 10) / 10;
    const cutKey = tile.isCut ? (tile.cutType || 'cut') : 'full';
    const groupKey = `${cutKey}-${w}x${h}`;

    const existing = groupMap.get(groupKey);
    if (existing) {
      existing.count++;
      existing.totalArea += w * h;
      existing.tileIds.push(tile.id);
    } else {
      let groupName: string;
      if (tile.isCut) {
        const cutTypeName = tile.cutType === 'left' ? '左裁切'
          : tile.cutType === 'right' ? '右裁切'
          : tile.cutType === 'top' ? '上裁切'
          : tile.cutType === 'bottom' ? '下裁切'
          : tile.cutType === 'both' ? '双侧裁切'
          : '裁切';
        groupName = `${cutTypeName}瓦 ${w}×${h}mm`;
      } else {
        groupName = `完整瓦 ${w}×${h}mm`;
      }

      groupMap.set(groupKey, {
        groupKey,
        groupName,
        isCut: tile.isCut,
        cutType: tile.cutType,
        width: w,
        height: h,
        count: 1,
        totalArea: w * h,
        tileIds: [tile.id],
      });
    }
  });

  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.isCut !== b.isCut) return a.isCut ? 1 : -1;
    return b.count - a.count;
  });

  const fullTileGroups = groups.filter(g => !g.isCut);
  const cutTileGroups = groups.filter(g => g.isCut);

  const fullTileCount = tiles.filter(t => !t.isCut).length;
  const cutTileCount = tiles.filter(t => t.isCut).length;
  const totalArea = groups.reduce((sum, g) => sum + g.totalArea, 0);

  return {
    groups,
    fullTileGroups,
    cutTileGroups,
    summary: {
      totalGroups: groups.length,
      fullTileCount,
      cutTileCount,
      totalTileCount: tiles.length,
      totalArea,
    },
  };
}

export function generateConstructionSequence(
  tiles: Tile[],
  direction: ConstructionDirection = 'bottom-up'
): ConstructionSequenceResult {
  const rows = new Map<number, Tile[]>();

  tiles.forEach((tile) => {
    if (!rows.has(tile.row)) {
      rows.set(tile.row, []);
    }
    rows.get(tile.row)!.push(tile);
  });

  const sortedRowNumbers = Array.from(rows.keys()).sort((a, b) => {
    switch (direction) {
      case 'bottom-up':
        return b - a;
      case 'top-down':
        return a - b;
      case 'left-right':
      case 'right-left':
        return a - b;
      default:
        return b - a;
    }
  });

  const steps: ConstructionStep[] = [];
  let stepNumber = 1;

  sortedRowNumbers.forEach((rowNum) => {
    const rowTiles = rows.get(rowNum)!.sort((a, b) => {
      if (direction === 'right-left') return b.x - a.x;
      return a.x - b.x;
    });

    const displayRow = rowNum + 1;
    let description: string;
    switch (direction) {
      case 'bottom-up':
        description = `第 ${displayRow} 行（从下往上施工，共 ${rowTiles.length} 块）`;
        break;
      case 'top-down':
        description = `第 ${displayRow} 行（从上往下施工，共 ${rowTiles.length} 块）`;
        break;
      case 'left-right':
        description = `第 ${displayRow} 行（从左往右施工，共 ${rowTiles.length} 块）`;
        break;
      case 'right-left':
        description = `第 ${displayRow} 行（从右往左施工，共 ${rowTiles.length} 块）`;
        break;
      default:
        description = `第 ${displayRow} 行（共 ${rowTiles.length} 块）`;
    }

    const estimatedArea = rowTiles.reduce((sum, t) => sum + t.width * t.height, 0);

    steps.push({
      stepNumber: stepNumber++,
      tileIds: rowTiles.map(t => t.id),
      description,
      row: rowNum,
      estimatedArea,
    });
  });

  return {
    steps,
    direction,
    totalSteps: steps.length,
  };
}

export function generateConstructionListExportData(
  roof: RoofParams,
  tileParams: TileParams,
  tiles: Tile[],
  scheme: NumberingScheme = 'slope-row-col',
  direction: ConstructionDirection = 'bottom-up'
): ConstructionListExportData {
  const numbering = generateTileNumbering(tiles, scheme);
  const materials = calculateMaterialStats(tiles);
  const sequence = generateConstructionSequence(tiles, direction);
  const roofArea = calculateRoofArea(roof);

  const tileDetails = tiles.map((tile) => {
    const num = numbering.numberingMap[tile.id];
    return {
      ...tile,
      displayNumber: num?.displayNumber || tile.id,
      globalSequence: num?.globalSequence || 0,
    };
  }).sort((a, b) => a.globalSequence - b.globalSequence);

  const shapeName = roof.shape === 'rectangle' ? '矩形'
    : roof.shape === 'trapezoid' ? '梯形'
    : roof.shape === 'curved' ? '弧形'
    : roof.shape;

  return {
    projectInfo: {
      exportDate: new Date().toISOString(),
      roofShape: shapeName,
      roofWidth: roof.width,
      roofHeight: roof.height,
      roofArea,
      tileType: tileParams.tileType === 'round' ? '筒瓦' : '板瓦',
      tileWidth: tileParams.width,
      tileHeight: tileParams.length,
    },
    numbering,
    materials,
    sequence,
    tileDetails,
  };
}

export function generatePrintableConstructionListHTML(data: ConstructionListExportData): string {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const rows = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>古建筑屋面施工清单</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: "SimSun", "宋体", serif;
          padding: 40px;
          background: #fff;
          color: #333;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .header .subtitle {
          font-size: 14px;
          color: #666;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          border-left: 4px solid #8b4513;
          padding-left: 10px;
          margin-bottom: 15px;
          color: #8b4513;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          font-size: 14px;
        }
        .info-item {
          padding: 8px 12px;
          background: #f9f6f0;
          border: 1px solid #e0d8c8;
        }
        .info-label {
          color: #666;
          margin-right: 8px;
        }
        .info-value {
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        th, td {
          border: 1px solid #999;
          padding: 8px 10px;
          text-align: center;
        }
        th {
          background: #8b4513;
          color: #fff;
          font-weight: bold;
        }
        tr:nth-child(even) td {
          background: #f9f6f0;
        }
        .cut-tile {
          background: #fff8e6 !important;
        }
        .summary-row td {
          background: #ede4d4 !important;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #999;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #666;
        }
        .sign-area {
          display: inline-block;
          min-width: 150px;
        }
        @media print {
          body { padding: 20px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>古建筑屋面瓦作施工清单</h1>
        <div class="subtitle">导出日期：${formatDate(data.projectInfo.exportDate)}</div>
      </div>

      <div class="section">
        <div class="section-title">一、工程概况</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">屋面形式：</span>
            <span class="info-value">${data.projectInfo.roofShape}</span>
          </div>
          <div class="info-item">
            <span class="info-label">屋面宽度：</span>
            <span class="info-value">${data.projectInfo.roofWidth} mm</span>
          </div>
          <div class="info-item">
            <span class="info-label">屋面高度：</span>
            <span class="info-value">${data.projectInfo.roofHeight} mm</span>
          </div>
          <div class="info-item">
            <span class="info-label">屋面面积：</span>
            <span class="info-value">${(data.projectInfo.roofArea / 1000000).toFixed(4)} m²</span>
          </div>
          <div class="info-item">
            <span class="info-label">瓦件类型：</span>
            <span class="info-value">${data.projectInfo.tileType}</span>
          </div>
          <div class="info-item">
            <span class="info-label">瓦件规格：</span>
            <span class="info-value">${data.projectInfo.tileWidth}×${data.projectInfo.tileHeight} mm</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">二、材料分组统计</div>
        <table>
          <thead>
            <tr>
              <th>序号</th>
              <th>材料名称</th>
              <th>规格 (mm)</th>
              <th>类型</th>
              <th>数量 (块)</th>
              <th>单块面积 (mm²)</th>
              <th>总面积 (mm²)</th>
            </tr>
          </thead>
          <tbody>
            ${data.materials.groups.map((g, i) => `
              <tr class="${g.isCut ? 'cut-tile' : ''}">
                <td>${i + 1}</td>
                <td>${g.groupName}</td>
                <td>${g.width}×${g.height}</td>
                <td>${g.isCut ? '裁切瓦' : '完整瓦'}</td>
                <td>${g.count}</td>
                <td>${(g.totalArea / g.count).toFixed(0)}</td>
                <td>${g.totalArea.toFixed(0)}</td>
              </tr>
            `).join('')}
            <tr class="summary-row">
              <td colspan="4">合计</td>
              <td>${data.materials.summary.totalTileCount}</td>
              <td>-</td>
              <td>${data.materials.summary.totalArea.toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">三、施工顺序（共 ${data.sequence.totalSteps} 步）</div>
        <table>
          <thead>
            <tr>
              <th>步骤</th>
              <th>施工内容</th>
              <th>瓦片数量 (块)</th>
              <th>估计面积 (mm²)</th>
              <th>瓦片编号</th>
            </tr>
          </thead>
          <tbody>
            ${data.sequence.steps.map((step) => `
              <tr>
                <td>${step.stepNumber}</td>
                <td>${step.description}</td>
                <td>${step.tileIds.length}</td>
                <td>${step.estimatedArea.toFixed(0)}</td>
                <td style="text-align:left;font-size:11px;">${step.tileIds.map(id => data.numbering.numberingMap[id]?.displayNumber || id).join('、')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">四、瓦片明细清单（共 ${data.tileDetails.length} 块）</div>
        <table>
          <thead>
            <tr>
              <th>序号</th>
              <th>瓦片编号</th>
              <th>行列位置</th>
              <th>类型</th>
              <th>规格 (mm)</th>
              <th>位置 X (mm)</th>
              <th>位置 Y (mm)</th>
              <th>裁切方式</th>
            </tr>
          </thead>
          <tbody>
            ${data.tileDetails.map((tile, i) => {
              const cutTypeName = tile.cutType === 'left' ? '左裁切'
                : tile.cutType === 'right' ? '右裁切'
                : tile.cutType === 'top' ? '上裁切'
                : tile.cutType === 'bottom' ? '下裁切'
                : tile.cutType === 'both' ? '双侧裁切'
                : '-';
              return `
                <tr class="${tile.isCut ? 'cut-tile' : ''}">
                  <td>${i + 1}</td>
                  <td><strong>${tile.displayNumber}</strong></td>
                  <td>第${tile.row + 1}行 第${tile.col + 1}列</td>
                  <td>${tile.isCut ? '裁切瓦' : '完整瓦'}</td>
                  <td>${tile.width.toFixed(1)}×${tile.height.toFixed(1)}</td>
                  <td>${tile.x.toFixed(1)}</td>
                  <td>${tile.y.toFixed(1)}</td>
                  <td>${cutTypeName}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div class="sign-area">
          制表人：____________
        </div>
        <div class="sign-area">
          审核人：____________
        </div>
        <div class="sign-area">
          日期：${formatDate(data.projectInfo.exportDate)}
        </div>
      </div>
    </body>
    </html>
  `;

  return rows;
}
