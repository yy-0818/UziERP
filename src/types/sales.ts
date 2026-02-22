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

export interface ReceiptRow {
  id: string;
  account_name: string | null;
  customer_name: string | null;
  receipt_date: string | null;
  amount_usd: number | null;
  amount_uzs: number | null;
  note: string | null;
}

export interface SalesImportRowLegacy extends Partial<Omit<SalesRow, 'id'>> {
  source_type?: 'excel' | 'paste';
  [key: string]: string | number | null | undefined;
}

export interface ReceiptImportRowLegacy extends Partial<Omit<ReceiptRow, 'id'>> {
  source_type?: 'excel' | 'paste';
  [key: string]: string | number | null | undefined;
}

export interface SalesEditForm extends Omit<SalesRow, 'id'> { id: string | null }
export interface ReceiptEditForm extends Omit<ReceiptRow, 'id'> { id: string | null }

export interface PageResult<T> { rows: T[]; total: number }
