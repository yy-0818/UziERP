import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

export type ImportMode = 'sales' | 'receipt';
export type ImportRow = Record<string, unknown>;

const SALES_PASTE_KEYS = ['document_date', 'document_no', 'payment_method', 'customer_name', 'product_name', 'color_code', 'spec_model', 'category', 'grade', 'box_count', 'area_sqm', 'unit_price_usd', 'amount_usd', 'exchange_rate', 'amount_uzs', 'refund_uzs', 'vehicle_no', 'export_country', 'dealer_name', 'shipper_name', 'order_no', 'note', 'driver_tax_no', 'logistics_tax_no', 'vehicle_type', 'contract_no'];
const RECEIPT_PASTE_KEYS = ['receipt_date', 'account_name', 'customer_name', 'amount_usd', 'amount_uzs', 'note'];
const HEADER_HINTS = ['日期', '单据', '客户', '账户', '商品', '美金', '苏姆', '备注', 'document', 'receipt', 'customer', 'account'];

const LEGACY_KEY_ALIASES: Record<string, string> = {
  '单据日期датадокумента': '单据日期 Дата документа',
  '单据编号номердокумента': '单据编号 Номер документа',
  '客户分类способоплаты': '客户分类 способ  оплаты',
  '客户名称названиеклиента': '客户名称 Название клиента',
  '商品名称названиетовара': '商品名称 Название товара',
  '色号партия': '色号 партия',
  '规格型号спецификация': '规格型号 спецификация',
  '类别категория': '类别 Категория',
  '等级класс': '等级 Класс',
  '箱数количествокоробок': '箱数 Количество  коробок',
  '平方数квадратныеметры': '平方数 Квадратные метры',
  '单价$ценазаединицу': '单价$ цена за единицу',
  '合计$итог': '合计$ итог',
  '汇率курсвалют': '汇率 Курс валют',
  '苏姆合计суммавсумах': '苏姆合计 Сумма в сумах',
  '订单号номерзаказа': '订单号 Номер заказа',
  '车号номеравтомобиля': '车号 Номер  автомобиля',
  '出口国страна': '出口国 Страна',
  '经销商дилер': '经销商 Дилер',
  '发货人отправитель': '发货人 Отправитель',
  '司机税号': '司机税号',
  '物流税号': '物流税号',
  '车型': '车型',
  '合同编号': '合同编号',
  '整单备注': '备注',
  '日期датадокумента': '日期 Дата документа',
  '美金金额$итог': '美金金额 $ итог',
  '苏姆金额somсуммавсумах': '苏姆金额 som Сумма в сумах',
  '备注': '备注',
  '__empty': '账户',
  '__empty_1': '备注',
};

function toNum(v: string): number | null {
  if (v == null || v === '') return null;
  const s = String(v).trim().replace(/\s/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

export function normalizeDateForDb(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cnMatch = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?/);
  if (cnMatch) {
    const [, y, m, d] = cnMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = dayjs(s, ['YYYY-MM-DD', 'YYYY/M/D', 'YYYY-M-D', 'M/D/YYYY', 'DD.MM.YYYY', 'YYYY.MM.DD', 'MM/DD/YYYY'], true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

function parseTsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      cell += c;
    } else if (c === '\t') {
      cells.push(cell);
      cell = '';
    } else {
      cell += c;
    }
  }
  cells.push(cell);
  return cells;
}

function parseTsvRows(txt: string): string[][] {
  const rows: string[][] = [];
  let line = '';
  let inQuotes = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (c === '"') {
      if (inQuotes && txt[i + 1] === '"') {
        line += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        line += c;
      }
    } else if (!inQuotes && (c === '\n' || c === '\r')) {
      if (c === '\r' && txt[i + 1] === '\n') i++;
      rows.push(parseTsvLine(line));
      line = '';
    } else {
      line += c;
    }
  }
  if (line) rows.push(parseTsvLine(line));
  return rows;
}

