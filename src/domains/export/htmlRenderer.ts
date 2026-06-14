import type { ConstructionListExportData, ConstructionListFilter } from '@/types';
import {
  formatDate,
  getCutTypeName,
  CSS_STYLES,
  FILTER_CSS,
  renderHeader,
  renderInfoGrid,
  renderSection,
  renderFooter,
  renderFilterInfo,
} from './htmlTemplate';
import { applyChecklistFilter } from '../checklist';

function renderMaterialsTable(data: ConstructionListExportData): string {
  return `
    <table>
      <thead>
        <tr>
          <th>序号</th>
          <th>材料名称</th>
          <th>规格 (mm)</th>
          <th>类型</th>
          <th>数量 (块)</th>
          <th>单块面积 (mm²)</th>
          <th>总面积 (mm²)</th>
        </tr>
      </thead>
      <tbody>
        ${data.materials.groups
          .map(
            (g, i) => `
          <tr class="${g.isCut ? 'cut-tile' : ''}">
            <td>${i + 1}</td>
            <td>${g.groupName}</td>
            <td>${g.width}×${g.height}</td>
            <td>${g.isCut ? '裁切瓦' : '完整瓦'}</td>
            <td>${g.count}</td>
            <td>${(g.totalArea / g.count).toFixed(0)}</td>
            <td>${g.totalArea.toFixed(0)}</td>
          </tr>
        `
          )
          .join('')}
        <tr class="summary-row">
          <td colspan="4">合计</td>
          <td>${data.materials.summary.totalTileCount}</td>
          <td>-</td>
          <td>${data.materials.summary.totalArea.toFixed(0)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderSequenceTable(data: ConstructionListExportData): string {
  return `
    <table>
      <thead>
        <tr>
          <th>步骤</th>
          <th>施工内容</th>
          <th>瓦片数量 (块)</th>
          <th>估计面积 (mm²)</th>
          <th>瓦片编号</th>
        </tr>
      </thead>
      <tbody>
        ${data.sequence.steps
          .map(
            (step) => `
          <tr>
            <td>${step.stepNumber}</td>
            <td>${step.description}</td>
            <td>${step.tileIds.length}</td>
            <td>${step.estimatedArea.toFixed(0)}</td>
            <td style="text-align:left;font-size:11px;">${step.tileIds
              .map((id) => data.numbering.numberingMap[id]?.displayNumber || id)
              .join('、')}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderTileDetailsTable(tileDetails: ConstructionListExportData['tileDetails']): string {
  return `
    <table>
      <thead>
        <tr>
          <th>序号</th>
          <th>瓦片编号</th>
          <th>行列位置</th>
          <th>类型</th>
          <th>规格 (mm)</th>
          <th>位置 X (mm)</th>
          <th>位置 Y (mm)</th>
          <th>裁切方式</th>
        </tr>
      </thead>
      <tbody>
        ${tileDetails
          .map((tile, i) => {
            return `
              <tr class="${tile.isCut ? 'cut-tile' : ''}">
                <td>${i + 1}</td>
                <td><strong>${tile.displayNumber}</strong></td>
                <td>第${tile.row + 1}行 第${tile.col + 1}列</td>
                <td>${tile.isCut ? '裁切瓦' : '完整瓦'}</td>
                <td>${tile.width.toFixed(1)}×${tile.height.toFixed(1)}</td>
                <td>${tile.x.toFixed(1)}</td>
                <td>${tile.y.toFixed(1)}</td>
                <td>${getCutTypeName(tile.cutType)}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

export function generatePrintableConstructionListHTML(data: ConstructionListExportData): string {
  const exportDateFormatted = formatDate(data.projectInfo.exportDate);

  const overviewSection = renderSection(
    '一、工程概况',
    renderInfoGrid([
      { label: '屋面形式：', value: data.projectInfo.roofShape },
      { label: '屋面宽度：', value: `${data.projectInfo.roofWidth} mm` },
      { label: '屋面高度：', value: `${data.projectInfo.roofHeight} mm` },
      {
        label: '屋面面积：',
        value: `${(data.projectInfo.roofArea / 1000000).toFixed(4)} m²`,
      },
      { label: '瓦件类型：', value: data.projectInfo.tileType },
      {
        label: '瓦件规格：',
        value: `${data.projectInfo.tileWidth}×${data.projectInfo.tileHeight} mm`,
      },
    ])
  );

  const materialsSection = renderSection(
    '二、材料分组统计',
    renderMaterialsTable(data)
  );

  const sequenceSection = renderSection(
    `三、施工顺序（共 ${data.sequence.totalSteps} 步）`,
    renderSequenceTable(data)
  );

  const detailsSection = renderSection(
    `四、瓦片明细清单（共 ${data.tileDetails.length} 块）`,
    renderTileDetailsTable(data.tileDetails)
  );

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>古建筑屋面施工清单</title>
      <style>${CSS_STYLES}</style>
    </head>
    <body>
      ${renderHeader('古建筑屋面瓦作施工清单', `导出日期：${exportDateFormatted}`)}
      ${overviewSection}
      ${materialsSection}
      ${sequenceSection}
      ${detailsSection}
      ${renderFooter(exportDateFormatted)}
    </body>
    </html>
  `;
}

export function generateFilteredPrintableConstructionListHTML(
  data: ConstructionListExportData,
  filter: ConstructionListFilter
): string {
  const { filteredTiles, filteredGroups, filteredSteps } = applyChecklistFilter(
    {
      tiles: data.tileDetails as unknown as (typeof data.tileDetails)[number][],
      groups: data.materials.groups,
      steps: data.sequence.steps,
      numberingMap: data.numbering.numberingMap,
    },
    filter
  );

  const hasFilter =
    !filter.includeFullTiles ||
    !filter.includeCutTiles ||
    filter.selectedGroups.length > 0 ||
    filter.selectedSteps.length > 0 ||
    filter.searchKeyword.trim() !== '';

  const totalFilteredCount = filteredTiles.length;
  const totalFilteredArea = filteredTiles.reduce((sum, t) => sum + t.width * t.height, 0);
  const exportDateFormatted = formatDate(data.projectInfo.exportDate);

  const overviewSection = renderSection(
    '一、工程概况',
    renderInfoGrid([
      { label: '屋面形式：', value: data.projectInfo.roofShape },
      { label: '屋面宽度：', value: `${data.projectInfo.roofWidth} mm` },
      { label: '屋面高度：', value: `${data.projectInfo.roofHeight} mm` },
      {
        label: '屋面面积：',
        value: `${(data.projectInfo.roofArea / 1000000).toFixed(4)} m²`,
      },
      { label: '瓦件类型：', value: data.projectInfo.tileType },
      {
        label: '瓦件规格：',
        value: `${data.projectInfo.tileWidth}×${data.projectInfo.tileHeight} mm`,
      },
    ])
  );

  const statsSection = renderSection(
    '二、筛选结果统计',
    renderInfoGrid([
      { label: '筛选瓦数：', value: `${totalFilteredCount} 块` },
      {
        label: '筛选面积：',
        value: `${(totalFilteredArea / 1000000).toFixed(4)} m²`,
      },
      {
        label: '占总数比：',
        value: `${
          data.materials.summary.totalTileCount > 0
            ? ((totalFilteredCount / data.materials.summary.totalTileCount) * 100).toFixed(1)
            : 0
        }%`,
      },
    ])
  );

  const materialsSection = renderSection(
    '三、材料分组统计',
    `
    <table>
      <thead>
        <tr>
          <th>序号</th>
          <th>材料名称</th>
          <th>规格 (mm)</th>
          <th>类型</th>
          <th>数量 (块)</th>
          <th>单块面积 (mm²)</th>
          <th>总面积 (mm²)</th>
        </tr>
      </thead>
      <tbody>
        ${filteredGroups
          .map(
            (g, i) => `
          <tr class="${g.isCut ? 'cut-tile' : ''}">
            <td>${i + 1}</td>
            <td>${g.groupName}</td>
            <td>${g.width}×${g.height}</td>
            <td>${g.isCut ? '裁切瓦' : '完整瓦'}</td>
            <td>${g.count}</td>
            <td>${g.count > 0 ? (g.totalArea / g.count).toFixed(0) : 0}</td>
            <td>${g.totalArea.toFixed(0)}</td>
          </tr>
        `
          )
          .join('')}
        <tr class="summary-row">
          <td colspan="4">合计</td>
          <td>${filteredGroups.reduce((sum, g) => sum + g.count, 0)}</td>
          <td>-</td>
          <td>${filteredGroups.reduce((sum, g) => sum + g.totalArea, 0).toFixed(0)}</td>
        </tr>
      </tbody>
    </table>
    `
  );

  const sequenceSection = renderSection(
    `四、施工顺序（共 ${filteredSteps.length} 步）`,
    `
    <table>
      <thead>
        <tr>
          <th>步骤</th>
          <th>施工内容</th>
          <th>瓦片数量 (块)</th>
          <th>估计面积 (mm²)</th>
          <th>瓦片编号</th>
        </tr>
      </thead>
      <tbody>
        ${filteredSteps
          .map(
            (step) => `
          <tr>
            <td>${step.stepNumber}</td>
            <td>${step.description}</td>
            <td>${step.tileIds.length}</td>
            <td>${step.tileIds
              .reduce((sum, id) => {
                const tile = data.tileDetails.find((t) => t.id === id);
                return sum + (tile ? tile.width * tile.height : 0);
              }, 0)
              .toFixed(0)}</td>
            <td style="text-align:left;font-size:11px;">${step.tileIds
              .map((id) => data.numbering.numberingMap[id]?.displayNumber || id)
              .join('、')}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
  );

  const filteredTileDetails = data.tileDetails.filter((t) =>
    filteredTiles.some((ft) => ft.id === t.id)
  );

  const detailsSection = renderSection(
    `五、瓦片明细清单（共 ${filteredTileDetails.length} 块）`,
    renderTileDetailsTable(filteredTileDetails)
  );

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>古建筑屋面施工清单${hasFilter ? '（筛选）' : ''}</title>
      <style>${CSS_STYLES}${FILTER_CSS}</style>
    </head>
    <body>
      ${renderHeader(
        '古建筑屋面瓦作施工清单',
        `导出日期：${exportDateFormatted}${hasFilter ? ' | 筛选结果' : ''}`
      )}
      ${hasFilter ? renderFilterInfo(filter) : ''}
      ${overviewSection}
      ${statsSection}
      ${materialsSection}
      ${sequenceSection}
      ${detailsSection}
      ${renderFooter(exportDateFormatted)}
    </body>
    </html>
  `;
}
