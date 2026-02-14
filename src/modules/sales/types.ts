/** 销售记录行（直接从 sales_records 表查询） */
export interface SalesRow {
  id: string;
  document_date: string | null;
  document_no: string | null;
  payment_method: string | null;
  customer_name: string | null;
  product_name: string | null;
  color_code: string | null;
  spec_model: string | null;
  category: string | null;
  grade: string | null;
  box_count: number | null;
  area_sqm: number | null;
  unit_price_usd: number | null;
  amount_usd: number | null;
  exchange_rate: number | null;
  amount_uzs: number | null;
  order_no: string | null;
  vehicle_no: string | null;
  export_country: string | null;
  dealer_name: string | null;
  shipper_name: string | null;
  note: string | null;
  refund_uzs: number | null;
  driver_tax_no: string | null;
  logistics_tax_no: string | null;
  vehicle_type: string | null;
  contract_no: string | null;
}

/** 收款记录行 */
export interface ReceiptRow {
  id: string;
  account_name: string | null;
  customer_name: string | null;
  receipt_date: string | null;
  amount_usd: number | null;
  amount_uzs: number | null;
  exchange_rate: number | null;
  sales_document_no: string | null;
  contract_no: string | null;
  note: string | null;
}

/** 服务端分页结果 */
export interface PageResult<T> {
  rows: T[];
  total: number;
}
