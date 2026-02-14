import { supabase } from '../../supabase';
import type { SalesRow, ReceiptRow, PageResult } from './types';

const SALES_SELECT =
  'id, document_date, document_no, payment_method, customer_name, product_name, color_code, spec_model, category, grade, box_count, area_sqm, unit_price_usd, amount_usd, exchange_rate, amount_uzs, order_no, vehicle_no, export_country, dealer_name, shipper_name, note, refund_uzs, driver_tax_no, logistics_tax_no, vehicle_type, contract_no';

const RECEIPT_SELECT =
  'id, account_name, customer_name, receipt_date, amount_usd, amount_uzs, exchange_rate, sales_document_no, contract_no, note';

/** 销售数据：服务端分页 + 日期筛选 + 关键词 */
export async function fetchSalesPage(params: {
  page: number;
  pageSize: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  keyword?: string;
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

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data || []) as SalesRow[], total: count ?? 0 };
}

/** 收款数据：服务端分页 + 日期筛选 + 关键词 */
export async function fetchReceiptPage(params: {
  page: number;
  pageSize: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  keyword?: string;
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
    query = query.or(`account_name.ilike.${k},customer_name.ilike.${k},sales_document_no.ilike.${k},contract_no.ilike.${k}`);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data || []) as ReceiptRow[], total: count ?? 0 };
}

export async function importSalesRowsLegacy(rows: Record<string, any>[]) {
  const { data, error } = await supabase.rpc('rpc_sales_import_rows_legacy_headers', { p_rows: rows });
  if (error) throw error;
  return data as { inserted?: number; updated?: number };
}

export async function importReceiptRowsLegacy(rows: Record<string, any>[]) {
  const { data, error } = await supabase.rpc('rpc_sales_receipts_import_rows_legacy_headers', { p_rows: rows });
  if (error) throw error;
  return data as { inserted?: number; updated?: number };
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

/** 仪表盘统计：近 N 天销售/收款概况 */
export async function fetchDashboardSalesStats(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const [salesCountRes, salesSumRes, receiptCountRes, receiptSumRes] = await Promise.all([
    supabase
      .from('sales_records')
      .select('id', { count: 'exact', head: true })
      .gte('document_date', since),
    supabase
      .from('sales_records')
      .select('amount_uzs.sum(), amount_usd.sum()')
      .gte('document_date', since)
      .single(),
    supabase
      .from('sales_receipts')
      .select('id', { count: 'exact', head: true })
      .gte('receipt_date', since),
    supabase
      .from('sales_receipts')
      .select('amount_uzs.sum(), amount_usd.sum()')
      .gte('receipt_date', since)
      .single(),
  ]);

  return {
    salesCount: salesCountRes.count ?? 0,
    salesTotalUzs: Number((salesSumRes.data as any)?.sum ?? 0),
    salesTotalUsd: Number((salesSumRes.data as any)?.sum ?? 0),
    receiptCount: receiptCountRes.count ?? 0,
    receiptTotalUzs: Number((receiptSumRes.data as any)?.sum ?? 0),
    receiptTotalUsd: Number((receiptSumRes.data as any)?.sum ?? 0),
  };
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
