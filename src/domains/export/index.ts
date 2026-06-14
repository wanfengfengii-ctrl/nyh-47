export * from './projectIO';
export * from './checklistExport';
export * from './htmlRenderer';
export * from './htmlTemplate';

import type { ConstructionListExportData, ConstructionListFilter } from '@/types';
import { generatePrintableConstructionListHTML, generateFilteredPrintableConstructionListHTML } from './htmlRenderer';
import { generateConstructionListExportData } from './checklistExport';
import type { RoofParams, TileParams, Tile, NumberingScheme, ConstructionDirection } from '@/types';

export interface ExportFilenameCtx {
  date?: string;
  prefix?: string;
}

function buildFilename(prefix: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}_${date}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON<T>(data: T, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, filename);
}

export function printHTML(html: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export interface ConstructionListExportContext {
  roof: RoofParams;
  tiles: TileParams;
  layoutTiles: Tile[];
  numberingScheme: NumberingScheme;
  constructionDirection: ConstructionDirection;
}

export function buildAndExportConstructionListJSON(ctx: ConstructionListExportContext): void {
  const data = generateConstructionListExportData(
    ctx.roof,
    ctx.tiles,
    ctx.layoutTiles,
    ctx.numberingScheme,
    ctx.constructionDirection
  );
  downloadJSON(data, buildFilename('施工清单', 'json'));
}

export function buildAndExportConstructionListHTML(ctx: ConstructionListExportContext): void {
  const data = generateConstructionListExportData(
    ctx.roof,
    ctx.tiles,
    ctx.layoutTiles,
    ctx.numberingScheme,
    ctx.constructionDirection
  );
  const html = generatePrintableConstructionListHTML(data);
  downloadHTML(html, buildFilename('施工清单', 'html'));
}

export function buildAndPrintConstructionList(
  ctx: ConstructionListExportContext
): void {
  const data = generateConstructionListExportData(
    ctx.roof,
    ctx.tiles,
    ctx.layoutTiles,
    ctx.numberingScheme,
    ctx.constructionDirection
  );
  const html = generatePrintableConstructionListHTML(data);
  printHTML(html);
}

export function buildAndPrintFilteredConstructionList(
  ctx: ConstructionListExportContext & { filter: ConstructionListFilter }
): void {
  const data = generateConstructionListExportData(
    ctx.roof,
    ctx.tiles,
    ctx.layoutTiles,
    ctx.numberingScheme,
    ctx.constructionDirection
  );
  const html = generateFilteredPrintableConstructionListHTML(data, ctx.filter);
  printHTML(html);
}

export function getExportData(ctx: ConstructionListExportContext): ConstructionListExportData {
  return generateConstructionListExportData(
    ctx.roof,
    ctx.tiles,
    ctx.layoutTiles,
    ctx.numberingScheme,
    ctx.constructionDirection
  );
}

export const exportDomain = {
  downloadBlob,
  downloadJSON,
  downloadHTML,
  printHTML,
  buildAndExportConstructionListJSON,
  buildAndExportConstructionListHTML,
  buildAndPrintConstructionList,
  buildAndPrintFilteredConstructionList,
  getExportData,
  buildFilename,
};
