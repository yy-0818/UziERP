import { fetchSalesPage, fetchReceiptPage } from '../api';

export async function querySales(params: any) {
  return fetchSalesPage(params);
}

export async function queryReceipts(params: any) {
  return fetchReceiptPage(params);
}
