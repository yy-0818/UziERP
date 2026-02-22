import { supabase } from '../../supabase';
import { mapApiError } from '../../services/apiClient';

export interface CustomerRecord {
  id: string;
  name: string;
  level: string | null;
  region: string | null;
  created_at: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: string | null;
  spec: string | null;
  unit: string | null;
  created_at: string;
}

interface UpsertCustomerPayload {
  id?: string;
  name: string;
  level?: string | null;
  region?: string | null;
}

interface UpsertProductPayload {
  id?: string;
  name: string;
  category?: string | null;
  spec?: string | null;
  unit?: string | null;
}

export async function listCustomers(keyword?: string): Promise<CustomerRecord[]> {
  try {
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (keyword) {
      query = query.ilike('name', `%${keyword}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CustomerRecord[];
  } catch (error) {
    throw mapApiError(error, '客户查询失败，请稍后重试。');
  }
}

export async function upsertCustomer(payload: UpsertCustomerPayload): Promise<void> {
  try {
    const normalized = {
      name: payload.name,
      level: payload.level || null,
      region: payload.region || null,
    };

    const { error } = payload.id
      ? await supabase.from('customers').update(normalized).eq('id', payload.id)
      : await supabase.from('customers').insert(normalized);

    if (error) throw error;
  } catch (error) {
    throw mapApiError(error, '客户保存失败，请稍后重试。');
  }
}

export async function listProducts(keyword?: string): Promise<ProductRecord[]> {
  try {
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });

    if (keyword) {
      query = query.ilike('name', `%${keyword}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ProductRecord[];
  } catch (error) {
    throw mapApiError(error, '产品查询失败，请稍后重试。');
  }
}

export async function upsertProduct(payload: UpsertProductPayload): Promise<void> {
  try {
    const normalized = {
      name: payload.name,
      category: payload.category || null,
      spec: payload.spec || null,
      unit: payload.unit || null,
    };

    const { error } = payload.id
      ? await supabase.from('products').update(normalized).eq('id', payload.id)
      : await supabase.from('products').insert(normalized);

    if (error) throw error;
  } catch (error) {
    throw mapApiError(error, '产品保存失败，请稍后重试。');
  }
}
