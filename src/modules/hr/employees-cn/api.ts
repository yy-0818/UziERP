/**
 * 中国员工管理 - API（Supabase + Storage）
 * 依赖校验：签证办理前校验邀请函；机票申请/办理校验签证并扣减剩余次数
 */
import { supabase } from '../../../supabase';
import { getLocalIsoString } from '../../../utils/datetime';
import { parseRpcEnvelope } from '../../../utils/rpc';
import { logOperation } from '../../operation-log/api';
import type {
  CnEmployee,
  InvitationApplication,
  InvitationHandle,
  VisaApplication,
  VisaHandle,
  FlightApplication,
  FlightHandle,
  LaborPermitApplication,
  LaborPermitHandle,
  TransferRecord,
  SalaryChangeRecord,
  LeaveRecord,
  RewardDisciplineRecord,
  TodoItem,
  ApplicationStatus,
  EmployeeTimelineItem,
} from './types';

const BUCKET = 'employees-cn';
const SIGNED_URL_EXPIRES = 3600;

function safePath(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'file';
}

/** 上传文件到 employees-cn 桶，返回存储路径（不含桶名） */
export async function uploadEmployeeFile(
  folder: string,
  fileName: string,
  file: File
): Promise<string> {
  const base = `${folder}/${Date.now()}_${safePath(fileName)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(base, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return base;
}

/** 获取签名 URL */
export async function getSignedUrl(path: string): Promise<string> {
  const p = path.startsWith(`${BUCKET}/`) ? path.slice(BUCKET.length + 1) : path;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(p, SIGNED_URL_EXPIRES);
  if (error) throw error;
  return data.signedUrl;
}

// ==================== 员工 ====================

export async function fetchEmployees(): Promise<CnEmployee[]> {
  const { data, error } = await supabase
    .from('cn_employees')
    .select('*')
    .order('employee_no', { ascending: true });
  if (error) throw error;
  return (data || []) as CnEmployee[];
}

export async function fetchEmployeeById(id: string): Promise<CnEmployee | null> {
  const { data, error } = await supabase.from('cn_employees').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as CnEmployee | null;
}

/** 获取员工姓名与工号，用于操作日志 detail */
async function getEmployeeBrief(employeeId: string): Promise<{ name: string; employee_no: string } | null> {
  const emp = await fetchEmployeeById(employeeId);
  return emp ? { name: emp.name, employee_no: emp.employee_no } : null;
}

export async function fetchEmployeeByNo(employeeNo: string): Promise<CnEmployee | null> {
  const { data, error } = await supabase
    .from('cn_employees')
    .select('*')
    .eq('employee_no', employeeNo)
    .maybeSingle();
  if (error) throw error;
  return data as CnEmployee | null;
}

export async function createEmployee(params: Partial<CnEmployee>): Promise<CnEmployee> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_employees')
    .insert({
      ...params,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  const emp = data as CnEmployee;
  try {
    await logOperation({
      category: 'employee',
      action: '新增员工',
      target_type: 'cn_employees',
      target_id: emp.id,
      detail: { name: emp.name, employee_no: emp.employee_no },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return emp;
}

export async function updateEmployee(id: string, params: Partial<CnEmployee>): Promise<CnEmployee> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_employees')
    .update({ ...params, updated_at: now })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CnEmployee;
}

/** 离职：设置 resigned_at，可选记录操作人 resigned_by，必填备注 resign_remark */
export async function setEmployeeResigned(
  id: string,
  operator?: string | null,
  resignRemark?: string | null
): Promise<CnEmployee> {
  const emp = await updateEmployee(id, {
    resigned_at: getLocalIsoString(),
    ...(operator != null && { resigned_by: operator }),
    ...(resignRemark != null && { resign_remark: resignRemark }),
  });
  try {
    await logOperation({
      category: 'resign',
      action: '离职',
      target_type: 'cn_employees',
      target_id: id,
      detail: { name: emp.name, employee_no: emp.employee_no },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return emp;
}

// ==================== 邀请函 ====================

export async function fetchInvitationApplications(employeeId?: string): Promise<InvitationApplication[]> {
  let q = supabase.from('cn_invitation_applications').select('*').order('submitted_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as InvitationApplication[];
}

export async function fetchInvitationHandleByApplicationId(applicationId: string): Promise<InvitationHandle | null> {
  const { data, error } = await supabase
    .from('cn_invitation_handles')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data as InvitationHandle | null;
}

/** 校验该员工是否有已办理的邀请函（用于签证办理前） */
export async function hasInvitationHandled(employeeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('cn_invitation_applications')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('status', 'done');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function createInvitationApplication(params: {
  employee_id: string;
  submitted_by: string | null;
}): Promise<InvitationApplication> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_invitation_applications')
    .insert({
      employee_id: params.employee_id,
      submitted_at: now,
      submitted_by: params.submitted_by,
      status: 'pending',
      created_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  const app = data as InvitationApplication;
  try {
    const brief = await getEmployeeBrief(app.employee_id);
    await logOperation({
      category: 'invitation',
      action: '邀请函申请',
      target_type: 'cn_invitation_applications',
      target_id: app.id,
      detail: { employee_id: app.employee_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return app;
}

export async function createInvitationHandle(params: {
  application_id: string;
  letter_date: string | null;
  letter_image_url: string | null;
  fee_amount: number | null;
  operator?: string | null;
}): Promise<InvitationHandle> {
  const now = getLocalIsoString();
  const { data: handle, error: eHandle } = await supabase
    .from('cn_invitation_handles')
    .insert({
      application_id: params.application_id,
      letter_date: params.letter_date,
      letter_image_url: params.letter_image_url,
      fee_amount: params.fee_amount,
      operator: params.operator ?? null,
      created_at: now,
    })
    .select()
    .single();
  if (eHandle) throw eHandle;
  await supabase
    .from('cn_invitation_applications')
    .update({ status: 'done', updated_at: now })
    .eq('id', params.application_id);
  try {
    const { data: appRow } = await supabase
      .from('cn_invitation_applications')
      .select('employee_id')
      .eq('id', params.application_id)
      .maybeSingle();
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'invitation',
      action: '邀请函办理',
      target_type: 'cn_invitation_handles',
      target_id: (handle as InvitationHandle).id,
      detail: { application_id: params.application_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return handle as InvitationHandle;
}

// ==================== 签证 ====================

export async function fetchVisaApplications(employeeId?: string): Promise<VisaApplication[]> {
  let q = supabase.from('cn_visa_applications').select('*').order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as VisaApplication[];
}

export async function fetchVisaHandleByApplicationId(applicationId: string): Promise<VisaHandle | null> {
  const { data, error } = await supabase
    .from('cn_visa_handles')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data as VisaHandle | null;
}

/** 获取员工当前有效签证（生效日期<=今天<=失效日期 且 剩余次数>0 或 -1） */
export async function fetchValidVisasForEmployee(employeeId: string): Promise<VisaHandle[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: apps, error: eApps } = await supabase
    .from('cn_visa_applications')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('status', 'done');
  if (eApps || !apps?.length) return [];
  const appIds = apps.map((a: { id: string }) => a.id);
  const { data: handles, error } = await supabase
    .from('cn_visa_handles')
    .select('*')
    .in('application_id', appIds)
    .lte('effective_date', today)
    .gte('expiry_date', today);
  if (error) throw error;
  const list = (handles || []) as VisaHandle[];
  return list.filter((h) => h.remaining_times === null || h.remaining_times === -1 || h.remaining_times > 0);
}

export async function createVisaApplication(params: {
  employee_id: string;
  application_type: string | null;
  expected_departure_at: string | null;
  submitted_by: string | null;
}): Promise<VisaApplication> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_visa_applications')
    .insert({
      employee_id: params.employee_id,
      application_type: params.application_type,
      expected_departure_at: params.expected_departure_at,
      submitted_by: params.submitted_by,
      status: 'pending',
      created_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  const app = data as VisaApplication;
  try {
    const brief = await getEmployeeBrief(app.employee_id);
    await logOperation({
      category: 'visa',
      action: '签证申请',
      target_type: 'cn_visa_applications',
      target_id: app.id,
      detail: { employee_id: app.employee_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return app;
}

export async function createVisaHandle(params: {
  application_id: string;
  effective_date: string | null;
  expiry_date: string | null;
  visa_times: number | null;
  remaining_times: number | null;
  visa_image_url: string | null;
  fee_amount: number | null;
  issuer_company: string | null;
  operator?: string | null;
}): Promise<VisaHandle> {
  const now = getLocalIsoString();
  const { data: handle, error: eHandle } = await supabase
    .from('cn_visa_handles')
    .insert({
      application_id: params.application_id,
      effective_date: params.effective_date,
      expiry_date: params.expiry_date,
      visa_times: params.visa_times,
      remaining_times: params.remaining_times,
      visa_image_url: params.visa_image_url,
      fee_amount: params.fee_amount,
      issuer_company: params.issuer_company,
      operator: params.operator ?? null,
      created_at: now,
    })
    .select()
    .single();
  if (eHandle) throw eHandle;
  await supabase
    .from('cn_visa_applications')
    .update({ status: 'done', updated_at: now })
    .eq('id', params.application_id);
  try {
    const { data: appRow } = await supabase
      .from('cn_visa_applications')
      .select('employee_id')
      .eq('id', params.application_id)
      .maybeSingle();
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'visa',
      action: '签证办理',
      target_type: 'cn_visa_handles',
      target_id: (handle as VisaHandle).id,
      detail: { application_id: params.application_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return handle as VisaHandle;
}

// ==================== 机票 ====================

export async function fetchFlightApplications(employeeId?: string): Promise<FlightApplication[]> {
  let q = supabase.from('cn_flight_applications').select('*').order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as FlightApplication[];
}

export async function fetchFlightHandleByApplicationId(applicationId: string): Promise<FlightHandle | null> {
  const { data, error } = await supabase
    .from('cn_flight_handles')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data as FlightHandle | null;
}

export async function createFlightApplication(params: {
  employee_id: string;
  depart_city: string | null;
  arrive_city: string | null;
  expected_departure_at: string | null;
  remark: string | null;
  submitted_by: string | null;
}): Promise<FlightApplication> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_flight_applications')
    .insert({
      employee_id: params.employee_id,
      depart_city: params.depart_city,
      arrive_city: params.arrive_city,
      expected_departure_at: params.expected_departure_at,
      remark: params.remark,
      submitted_by: params.submitted_by,
      status: 'pending',
      created_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  const app = data as FlightApplication;
  try {
    const brief = await getEmployeeBrief(app.employee_id);
    await logOperation({
      category: 'flight',
      action: '机票申请',
      target_type: 'cn_flight_applications',
      target_id: app.id,
      detail: { employee_id: app.employee_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return app;
}

/** 办理机票并扣减签证剩余次数（entry_count 从指定 visa_handle_id 扣减） */
export async function createFlightHandle(params: {
  application_id: string;
  visa_handle_id: string;
  entry_count: number;
  actual_departure_at: string | null;
  arrival_at: string | null;
  depart_city: string | null;
  arrive_city: string | null;
  ticket_amount: number | null;
  ticket_image_url: string | null;
  issuer_company: string | null;
  operator?: string | null;
  request_id?: string;
}): Promise<FlightHandle> {
  const requestId = params.request_id ?? (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const { data, error } = await supabase.rpc('rpc_create_flight_handle_txn', {
    p_application_id: params.application_id,
    p_visa_handle_id: params.visa_handle_id,
    p_entry_count: params.entry_count,
    p_actual_departure_at: params.actual_departure_at,
    p_arrival_at: params.arrival_at,
    p_depart_city: params.depart_city,
    p_arrive_city: params.arrive_city,
    p_ticket_amount: params.ticket_amount,
    p_ticket_image_url: params.ticket_image_url,
    p_issuer_company: params.issuer_company,
    p_operator: params.operator ?? null,
    p_request_id: requestId,
  });
  if (error) throw error;
  const payload = parseRpcEnvelope<{ ok: boolean; code?: string; message?: string; handle_id?: string }>(data, '机票办理失败');
  const handleId = (payload as { handle_id?: string }).handle_id;
  if (!handleId) throw new Error('机票办理返回缺少 handle_id');
  const { data: handle, error: eHandle } = await supabase
    .from('cn_flight_handles')
    .select('*')
    .eq('id', handleId)
    .single();
  if (eHandle || !handle) throw eHandle || new Error('机票办理成功但无法读取结果');
  try {
    const { data: appRow } = await supabase
      .from('cn_flight_applications')
      .select('employee_id')
      .eq('id', params.application_id)
      .maybeSingle();
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'flight',
      action: '机票办理',
      target_type: 'cn_flight_handles',
      target_id: (handle as FlightHandle).id,
      detail: { application_id: params.application_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return handle as FlightHandle;
}

// ==================== 劳动许可 ====================

export async function fetchLaborPermitApplications(employeeId?: string): Promise<LaborPermitApplication[]> {
  let q = supabase.from('cn_labor_permit_applications').select('*').order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as LaborPermitApplication[];
}

export async function fetchLaborPermitHandleByApplicationId(
  applicationId: string
): Promise<LaborPermitHandle | null> {
  const { data, error } = await supabase
    .from('cn_labor_permit_handles')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data as LaborPermitHandle | null;
}

export async function createLaborPermitApplication(params: {
  employee_id: string;
  application_date: string | null;
  application_content: string | null;
  applicant: string | null;
  image_url: string | null;
}): Promise<LaborPermitApplication> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_labor_permit_applications')
    .insert({
      employee_id: params.employee_id,
      application_date: params.application_date,
      application_content: params.application_content,
      applicant: params.applicant,
      image_url: params.image_url,
      status: 'pending',
      created_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  const app = data as LaborPermitApplication;
  try {
    const brief = await getEmployeeBrief(app.employee_id);
    await logOperation({
      category: 'labor_permit',
      action: '劳动许可申请',
      target_type: 'cn_labor_permit_applications',
      target_id: app.id,
      detail: { employee_id: app.employee_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return app;
}

export async function createLaborPermitHandle(params: {
  application_id: string;
  permit_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  fee_amount: number | null;
  image_url: string | null;
  operator?: string | null;
}): Promise<LaborPermitHandle> {
  const now = getLocalIsoString();
  const { data: handle, error: eHandle } = await supabase
    .from('cn_labor_permit_handles')
    .insert({
      application_id: params.application_id,
      permit_date: params.permit_date,
      effective_date: params.effective_date,
      expiry_date: params.expiry_date,
      fee_amount: params.fee_amount,
      image_url: params.image_url,
      operator: params.operator ?? null,
      created_at: now,
    })
    .select()
    .single();
  if (eHandle) throw eHandle;
  await supabase
    .from('cn_labor_permit_applications')
    .update({ status: 'done', updated_at: now })
    .eq('id', params.application_id);
  try {
    const { data: appRow } = await supabase
      .from('cn_labor_permit_applications')
      .select('employee_id')
      .eq('id', params.application_id)
      .maybeSingle();
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'labor_permit',
      action: '劳动许可办理',
      target_type: 'cn_labor_permit_handles',
      target_id: (handle as LaborPermitHandle).id,
      detail: { application_id: params.application_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return handle as LaborPermitHandle;
}

// ==================== 调岗 / 调薪 / 请假 / 奖励违纪 ====================

export async function fetchTransferRecords(employeeId: string): Promise<TransferRecord[]> {
  const { data, error } = await supabase
    .from('cn_transfer_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('transfer_date', { ascending: false });
  if (error) throw error;
  return (data || []) as TransferRecord[];
}

export async function createTransferRecord(params: {
  employee_id: string;
  from_department: string | null;
  from_position: string | null;
  to_department: string | null;
  to_position: string | null;
  operator: string | null;
  transfer_date: string | null;
}): Promise<TransferRecord> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_transfer_records')
    .insert({ ...params, created_at: now })
    .select()
    .single();
  if (error) throw error;
  await supabase
    .from('cn_employees')
    .update({
      department: params.to_department,
      position: params.to_position,
      updated_at: now,
    })
    .eq('id', params.employee_id);
  const rec = data as TransferRecord;
  try {
    const brief = await getEmployeeBrief(params.employee_id);
    await logOperation({
      category: 'transfer',
      action: '调岗',
      target_type: 'cn_transfer_records',
      target_id: rec.id,
      detail: {
        employee_id: params.employee_id,
        from_department: params.from_department,
        to_department: params.to_department,
        ...brief,
      },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return rec;
}

export async function fetchSalaryChangeRecords(employeeId: string): Promise<SalaryChangeRecord[]> {
  const { data, error } = await supabase
    .from('cn_salary_change_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('change_date', { ascending: false });
  if (error) throw error;
  return (data || []) as SalaryChangeRecord[];
}

export async function createSalaryChangeRecord(params: {
  employee_id: string;
  change_date: string | null;
  salary_before: number | null;
  salary_after: number | null;
  operator: string | null;
}): Promise<SalaryChangeRecord> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_salary_change_records')
    .insert({ ...params, created_at: now })
    .select()
    .single();
  if (error) throw error;
  await supabase
    .from('cn_employees')
    .update({ salary_standard: params.salary_after, updated_at: now })
    .eq('id', params.employee_id);
  const rec = data as SalaryChangeRecord;
  try {
    const brief = await getEmployeeBrief(params.employee_id);
    await logOperation({
      category: 'salary',
      action: '调薪',
      target_type: 'cn_salary_change_records',
      target_id: rec.id,
      detail: { employee_id: params.employee_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return rec;
}

export async function fetchLeaveRecords(employeeId?: string): Promise<LeaveRecord[]> {
  let q = supabase.from('cn_leave_records').select('*').order('start_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as LeaveRecord[];
}

/** 判断员工当前是否在休假（以本机时间为准，结束时间已过则自动结束休假状态） */
export function isOnLeaveToday(records: LeaveRecord[]): boolean {
  const now = Date.now();
  return records.some((r) => {
    const start = r.start_at ? new Date(r.start_at).getTime() : 0;
    const end = r.end_at ? new Date(r.end_at).getTime() : Infinity;
    return start <= now && now <= end;
  });
}

export async function createLeaveRecord(params: {
  employee_id: string;
  reason: string | null;
  start_at: string | null;
  end_at: string | null;
  operator: string | null;
  leave_hours: number | null;
}): Promise<LeaveRecord> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_leave_records')
    .insert({ ...params, created_at: now })
    .select()
    .single();
  if (error) throw error;
  const rec = data as LeaveRecord;
  try {
    const brief = await getEmployeeBrief(params.employee_id);
    await logOperation({
      category: 'leave',
      action: '请假',
      target_type: 'cn_leave_records',
      target_id: rec.id,
      detail: { employee_id: params.employee_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return rec;
}

export async function fetchRewardDisciplineRecords(employeeId?: string): Promise<RewardDisciplineRecord[]> {
  let q = supabase.from('cn_reward_discipline_records').select('*').order('created_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as RewardDisciplineRecord[];
}

export async function createRewardDisciplineRecord(params: {
  employee_id: string;
  reason: string | null;
  operator: string | null;
  amount: number | null;
  record_type: 'reward' | 'discipline';
}): Promise<RewardDisciplineRecord> {
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_reward_discipline_records')
    .insert({ ...params, created_at: now })
    .select()
    .single();
  if (error) throw error;
  const rec = data as RewardDisciplineRecord;
  try {
    const brief = await getEmployeeBrief(params.employee_id);
    await logOperation({
      category: 'reward_discipline',
      action: params.record_type === 'reward' ? '奖励' : '违纪',
      target_type: 'cn_reward_discipline_records',
      target_id: rec.id,
      detail: { employee_id: params.employee_id, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return rec;
}

// ==================== 待办中心（聚合各流程待办理申请） ====================

export async function fetchTodoList(): Promise<TodoItem[]> {
  const [invitations, visas, flights, laborPermits] = await Promise.all([
    supabase.from('cn_invitation_applications').select('id, employee_id, submitted_at').eq('status', 'pending'),
    // 签证表无 submitted_at，使用 created_at
    supabase.from('cn_visa_applications').select('id, employee_id, created_at').eq('status', 'pending'),
    // 机票表无 submitted_at，使用 created_at
    supabase.from('cn_flight_applications').select('id, employee_id, created_at').eq('status', 'pending'),
    // 劳动许可表无 submitted_at，使用 application_date 与 created_at
    supabase
      .from('cn_labor_permit_applications')
      .select('id, employee_id, application_date, created_at')
      .eq('status', 'pending'),
  ]);
  const employees = await fetchEmployees();
  const empMap = new Map(employees.map((e) => [e.id, { name: e.name, employeeNo: e.employee_no }]));
  const toTodo = (
    type: TodoItem['type'],
    rows: { id: string; employee_id: string; submitted_at?: string; application_date?: string | null; created_at?: string }[]
  ): TodoItem[] =>
    (rows || []).map((r) => {
      const emp = empMap.get(r.employee_id);
      return {
        type,
        applicationId: r.id,
        employeeId: r.employee_id,
        employeeName: emp?.name ?? '—',
        employeeNo: emp?.employeeNo ?? '—',
        submittedAt: r.submitted_at ?? r.application_date ?? r.created_at ?? '',
      };
    });
  const list: TodoItem[] = [];
  if (invitations.data) list.push(...toTodo('invitation', invitations.data as any));
  if (visas.data) list.push(...toTodo('visa', visas.data as any));
  if (flights.data) list.push(...toTodo('flight', flights.data as any));
  if (laborPermits.data) list.push(...toTodo('labor_permit', laborPermits.data as any));
  list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return list;
}

export async function fetchTodoCount(): Promise<number> {
  const list = await fetchTodoList();
  return list.length;
}

// ==================== 员工流程时间线（详情页展示） ====================

export async function fetchEmployeeTimeline(employeeId: string): Promise<EmployeeTimelineItem[]> {
  const items: EmployeeTimelineItem[] = [];
  const [invApps, visaApps, flightApps, laborApps, transfers, leaves, rewards] = await Promise.all([
    supabase.from('cn_invitation_applications').select('id, submitted_at, status').eq('employee_id', employeeId),
    supabase.from('cn_visa_applications').select('id, created_at, status').eq('employee_id', employeeId),
    supabase.from('cn_flight_applications').select('id, created_at, status').eq('employee_id', employeeId),
    supabase.from('cn_labor_permit_applications').select('id, application_date, created_at, status').eq('employee_id', employeeId),
    supabase.from('cn_transfer_records').select('id, from_department, from_position, to_department, to_position, transfer_date, created_at, operator').eq('employee_id', employeeId).order('transfer_date', { ascending: false }),
    supabase.from('cn_leave_records').select('id, start_at, end_at, reason, created_at, operator').eq('employee_id', employeeId).order('start_at', { ascending: false }),
    supabase.from('cn_reward_discipline_records').select('id, record_type, reason, amount, created_at, operator').eq('employee_id', employeeId).order('created_at', { ascending: false }),
  ]);

  (invApps.data || []).forEach((r: any) => {
    items.push({
      id: `inv-app-${r.id}`,
      type: 'invitation',
      title: '邀请函申请',
      date: r.submitted_at || r.created_at || '',
      status: r.status === 'done' ? '已办理' : '待办理',
    });
  });
  (visaApps.data || []).forEach((r: any) => {
    items.push({
      id: `visa-app-${r.id}`,
      type: 'visa',
      title: '签证申请',
      date: r.created_at || '',
      status: r.status === 'done' ? '已办理' : '待办理',
    });
  });
  (flightApps.data || []).forEach((r: any) => {
    items.push({
      id: `flight-app-${r.id}`,
      type: 'flight',
      title: '机票申请',
      date: r.created_at || '',
      status: r.status === 'done' ? '已办理' : '待办理',
    });
  });
  (laborApps.data || []).forEach((r: any) => {
    items.push({
      id: `labor-app-${r.id}`,
      type: 'labor',
      title: '劳动许可申请',
      date: r.application_date || r.created_at || '',
      status: r.status === 'done' ? '已办理' : '待办理',
    });
  });
  (transfers.data || []).forEach((r: any) => {
    items.push({
      id: `transfer-${r.id}`,
      type: 'transfer',
      title: '调岗',
      date: r.transfer_date || r.created_at || '',
      description: (() => {
        const from = [r.from_department, r.from_position].filter(Boolean).join(' ');
        const to = [r.to_department, r.to_position].filter(Boolean).join(' ');
        return from && to ? `${from} → ${to}` : (to || from || undefined);
      })(),
      operator: r.operator ?? undefined,
    });
  });
  (leaves.data || []).forEach((r: any) => {
    items.push({
      id: `leave-${r.id}`,
      type: 'leave',
      title: '请假',
      date: r.start_at || r.created_at || '',
      description: r.reason || undefined,
      operator: r.operator ?? undefined,
    });
  });
  (rewards.data || []).forEach((r: any) => {
    items.push({
      id: `reward-${r.id}`,
      type: 'reward',
      title: r.record_type === 'reward' ? '奖励' : '违纪',
      date: r.created_at || '',
      description: r.reason || (r.amount != null ? `金额 ${r.amount}` : undefined),
      operator: r.operator ?? undefined,
    });
  });

  const invIds = (invApps.data || []).map((a: any) => a.id).filter(Boolean);
  const visaIds = (visaApps.data || []).map((a: any) => a.id).filter(Boolean);
  const flightIds = (flightApps.data || []).map((a: any) => a.id).filter(Boolean);
  const laborIds = (laborApps.data || []).map((a: any) => a.id).filter(Boolean);
  const handles = await Promise.all([
    invIds.length ? supabase.from('cn_invitation_handles').select('id, application_id, created_at').in('application_id', invIds) : { data: [] },
    visaIds.length ? supabase.from('cn_visa_handles').select('id, application_id, created_at').in('application_id', visaIds) : { data: [] },
    flightIds.length ? supabase.from('cn_flight_handles').select('id, application_id, created_at').in('application_id', flightIds) : { data: [] },
    laborIds.length ? supabase.from('cn_labor_permit_handles').select('id, application_id, created_at').in('application_id', laborIds) : { data: [] },
  ]);
  (handles[0].data || []).forEach((h: any) => {
    items.push({ id: `inv-handle-${h.id}`, type: 'invitation', title: '邀请函办理', date: h.created_at || '', status: '已办理' });
  });
  (handles[1].data || []).forEach((h: any) => {
    items.push({ id: `visa-handle-${h.id}`, type: 'visa', title: '签证办理', date: h.created_at || '', status: '已办理' });
  });
  (handles[2].data || []).forEach((h: any) => {
    items.push({ id: `flight-handle-${h.id}`, type: 'flight', title: '机票办理', date: h.created_at || '', status: '已办理' });
  });
  (handles[3].data || []).forEach((h: any) => {
    items.push({ id: `labor-handle-${h.id}`, type: 'labor', title: '劳动许可办理', date: h.created_at || '', status: '已办理' });
  });

  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return items;
}
