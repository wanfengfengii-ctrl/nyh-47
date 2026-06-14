import { create } from 'zustand';
import type {
  RoofParams,
  TileParams,
  ProjectData,
  NumberingScheme,
  ConstructionDirection,
  ConstructionListExportData,
  SelectionMode,
  ConstructionListFilter,
  HighlightSource,
} from '@/types';

import {
  deriveFullLayoutState,
  computeLayoutWithOriginals,
  validateOverlapConstraints,
  validateSingleTileAdjustment,
  isPointInRoof,
  buildPostChangeValidationMessage,
  buildValidationMessage,
  type LayoutManualAdjustments,
  type OriginalPositionMap,
  type SingleTileAdjustmentValidation,
} from '@/domains/layout';

import {
  generateTileNumbering,
} from '@/domains/numbering';

import {
  calculateMaterialStats,
  generateConstructionSequence,
  DEFAULT_LIST_FILTER,
} from '@/domains/checklist';

import {
  buildSelectionChange,
  buildToggleSelection,
  buildStepHighlightChange,
  buildMaterialHighlightChange,
  selectTilesInRect as selectInRect,
  toggleGroupSelectionInFilter,
  toggleStepSelectionInFilter,
} from '@/domains/selection';

import {
  buildProjectExport,
  buildImportWarnings,
  validateProjectData,
  buildAndExportConstructionListHTML,
  buildAndPrintConstructionList,
  buildAndPrintFilteredConstructionList,
  getExportData,
} from '@/domains/export';

interface DerivedStateChunk {
  layout: ReturnType<typeof computeLayoutWithOriginals>['layout'];
  originalPositions: OriginalPositionMap;
  validationResult: ReturnType<typeof validateOverlapConstraints>;
  numberingResult: ReturnType<typeof generateTileNumbering>;
  constructionSequence: ReturnType<typeof generateConstructionSequence>;
  materialStats: ReturnType<typeof calculateMaterialStats>;
}

interface HighlightResetChunk {
  highlightedStepNumber: null;
  highlightedMaterialGroupTileIds: string[];
}

const HIGHLIGHT_RESET: HighlightResetChunk = {
  highlightedStepNumber: null,
  highlightedMaterialGroupTileIds: [],
};

function deriveAllFromState(
  roof: RoofParams,
  tiles: TileParams,
  manualAdjustments: LayoutManualAdjustments,
  numberingScheme: NumberingScheme,
  constructionDirection: ConstructionDirection
): DerivedStateChunk {
  const layoutResult = deriveFullLayoutState({ roof, tiles, manualAdjustments });
  return {
    layout: layoutResult.layout,
    originalPositions: layoutResult.originalPositions,
    validationResult: layoutResult.validation,
    numberingResult: generateTileNumbering(layoutResult.layout.tiles, numberingScheme),
    constructionSequence: generateConstructionSequence(layoutResult.layout.tiles, constructionDirection),
    materialStats: calculateMaterialStats(layoutResult.layout.tiles),
  };
}

const defaultRoof: RoofParams = {
  shape: 'rectangle',
  width: 600,
  height: 400,
  topWidth: 360,
  curveDepth: 80,
};

const defaultTiles: TileParams = {
  tileType: 'round',
  width: 40,
  length: 60,
  overlapX: 10,
  overlapY: 15,
  minOverlapX: 5,
  minOverlapY: 8,
};

const defaultListFilter: ConstructionListFilter = DEFAULT_LIST_FILTER;

const initialDerived = deriveAllFromState(
  defaultRoof,
  defaultTiles,
  {},
  'slope-row-col',
  'bottom-up'
);

