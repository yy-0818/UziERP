export interface ContractEntity {
  id: string;
  contract_no: string;
  business_type: 'uz_domestic' | 'export';
  account_name: string | null;
  customer_display_name: string | null;
  created_at: string;
}
