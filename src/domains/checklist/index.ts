import type {
  Tile,
  ConstructionDirection,
  ConstructionSequenceResult,
  ConstructionStep,
  MaterialStatsResult,
  MaterialGroup,
  ConstructionListFilter,
  TileNumbering,
  NumberingResult,
} from '@/types';

export type ConstructionDirectionType = ConstructionDirection;
export type ListFilter = ConstructionListFilter;

export const CONSTRUCTION_DIRECTION_LABELS: Record<ConstructionDirectionType, string> = {
  'bottom-up': '从下往上',
  'top-down': '从上往下',
  'left-right': '从左往右',
  'right-left': '从右往左',
};

export const CONSTRUCTION_DIRECTION_OPTIONS = [
  { value: 'bottom-up' as const, label: '从下往上' },
  { value: 'top-down' as const, label: '从上往下' },
  { value: 'left-right' as const, label: '从左往右' },
  { value: 'right-left' as const, label: '从右往左' },
];

export const DIRECTION_OPTIONS = CONSTRUCTION_DIRECTION_OPTIONS;

export const DEFAULT_LIST_FILTER: ListFilter = {
  includeFullTiles: true,
  includeCutTiles: true,
  selectedGroups: [],
  selectedSteps: [],
  searchKeyword: '',
};

function getCutTypeName(cutType: Tile['cutType']): string {
  return cutType === 'left'
    ? '左裁切'
    : cutType === 'right'
    ? '右裁切'
    : cutType === 'top'
    ? '上裁切'
    : cutType === 'bottom'
    ? '下裁切'
    : cutType === 'both'
    ? '双侧裁切'
    : '裁切';
}

