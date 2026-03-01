import { supabase } from '../../supabase';

export type PriceFilters = {
  keyword: string;
  level: string[];
  region: string[];
  price_type: string[];
  /** 账户筛选：1账户、2账户、3账户 */
  account_name: string[];
  product_ids: number[];
};

export async function fetchCustomersBasic() {
  return supabase.from('customers').select('id, name, region, level').order('name');
}

export async function fetchProductsBasic() {
  return supabase.from('products').select('id, name, spec').order('name');
}

export async function fetchAccountsBasic() {
  return supabase
    .from('customer_accounts')
    .select('id, account_id, customer_id, account_name, price_type')
    .order('account_name');
}

export async function fetchAccountIdsByKeyword(keyword: string) {
  const { data: custRows } = await supabase
    .from('customers')
    .select('id')
    .or(`name.ilike.%${keyword}%,region.ilike.%${keyword}%`);
  const cIds = (custRows || []).map((c) => c.id);
  let ids: number[] = [];
  if (cIds.length) {
    const { data: accRows } = await supabase.from('customer_accounts').select('id, account_id').in('customer_id', cIds);
    ids = (accRows || []).map((a: any) => (a.account_id != null ? a.account_id : a.id));
  }
  const { data: accByName } = await supabase.from('customer_accounts').select('id, account_id').ilike('account_name', `%${keyword}%`);
  const byName = (accByName || []).map((a: any) => (a.account_id != null ? a.account_id : a.id));
  return [...new Set([...ids, ...byName])];
}

export async function fetchAccountIdsByCustomerFilter(field: 'level' | 'region', values: string[]) {
  const { data: custRows } = await supabase.from('customers').select('id').in(field, values);
  const cIds = (custRows || []).map((c) => c.id);
  if (!cIds.length) return [];
  const { data: accRows } = await supabase.from('customer_accounts').select('id, account_id').in('customer_id', cIds);
  return (accRows || []).map((a: any) => (a.account_id != null ? a.account_id : a.id));
}

export async function fetchAccountIdsByPriceType(values: string[]) {
  const { data } = await supabase.from('customer_accounts').select('id, account_id').in('price_type', values);
  return (data || []).map((a: any) => (a.account_id != null ? a.account_id : a.id));
}

/** 按账户名称筛选（1账户、2账户、3账户等） */
export async function fetchAccountIdsByAccountName(values: string[]) {
  if (!values.length) return [];
  const { data } = await supabase.from('customer_accounts').select('id, account_id').in('account_name', values);
  return (data || []).map((a: any) => (a.account_id != null ? a.account_id : a.id));
}

export async function fetchCurrentPrices(accountIds: number[] | null, productIds: number[]) {
  let query = supabase
    .from('prices')
    .select('id, account_id, product_id, price, currency, valid_from, valid_to, update_reason')
    .is('valid_to', null)
    .order('valid_from', { ascending: false });
  if (accountIds && accountIds.length) query = query.in('account_id', accountIds);
  if (productIds.length) query = query.in('product_id', productIds);

  const PAGE = 1000;
  const list: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    list.push(...rows);
    if (rows.length < PAGE) break;
  }
  return list;
}

export async function fetchPriceRelatedData(accIds: number[], prodIds: number[]) {
  const [{ data: accounts }, { data: products }] = await Promise.all([
    accIds.length
      ? supabase.from('customer_accounts').select('id, account_id, account_name, price_type, customer_id').or(`id.in.(${accIds.join(',')}),account_id.in.(${accIds.join(',')})`)
      : Promise.resolve({ data: [] as any[] }),
    prodIds.length
      ? supabase.from('products').select('id, name, spec').in('id', prodIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const customerIds = [...new Set((accounts || []).map((a: any) => a.customer_id).filter(Boolean))];
  let customers: any[] = [];
  if (customerIds.length) {
    const { data } = await supabase.from('customers').select('id, name, region, level').in('id', customerIds);
    customers = data || [];
  }
  return { accounts: accounts || [], products: products || [], customers };
}

export async function fetchPriceHistory(accountId: number, productId: number) {
  return supabase.from('prices').select('*').eq('account_id', accountId).eq('product_id', productId).order('valid_from', { ascending: false });
}
