import { create } from 'zustand';
import type { RoofParams, TileParams, LayoutResult, ProjectData, ValidationResult, NumberingScheme, NumberingResult, MaterialStatsResult, ConstructionDirection, ConstructionSequenceResult, ConstructionListExportData } from '@/types';
import { calculateLayoutWithOriginal, validateOverlapConstraints, validateSingleTileAdjustment, isPointInRoof, generateTileNumbering, calculateMaterialStats, generateConstructionSequence, generateConstructionListExportData, generatePrintableConstructionListHTML } from '@/utils/roofCalculator';

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
  numberingScheme: NumberingScheme;
  numberingResult: NumberingResult;
  constructionDirection: ConstructionDirection;
  constructionSequence: ConstructionSequenceResult;
  materialStats: MaterialStatsResult;
  showTileNumbers: boolean;
  highlightedStepNumber: number | null;
  highlightedMaterialGroupTileIds: string[];

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
  setNumberingScheme: (scheme: NumberingScheme) => void;
  setConstructionDirection: (direction: ConstructionDirection) => void;
  toggleShowTileNumbers: () => void;
  setShowTileNumbers: (show: boolean) => void;
  setHighlightedStepNumber: (step: number | null) => void;
  setHighlightedMaterialGroupTileIds: (tileIds: string[]) => void;
  clearHighlightedMaterialGroup: () => void;
  regenerateDerivedData: () => void;
  exportConstructionListJSON: () => ConstructionListExportData;
  exportConstructionListHTML: () => void;
  printConstructionList: () => void;
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
const initialNumbering = generateTileNumbering(initialResult.layout.tiles, 'slope-row-col');
const initialSequence = generateConstructionSequence(initialResult.layout.tiles, 'bottom-up');
const initialMaterialStats = calculateMaterialStats(initialResult.layout.tiles);

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
  numberingScheme: 'slope-row-col',
  numberingResult: initialNumbering,
  constructionDirection: 'bottom-up',
  constructionSequence: initialSequence,
  materialStats: initialMaterialStats,
  showTileNumbers: true,
  highlightedStepNumber: null,
  highlightedMaterialGroupTileIds: [],

  setRoof: (roof) => {
    set((state) => {
      const newRoof = { ...state.roof, ...roof };
      const result = calculateLayoutWithOriginal(newRoof, state.tiles, state.manualAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
      const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
      const materialStats = calculateMaterialStats(result.layout.tiles);
      return {
        roof: newRoof,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `参数变更后检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
        numberingResult: numbering,
        constructionSequence: sequence,
        materialStats,
        highlightedStepNumber: null,
        highlightedMaterialGroupTileIds: [],
      };
    });
  },

  setTiles: (tiles) => {
    set((state) => {
      const newTiles = { ...state.tiles, ...tiles };
      const result = calculateLayoutWithOriginal(state.roof, newTiles, state.manualAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, newTiles);
      const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
      const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
      const materialStats = calculateMaterialStats(result.layout.tiles);
      return {
        tiles: newTiles,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `参数变更后检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
        numberingResult: numbering,
        constructionSequence: sequence,
        materialStats,
        highlightedStepNumber: null,
        highlightedMaterialGroupTileIds: [],
      };
    });
  },

  setSelectedTile: (id) => {
    set({ selectedTileId: id, highlightedMaterialGroupTileIds: [] });
  },

  setManualAdjustment: (tileId, x, y) => {
    const state = get();
    const tile = state.layout.tiles.find(t => t.id === tileId);
    
    if (!tile) {
      return { success: false, message: '未找到瓦片' };
    }

    if (x < 0 || y < 0 || x + tile.width > state.roof.width || y + tile.height > state.roof.height) {
      const clampedX = Math.max(0, Math.min(x, state.roof.width - tile.width));
      const clampedY = Math.max(0, Math.min(y, state.roof.height - tile.height));
      const boundaryMsg = `瓦片不能移出屋面边界（X范围: 0~${(state.roof.width - tile.width).toFixed(0)}mm，Y范围: 0~${(state.roof.height - tile.height).toFixed(0)}mm）`;
      
      if (x !== clampedX || y !== clampedY) {
        set({
          lastValidationMessage: `调整被拦截：${boundaryMsg}`,
        });
        return { success: false, message: boundaryMsg };
      }
    }

    const tileCenterX = x + tile.width / 2;
    const tileCenterY = y + tile.height / 2;
    if (!isPointInRoof(state.roof, tileCenterX, tileCenterY)) {
      set({
        lastValidationMessage: '调整被拦截：瓦片中心点必须在屋面区域内',
      });
      return { success: false, message: '瓦片中心点必须在屋面区域内' };
    }
    
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
    const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
    const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
    const materialStats = calculateMaterialStats(result.layout.tiles);

    set({
      manualAdjustments: newAdjustments,
      layout: result.layout,
      originalPositions: result.originalPositions,
      validationResult: fullValidation,
      showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
      lastValidationMessage: '',
      numberingResult: numbering,
      constructionSequence: sequence,
      materialStats,
      highlightedStepNumber: null,
      highlightedMaterialGroupTileIds: [],
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
      const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
      const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
      const materialStats = calculateMaterialStats(result.layout.tiles);
      return {
        manualAdjustments: newAdjustments,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
        numberingResult: numbering,
        constructionSequence: sequence,
        materialStats,
        highlightedStepNumber: null,
        highlightedMaterialGroupTileIds: [],
      };
    });
  },

  clearManualAdjustment: (tileId) => {
    set((state) => {
      const newAdjustments = { ...state.manualAdjustments };
      delete newAdjustments[tileId];
      const result = calculateLayoutWithOriginal(state.roof, state.tiles, newAdjustments);
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
      const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
      const materialStats = calculateMaterialStats(result.layout.tiles);
      return {
        manualAdjustments: newAdjustments,
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
        numberingResult: numbering,
        constructionSequence: sequence,
        materialStats,
        highlightedStepNumber: null,
        highlightedMaterialGroupTileIds: [],
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
    const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
    const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
    const materialStats = calculateMaterialStats(result.layout.tiles);

    set({
      manualAdjustments: newAdjustments,
      layout: result.layout,
      originalPositions: result.originalPositions,
      validationResult: validation,
      showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
      lastValidationMessage: `瓦片 ${tileId} 已重置到原始位置`,
      numberingResult: numbering,
      constructionSequence: sequence,
      materialStats,
      highlightedStepNumber: null,
      highlightedMaterialGroupTileIds: [],
    });
  },

  clearManualAdjustments: () => {
    set((state) => {
      const result = calculateLayoutWithOriginal(state.roof, state.tiles, {});
      const validation = validateOverlapConstraints(result.layout.tiles, state.tiles);
      const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
      const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
      const materialStats = calculateMaterialStats(result.layout.tiles);
      return {
        manualAdjustments: {},
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
        numberingResult: numbering,
        constructionSequence: sequence,
        materialStats,
        highlightedStepNumber: null,
        highlightedMaterialGroupTileIds: [],
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
      const numbering = generateTileNumbering(result.layout.tiles, state.numberingScheme);
      const sequence = generateConstructionSequence(result.layout.tiles, state.constructionDirection);
      const materialStats = calculateMaterialStats(result.layout.tiles);
      return {
        layout: result.layout,
        originalPositions: result.originalPositions,
        validationResult: validation,
        showWasteWarning: result.layout.wasteRate > state.wasteThreshold,
        lastValidationMessage: validation.isValid ? '' : `检测到 ${validation.invalidTileIds.length} 块瓦片存在搭接约束违规`,
        numberingResult: numbering,
        constructionSequence: sequence,
        materialStats,
        highlightedStepNumber: null,
        highlightedMaterialGroupTileIds: [],
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
    const numbering = generateTileNumbering(result.layout.tiles, 'slope-row-col');
    const sequence = generateConstructionSequence(result.layout.tiles, 'bottom-up');
    const materialStats = calculateMaterialStats(result.layout.tiles);

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
      numberingResult: numbering,
      constructionSequence: sequence,
      materialStats,
      highlightedStepNumber: null,
      highlightedMaterialGroupTileIds: [],
    });

    return { 
      success: true, 
      warnings 
    };
  },

  clearImportValidation: () => {
    set({ importValidationResult: null });
  },

  setNumberingScheme: (scheme) => {
    set((state) => {
      const numbering = generateTileNumbering(state.layout.tiles, scheme);
      return {
        numberingScheme: scheme,
        numberingResult: numbering,
      };
    });
  },

  setConstructionDirection: (direction) => {
    set((state) => {
      const sequence = generateConstructionSequence(state.layout.tiles, direction);
      return {
        constructionDirection: direction,
        constructionSequence: sequence,
        highlightedStepNumber: null,
      };
    });
  },

  toggleShowTileNumbers: () => {
    set((state) => ({ showTileNumbers: !state.showTileNumbers }));
  },

  setShowTileNumbers: (show) => {
    set({ showTileNumbers: show });
  },

  setHighlightedStepNumber: (step) => {
    set({ highlightedStepNumber: step });
  },

  setHighlightedMaterialGroupTileIds: (tileIds) => {
    set({ highlightedMaterialGroupTileIds: tileIds });
  },

  clearHighlightedMaterialGroup: () => {
    set({ highlightedMaterialGroupTileIds: [] });
  },

  regenerateDerivedData: () => {
    set((state) => {
      const numbering = generateTileNumbering(state.layout.tiles, state.numberingScheme);
      const sequence = generateConstructionSequence(state.layout.tiles, state.constructionDirection);
      const materialStats = calculateMaterialStats(state.layout.tiles);
      return {
        numberingResult: numbering,
        constructionSequence: sequence,
        materialStats,
      };
    });
  },

  exportConstructionListJSON: () => {
    const state = get();
    return generateConstructionListExportData(
      state.roof,
      state.tiles,
      state.layout.tiles,
      state.numberingScheme,
      state.constructionDirection
    );
  },

  exportConstructionListHTML: () => {
    const state = get();
    const data = generateConstructionListExportData(
      state.roof,
      state.tiles,
      state.layout.tiles,
      state.numberingScheme,
      state.constructionDirection
    );
    const html = generatePrintableConstructionListHTML(data);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `施工清单_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  printConstructionList: () => {
    const state = get();
    const data = generateConstructionListExportData(
      state.roof,
      state.tiles,
      state.layout.tiles,
      state.numberingScheme,
      state.constructionDirection
    );
    const html = generatePrintableConstructionListHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  },
}));
