export interface CustomerEntity {
  id: number;
  name: string;
  level: string | null;
  region: string | null;
  created_at?: string;
}

export interface CustomerEditForm {
  id: number | null;
  name: string;
  level: string;
  region: string;
}

export function createCustomerEditFormDefault(): CustomerEditForm {
  return { id: null, name: '', level: '', region: '' };
}
