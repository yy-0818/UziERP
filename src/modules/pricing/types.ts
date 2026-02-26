/** 客户基本信息 */
export interface CustomerBasic {
  id: number;
  name: string;
  level: string | null;
  region: string | null;
}

/** 产品基本信息 */
export interface ProductBasic {
  id: number;
  name: string;
  spec: string | null;
}

/** 客户账户 */
export interface CustomerAccount {
  id: number;
  customer_id: number | null;
  account_id: number | null;
  account_name: string | null;
  price_type: string | null;
}

/** 价格记录（从 prices 表查询） */
export interface PriceRecord {
  id: number;
  account_id: number;
  product_id: number;
  price: number | null;
  currency: string | null;
  valid_from: string | null;
  valid_to: string | null;
  update_reason: string | null;
  modifier_email: string | null;
  created_at: string | null;
}

/** 价格表单元格 */
export interface PriceCell {
  price: number | null;
  product_id: number;
}

/** 价格宽表行（行转列后） */
export interface PriceWideRow {
  account_id: number;
  customer_id: number | null;
  company: string;
  account_name: string;
  level: string;
  region: string;
  price_type: string;
  _cells: Record<string, PriceCell>;
}

/** 价格编辑表单 */
export interface PriceEditForm {
  company_value: number | string | null;
  company_display?: string;
  account_name_display?: string;
  product_spec_display?: string;
  customer_id: number | null;
  account_id: number | null;
  new_account_name: string;
  product_ids: number[];
  product_prices: Record<number, number | string | null>;
  product_id: number | null;
  price: number | null;
  currency: string;
  level: string;
  region: string;
  price_type: string;
  update_reason: string;
  modifier_email: string;
}

/** 价格历史记录 */
export interface PriceHistoryItem {
  id: number;
  price: number | null;
  currency: string | null;
  valid_from: string | null;
  valid_to: string | null;
  update_reason: string | null;
  modifier_email: string | null;
  created_at: string | null;
}

/** 选项缓存结构 */
export interface OptionsCachePayload {
  customers: CustomerBasic[];
  products: ProductBasic[];
  accountsByCustomer: Record<string, CustomerAccount[]>;
  levelOptions: string[];
  regionOptions: string[];
  priceTypeOptions: string[];
  ts: number;
  schemaVersion: number;
}
