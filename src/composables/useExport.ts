import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
}

/**
 * 将表格数据导出为 Excel（.xlsx）
 * @param data 行数据数组
 * @param columns 列配置，若不传则用 data[0] 的 key 作为表头
 * @param filename 文件名（不含扩展名）
 */
export function exportToExcel(
  data: Record<string, any>[],
  columns?: ExportColumn[],
  filename = 'export'
) {
  if (!data.length) return;
  const headers = columns
    ? columns.map((c) => c.label)
    : Object.keys(data[0]);
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);
  const rows = data.map((row) =>
    keys.map((k) => (row[k] != null ? row[k] : ''))
  );
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}

/**
 * 导出多 sheet 的 Excel
 * @param sheets 每个 sheet 的 name 与行数据（每行为对象，key 为列名）
 * @param filename 文件名（不含扩展名）
 */
export function exportToExcelMultiSheet(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename = 'export'
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((k) => (row[k] != null ? row[k] : '')));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}
