export {
  calculateRoofArea,
  getRoofWidthAtY,
  getRoofLeftOffsetAtY,
  getRoofBoundaryPoints,
  isPointInRoof,
  validateRoofParams,
  validateTileParams,
  computeLayoutWithOriginals as calculateLayoutWithOriginal,
  validateOverlapConstraints,
  validateSingleTileAdjustment,
  deriveFullLayoutState,
  computeLayoutWithOriginals,
} from '@/domains/layout';

export { calculateLayout } from '@/domains/layout/legacyCompat';

export { generateTileNumbering } from '@/domains/numbering';

export {
  calculateMaterialStats,
  generateConstructionSequence,
} from '@/domains/checklist';

export {
  generateConstructionListExportData,
  generatePrintableConstructionListHTML,
  generateFilteredPrintableConstructionListHTML,
} from '@/domains/export';
