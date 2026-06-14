import type {
  RoofParams,
  TileParams,
  Tile,
  ConstructionListExportData,
  NumberingScheme,
  ConstructionDirection,
} from '@/types';
import { generateTileNumbering } from '../numbering';
import { calculateMaterialStats, generateConstructionSequence } from '../checklist';
import { calculateRoofArea } from '../layout/roofGeometry';

export function generateConstructionListExportData(
  roof: RoofParams,
  tileParams: TileParams,
  tiles: Tile[],
  scheme: NumberingScheme = 'slope-row-col',
  direction: ConstructionDirection = 'bottom-up'
): ConstructionListExportData {
  const numbering = generateTileNumbering(tiles, scheme);
  const materials = calculateMaterialStats(tiles);
  const sequence = generateConstructionSequence(tiles, direction);
  const roofArea = calculateRoofArea(roof);

  const tileDetails = tiles
    .map((tile) => {
      const num = numbering.numberingMap[tile.id];
      return {
        ...tile,
        displayNumber: num?.displayNumber || tile.id,
        globalSequence: num?.globalSequence || 0,
      };
    })
    .sort((a, b) => a.globalSequence - b.globalSequence);

  const shapeName =
    roof.shape === 'rectangle'
      ? '矩形'
      : roof.shape === 'trapezoid'
      ? '梯形'
      : roof.shape === 'curved'
      ? '弧形'
      : roof.shape;

  return {
    projectInfo: {
      exportDate: new Date().toISOString(),
      roofShape: shapeName,
      roofWidth: roof.width,
      roofHeight: roof.height,
      roofArea,
      tileType: tileParams.tileType === 'round' ? '筒瓦' : '板瓦',
      tileWidth: tileParams.width,
      tileHeight: tileParams.length,
    },
    numbering,
    materials,
    sequence,
    tileDetails,
  };
}

export type { ConstructionListExportData };
