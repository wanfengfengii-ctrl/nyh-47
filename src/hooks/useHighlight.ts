import { useMemo } from 'react';
import { useRoofStore } from '@/store/roofStore';
import {
  getHighlightColorScheme,
  getHighlightedTileIds as computeHighlightedIds,
  getHighlightLabel as computeHighlightLabel,
  type HighlightColorScheme,
  type HighlightLabel,
} from '@/domains/selection';
import type { Tile, HighlightSource } from '@/types';

export interface TileHighlightColors {
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
}

export interface UseHighlightResult {
  highlightSource: HighlightSource;
  highlightedTileIds: Set<string>;
  colors: HighlightColorScheme;
  label: HighlightLabel | null;
  stepContext: {
    highlightedStepNumber: number | null;
    totalSteps: number;
  };
  materialContext: {
    highlightedGroupTileIds: string[];
  };
  selectionContext: {
    selectedCount: number;
    totalCount: number;
  };
  getTileColors: (tile: Tile) => TileHighlightColors;
  isTileSelected: (tileId: string) => boolean;
}

const VIOLATION_COLORS = {
  fill: '#ef4444',
  stroke: '#b91c1c',
  shadow: 'rgba(239,68,68,0.5)',
};

const SELECTED_SINGLE_COLORS = {
  fill: '#3b82f6',
  stroke: '#1d4ed8',
};

const MANUAL_ADJUSTED_COLORS = {
  fill: '#8b5cf6',
  stroke: '#7c3aed',
};

const CUT_TILE_COLORS = {
  fill: '#f59e0b',
  stroke: '#d97706',
};

const DEFAULT_ROUND_COLORS = {
  fill: '#8b4513',
  stroke: '#5c2e0e',
};

const DEFAULT_FLAT_COLORS = {
  fill: '#a0522d',
  stroke: '#5c2e0e',
};

const DEFAULT_SHADOW = 'rgba(0,0,0,0.1)';

export function useHighlight(): UseHighlightResult {
  const highlightSource = useRoofStore((s) => s.highlightSource);
  const highlightedStepNumber = useRoofStore((s) => s.highlightedStepNumber);
  const highlightedMaterialGroupTileIds = useRoofStore((s) => s.highlightedMaterialGroupTileIds);
  const selectedTileIds = useRoofStore((s) => s.selectedTileIds);
  const selectedTileId = useRoofStore((s) => s.selectedTileId);
  const selectionMode = useRoofStore((s) => s.selectionMode);
  const focusedTileId = useRoofStore((s) => s.focusedTileId);
  const constructionSequence = useRoofStore((s) => s.constructionSequence);
  const validationResult = useRoofStore((s) => s.validationResult);
  const tileType = useRoofStore((s) => s.tiles.tileType);
  const layout = useRoofStore((s) => s.layout);

  const colors = useMemo(() => getHighlightColorScheme(highlightSource), [highlightSource]);

  const highlightedTileIds = useMemo(() => {
    return computeHighlightedIds(
      {
        highlightedStepNumber,
        highlightedMaterialGroupTileIds,
        highlightSource,
        selectionMode,
        selectedTileIds,
      },
      { steps: constructionSequence.steps }
    );
  }, [
    highlightedStepNumber,
    highlightedMaterialGroupTileIds,
    highlightSource,
    selectionMode,
    selectedTileIds,
    constructionSequence.steps,
  ]);

  const label = useMemo(() => {
    return computeHighlightLabel(highlightSource, {
      highlightedStepNumber,
      totalSteps: constructionSequence.totalSteps,
      highlightedMaterialGroupTileIds,
      selectedTileIds,
    });
  }, [
    highlightSource,
    highlightedStepNumber,
    constructionSequence.totalSteps,
    highlightedMaterialGroupTileIds,
    selectedTileIds,
  ]);

  const isTileSelected = useMemo(() => {
    return (tileId: string): boolean => {
      if (selectionMode === 'single') return tileId === selectedTileId;
      return selectedTileIds.includes(tileId);
    };
  }, [selectionMode, selectedTileId, selectedTileIds]);

  const getTileColors = useMemo(() => {
    return (tile: Tile): TileHighlightColors => {
      const isViolation = validationResult.invalidTileIds.includes(tile.id);
      const isSingleSelected = selectionMode === 'single' && tile.id === selectedTileId;
      const isHighlighted = highlightedTileIds.has(tile.id);
      const isFocused = tile.id === focusedTileId;

      let fill: string;
      let stroke: string;
      let strokeWidth = 1;
      let shadowColor = DEFAULT_SHADOW;
      let shadowBlur = 2;

      if (isViolation) {
        fill = VIOLATION_COLORS.fill;
        stroke = VIOLATION_COLORS.stroke;
        strokeWidth = 3;
        shadowColor = VIOLATION_COLORS.shadow;
      } else if (isSingleSelected) {
        fill = SELECTED_SINGLE_COLORS.fill;
        stroke = SELECTED_SINGLE_COLORS.stroke;
        strokeWidth = 2;
      } else if (isHighlighted) {
        fill = colors.fill;
        stroke = colors.stroke;
        strokeWidth = 2;
        shadowColor = colors.shadow;
      } else if (tile.manuallyAdjusted) {
        fill = MANUAL_ADJUSTED_COLORS.fill;
        stroke = MANUAL_ADJUSTED_COLORS.stroke;
      } else if (tile.isCut) {
        fill = CUT_TILE_COLORS.fill;
        stroke = CUT_TILE_COLORS.stroke;
        strokeWidth = 2;
      } else {
        const defaultColors = tileType === 'round' ? DEFAULT_ROUND_COLORS : DEFAULT_FLAT_COLORS;
        fill = defaultColors.fill;
        stroke = defaultColors.stroke;
      }

      if (isFocused) {
        strokeWidth = 3;
        if (!isViolation) {
          shadowColor = colors.shadow;
        }
      }

      if (isViolation || isHighlighted || isFocused) {
        shadowBlur = 8;
      }

      return { fill, stroke, strokeWidth, shadowColor, shadowBlur };
    };
  }, [
    validationResult.invalidTileIds,
    selectionMode,
    selectedTileId,
    highlightedTileIds,
    focusedTileId,
    colors,
    tileType,
  ]);

  return {
    highlightSource,
    highlightedTileIds,
    colors,
    label,
    stepContext: {
      highlightedStepNumber,
      totalSteps: constructionSequence.totalSteps,
    },
    materialContext: {
      highlightedGroupTileIds: highlightedMaterialGroupTileIds,
    },
    selectionContext: {
      selectedCount: selectedTileIds.length,
      totalCount: layout.tiles.length,
    },
    getTileColors,
    isTileSelected,
  };
}