interface RoofStore {
  roof: RoofParams;
  tiles: TileParams;
  layout: DerivedStateChunk['layout'];
  manualAdjustments: LayoutManualAdjustments;
  originalPositions: OriginalPositionMap;
  selectedTileId: string | null;
  selectedTileIds: string[];
  selectionMode: SelectionMode;
  wasteThreshold: number;
  showWasteWarning: boolean;
  validationResult: DerivedStateChunk['validationResult'];
  lastValidationMessage: string;
  importValidationResult: DerivedStateChunk['validationResult'] | null;
  numberingScheme: NumberingScheme;
  numberingResult: DerivedStateChunk['numberingResult'];
  constructionDirection: ConstructionDirection;
  constructionSequence: DerivedStateChunk['constructionSequence'];
  materialStats: DerivedStateChunk['materialStats'];
  showTileNumbers: boolean;
  highlightedStepNumber: number | null;
  highlightedMaterialGroupTileIds: string[];
  highlightSource: HighlightSource;
  focusedTileId: string | null;
  listFilter: ConstructionListFilter;

  setRoof: (roof: Partial<RoofParams>) => void;
  setTiles: (tiles: Partial<TileParams>) => void;
  setSelectedTile: (id: string | null) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  toggleTileSelection: (tileId: string) => void;
  clearTileSelection: () => void;
  selectAllTiles: () => void;
  selectTilesInRect: (x1: number, y1: number, x2: number, y2: number) => void;
  setManualAdjustment: (tileId: string, x: number, y: number) => { success: boolean; message: string };
  forceSetManualAdjustment: (tileId: string, x: number, y: number) => void;
  clearManualAdjustment: (tileId: string) => void;
  resetTileToOriginal: (tileId: string) => void;
  clearManualAdjustments: () => void;
  setWasteThreshold: (threshold: number) => void;
  recalculateLayout: () => void;
  validateLayout: () => void;
  exportProject: () => ProjectData;
  importProject: (data: ProjectData) => { success: boolean; warnings: string[] };
  clearImportValidation: () => void;
  setNumberingScheme: (scheme: NumberingScheme) => void;
  setConstructionDirection: (direction: ConstructionDirection) => void;
  toggleShowTileNumbers: () => void;
  setShowTileNumbers: (show: boolean) => void;
  setHighlightedStepNumber: (step: number | null) => void;
  setHighlightedMaterialGroupTileIds: (tileIds: string[]) => void;
  clearHighlightedMaterialGroup: () => void;
  setFocusedTile: (tileId: string | null) => void;
  focusAndHighlightTile: (tileId: string) => void;
  setListFilter: (filter: Partial<ConstructionListFilter>) => void;
  resetListFilter: () => void;
  regenerateDerivedData: () => void;
  exportConstructionListJSON: () => ConstructionListExportData;
  exportConstructionListHTML: () => void;
  printConstructionList: () => void;
  printFilteredConstructionList: () => void;
}

