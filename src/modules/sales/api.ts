import { supabase } from '../../supabase';
import type { SalesRow, ReceiptRow, PageResult } from './types';

const SALES_SELECT =
  'id, document_date, document_no, payment_method, customer_name, product_name, color_code, spec_model, category, grade, box_count, area_sqm, unit_price_usd, amount_usd, exchange_rate, amount_uzs, order_no, vehicle_no, export_country, dealer_name, shipper_name, note, refund_uzs, driver_tax_no, logistics_tax_no, vehicle_type, contract_no';

const RECEIPT_SELECT =
  'id, account_name, customer_name, receipt_date, amount_usd, amount_uzs, note';

/** 销售列筛选：支持按列精确/多选，服务端查询 */
const SALES_FILTER_COLUMNS = [
  'document_date', 'document_no', 'payment_method', 'customer_name',
  'category', 'grade', 'export_country', 'vehicle_no',
] as const;

/** 销售数据：服务端分页 + 日期 + 关键词 + 列筛选 */
export async function fetchSalesPage(params: {
  page: number;
  pageSize: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  keyword?: string;
  columnFilters?: Record<string, string[]>;
}): Promise<PageResult<SalesRow>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('sales_records')
    .select(SALES_SELECT, { count: 'exact' })
    .order('document_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.dateFrom) query = query.gte('document_date', params.dateFrom);
  if (params.dateTo) query = query.lte('document_date', params.dateTo);
  if (params.keyword) {
    const k = `%${params.keyword}%`;
    query = query.or(`document_no.ilike.${k},customer_name.ilike.${k},product_name.ilike.${k},contract_no.ilike.${k}`);
  }
  if (params.columnFilters) {
    for (const col of SALES_FILTER_COLUMNS) {
      const vals = params.columnFilters[col];
      if (vals?.length) query = query.in(col, vals);
    }
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data || []) as SalesRow[], total: count ?? 0 };
}

/** 收款列筛选：支持按列精确/多选，服务端查询 */
const RECEIPT_FILTER_COLUMNS = ['receipt_date', 'account_name', 'customer_name'] as const;

/** 收款数据：服务端分页 + 日期 + 关键词 + 列筛选 */
export async function fetchReceiptPage(params: {
  page: number;
  pageSize: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  keyword?: string;
  columnFilters?: Record<string, string[]>;
}): Promise<PageResult<ReceiptRow>> {
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from('sales_receipts')
    .select(RECEIPT_SELECT, { count: 'exact' })
    .order('receipt_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.dateFrom) query = query.gte('receipt_date', params.dateFrom);
  if (params.dateTo) query = query.lte('receipt_date', params.dateTo);
  if (params.keyword) {
    const k = `%${params.keyword}%`;
    query = query.or(`account_name.ilike.${k},customer_name.ilike.${k}`);
  }
  if (params.columnFilters) {
    for (const col of RECEIPT_FILTER_COLUMNS) {
      const vals = params.columnFilters[col];
      if (vals?.length) query = query.in(col, vals);
    }
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data || []) as ReceiptRow[], total: count ?? 0 };
}

/**
 * 分批获取全部销售数据（用于导出）
 * Supabase 单次 .range() 最多返回约 1000 行，这里循环拉取直到拿完
 */
