import type { Tile, TileParams, ValidationResult, OverlapViolation } from './types';
import type { SingleTileAdjustmentValidation } from './types';

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
): SingleTileAdjustmentValidation {
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

export function buildValidationMessage(validation: ValidationResult): string {
  return validation.isValid
    ? '所有瓦片排布符合约束要求'
    : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`;
}

export function buildPostChangeValidationMessage(validation: ValidationResult): string {
  return validation.isValid
    ? ''
    : `参数变更后检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`;
}