function buildMaterialGroupName(tile: Tile, w: number, h: number): string {
  if (tile.isCut) {
    const cutTypeName = getCutTypeName(tile.cutType);
    return `${cutTypeName}瓦 ${w}×${h}mm`;
  }
  return `完整瓦 ${w}×${h}mm`;
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
      groupMap.set(groupKey, {
        groupKey,
        groupName: buildMaterialGroupName(tile, w, h),
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

  const fullTileGroups = groups.filter((g) => !g.isCut);
  const cutTileGroups = groups.filter((g) => g.isCut);

  const fullTileCount = tiles.filter((t) => !t.isCut).length;
  const cutTileCount = tiles.filter((t) => t.isCut).length;
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

function buildStepDescription(
  rowNum: number,
  direction: ConstructionDirectionType,
  tileCount: number
): string {
  const displayRow = rowNum + 1;
  switch (direction) {
    case 'bottom-up':
      return `第 ${displayRow} 行（从下往上施工，共 ${tileCount} 块）`;
    case 'top-down':
      return `第 ${displayRow} 行（从上往下施工，共 ${tileCount} 块）`;
    case 'left-right':
      return `第 ${displayRow} 行（从左往右施工，共 ${tileCount} 块）`;
    case 'right-left':
      return `第 ${displayRow} 行（从右往左施工，共 ${tileCount} 块）`;
    default:
      return `第 ${displayRow} 行（共 ${tileCount} 块）`;
  }
}

export function generateConstructionSequence(
  tiles: Tile[],
  direction: ConstructionDirectionType = 'bottom-up'
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

    const estimatedArea = rowTiles.reduce((sum, t) => sum + t.width * t.height, 0);

    steps.push({
      stepNumber: stepNumber++,
      tileIds: rowTiles.map((t) => t.id),
      description: buildStepDescription(rowNum, direction, rowTiles.length),
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

export interface ChecklistFilterContext {
  tiles: Tile[];
  groups: MaterialGroup[];
  steps: ConstructionStep[];
  numberingMap: Record<string, TileNumbering>;
}

export interface FilteredChecklistResult {
  filteredTiles: Tile[];
  filteredGroups: MaterialGroup[];
  filteredSteps: ConstructionStep[];
  hasActiveFilter: boolean;
}

function applyTileTypeFilter(tiles: Tile[], filter: ListFilter): Tile[] {
  let result = tiles;
  if (!filter.includeFullTiles) {
    result = result.filter((t) => t.isCut);
  }
  if (!filter.includeCutTiles) {
    result = result.filter((t) => !t.isCut);
  }
  return result;
}

function applyGroupFilter(tiles: Tile[], groups: MaterialGroup[], filter: ListFilter): Tile[] {
  if (filter.selectedGroups.length === 0) return tiles;
  const groupTileIds = new Set<string>();
  groups
    .filter((g) => filter.selectedGroups.includes(g.groupKey))
    .forEach((g) => g.tileIds.forEach((id) => groupTileIds.add(id)));
  return tiles.filter((t) => groupTileIds.has(t.id));
}

function applyStepFilter(tiles: Tile[], steps: ConstructionStep[], filter: ListFilter): Tile[] {
  if (filter.selectedSteps.length === 0) return tiles;
  const stepTileIds = new Set<string>();
  steps
    .filter((s) => filter.selectedSteps.includes(s.stepNumber))
    .forEach((s) => s.tileIds.forEach((id) => stepTileIds.add(id)));
  return tiles.filter((t) => stepTileIds.has(t.id));
}

function applyKeywordFilter(
  tiles: Tile[],
  numberingMap: Record<string, TileNumbering>,
  keyword: string
): Tile[] {
  if (!keyword.trim()) return tiles;
  const kw = keyword.toLowerCase();
  return tiles.filter((t) => {
    const num = numberingMap[t.id];
    return (
      num?.displayNumber.toLowerCase().includes(kw) ||
      t.id.toLowerCase().includes(kw) ||
      String(t.row + 1).includes(kw) ||
      String(t.col + 1).includes(kw)
    );
  });
}

export function applyChecklistFilter(
  ctx: ChecklistFilterContext,
  filter: ListFilter
): FilteredChecklistResult {
  const { tiles, groups, steps, numberingMap } = ctx;

  let filteredTiles = applyTileTypeFilter(tiles, filter);
  filteredTiles = applyGroupFilter(filteredTiles, groups, filter);
  filteredTiles = applyStepFilter(filteredTiles, steps, filter);
  filteredTiles = applyKeywordFilter(filteredTiles, numberingMap, filter.searchKeyword);

  const tileIdSet = new Set(filteredTiles.map((t) => t.id));

  const effectiveGroups = filter.selectedGroups.length > 0
    ? groups.filter((g) => filter.selectedGroups.includes(g.groupKey))
    : groups;

  const filteredGroups = effectiveGroups
    .map((g) => {
      const keptIds = g.tileIds.filter((id) => tileIdSet.has(id));
      return {
        ...g,
        count: keptIds.length,
        tileIds: keptIds,
        totalArea: keptIds.reduce((sum, id) => {
          const tile = tiles.find((t) => t.id === id);
          return sum + (tile ? tile.width * tile.height : 0);
        }, 0),
      };
    })
    .filter((g) => g.count > 0);

  const effectiveSteps = filter.selectedSteps.length > 0
    ? steps.filter((s) => filter.selectedSteps.includes(s.stepNumber))
    : steps;

  const filteredSteps = effectiveSteps
    .map((s) => ({
      ...s,
      tileIds: s.tileIds.filter((id) => tileIdSet.has(id)),
    }))
    .filter((s) => s.tileIds.length > 0);

  const hasActiveFilter =
    !filter.includeFullTiles ||
    !filter.includeCutTiles ||
    filter.selectedGroups.length > 0 ||
    filter.selectedSteps.length > 0 ||
    filter.searchKeyword.trim() !== '';

  return {
    filteredTiles,
    filteredGroups,
    filteredSteps,
    hasActiveFilter,
  };
}

export const checklistDomain = {
  calculateMaterialStats,
  generateConstructionSequence,
  applyChecklistFilter,
  DEFAULT_FILTER: DEFAULT_LIST_FILTER,
  DIRECTION_LABELS: CONSTRUCTION_DIRECTION_LABELS,
  DIRECTION_OPTIONS: CONSTRUCTION_DIRECTION_OPTIONS,
};

export type { NumberingResult };