export const useRoofStore = create<RoofStore>((set, get) => ({
  roof: defaultRoof,
  tiles: defaultTiles,
  layout: initialDerived.layout,
  manualAdjustments: {},
  originalPositions: initialDerived.originalPositions,
  selectedTileId: null,
  selectedTileIds: [],
  selectionMode: 'single',
  wasteThreshold: 0.15,
  showWasteWarning: initialDerived.layout.wasteRate > 0.15,
  validationResult: initialDerived.validationResult,
  lastValidationMessage: '',
  importValidationResult: null,
  numberingScheme: 'slope-row-col',
  numberingResult: initialDerived.numberingResult,
  constructionDirection: 'bottom-up',
  constructionSequence: initialDerived.constructionSequence,
  materialStats: initialDerived.materialStats,
  showTileNumbers: true,
  highlightedStepNumber: null,
  highlightedMaterialGroupTileIds: [],
  highlightSource: 'none',
  focusedTileId: null,
  listFilter: defaultListFilter,

  setRoof: (roof) => {
    set((state) => {
      const newRoof = { ...state.roof, ...roof };
      const derived = deriveAllFromState(
        newRoof,
        state.tiles,
        state.manualAdjustments,
        state.numberingScheme,
        state.constructionDirection
      );
      return {
        roof: newRoof,
        ...derived,
        ...HIGHLIGHT_RESET,
        showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: buildPostChangeValidationMessage(derived.validationResult),
      };
    });
  },

  setTiles: (tiles) => {
    set((state) => {
      const newTiles = { ...state.tiles, ...tiles };
      const derived = deriveAllFromState(
        state.roof,
        newTiles,
        state.manualAdjustments,
        state.numberingScheme,
        state.constructionDirection
      );
      return {
        tiles: newTiles,
        ...derived,
        ...HIGHLIGHT_RESET,
        showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: buildPostChangeValidationMessage(derived.validationResult),
      };
    });
  },

  setSelectedTile: (id) => {
    set({
      selectedTileId: id,
      selectedTileIds: id ? [id] : [],
      highlightedMaterialGroupTileIds: [],
      highlightSource: id ? 'selection' : 'none',
    });
  },

  setSelectionMode: (mode) => {
    set((state) => ({
      selectionMode: mode,
      selectedTileIds:
        mode === 'single' && state.selectedTileIds.length > 0
          ? state.selectedTileId
            ? [state.selectedTileId]
            : []
          : state.selectedTileIds,
    }));
  },

  toggleTileSelection: (tileId) => {
    set((state) => {
      const change = buildToggleSelection(state.selectedTileIds, tileId);
      return {
        ...change,
        highlightedMaterialGroupTileIds: [],
      };
    });
  },

  clearTileSelection: () => {
    set({
      selectedTileIds: [],
      selectedTileId: null,
      highlightSource: 'none',
    });
  },

  selectAllTiles: () => {
    const state = get();
    const allIds = state.layout.tiles.map((t) => t.id);
    set(buildSelectionChange(allIds));
  },

  selectTilesInRect: (x1, y1, x2, y2) => {
    const state = get();
    const tileIds = selectInRect(state.layout.tiles, x1, y1, x2, y2);
    set(buildSelectionChange(tileIds));
  },

  setManualAdjustment: (tileId, x, y) => {
    const state = get();
    const tile = state.layout.tiles.find((t) => t.id === tileId);

    if (!tile) {
      return { success: false, message: '未找到瓦片' };
    }

    if (x < 0 || y < 0 || x + tile.width > state.roof.width || y + tile.height > state.roof.height) {
      const clampedX = Math.max(0, Math.min(x, state.roof.width - tile.width));
      const clampedY = Math.max(0, Math.min(y, state.roof.height - tile.height));
      const boundaryMsg = `瓦片不能移出屋面边界（X范围: 0~${(state.roof.width - tile.width).toFixed(0)}mm，Y范围: 0~${(state.roof.height - tile.height).toFixed(0)}mm）`;

      if (x !== clampedX || y !== clampedY) {
        set({ lastValidationMessage: `调整被拦截：${boundaryMsg}` });
        return { success: false, message: boundaryMsg };
      }
    }

    const tileCenterX = x + tile.width / 2;
    const tileCenterY = y + tile.height / 2;
    if (!isPointInRoof(state.roof, tileCenterX, tileCenterY)) {
      set({ lastValidationMessage: '调整被拦截：瓦片中心点必须在屋面区域内' });
      return { success: false, message: '瓦片中心点必须在屋面区域内' };
    }

    const validation: SingleTileAdjustmentValidation = validateSingleTileAdjustment(
      tileId,
      x,
      y,
      state.layout.tiles,
      state.tiles
    );

    if (!validation.isValid) {
      set({ lastValidationMessage: `调整被拦截：${validation.message}` });
      return { success: false, message: validation.message };
    }

    const newAdjustments = {
      ...state.manualAdjustments,
      [tileId]: { x, y },
    };
    const derived = deriveAllFromState(
      state.roof,
      state.tiles,
      newAdjustments,
      state.numberingScheme,
      state.constructionDirection
    );

    set({
      manualAdjustments: newAdjustments,
      ...derived,
      ...HIGHLIGHT_RESET,
      showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
      lastValidationMessage: '',
    });

    return { success: true, message: '' };
  },

  forceSetManualAdjustment: (tileId, x, y) => {
    set((state) => {
      const newAdjustments = {
        ...state.manualAdjustments,
        [tileId]: { x, y },
      };
      const derived = deriveAllFromState(
        state.roof,
        state.tiles,
        newAdjustments,
        state.numberingScheme,
        state.constructionDirection
      );
      return {
        manualAdjustments: newAdjustments,
        ...derived,
        ...HIGHLIGHT_RESET,
        showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: buildPostChangeValidationMessage(derived.validationResult),
      };
    });
  },

  clearManualAdjustment: (tileId) => {
    set((state) => {
      const newAdjustments = { ...state.manualAdjustments };
      delete newAdjustments[tileId];
      const derived = deriveAllFromState(
        state.roof,
        state.tiles,
        newAdjustments,
        state.numberingScheme,
        state.constructionDirection
      );
      return {
        manualAdjustments: newAdjustments,
        ...derived,
        ...HIGHLIGHT_RESET,
        showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: buildPostChangeValidationMessage(derived.validationResult),
      };
    });
  },

  resetTileToOriginal: (tileId) => {
    const state = get();
    const originalPos = state.originalPositions[tileId];

    if (!originalPos) {
      set({ lastValidationMessage: `未找到瓦片 ${tileId} 的原始位置` });
      return;
    }

    const newAdjustments = { ...state.manualAdjustments };
    delete newAdjustments[tileId];

    const derived = deriveAllFromState(
      state.roof,
      state.tiles,
      newAdjustments,
      state.numberingScheme,
      state.constructionDirection
    );

    set({
      manualAdjustments: newAdjustments,
      ...derived,
      ...HIGHLIGHT_RESET,
      showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
      lastValidationMessage: `瓦片 ${tileId} 已重置到原始位置`,
    });
  },

  clearManualAdjustments: () => {
    set((state) => {
      const derived = deriveAllFromState(
        state.roof,
        state.tiles,
        {},
        state.numberingScheme,
        state.constructionDirection
      );
      return {
        manualAdjustments: {},
        ...derived,
        ...HIGHLIGHT_RESET,
        showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: buildPostChangeValidationMessage(derived.validationResult),
      };
    });
  },

  setWasteThreshold: (threshold) => {
    set((state) => ({
      wasteThreshold: threshold,
      showWasteWarning: state.layout.wasteRate > threshold,
    }));
  },

  recalculateLayout: () => {
    set((state) => {
      const derived = deriveAllFromState(
        state.roof,
        state.tiles,
        state.manualAdjustments,
        state.numberingScheme,
        state.constructionDirection
      );
      return {
        ...derived,
        ...HIGHLIGHT_RESET,
        showWasteWarning: derived.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: buildPostChangeValidationMessage(derived.validationResult),
      };
    });
  },

  validateLayout: () => {
    set((state) => {
      const validation = validateOverlapConstraints(state.layout.tiles, state.tiles);
      return {
        validationResult: validation,
        lastValidationMessage: buildValidationMessage(validation),
      };
    });
  },

  exportProject: () => {
    const state = get();
    return buildProjectExport(
      state.roof,
      state.tiles,
      state.layout,
      state.manualAdjustments,
      state.wasteThreshold
    );
  },

  importProject: (data) => {
    if (!validateProjectData(data)) {
      return { success: false, warnings: ['文件格式错误'] };
    }

    const derived = deriveAllFromState(
      data.roof,
      data.tiles,
      data.manualAdjustments,
      'slope-row-col',
      'bottom-up'
    );

    const warnings = buildImportWarnings({
      layoutWasteRate: derived.layout.wasteRate,
      wasteThreshold: data.wasteThreshold,
      invalidTileCount: derived.validationResult.invalidTileIds.length,
      manualAdjustmentCount: Object.keys(data.manualAdjustments).length,
    });

    void validateProjectData;

    set({
      roof: data.roof,
      tiles: data.tiles,
      layout: derived.layout,
      originalPositions: derived.originalPositions,
      manualAdjustments: data.manualAdjustments,
      wasteThreshold: data.wasteThreshold,
      showWasteWarning: derived.layout.wasteRate > data.wasteThreshold,
      validationResult: derived.validationResult,
      importValidationResult: derived.validationResult,
      lastValidationMessage:
        warnings.length > 0 ? warnings.join('；') : '方案导入成功，所有约束检查通过',
      numberingResult: derived.numberingResult,
      constructionSequence: derived.constructionSequence,
      materialStats: derived.materialStats,
      ...HIGHLIGHT_RESET,
    });

    return { success: true, warnings };
  },

  clearImportValidation: () => {
    set({ importValidationResult: null });
  },

  setNumberingScheme: (scheme) => {
    set((state) => ({
      numberingScheme: scheme,
      numberingResult: generateTileNumbering(state.layout.tiles, scheme),
    }));
  },

  setConstructionDirection: (direction) => {
    set((state) => ({
      constructionDirection: direction,
      constructionSequence: generateConstructionSequence(state.layout.tiles, direction),
      highlightedStepNumber: null,
    }));
  },

  toggleShowTileNumbers: () => {
    set((state) => ({ showTileNumbers: !state.showTileNumbers }));
  },

  setShowTileNumbers: (show) => {
    set({ showTileNumbers: show });
  },

  setHighlightedStepNumber: (step) => {
    set(buildStepHighlightChange(step));
  },

  setHighlightedMaterialGroupTileIds: (tileIds) => {
    set(buildMaterialHighlightChange(tileIds));
  },

  clearHighlightedMaterialGroup: () => {
    set(buildMaterialHighlightChange([]));
  },

  setFocusedTile: (tileId) => {
    set({ focusedTileId: tileId });
  },

  focusAndHighlightTile: (tileId) => {
    set({
      focusedTileId: tileId,
      selectedTileId: tileId,
      selectedTileIds: [tileId],
      highlightSource: 'selection',
    });
  },

  setListFilter: (filter) => {
    set((state) => ({
      listFilter: { ...state.listFilter, ...filter },
    }));
  },

  resetListFilter: () => {
    set({ listFilter: defaultListFilter });
  },

  regenerateDerivedData: () => {
    set((state) => ({
      numberingResult: generateTileNumbering(state.layout.tiles, state.numberingScheme),
      constructionSequence: generateConstructionSequence(state.layout.tiles, state.constructionDirection),
      materialStats: calculateMaterialStats(state.layout.tiles),
    }));
  },

  exportConstructionListJSON: () => {
    const state = get();
    return getExportData({
      roof: state.roof,
      tiles: state.tiles,
      layoutTiles: state.layout.tiles,
      numberingScheme: state.numberingScheme,
      constructionDirection: state.constructionDirection,
    });
  },

  exportConstructionListHTML: () => {
    const state = get();
    buildAndExportConstructionListHTML({
      roof: state.roof,
      tiles: state.tiles,
      layoutTiles: state.layout.tiles,
      numberingScheme: state.numberingScheme,
      constructionDirection: state.constructionDirection,
    });
  },

  printConstructionList: () => {
    const state = get();
    buildAndPrintConstructionList({
      roof: state.roof,
      tiles: state.tiles,
      layoutTiles: state.layout.tiles,
      numberingScheme: state.numberingScheme,
      constructionDirection: state.constructionDirection,
    });
  },

  printFilteredConstructionList: () => {
    const state = get();
    buildAndPrintFilteredConstructionList({
      roof: state.roof,
      tiles: state.tiles,
      layoutTiles: state.layout.tiles,
      numberingScheme: state.numberingScheme,
      constructionDirection: state.constructionDirection,
      filter: state.listFilter,
    });
  },
}));

export type { LayoutManualAdjustments, OriginalPositionMap };