export function parseExcelPasteRows(text: string, mode: ImportMode): ImportRow[] {
  const txt = String(text || '').trim();
  if (!txt) return [];
  const keys = mode === 'sales' ? SALES_PASTE_KEYS : RECEIPT_PASTE_KEYS;
  const lines = parseTsvRows(txt);
  const rows: ImportRow[] = [];
  let startIdx = 0;
  if (lines.length > 0 && lines[0].length > 0) {
    const firstCell = String(lines[0][0] || '').trim().replace(/^"|"$/g, '');
    if (HEADER_HINTS.some((h) => firstCell.includes(h))) startIdx = 1;
  }
  for (let i = startIdx; i < lines.length; i++) {
    const cells = lines[i];
    const row: ImportRow = {};
    for (let j = 0; j < keys.length; j++) {
      let val = cells[j] != null ? String(cells[j]).trim() : '';
      val = val.replace(/^"|"$/g, '').replace(/""/g, '"');
      const k = keys[j];
      if (['box_count', 'area_sqm', 'unit_price_usd', 'amount_usd', 'exchange_rate', 'amount_uzs', 'refund_uzs'].includes(k)) {
        row[k] = toNum(val);
      } else {
        row[k] = val || null;
      }
    }
    if (mode === 'sales' && (row.document_no || row.customer_name || row.product_name)) rows.push(row);
    else if (mode === 'receipt' && row.customer_name) rows.push(row);
  }
  return rows;
}

function normalizeKey(k: string) {
  return String(k || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function normalizeImportRowKeys(row: ImportRow) {
  const out: ImportRow = {};
  for (const [k, v] of Object.entries(row || {})) {
    const original = String(k || '').trim();
    if (!original) continue;
    const nk = normalizeKey(original);
    const alias = LEGACY_KEY_ALIASES[nk];
    out[alias || original] = v;
  }
  return out;
}

function normalizeNumericValue(v: unknown): string {
  if (v == null) return '';
  let s = String(v).trim();
  if (!s) return '';
  s = s.replace(/\u00a0/g, ' ').replace(/[，]/g, ',');
  s = s.replace(/\s+/g, '');
  s = s.replace(/[^\d\.\-,]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  else if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',');
    s = parts.length === 2 && parts[1].length > 0 && parts[1].length <= 4 ? `${parts[0]}.${parts[1]}` : parts.join('');
  }
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  return s;
}

export function normalizeImportRows(rows: ImportRow[], mode: ImportMode): ImportRow[] {
  return rows.map((r) => {
    const out = normalizeImportRowKeys(r || {});
    const numericKeys = mode === 'sales'
      ? ['box_count', 'area_sqm', 'unit_price_usd', 'amount_usd', 'exchange_rate', 'amount_uzs', 'refund_uzs', '箱数 Количество  коробок', '平方数 Квадратные метры', '单价$ цена за единицу', '合计$ итог', '汇率 Курс валют', '苏姆合计 Сумма в сумах', '退货苏姆']
      : ['amount_usd', 'amount_uzs', '美金金额 $ итог', '苏姆金额 som Сумма в сумах'];
    numericKeys.forEach((k) => {
      if (k in out) out[k] = normalizeNumericValue(out[k]);
    });
    if (mode === 'receipt') {
      const accountVal = out.__EMPTY ?? out.账户;
      if (accountVal != null && String(accountVal).trim() !== '') out.account_name = String(accountVal).trim();
      const noteVal = out.__EMPTY_1 ?? out.备注;
      if (noteVal != null && String(noteVal).trim() !== '') out.note = String(noteVal).trim();
    }
    return out;
  });
}

export async function parseRowsFromFile(file: File): Promise<ImportRow[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.json')) {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error('JSON 文件内容必须是数组');
    return parsed.map((r) => normalizeImportRowKeys(r || {}));
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '', raw: false });
  return rows.map((r) => normalizeImportRowKeys(r || {}));
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  if (error && typeof error === 'object') {
    const maybe = error as { error_description?: string; details?: string; message?: string };
    return maybe.message || maybe.error_description || maybe.details || fallback;
  }
  return fallback;
}
