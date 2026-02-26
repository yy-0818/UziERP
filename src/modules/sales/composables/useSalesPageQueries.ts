import { fetchSalesPage, fetchReceiptPage } from '../api';
import type { SalesRow, ReceiptRow, PageResult } from '../types';

export interface QueryPageParams {
  page: number;
  pageSize: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  keyword?: string;
  columnFilters?: Record<string, string[]>;
}

export async function querySales(params: QueryPageParams): Promise<PageResult<SalesRow>> {
  return fetchSalesPage(params);
}

export async function queryReceipts(params: QueryPageParams): Promise<PageResult<ReceiptRow>> {
  return fetchReceiptPage(params);
}
