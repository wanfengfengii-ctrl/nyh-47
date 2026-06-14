import type { RoofParams, TileParams, ProjectData, LayoutResult } from '@/types';
import type { LayoutManualAdjustments } from '../layout/types';

export function serializeProject(data: ProjectData): string {
  return JSON.stringify(data, null, 2);
}

export function deserializeProject(jsonStr: string): ProjectData {
  return JSON.parse(jsonStr) as ProjectData;
}

export function validateProjectData(data: unknown): data is ProjectData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.roof === 'object' &&
    d.roof !== null &&
    typeof d.tiles === 'object' &&
    d.tiles !== null &&
    typeof d.layout === 'object' &&
    d.layout !== null &&
    typeof d.manualAdjustments === 'object' &&
    d.manualAdjustments !== null &&
    typeof d.wasteThreshold === 'number'
  );
}

export function buildProjectExport(
  roof: RoofParams,
  tiles: TileParams,
  layout: LayoutResult,
  manualAdjustments: LayoutManualAdjustments,
  wasteThreshold: number
): ProjectData {
  return {
    roof,
    tiles,
    layout,
    manualAdjustments,
    wasteThreshold,
  };
}

export interface ImportWarnings {
  warnings: string[];
}

export function buildImportWarnings(ctx: {
  layoutWasteRate: number;
  wasteThreshold: number;
  invalidTileCount: number;
  manualAdjustmentCount: number;
}): string[] {
  const warnings: string[] = [];

  if (ctx.invalidTileCount > 0) {
    warnings.push(`导入方案检测到 ${ctx.invalidTileCount} 块瓦片存在搭接约束违规`);
  }

  if (ctx.layoutWasteRate > ctx.wasteThreshold) {
    warnings.push(
      `导入方案损耗率为 ${(ctx.layoutWasteRate * 100).toFixed(2)}%，超过阈值 ${(ctx.wasteThreshold * 100).toFixed(0)}%`
    );
  }

  if (ctx.manualAdjustmentCount > 0) {
    warnings.push(`导入方案包含 ${ctx.manualAdjustmentCount} 块手动调整的瓦片`);
  }

  return warnings;
}
