/**
 * 中国员工管理 - 类型定义（与数据表结构对应）
 *
 * ==================== 数据库迁移 SQL ====================
 * 请在 Supabase SQL Editor 中执行以下语句以添加新字段：
 *
 * -- 签证办理表：小白条地址
 * ALTER TABLE cn_visa_handles ADD COLUMN IF NOT EXISTS address_slip text;
 *
 * -- 机票申请表：计划返回日期
 * ALTER TABLE cn_flight_applications ADD COLUMN IF NOT EXISTS planned_return_at date;
 *
 * -- 机票办理表：航班信息、费用承担方、审批人
 * ALTER TABLE cn_flight_handles ADD COLUMN IF NOT EXISTS flight_info text;
 * ALTER TABLE cn_flight_handles ADD COLUMN IF NOT EXISTS cost_bearer text;
 * ALTER TABLE cn_flight_handles ADD COLUMN IF NOT EXISTS approver text;
 * ========================================================
 */

/** 员工主表 */
export interface CnEmployee {
  id: string;
  employee_no: string;
  name: string;
  passport_no: string | null;
  birth_date: string | null;
  photo_url: string | null;
  passport_photo_url: string | null;
  gender: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  resigned_at: string | null;
  resigned_by: string | null;
  /** 离职备注理由（办理离职时必填）。若表 cn_employees 无此字段请执行：ALTER TABLE cn_employees ADD COLUMN resign_remark text; */
  resign_remark: string | null;
  bank_account: string | null;
  bank_name: string | null;
  salary_standard: number | null;
  id_card_no: string | null;
  home_address: string | null;
  marital_status: string | null;
  contact_phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  created_at: string;
  updated_at: string | null;
}

/** 申请/办理状态 */
export type ApplicationStatus = 'pending' | 'done';

/** 邀请函申请 */
export interface InvitationApplication {
  id: string;
  employee_id: string;
  submitted_at: string;
  submitted_by: string | null;
  status: ApplicationStatus;
  created_at: string;
}

/** 邀请函办理 */
export interface InvitationHandle {
  id: string;
  application_id: string;
  letter_date: string | null;
  letter_image_url: string | null;
  fee_amount: number | null;
  operator: string | null;
  created_at: string;
}

/** 签证申请 */
export interface VisaApplication {
  id: string;
  employee_id: string;
  application_type: string | null;
  expected_departure_at: string | null;
  submitted_by: string | null;
  status: ApplicationStatus;
  created_at: string;
}

/** 签证办理（剩余次数：-1 表示无限次） */
export interface VisaHandle {
  id: string;
  application_id: string;
  effective_date: string | null;
  expiry_date: string | null;
  visa_times: number | null;
  remaining_times: number | null;
  visa_image_url: string | null;
  fee_amount: number | null;
  issuer_company: string | null;
  operator: string | null;
  /** 小白条地址信息（落地塔什干后3天内需填写的地址） */
  address_slip: string | null;
  created_at: string;
}

/** 机票申请 */
export interface FlightApplication {
  id: string;
  employee_id: string;
  depart_city: string | null;
  arrive_city: string | null;
  expected_departure_at: string | null;
  /** 计划返回日期 */
  planned_return_at: string | null;
  remark: string | null;
  submitted_by: string | null;
  status: ApplicationStatus;
  created_at: string;
}

/** 机票办理 */
export interface FlightHandle {
  id: string;
  application_id: string;
  actual_departure_at: string | null;
  arrival_at: string | null;
  /** 实际返回日期 */
  actual_return_at: string | null;
  depart_city: string | null;
  arrive_city: string | null;
  entry_count: number | null;
  /** 航班信息（航班号等） */
  flight_info: string | null;
  ticket_amount: number | null;
  ticket_image_url: string | null;
  /** 出票方：个人 / 公司 */
  issuer_company: string | null;
  /** 费用承担方 */
  cost_bearer: string | null;
  /** 审批人签字记录 */
  approver: string | null;
  operator: string | null;
  created_at: string;
}

/** 劳动许可申请 */
export interface LaborPermitApplication {
  id: string;
  employee_id: string;
  application_date: string | null;
  application_content: string | null;
  applicant: string | null;
  image_url: string | null;
  status: ApplicationStatus;
  created_at: string;
}

/** 劳动许可办理 */
export interface LaborPermitHandle {
  id: string;
  application_id: string;
  permit_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  fee_amount: number | null;
  image_url: string | null;
  operator: string | null;
  created_at: string;
}

/** 调岗记录 */
export interface TransferRecord {
  id: string;
  employee_id: string;
  from_department: string | null;
  from_position: string | null;
  to_department: string | null;
  to_position: string | null;
  operator: string | null;
  transfer_date: string | null;
  created_at: string;
}

/** 调薪记录 */
export interface SalaryChangeRecord {
  id: string;
  employee_id: string;
  change_date: string | null;
  salary_before: number | null;
  salary_after: number | null;
  operator: string | null;
  created_at: string;
}

/** 请假记录 */
export interface LeaveRecord {
  id: string;
  employee_id: string;
  reason: string | null;
  start_at: string | null;
  end_at: string | null;
  operator: string | null;
  leave_hours: number | null;
  created_at: string;
}

/** 奖励/违纪类型 */
export type RewardDisciplineType = 'reward' | 'discipline';

/** 奖励/违纪记录 */
export interface RewardDisciplineRecord {
  id: string;
  employee_id: string;
  reason: string | null;
  operator: string | null;
  amount: number | null;
  record_type: RewardDisciplineType;
  created_at: string;
}

/** 待办任务（从各申请表聚合：状态=待办理） */
export interface TodoItem {
  type: 'invitation' | 'visa' | 'flight' | 'labor_permit';
  applicationId: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  submittedAt: string;
  extra?: Record<string, unknown>;
}

/** 流程时间线单项（用于详情页时间线展示） */
export interface EmployeeTimelineItem {
  id: string;
  type: string;
  title: string;
  date: string;
  description?: string;
  operator?: string | null;
  status?: string;
}

/** 列表用：员工 + 是否休假（前端计算或接口返回） */
export interface CnEmployeeWithStatus extends CnEmployee {
  isOnLeave?: boolean;
  currentDepartment?: string | null;
  currentPosition?: string | null;
  currentSalary?: number | null;
}

/** 签证次数类型字典 */
export const VISA_TIMES_LABELS: Record<string, string> = {
  '1': '单次',
  '2': '两次',
  '3': '三次',
  'N': '多次',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: '待办理',
  done: '已办理',
};

export const REWARD_DISCIPLINE_LABELS: Record<RewardDisciplineType, string> = {
  reward: '奖励',
  discipline: '违纪',
};

/** 签证类型选项 */
export const VISA_TYPE_OPTIONS = ['免签', '商务签'] as const;

/** 城市选项（含塔什干） */
export const CITY_OPTIONS = ['塔什干', '北京', '上海', '广州', '深圳', '成都', '乌鲁木齐'] as const;

/** 出票方选项 */
export const ISSUER_TYPE_OPTIONS = ['个人', '公司'] as const;

/** 仪表盘预警事件 */
export interface DashboardAlertItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  type: 'visa_expiry' | 'visa_free_warning' | 'address_slip_missing' | 'labor_permit_reminder';
  typeLabel: string;
  triggerDate: string;
  description: string;
}

/** 格式化日期为 YYYY-MM-DD 显示 */
export function formatDateOnly(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('zh-CN');
  } catch {
    return d;
  }
}
