export interface EmployeeEntity {
  id: number;
  employee_id: string | null;
  chinese_name: string | null;
  surname: string | null;
  given_name: string | null;
  department: string | null;
  position: string | null;
  position_salary: number | null;
  salary_currency: string | null;
  status: string | null;
  created_at?: string;
}