export async function fetchAllSalesRows(params: {
  dateFrom?: string | null;
  dateTo?: string | null;
  keyword?: string;
  columnFilters?: Record<string, string[]>;
}): Promise<SalesRow[]> {
  const PAGE = 1000;
  const all: SalesRow[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from('sales_records')
      .select(SALES_SELECT)
      .order('document_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (params.dateFrom) query = query.gte('document_date', params.dateFrom);
    if (params.dateTo) query = query.lte('document_date', params.dateTo);
    if (params.keyword) {
      const k = `%${params.keyword}%`;
      query = query.or(`document_no.ilike.${k},customer_name.ilike.${k},product_name.ilike.${k},contract_no.ilike.${k}`);
    }
    if (params.columnFilters) {
      for (const col of SALES_FILTER_COLUMNS) {
        const vals = params.columnFilters[col];
        if (vals?.length) query = query.in(col, vals);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as SalesRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

/**
 * 分批获取全部收款数据（用于导出）
 */
export async function fetchAllReceiptRows(params: {
  dateFrom?: string | null;
  dateTo?: string | null;
  keyword?: string;
  columnFilters?: Record<string, string[]>;
}): Promise<ReceiptRow[]> {
  const PAGE = 1000;
  const all: ReceiptRow[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from('sales_receipts')
      .select(RECEIPT_SELECT)
      .order('receipt_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (params.dateFrom) query = query.gte('receipt_date', params.dateFrom);
    if (params.dateTo) query = query.lte('receipt_date', params.dateTo);
    if (params.keyword) {
      const k = `%${params.keyword}%`;
      query = query.or(`account_name.ilike.${k},customer_name.ilike.${k}`);
    }
    if (params.columnFilters) {
      for (const col of RECEIPT_FILTER_COLUMNS) {
        const vals = params.columnFilters[col];
        if (vals?.length) query = query.in(col, vals);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as ReceiptRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

export async function importSalesRowsLegacy(rows: Record<string, any>[]) {
  const { data, error } = await supabase.rpc('rpc_sales_import_rows_legacy_headers', { p_rows: rows });
  if (error) throw error;
  const d = data as { written?: number; total?: number };
  return { written: Number(d?.written ?? 0) };
}

export async function importReceiptRowsLegacy(rows: Record<string, any>[]) {
  const { data, error } = await supabase.rpc('rpc_sales_receipts_import_rows_legacy_headers', { p_rows: rows });
  if (error) throw error;
  const d = data as { written?: number; total?: number };
  return { written: Number(d?.written ?? 0) };
}

/** 新增单条销售记录 */
export async function createSalesRecord(payload: Partial<Omit<SalesRow, 'id'>>) {
  const { data, error } = await supabase
    .from('sales_records')
    .insert([payload])
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

/** 新增单条收款记录 */
export async function createReceiptRecord(payload: Partial<Omit<ReceiptRow, 'id'>>) {
  const { data, error } = await supabase
    .from('sales_receipts')
    .insert([payload])
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

/** 删除销售记录 */
export async function deleteSalesRecord(id: string) {
  const { error } = await supabase.from('sales_records').delete().eq('id', id);
  if (error) throw error;
}

/** 删除收款记录 */
export async function deleteReceiptRecord(id: string) {
  const { error } = await supabase.from('sales_receipts').delete().eq('id', id);
  if (error) throw error;
}

/** 更新单条收款记录 */
export async function updateReceiptRecord(id: string, payload: Partial<Omit<ReceiptRow, 'id'>>) {
  const { error } = await supabase.from('sales_receipts').update(payload).eq('id', id);
  if (error) throw error;
}

export async function updateSalesRecord(params: {
  id: string;
  payload: Record<string, any>;
  modifierEmail?: string;
  modifierUserId?: string;
}) {
  let extra: Record<string, any> = {};
  if (params.modifierEmail) {
    const { data: cur, error: e1 } = await supabase.from('sales_records').select('extra').eq('id', params.id).single();
    if (e1) throw e1;
    extra = (cur as any)?.extra || {};
    extra = {
      ...(extra || {}),
      modifier_email: params.modifierEmail,
      modifier_at: new Date().toISOString(),
    };
    if (params.modifierUserId) extra.modifier_user_id = params.modifierUserId;
  }
  const updatePayload: Record<string, any> = { ...params.payload };
  if (params.modifierEmail) updatePayload.extra = extra;
  if (params.modifierUserId) updatePayload.updated_by = params.modifierUserId;

  const { error } = await supabase.from('sales_records').update(updatePayload).eq('id', params.id);
  if (error) throw error;
}

/** 仪表盘：最近 N 条销售记录 */
export async function fetchRecentSales(limit = 10): Promise<SalesRow[]> {
  const { data, error } = await supabase
    .from('sales_records')
    .select(SALES_SELECT)
    .order('document_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as SalesRow[];
}

/** 仪表盘：最近 N 条收款记录 */
export async function fetchRecentReceipts(limit = 10): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from('sales_receipts')
    .select(RECEIPT_SELECT)
    .order('receipt_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ReceiptRow[];
}

/** 仪表盘图表：近 N 天每日销售与收款汇总 */
export async function fetchDashboardChartData(days = 30): Promise<{
  labels: string[];
  sales: number[];
  receipts_usd: number[];
  receipts_uzs: number[];
}> {
  const { data, error } = await supabase.rpc('rpc_sales_dashboard_chart_data', { p_days: days });
  if (error) throw error;
  let raw: Record<string, unknown> = {};
  if (data != null && typeof data === 'object') {
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      raw = (row && typeof row === 'object' && 'rpc_sales_dashboard_chart_data' in row
        ? (row as { rpc_sales_dashboard_chart_data: Record<string, unknown> }).rpc_sales_dashboard_chart_data
        : row) as Record<string, unknown>;
    } else {
      raw = data as Record<string, unknown>;
    }
  }
  return {
    labels: (raw.labels as string[]) ?? [],
    sales: (raw.sales as number[]) ?? [],
    receipts_usd: (raw.receipts_usd as number[]) ?? [],
    receipts_uzs: (raw.receipts_uzs as number[]) ?? [],
  };
}

/** 仪表盘：销售总销售额(美元)、收款美金/苏姆合计，与 sales_records / sales_receipts 实时同步 */
export async function fetchDashboardTotals(): Promise<{
  sales_total_usd: number;
  receipt_total_usd: number;
  receipt_total_uzs: number;
}> {
  const { data, error } = await supabase.rpc('rpc_sales_dashboard_totals');
  if (error) throw error;
  let raw: Record<string, unknown> = {};
  if (data != null && typeof data === 'object') {
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      raw = (row && typeof row === 'object' && 'rpc_sales_dashboard_totals' in row
        ? (row as { rpc_sales_dashboard_totals: Record<string, unknown> }).rpc_sales_dashboard_totals
        : row) as Record<string, unknown>;
    } else {
      raw = data as Record<string, unknown>;
    }
  }
  return {
    sales_total_usd: Number(raw.sales_total_usd ?? 0),
    receipt_total_usd: Number(raw.receipt_total_usd ?? 0),
    receipt_total_uzs: Number(raw.receipt_total_uzs ?? 0),
  };
}
