import type { Tile, SelectionMode, HighlightSource, ConstructionStep, MaterialGroup, ConstructionListFilter } from '@/types';

export type HighlightSourceType = HighlightSource;

export interface SelectionState {
  selectedTileId: string | null;
  selectedTileIds: string[];
  selectionMode: SelectionMode;
  focusedTileId: string | null;
}

export interface HighlightState {
  highlightedStepNumber: number | null;
  highlightedMaterialGroupTileIds: string[];
  highlightSource: HighlightSourceType;
}

export interface SelectionHighlightState extends SelectionState, HighlightState {}

export interface HighlightColorScheme {
  fill: string;
  stroke: string;
  shadow: string;
}

export interface HighlightLabel {
  text: string;
  color: 'teal' | 'orange' | 'blue' | 'violet' | 'gray';
}

export const HIGHLIGHT_COLOR_SCHEMES: Record<Exclude<HighlightSourceType, 'none'>, HighlightColorScheme> = {
  step: { fill: '#10b981', stroke: '#059669', shadow: 'rgba(16,185,129,0.5)' },
  material: { fill: '#f59e0b', stroke: '#d97706', shadow: 'rgba(245,158,11,0.5)' },
  selection: { fill: '#3b82f6', stroke: '#1d4ed8', shadow: 'rgba(59,130,246,0.5)' },
  numbering: { fill: '#8b5cf6', stroke: '#7c3aed', shadow: 'rgba(139,92,246,0.5)' },
};

export const DEFAULT_HIGHLIGHT_COLORS: HighlightColorScheme = {
  fill: '#10b981',
  stroke: '#059669',
  shadow: 'rgba(16,185,129,0.5)',
};

export function getHighlightColorScheme(source: HighlightSourceType): HighlightColorScheme {
  if (source === 'none') return DEFAULT_HIGHLIGHT_COLORS;
  return HIGHLIGHT_COLOR_SCHEMES[source];
}

export function getHighlightLabel(
  source: HighlightSourceType,
  ctx: {
    highlightedStepNumber: number | null;
    totalSteps: number;
    highlightedMaterialGroupTileIds: string[];
    selectedTileIds: string[];
  }
): HighlightLabel | null {
  switch (source) {
    case 'step':
      return { text: '施工步骤高亮', color: 'teal' };
    case 'material':
      return { text: '材料分组高亮', color: 'orange' };
    case 'selection':
      return { text: `已选 ${ctx.selectedTileIds.length} 块`, color: 'blue' };
    case 'numbering':
      return { text: '编号定位高亮', color: 'violet' };
    default:
      return null;
  }
}

export function getHighlightedTileIds(
  state: HighlightState & { selectionMode: SelectionMode; selectedTileIds: string[] },
  ctx: { steps: ConstructionStep[] }
): Set<string> {
  const ids = new Set<string>();

  if (state.highlightedStepNumber !== null) {
    const step = ctx.steps.find((s) => s.stepNumber === state.highlightedStepNumber);
    if (step) step.tileIds.forEach((id) => ids.add(id));
  }

  state.highlightedMaterialGroupTileIds.forEach((id) => ids.add(id));

  if (state.selectionMode !== 'single' && state.selectedTileIds.length > 0) {
    state.selectedTileIds.forEach((id) => ids.add(id));
  }

  return ids;
}

export function selectTilesInRect(
  tiles: Tile[],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string[] {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  return tiles
    .filter((tile) => {
      const tileCenterX = tile.x + tile.width / 2;
      const tileCenterY = tile.y + tile.height / 2;
      return (
        tileCenterX >= minX &&
        tileCenterX <= maxX &&
        tileCenterY >= minY &&
        tileCenterY <= maxY
      );
    })
    .map((tile) => tile.id);
}

export function isTileSelected(
  tileId: string,
  state: SelectionState
): boolean {
  if (state.selectionMode === 'single') return tileId === state.selectedTileId;
  return state.selectedTileIds.includes(tileId);
}

export function buildSelectionChange(
  tileIds: string[]
): Pick<SelectionHighlightState, 'selectedTileId' | 'selectedTileIds' | 'highlightSource'> {
  return {
    selectedTileIds: tileIds,
    selectedTileId: tileIds.length > 0 ? tileIds[0] : null,
    highlightSource: tileIds.length > 0 ? 'selection' : 'none',
  };
}

export function buildToggleSelection(
  currentIds: string[],
  tileId: string
): Pick<SelectionHighlightState, 'selectedTileId' | 'selectedTileIds' | 'highlightSource'> {
  const isSelected = currentIds.includes(tileId);
  const newIds = isSelected
    ? currentIds.filter((id) => id !== tileId)
    : [...currentIds, tileId];
  return buildSelectionChange(newIds);
}

export function buildStepHighlightChange(
  step: number | null
): Pick<HighlightState, 'highlightedStepNumber' | 'highlightSource'> & { focusedTileId: null } {
  return {
    highlightedStepNumber: step,
    highlightSource: step !== null ? 'step' : 'none',
    focusedTileId: null,
  };
}

export function buildMaterialHighlightChange(
  tileIds: string[]
): Pick<HighlightState, 'highlightedMaterialGroupTileIds' | 'highlightSource'> {
  return {
    highlightedMaterialGroupTileIds: tileIds,
    highlightSource: tileIds.length > 0 ? 'material' : 'none',
  };
}

export function isGroupHighlighted(
  groupTileIds: string[],
  highlightedTileIds: string[]
): boolean {
  if (groupTileIds.length === 0 || highlightedTileIds.length === 0) return false;
  return groupTileIds.every((id) => highlightedTileIds.includes(id));
}

export function toggleGroupSelectionInFilter(
  filter: ConstructionListFilter,
  groupKey: string
): Pick<ConstructionListFilter, 'selectedGroups'> {
  const isSelected = filter.selectedGroups.includes(groupKey);
  const newGroups = isSelected
    ? filter.selectedGroups.filter((g) => g !== groupKey)
    : [...filter.selectedGroups, groupKey];
  return { selectedGroups: newGroups };
}

export function toggleStepSelectionInFilter(
  filter: ConstructionListFilter,
  stepNumber: number
): Pick<ConstructionListFilter, 'selectedSteps'> {
  const isSelected = filter.selectedSteps.includes(stepNumber);
  const newSteps = isSelected
    ? filter.selectedSteps.filter((s) => s !== stepNumber)
    : [...filter.selectedSteps, stepNumber];
  return { selectedSteps: newSteps };
}

export function getAllGroupKeys(groups: MaterialGroup[]): string[] {
  return groups.map((g) => g.groupKey);
}

export function getAllStepNumbers(steps: ConstructionStep[]): number[] {
  return steps.map((s) => s.stepNumber);
}
