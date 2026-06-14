import { create } from 'zustand';
import type { RoofParams, TileParams, LayoutResult, ProjectData, ValidationResult } from '@/types';
import { calculateLayout, calculateLayoutWithOriginal, validateOverlapConstraints, validateSingleTileAdjustment } from '@/utils/roofCalculator';

interface RoofStore {
  roof: RoofParams;
  tiles: TileParams;
  layout: LayoutResult;
  manualAdjustments: Record<string, { x: number; y: number }>;
  originalPositions: Record<string, { x: number; y: number }>;
  selectedTileId: string | null;
  wasteThreshold: number;
  showWasteWarning: boolean;
  validationResult: ValidationResult;
  lastValidationMessage: string;
  importValidationResult: ValidationResult | null;

  setRoof: (roof: Partial<RoofParams>) => void;
  setTiles: (tiles: Partial<TileParams>) => void;
  setSelectedTile: (id: string | null) => void;
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

const initialResult = calculateLayoutWithOriginal(defaultRoof, defaultTiles);
const initialValidation = validateOverlapConstraints(initialResult.layout.tiles, defaultTiles);

export const useRoofStore = create<RoofStore>((set, get) => ({
  roof: defaultRoof,
  tiles: defaultTiles,
  layout: initialResult.layout,
  manualAdjustments: {},
  originalPositions: initialResult.originalPositions,
  selectedTileId: null,
  wasteThreshold: 0.15,
  showWasteWarning: false,
  validationResult: initialValidation,
  lastValidationMessage: '',
  importValidationResult: null,

  setRoof: (roof) => {
    set((state) => {
      const newRoof = { ...state.roof, ...roof };
      const result = calculateLayoutWithOriginal(newRoof, state.tiles, state.manualAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      return {
        roof: newRoof,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `参数变更后检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
      };
    });
  },

  setTiles: (tiles) => {
    set((state) => {
      const newTiles = { ...state.tiles, ...tiles };
      const result = calculateLayoutWithOriginal(state.roof, newTiles, state.manualAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, newTiles);
      return {
        tiles: newTiles,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `参数变更后检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
      };
    });
  },

  setSelectedTile: (id) => {
    set({ selectedTileId: id });
  },

  setManualAdjustment: (tileId, x, y) => {
    const state = get();
    
    const validation = validateSingleTileAdjustment(
      tileId,
      x,
      y,
      state.layout.tiles,
      state.tiles
    );

    if (!validation.isValid) {
      set({
        lastValidationMessage: `调整被拦截：${validation.message}`,
      });
      return { success: false, message: validation.message };
    }

    const newAdjustments = {
      ...state.manualAdjustments,
      [tileId]: { x, y },
    };
    const result = calculateLayoutWithOriginal(state.roof, state.tiles, newAdjustments);
    const fullValidation = validateOverlapConstraints(result.layout.tiles, state.tiles);

    set({
      manualAdjustments: newAdjustments,
      layout: result.layout,
      originalPositions: result.originalPositions,
      validationResult: fullValidation,
      showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
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
      const result = calculateLayoutWithOriginal(state.roof, state.tiles, newAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      return {
        manualAdjustments: newAdjustments,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
      };
    });
  },

  clearManualAdjustment: (tileId) => {
    set((state) => {
      const newAdjustments = { ...state.manualAdjustments };
      delete newAdjustments[tileId];
      const result = calculateLayoutWithOriginal(state.roof, state.tiles, newAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      return {
        manualAdjustments: newAdjustments,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
      };
    });
  },

  resetTileToOriginal: (tileId) => {
    const state = get();
    const originalPos = state.originalPositions[tileId];
    
    if (!originalPos) {
      set({
        lastValidationMessage: `未找到瓦片 ${tileId} 的原始位置`,
      });
      return;
    }

    const newAdjustments = { ...state.manualAdjustments };
    delete newAdjustments[tileId];
    
    const result = calculateLayoutWithOriginal(state.roof, state.tiles, newAdjustments);
    const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);

    set({
      manualAdjustments: newAdjustments,
      layout: result.layout,
      originalPositions: result.originalPositions,
      validationResult: validation,
      showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
      lastValidationMessage: `瓦片 ${tileId} 已重置到原始位置`,
    });
  },

  clearManualAdjustments: () => {
    set((state) => {
      const result = calculateLayoutWithOriginal(state.roof, state.tiles, {});
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      return {
        manualAdjustments: {},
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
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
      const result = calculateLayoutWithOriginal(state.roof, state.tiles, state.manualAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      return {
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
      };
    });
  },

  validateLayout: () => {
    set((state) => {
      const validation = validateOverlapConstraints(state.layout.tiles, state.tiles);
      return {
        validationResult: validation,
        lastValidationMessage: validation.isValid 
          ? '所有瓦片排布符合约束要求' 
          : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
      };
    });
  },

  exportProject: () => {
    const state = get();
    return {
      roof: state.roof,
      tiles: state.tiles,
      layout: state.layout,
      manualAdjustments: state.manualAdjustments,
      wasteThreshold: state.wasteThreshold,
    };
  },

  importProject: (data) => {
    const warnings: string[] = [];
    
    const result = calculateLayoutWithOriginal(data.roof, data.tiles, data.manualAdjustments);
    const validation = validateOverlapConstraints(result.layout.tiles, data.tiles);

    if (!validation.isValid) {
      warnings.push(`导入方案检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`);
    }

    if (result.layout.wasteRate > data.wasteThreshold) {
      warnings.push(`导入方案损耗率为 ${(result.layout.wasteRate * 100).toFixed(2)}%，超过阈值 ${(data.wasteThreshold * 100).toFixed(0)}%`);
    }

    if (data.manualAdjustments && Object.keys(data.manualAdjustments).length > 0) {
      warnings.push(`导入方案包含 ${Object.keys(data.manualAdjustments).length} 块手动调整的瓦片`);
    }

    set({
      roof: data.roof,
      tiles: data.tiles,
      layout: result.layout,
      originalPositions: result.originalPositions,
      manualAdjustments: data.manualAdjustments,
      wasteThreshold: data.wasteThreshold,
      showWasteWarning: result.layout.wasteRate > data.wasteThreshold,
      validationResult: validation,
      importValidationResult: validation,
      lastValidationMessage: warnings.length > 0 ? warnings.join('；') : '方案导入成功，所有约束检查通过',
    });

    return { 
      success: true, 
      warnings 
    };
  },

  clearImportValidation: () => {
    set({ importValidationResult: null });
  },
}));
