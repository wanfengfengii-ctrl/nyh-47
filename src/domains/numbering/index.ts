import type { Tile, NumberingScheme, NumberingResult, TileNumbering } from '@/types';

export type NumberingSchemeType = NumberingScheme;

export interface NumberingGenerationInput {
  tiles: Tile[];
  scheme: NumberingSchemeType;
}

export const NUMBERING_SCHEME_LABELS: Record<NumberingSchemeType, { label: string; description: string }> = {
  'slope-row-col': {
    label: '坡面-行-列',
    description: '格式 S1-R1-C1：坡面号-行号-列号，适合多坡面屋面。',
  },
  'row-col': {
    label: '行-列',
    description: '格式 R1-C1：行号-列号，简洁明了，适用于单坡面。',
  },
  'snake-row': {
    label: '蛇形行列',
    description: '蛇形排列：奇数行从左到右，偶数行从右到左，便于流水施工。',
  },
};

export const NUMBERING_SCHEME_OPTIONS = [
  { value: 'slope-row-col' as const, label: '坡面-行-列' },
  { value: 'row-col' as const, label: '行-列' },
  { value: 'snake-row' as const, label: '蛇形行列' },
];

function sortTilesForNumbering(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

function formatRowCol(tile: Tile): { displayRow: number; displayCol: number } {
  return {
    displayRow: tile.row + 1,
    displayCol: tile.col + 1,
  };
}

function formatSlopeRowCol(tile: Tile): string {
  const { displayRow, displayCol } = formatRowCol(tile);
  return `S1-R${displayRow}-C${displayCol}`;
}

function formatRowColSimple(tile: Tile): string {
  const { displayRow, displayCol } = formatRowCol(tile);
  return `R${displayRow}-C${displayCol}`;
}

function formatSnakeRow(tile: Tile, sortedTiles: Tile[]): string {
  const { displayRow } = formatRowCol(tile);
  const isEvenRow = tile.row % 2 === 0;
  const rowTiles = sortedTiles.filter((t) => t.row === tile.row);
  const colCount = rowTiles.length;
  const snakeCol = isEvenRow ? tile.col + 1 : colCount - tile.col;
  return `R${displayRow}-C${snakeCol}`;
}

export function generateTileNumbering(
  tiles: Tile[],
  scheme: NumberingSchemeType = 'slope-row-col'
): NumberingResult {
  const numberingMap: Record<string, TileNumbering> = {};
  const sortedTiles = sortTilesForNumbering(tiles);

  let globalSeq = 1;

  sortedTiles.forEach((tile) => {
    let displayNumber: string;
    const { displayRow, displayCol } = formatRowCol(tile);

    switch (scheme) {
      case 'slope-row-col':
        displayNumber = formatSlopeRowCol(tile);
        break;
      case 'row-col':
        displayNumber = formatRowColSimple(tile);
        break;
      case 'snake-row':
        displayNumber = formatSnakeRow(tile, sortedTiles);
        break;
      default:
        displayNumber = formatRowColSimple(tile);
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

  return {
    numberingMap,
    scheme,
    totalTiles: tiles.length,
  };
}

export function searchNumbering(
  numberingResult: NumberingResult,
  keyword: string,
  limit = 10
): TileNumbering[] {
  if (!keyword.trim()) return [];
  const kw = keyword.toLowerCase();
  return Object.values(numberingResult.numberingMap)
    .filter(
      (n) =>
        n.displayNumber.toLowerCase().includes(kw) ||
        String(n.rowNumber).includes(kw) ||
        String(n.colNumber).includes(kw) ||
        n.tileId.toLowerCase().includes(kw)
    )
    .slice(0, limit);
}

export function getSampleRows(
  tiles: Tile[],
  maxRows = 4
): Array<{ rowNum: number; tiles: Tile[] }> {
  const rows = new Map<number, Tile[]>();
  tiles.forEach((tile) => {
    if (!rows.has(tile.row)) {
      rows.set(tile.row, []);
    }
    rows.get(tile.row)!.push(tile);
  });
  const sortedRowKeys = Array.from(rows.keys()).sort((a, b) => a - b);
  return sortedRowKeys.slice(0, maxRows).map((rowNum) => {
    const rowTiles = rows.get(rowNum)!.sort((a, b) => a.col - b.col);
    return { rowNum, tiles: rowTiles };
  });
}

export const numberingDomain = {
  generate: generateTileNumbering,
  search: searchNumbering,
  getSampleRows,
  SCHEME_LABELS: NUMBERING_SCHEME_LABELS,
  SCHEME_OPTIONS: NUMBERING_SCHEME_OPTIONS,
};
