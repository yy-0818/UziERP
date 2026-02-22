/**
 * 操作日志分类与操作类型常量，便于前端筛选与扩展
 */
export const OPERATION_CATEGORIES = [
  { value: 'employee', label: '员工档案' },
  { value: 'invitation', label: '邀请函' },
  { value: 'visa', label: '签证' },
  { value: 'flight', label: '机票' },
  { value: 'labor_permit', label: '劳动许可' },
  { value: 'transfer', label: '调岗' },
  { value: 'salary', label: '调薪' },
  { value: 'leave', label: '请假' },
  { value: 'reward_discipline', label: '奖励/违纪' },
  { value: 'resign', label: '离职' },
  { value: 'other', label: '其他' },
] as const;

export type OperationCategory = (typeof OPERATION_CATEGORIES)[number]['value'];

/** 分类对应的 Tag 类型（用于表格中分类列展示，空串为默认灰） */
export const CATEGORY_TAG_TYPE: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info' | ''> = {
  employee: 'primary',
  invitation: 'success',
  visa: 'success',
  flight: 'warning',
  labor_permit: 'warning',
  transfer: 'info',
  salary: 'info',
  leave: 'info',
  reward_discipline: 'danger',
  resign: 'danger',
  other: 'info',
};

/** 操作日志 detail 字段的展示标签（关联信息列用） */
export const DETAIL_LABELS: Record<string, string> = {
  name: '姓名',
  employee_no: '工号',
  from_department: '调出部门',
  to_department: '调入部门',
  from_position: '调出岗位',
  to_position: '调入岗位',
  application_id: '申请单',
  employee_id: '员工',
};

/** 不在关联信息中展示的 key（仅内部关联用） */
export const DETAIL_HIDDEN_KEYS = ['application_id', 'employee_id'];

/** 各分类下常见操作（展示用，实际 action 以写入为准，可自由扩展） */
export const OPERATION_ACTIONS: Record<string, string[]> = {
  employee: ['新增员工', '编辑员工'],
  invitation: ['邀请函申请', '邀请函办理'],
  visa: ['签证申请', '签证办理'],
  flight: ['机票申请', '机票办理'],
  labor_permit: ['劳动许可申请', '劳动许可办理'],
  transfer: ['调岗'],
  salary: ['调薪'],
  leave: ['请假'],
  reward_discipline: ['奖励', '违纪'],
  resign: ['离职'],
  other: [],
};
