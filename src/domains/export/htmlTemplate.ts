export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCutTypeName(cutType: string | undefined): string {
  return cutType === 'left'
    ? '左裁切'
    : cutType === 'right'
    ? '右裁切'
    : cutType === 'top'
    ? '上裁切'
    : cutType === 'bottom'
    ? '下裁切'
    : cutType === 'both'
    ? '双侧裁切'
    : '-';
}

export const CSS_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: "SimSun", "宋体", serif;
  padding: 40px;
  background: #fff;
  color: #333;
  line-height: 1.6;
}
.header {
  text-align: center;
  border-bottom: 2px solid #333;
  padding-bottom: 20px;
  margin-bottom: 30px;
}
.header h1 {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 10px;
}
.header .subtitle {
  font-size: 14px;
  color: #666;
}
.section {
  margin-bottom: 30px;
}
.section-title {
  font-size: 18px;
  font-weight: bold;
  border-left: 4px solid #8b4513;
  padding-left: 10px;
  margin-bottom: 15px;
  color: #8b4513;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  font-size: 14px;
}
.info-item {
  padding: 8px 12px;
  background: #f9f6f0;
  border: 1px solid #e0d8c8;
}
.info-label {
  color: #666;
  margin-right: 8px;
}
.info-value {
  font-weight: bold;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th, td {
  border: 1px solid #999;
  padding: 8px 10px;
  text-align: center;
}
th {
  background: #8b4513;
  color: #fff;
  font-weight: bold;
}
tr:nth-child(even) td {
  background: #f9f6f0;
}
.cut-tile {
  background: #fff8e6 !important;
}
.summary-row td {
  background: #ede4d4 !important;
  font-weight: bold;
}
.footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #999;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
}
.sign-area {
  display: inline-block;
  min-width: 150px;
}
@media print {
  body { padding: 20px; }
  .section { page-break-inside: avoid; }
}
`;

export const FILTER_CSS = `
.filter-info {
  background: #f0f7ff;
  border: 1px solid #b0d4ff;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 13px;
}
.filter-info .filter-title {
  font-weight: bold;
  color: #1e40af;
  margin-bottom: 6px;
}
.filter-info .filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.filter-tag {
  background: #dbeafe;
  color: #1e40af;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
@media print {
  .filter-info { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function renderHeader(title: string, subtitle: string): string {
  return `
    <div class="header">
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
    </div>
  `;
}

export function renderInfoGrid(items: Array<{ label: string; value: string }>): string {
  return `
    <div class="info-grid">
      ${items
        .map(
          ({ label, value }) => `
        <div class="info-item">
          <span class="info-label">${label}</span>
          <span class="info-value">${value}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderSection(title: string, content: string): string {
  return `
    <div class="section">
      <div class="section-title">${title}</div>
      ${content}
    </div>
  `;
}

export function renderFooter(exportDate: string): string {
  return `
    <div class="footer">
      <div class="sign-area">制表人：____________</div>
      <div class="sign-area">审核人：____________</div>
      <div class="sign-area">日期：${exportDate}</div>
    </div>
  `;
}

export function renderFilterInfo(filter: {
  includeFullTiles: boolean;
  includeCutTiles: boolean;
  selectedGroups: string[];
  selectedSteps: number[];
  searchKeyword: string;
}): string {
  const tags: string[] = [];
  if (!filter.includeFullTiles) tags.push('<span class="filter-tag">排除完整瓦</span>');
  if (!filter.includeCutTiles) tags.push('<span class="filter-tag">排除裁切瓦</span>');
  if (filter.selectedGroups.length > 0)
    tags.push(`<span class="filter-tag">材料分组：${filter.selectedGroups.length}组</span>`);
  if (filter.selectedSteps.length > 0)
    tags.push(`<span class="filter-tag">施工步骤：${filter.selectedSteps.length}步</span>`);
  if (filter.searchKeyword.trim())
    tags.push(`<span class="filter-tag">关键词：${filter.searchKeyword}</span>`);

  if (tags.length === 0) return '';

  return `
    <div class="filter-info">
      <div class="filter-title">筛选条件</div>
      <div class="filter-tags">${tags.join('')}</div>
    </div>
  `;
}
