/**
 * 操作日志 API：写入与分页查询
 */
import { supabase } from '../../supabase';
import type { OperationCategory } from './constants';

export interface OperationLogRow {
  id: string;
  category: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  operator_id: string | null;
  operator_name: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export interface FetchOperationLogsParams {
  category?: OperationCategory | '';
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface FetchOperationLogsResult {
  list: OperationLogRow[];
  total: number;
}

/** 写入一条操作日志（内部会获取当前登录用户作为操作人） */
export async function logOperation(params: {
  category: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  operator_name?: string | null;
  operator_id?: string | null;
  detail?: Record<string, unknown> | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('operation_logs')
    .insert({
      category: params.category,
      action: params.action,
      target_type: params.target_type ?? null,
      target_id: params.target_id ?? null,
      operator_id: params.operator_id ?? user?.id ?? null,
      operator_name: params.operator_name ?? user?.email ?? null,
      detail: params.detail ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return;
}

/** 分页查询操作日志，支持按分类、关键词、日期范围筛选 */
export async function fetchOperationLogs(
  params: FetchOperationLogsParams = {}
): Promise<FetchOperationLogsResult> {
  const { category, keyword, startDate, endDate, page = 1, pageSize = 20 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('operation_logs')
    .select('*', { count: 'exact', head: false });

  if (category) {
    q = q.eq('category', category);
  }
  if (startDate) {
    q = q.gte('created_at', `${startDate}T00:00:00`);
  }
  if (endDate) {
    q = q.lte('created_at', `${endDate}T23:59:59.999`);
  }
  if (keyword && keyword.trim()) {
    const k = keyword.trim().replace(/'/g, "''");
    q = q.or(`action.ilike.%${k}%,operator_name.ilike.%${k}%`);
  }

  const { data: list, error, count } = await q
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return {
    list: (list || []) as OperationLogRow[],
    total: count ?? 0,
  };
}
