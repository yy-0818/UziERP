export interface ProductEntity {
  id: number;
  name: string;
  category: string | null;
  spec: string | null;
  unit: string | null;
  created_at?: string;
}

export interface ProductEditForm {
  id: number | null;
  name: string;
  category: string;
  spec: string;
  unit: string;
}

export function createProductEditFormDefault(): ProductEditForm {
  return { id: null, name: '', category: '', spec: '', unit: '' };
}
