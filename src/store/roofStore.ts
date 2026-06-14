import { create } from 'zustand';
import type { RoofParams, TileParams, LayoutResult, ProjectData } from '@/types';
import { calculateLayout } from '@/utils/roofCalculator';

interface RoofStore {
  roof: RoofParams;
  tiles: TileParams;
  layout: LayoutResult;
  manualAdjustments: Record<string, { x: number; y: number }>;
  selectedTileId: string | null;
  wasteThreshold: number;
  showWasteWarning: boolean;

  setRoof: (roof: Partial<RoofParams>) => void;
  setTiles: (tiles: Partial<TileParams>) => void;
  setSelectedTile: (id: string | null) => void;
  setManualAdjustment: (tileId: string, x: number, y: number) => void;
  clearManualAdjustments: () => void;
  setWasteThreshold: (threshold: number) => void;
  recalculateLayout: () => void;
  exportProject: () => ProjectData;
  importProject: (data: ProjectData) => void;
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

const initialLayout = calculateLayout(defaultRoof, defaultTiles);

export const useRoofStore = create<RoofStore>((set, get) => ({
  roof: defaultRoof,
  tiles: defaultTiles,
  layout: initialLayout,
  manualAdjustments: {},
  selectedTileId: null,
  wasteThreshold: 0.15,
  showWasteWarning: false,

  setRoof: (roof) => {
    set((state) => {
      const newRoof = { ...state.roof, ...roof };
      const newLayout = calculateLayout(newRoof, state.tiles, state.manualAdjustments);
      return {
        roof: newRoof,
        layout: newLayout,
        showWasteWarning: newLayout.wasteRate > state.wasteThreshold,
      };
    });
  },

  setTiles: (tiles) => {
    set((state) => {
      const newTiles = { ...state.tiles, ...tiles };
      const newLayout = calculateLayout(state.roof, newTiles, state.manualAdjustments);
      return {
        tiles: newTiles,
        layout: newLayout,
        showWasteWarning: newLayout.wasteRate > state.wasteThreshold,
      };
    });
  },

  setSelectedTile: (id) => {
    set({ selectedTileId: id });
  },

  setManualAdjustment: (tileId, x, y) => {
    set((state) => {
      const newAdjustments = {
        ...state.manualAdjustments,
        [tileId]: { x, y },
      };
      const newLayout = calculateLayout(state.roof, state.tiles, newAdjustments);
      return {
        manualAdjustments: newAdjustments,
        layout: newLayout,
        showWasteWarning: newLayout.wasteRate > state.wasteThreshold,
      };
    });
  },

  clearManualAdjustments: () => {
    set((state) => {
      const newLayout = calculateLayout(state.roof, state.tiles, {});
      return {
        manualAdjustments: {},
        layout: newLayout,
        showWasteWarning: newLayout.wasteRate > state.wasteThreshold,
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
      const newLayout = calculateLayout(state.roof, state.tiles, state.manualAdjustments);
      return {
        layout: newLayout,
        showWasteWarning: newLayout.wasteRate > state.wasteThreshold,
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
    set({
      roof: data.roof,
      tiles: data.tiles,
      layout: data.layout,
      manualAdjustments: data.manualAdjustments,
      wasteThreshold: data.wasteThreshold,
      showWasteWarning: data.layout.wasteRate > data.wasteThreshold,
    });
  },
}));
