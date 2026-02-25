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
  if (error) {
    if (error.code === '23505' && /employee_no|unique|duplicate/i.test(error.message || '')) {
      throw new Error('工号已存在，请更换工号');
    }
    throw error;
  }
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
  if (error) {
    if (error.code === '23505' && /employee_no|unique|duplicate/i.test(error.message || '')) {
      throw new Error('工号已存在，请更换工号');
    }
    throw error;
  }
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

/** 补充编辑邀请函办理（附件遗漏、资料更正） */
export async function updateInvitationHandle(
  id: string,
  params: {
    letter_date?: string | null;
    letter_image_url?: string | null;
    fee_amount?: number | null;
    operator?: string | null;
  }
): Promise<InvitationHandle> {
  const { data, error } = await supabase
    .from('cn_invitation_handles')
    .update({
      ...(params.letter_date !== undefined && { letter_date: params.letter_date }),
      ...(params.letter_image_url !== undefined && { letter_image_url: params.letter_image_url }),
      ...(params.fee_amount !== undefined && { fee_amount: params.fee_amount }),
      ...(params.operator !== undefined && { operator: params.operator }),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  try {
    const { data: row } = await supabase.from('cn_invitation_handles').select('application_id').eq('id', id).single();
    const appId = (row as { application_id?: string })?.application_id;
    const { data: appRow } = appId ? await supabase.from('cn_invitation_applications').select('employee_id').eq('id', appId).maybeSingle() : { data: null };
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'invitation',
      action: '邀请函编辑',
      target_type: 'cn_invitation_handles',
      target_id: id,
      detail: { application_id: appId, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return data as InvitationHandle;
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

/** 查询该员工有效签证：cn_visa_handles 表。有效 = 未过期（expiry_date>=今天或 null）且优先判定 visa_times/remaining_times（总次数>0或-1，剩余次数>0或-1） */
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
    .in('application_id', appIds);
  if (error) throw error;
  const list = (handles || []) as VisaHandle[];
  return list.filter((h) => {
    const notExpired = h.expiry_date == null || h.expiry_date >= today;
    const hasVisaTimes = h.visa_times === null || h.visa_times === -1 || h.visa_times > 0;
    const hasRemainingTimes = h.remaining_times === null || h.remaining_times === -1 || h.remaining_times > 0;
    return notExpired && hasVisaTimes && hasRemainingTimes;
  });
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
  address_slip?: string | null;
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
      ...(params.address_slip !== undefined && { address_slip: params.address_slip }),
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

/** 补充编辑签证办理 */
export async function updateVisaHandle(
  id: string,
  params: {
    effective_date?: string | null;
    expiry_date?: string | null;
    visa_times?: number | null;
    remaining_times?: number | null;
    visa_image_url?: string | null;
    fee_amount?: number | null;
    issuer_company?: string | null;
    operator?: string | null;
    address_slip?: string | null;
  }
): Promise<VisaHandle> {
  const { data, error } = await supabase
    .from('cn_visa_handles')
    .update({
      ...(params.effective_date !== undefined && { effective_date: params.effective_date }),
      ...(params.expiry_date !== undefined && { expiry_date: params.expiry_date }),
      ...(params.visa_times !== undefined && { visa_times: params.visa_times }),
      ...(params.remaining_times !== undefined && { remaining_times: params.remaining_times }),
      ...(params.visa_image_url !== undefined && { visa_image_url: params.visa_image_url }),
      ...(params.fee_amount !== undefined && { fee_amount: params.fee_amount }),
      ...(params.issuer_company !== undefined && { issuer_company: params.issuer_company }),
      ...(params.operator !== undefined && { operator: params.operator }),
      ...(params.address_slip !== undefined && { address_slip: params.address_slip }),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  try {
    const { data: row } = await supabase.from('cn_visa_handles').select('application_id').eq('id', id).single();
    const appId = (row as { application_id?: string })?.application_id;
    const { data: appRow } = appId ? await supabase.from('cn_visa_applications').select('employee_id').eq('id', appId).maybeSingle() : { data: null };
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'visa',
      action: '签证编辑',
      target_type: 'cn_visa_handles',
      target_id: id,
      detail: { application_id: appId, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return data as VisaHandle;
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

/** 新建机票申请：提交前校验该员工在 cn_visa_handles 中是否存在有效签证（visa_times/remaining_times），无有效签证或剩余次数为0则阻断 */
export async function createFlightApplication(params: {
  employee_id: string;
  depart_city: string | null;
  arrive_city: string | null;
  expected_departure_at: string | null;
  planned_return_at?: string | null;
  remark: string | null;
  submitted_by: string | null;
}): Promise<FlightApplication> {
  const validVisas = await fetchValidVisasForEmployee(params.employee_id);
  if (!validVisas.length) {
    throw new Error('该员工当前无有效签证或剩余次数为0，请先办理签证');
  }
  const now = getLocalIsoString();
  const { data, error } = await supabase
    .from('cn_flight_applications')
    .insert({
      employee_id: params.employee_id,
      depart_city: params.depart_city,
      arrive_city: params.arrive_city,
      expected_departure_at: params.expected_departure_at,
      ...(params.planned_return_at !== undefined && { planned_return_at: params.planned_return_at }),
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

/** 补充编辑机票办理（不修改签证扣减，仅更新时间/金额/附件等） */
export async function updateFlightHandle(
  id: string,
  params: {
    actual_departure_at?: string | null;
    arrival_at?: string | null;
    actual_return_at?: string | null;
    depart_city?: string | null;
    arrive_city?: string | null;
    flight_info?: string | null;
    ticket_amount?: number | null;
    ticket_image_url?: string | null;
    issuer_company?: string | null;
    cost_bearer?: string | null;
    approver?: string | null;
    operator?: string | null;
  }
): Promise<FlightHandle> {
  const { data, error } = await supabase
    .from('cn_flight_handles')
    .update({
      ...(params.actual_departure_at !== undefined && { actual_departure_at: params.actual_departure_at }),
      ...(params.arrival_at !== undefined && { arrival_at: params.arrival_at }),
      ...(params.actual_return_at !== undefined && { actual_return_at: params.actual_return_at }),
      ...(params.depart_city !== undefined && { depart_city: params.depart_city }),
      ...(params.arrive_city !== undefined && { arrive_city: params.arrive_city }),
      ...(params.flight_info !== undefined && { flight_info: params.flight_info }),
      ...(params.ticket_amount !== undefined && { ticket_amount: params.ticket_amount }),
      ...(params.ticket_image_url !== undefined && { ticket_image_url: params.ticket_image_url }),
      ...(params.issuer_company !== undefined && { issuer_company: params.issuer_company }),
      ...(params.cost_bearer !== undefined && { cost_bearer: params.cost_bearer }),
      ...(params.approver !== undefined && { approver: params.approver }),
      ...(params.operator !== undefined && { operator: params.operator }),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  try {
    const { data: row } = await supabase.from('cn_flight_handles').select('application_id').eq('id', id).single();
    const appId = (row as { application_id?: string })?.application_id;
    const { data: appRow } = appId ? await supabase.from('cn_flight_applications').select('employee_id').eq('id', appId).maybeSingle() : { data: null };
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'flight',
      action: '机票编辑',
      target_type: 'cn_flight_handles',
      target_id: id,
      detail: { application_id: appId, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return data as FlightHandle;
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

/** 补充编辑劳动许可办理 */
export async function updateLaborPermitHandle(
  id: string,
  params: {
    permit_date?: string | null;
    effective_date?: string | null;
    expiry_date?: string | null;
    fee_amount?: number | null;
    image_url?: string | null;
    operator?: string | null;
  }
): Promise<LaborPermitHandle> {
  const { data, error } = await supabase
    .from('cn_labor_permit_handles')
    .update({
      ...(params.permit_date !== undefined && { permit_date: params.permit_date }),
      ...(params.effective_date !== undefined && { effective_date: params.effective_date }),
      ...(params.expiry_date !== undefined && { expiry_date: params.expiry_date }),
      ...(params.fee_amount !== undefined && { fee_amount: params.fee_amount }),
      ...(params.image_url !== undefined && { image_url: params.image_url }),
      ...(params.operator !== undefined && { operator: params.operator }),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  try {
    const { data: row } = await supabase.from('cn_labor_permit_handles').select('application_id').eq('id', id).single();
    const appId = (row as { application_id?: string })?.application_id;
    const { data: appRow } = appId ? await supabase.from('cn_labor_permit_applications').select('employee_id').eq('id', appId).maybeSingle() : { data: null };
    const brief = appRow?.employee_id ? await getEmployeeBrief(appRow.employee_id) : null;
    await logOperation({
      category: 'labor_permit',
      action: '劳动许可编辑',
      target_type: 'cn_labor_permit_handles',
      target_id: id,
      detail: { application_id: appId, ...brief },
    });
  } catch (_) { /* 日志失败不影响主流程 */ }
  return data as LaborPermitHandle;
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

/**
 * 判断员工当前是否在休假（基于数据库返回的 ISO 时间：start_at/end_at，如 2026-02-24T11:12:26+00:00）
 * - 当前时间在 [start_at, end_at] 内视为休假中
 * - 无 end_at 或空字符串视为归期未知，只要已开始即视为休假中
 */
export function isOnLeaveToday(records: LeaveRecord[]): boolean {
  const now = Date.now();

  // DB 返回形如 2026-02-24T11:12:26+00:00（带时区）。
  // 业务侧通常按“本地时间”填写/理解，因此这里优先按本地时间解析（去掉时区后再 new Date）。
  // 若解析失败，再回退用原字符串解析（按绝对时间）。
  const toLocalMs = (iso: string | null): number => {
    if (iso == null) return NaN;
    const s = String(iso).trim();
    if (!s) return NaN;
    const noTz = s.replace(/([+-]\d{2}:\d{2}|Z)$/i, '');
    const msLocal = new Date(noTz).getTime();
    if (!Number.isNaN(msLocal)) return msLocal;
    return new Date(s).getTime();
  };

  return records.some((r) => {
    const startAt = r.start_at != null && String(r.start_at).trim() !== '' ? r.start_at : null;
    const startMs = toLocalMs(startAt);
    if (Number.isNaN(startMs) || startMs > now) return false;

    const endAt = r.end_at != null && String(r.end_at).trim() !== '' ? r.end_at : null;
    if (endAt == null) return true;
    const endMs = toLocalMs(endAt);
    // end_at 若异常（NaN），按“归期未知”处理
    if (Number.isNaN(endMs)) return true;
    return now <= endMs;
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

/** 订阅待办相关表变更，用于消息中心实时刷新（新申请/状态变更时回调） */
export function subscribeTodoListUpdates(callback: () => void): () => void {
  const channel = supabase
    .channel('hr-todos-updates')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cn_invitation_applications' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cn_visa_applications' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cn_flight_applications' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cn_labor_permit_applications' },
      () => callback()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
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

// ==================== 仪表盘预警 ====================

import type { DashboardAlertItem } from './types';

/**
 * 获取仪表盘预警事件：
 * 1. 签证到期预警（提前3周，含已过期7天内）
 * 2. 免签预警（机票到达塔什干后3周内到期）
 * 3. 小白条地址未填写提醒（落地塔什干后签证记录缺少地址信息）
 * 4. 劳动许可提醒（每年3月后，员工在塔什干累计时间达阈值）
 */
export async function fetchDashboardAlerts(): Promise<DashboardAlertItem[]> {
  const alerts: DashboardAlertItem[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let employees: CnEmployee[];
  try {
    employees = await fetchEmployees();
  } catch {
    return alerts;
  }
  const activeEmployees = employees.filter(e => !e.resigned_at);
  if (!activeEmployees.length) return alerts;

  const empMap = new Map(activeEmployees.map(e => [e.id, e]));
  const empIds = activeEmployees.map(e => e.id);

  let visaApps: { id: string; employee_id: string; application_type: string | null; status: string }[] = [];
  let flightApps: { id: string; employee_id: string; status: string }[] = [];

  try {
    const [visaAppsRes, flightAppsRes] = await Promise.all([
      supabase.from('cn_visa_applications').select('id, employee_id, application_type, status').in('employee_id', empIds),
      supabase.from('cn_flight_applications').select('id, employee_id, status').in('employee_id', empIds),
    ]);
    visaApps = (visaAppsRes.data || []) as typeof visaApps;
    flightApps = (flightAppsRes.data || []) as typeof flightApps;
  } catch {
    return alerts;
  }

  const doneVisaAppIds = visaApps.filter(a => a.status === 'done').map(a => a.id);
  const doneFlightAppIds = flightApps.filter(a => a.status === 'done').map(a => a.id);

  let visaHandles: VisaHandle[] = [];
  let flightHandles: FlightHandle[] = [];

  try {
    const [visaHandlesRes, flightHandlesRes] = await Promise.all([
      doneVisaAppIds.length
        ? supabase.from('cn_visa_handles').select('*').in('application_id', doneVisaAppIds)
        : { data: [] },
      doneFlightAppIds.length
        ? supabase.from('cn_flight_handles').select('*').in('application_id', doneFlightAppIds)
        : { data: [] },
    ]);
    visaHandles = (visaHandlesRes.data || []) as VisaHandle[];
    flightHandles = (flightHandlesRes.data || []) as FlightHandle[];
  } catch {
    return alerts;
  }

  const visaAppMap = new Map(visaApps.map(a => [a.id, a]));
  const DAY_MS = 24 * 60 * 60 * 1000;
  const threeWeeksMs = 21 * DAY_MS;

  // ---- 1. 签证到期预警 & 2. 免签预警 & 3. 小白条缺失 ----
  for (const vh of visaHandles) {
    const visaApp = visaAppMap.get(vh.application_id);
    if (!visaApp) continue;
    const emp = empMap.get(visaApp.employee_id);
    if (!emp) continue;

    const isFreeVisa = visaApp.application_type === '免签';

    // 小白条地址缺失提醒：已办理签证但未填写小白条地址
    if (!vh.address_slip) {
      alerts.push({
        id: `addr-slip-${vh.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNo: emp.employee_no,
        type: 'address_slip_missing',
        typeLabel: '小白条未填写',
        triggerDate: todayStr,
        description: `签证已办理但小白条地址信息尚未填写，请及时补充`,
      });
    }

    if (isFreeVisa) {
      // 免签：到达塔什干后3周到期预警
      const relatedFlights = flightHandles.filter(fh => {
        const fa = flightApps.find(a => a.id === fh.application_id);
        return fa && fa.employee_id === visaApp.employee_id;
      });
      for (const fh of relatedFlights) {
        const arrivedTashkent = fh.arrive_city === '塔什干' || (fh.arrive_city && fh.arrive_city.includes('塔什干'));
        if (fh.arrival_at && arrivedTashkent) {
          const arrivalDate = new Date(fh.arrival_at);
          const deadlineDate = new Date(arrivalDate.getTime() + threeWeeksMs);
          const deadlineStr = deadlineDate.toISOString().slice(0, 10);
          const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / DAY_MS);
          // 到期前21天到过期后7天都提醒
          if (daysLeft <= 21 && daysLeft >= -7) {
            alerts.push({
              id: `visa-free-${vh.id}-${fh.id}`,
              employeeId: emp.id,
              employeeName: emp.name,
              employeeNo: emp.employee_no,
              type: 'visa_free_warning',
              typeLabel: '免签到期预警',
              triggerDate: deadlineStr,
              description: daysLeft < 0
                ? `免签已于 ${deadlineStr} 到期（到达塔什干后3周）`
                : `免签将于 ${deadlineStr} 到期（剩余${daysLeft}天）`,
            });
          }
        }
      }
    } else if (vh.expiry_date) {
      // 非免签：按失效日期提前3周预警
      const expiryDate = new Date(vh.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / DAY_MS);
      // 到期前21天到过期后7天都提醒
      if (daysUntilExpiry <= 21 && daysUntilExpiry >= -7) {
        alerts.push({
          id: `visa-expiry-${vh.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeNo: emp.employee_no,
          type: 'visa_expiry',
          typeLabel: '签证到期预警',
          triggerDate: vh.expiry_date,
          description: daysUntilExpiry < 0
            ? `签证已于 ${vh.expiry_date} 过期`
            : daysUntilExpiry === 0
              ? `签证今天到期！`
              : `签证将于 ${vh.expiry_date} 到期（剩余${daysUntilExpiry}天）`,
        });
      }
    }
  }

  // ---- 4. 劳动许可提醒（每年3月后） ----
  const currentMonth = today.getMonth() + 1;
  if (currentMonth >= 3) {
    const currentYear = today.getFullYear();
    const yearStart = `${currentYear}-01-01`;

    for (const emp of activeEmployees) {
      const empFlights = flightHandles.filter(fh => {
        const fa = flightApps.find(a => a.id === fh.application_id);
        return fa && fa.employee_id === emp.id;
      });

      let daysInTashkent = 0;
      for (const fh of empFlights) {
        const arrivedTashkent = fh.arrive_city === '塔什干' || (fh.arrive_city && fh.arrive_city.includes('塔什干'));
        if (arrivedTashkent && fh.arrival_at) {
          const arrDate = new Date(fh.arrival_at);
          if (arrDate.toISOString().slice(0, 10) >= yearStart) {
            const departDate = fh.actual_return_at ? new Date(fh.actual_return_at) : today;
            daysInTashkent += Math.max(0, (departDate.getTime() - arrDate.getTime()) / DAY_MS);
          }
        }
      }

      if (daysInTashkent >= 60) {
        alerts.push({
          id: `labor-permit-${emp.id}-${currentYear}`,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeNo: emp.employee_no,
          type: 'labor_permit_reminder',
          typeLabel: '劳动许可提醒',
          triggerDate: todayStr,
          description: `${currentYear}年在塔什干累计约${Math.round(daysInTashkent)}天，请关注劳动许可办理`,
        });
      }
    }
  }

  alerts.sort((a, b) => a.triggerDate.localeCompare(b.triggerDate));
  return alerts;
}

// ==================== 员工档案导出（仅 cn_employees 表） ====================

const EMPLOYEE_EXPORT_KEYS: (keyof CnEmployee)[] = [
  'employee_no', 'name', 'passport_no', 'birth_date', 'gender', 'department', 'position',
  'hire_date', 'resigned_at', 'bank_account', 'bank_name', 'salary_standard', 'id_card_no',
  'home_address', 'marital_status', 'contact_phone', 'emergency_contact', 'emergency_phone',
  'created_at', 'updated_at',
];
const EMPLOYEE_EXPORT_LABELS: Record<string, string> = {
  employee_no: '工号', name: '姓名', passport_no: '护照号', birth_date: '出生日期', gender: '性别',
  department: '部门', position: '岗位', hire_date: '入职日期', resigned_at: '离职时间',
  bank_account: '银行账号', bank_name: '开户行', salary_standard: '工资标准', id_card_no: '身份证号',
  home_address: '家庭住址', marital_status: '婚姻状况', contact_phone: '联系电话',
  emergency_contact: '紧急联系人', emergency_phone: '紧急联系电话', created_at: '创建时间', updated_at: '更新时间',
};

/** 导出 cn_employees 表数据（中文表头） */
export async function fetchEmployeesForExport(): Promise<Record<string, unknown>[]> {
  const list = await fetchEmployees();
  return list.map((e) => {
    const row: Record<string, unknown> = {};
    EMPLOYEE_EXPORT_KEYS.forEach((k) => {
      const label = EMPLOYEE_EXPORT_LABELS[k] ?? k;
      row[label] = e[k] ?? '';
    });
    return row;
  });
}

/** 按工号导出档案：返回多 sheet 数据（邀请函、签证、机票、劳动许可、调岗调薪、请假、奖惩） */
export async function fetchArchiveForExportByEmployeeNos(
  employeeNos: string[]
): Promise<{ sheetName: string; data: Record<string, unknown>[] }[]> {
  const nos = [...new Set(employeeNos.map((n) => String(n).trim()).filter(Boolean))];
  if (!nos.length) return [];

  const employees: CnEmployee[] = [];
  for (const no of nos) {
    const e = await fetchEmployeeByNo(no);
    if (e) employees.push(e);
  }
  if (!employees.length) return [];

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const ids = employees.map((e) => e.id);

  const [invApps, visaApps, flightApps, laborApps, transferRecs, leaveRecs, rewardRecs] = await Promise.all([
    Promise.all(ids.map((id) => supabase.from('cn_invitation_applications').select('*').eq('employee_id', id))).then((r) => r.flatMap((x) => x.data || [])),
    Promise.all(ids.map((id) => supabase.from('cn_visa_applications').select('*').eq('employee_id', id))).then((r) => r.flatMap((x) => x.data || [])),
    Promise.all(ids.map((id) => supabase.from('cn_flight_applications').select('*').eq('employee_id', id))).then((r) => r.flatMap((x) => x.data || [])),
    Promise.all(ids.map((id) => supabase.from('cn_labor_permit_applications').select('*').eq('employee_id', id))).then((r) => r.flatMap((x) => x.data || [])),
    Promise.all(ids.map((id) => supabase.from('cn_transfer_records').select('*').eq('employee_id', id))).then((r) => r.flatMap((x) => x.data || [])),
    Promise.all(ids.map((id) => supabase.from('cn_leave_records').select('*').eq('employee_id', id))).then((r) => r.flatMap((x) => x.data || [])),
    Promise.all(ids.map((id) => supabase.from('cn_reward_discipline_records').select('*').eq('employee_id', id))).then((r) => r.flatMap((x) => x.data || [])),
  ]);

  const toRow = (empId: string, rest: Record<string, unknown>) => {
    const e = empMap.get(empId);
    return { 工号: e?.employee_no ?? '', 姓名: e?.name ?? '', ...rest };
  };

  const sheets: { sheetName: string; data: Record<string, unknown>[] }[] = [];

  sheets.push({
    sheetName: '员工',
    data: employees.map((e) => {
      const row: Record<string, unknown> = {};
      EMPLOYEE_EXPORT_KEYS.forEach((k) => {
        row[EMPLOYEE_EXPORT_LABELS[k] ?? k] = e[k] ?? '';
      });
      return row;
    }),
  });

  sheets.push({
    sheetName: '邀请函',
    data: (invApps as any[]).map((r) =>
      toRow(r.employee_id, {
        提交时间: r.submitted_at ?? r.created_at ?? '',
        状态: r.status === 'done' ? '已办理' : '待办理',
      })
    ),
  });

  sheets.push({
    sheetName: '签证',
    data: (visaApps as any[]).map((r) =>
      toRow(r.employee_id, {
        申请类型: r.application_type ?? '',
        预计出发: r.expected_departure_at ?? '',
        创建时间: r.created_at ?? '',
        状态: r.status === 'done' ? '已办理' : '待办理',
      })
    ),
  });

  sheets.push({
    sheetName: '机票',
    data: (flightApps as any[]).map((r) =>
      toRow(r.employee_id, {
        出发城市: r.depart_city ?? '',
        到达城市: r.arrive_city ?? '',
        预计出发: r.expected_departure_at ?? '',
        备注: r.remark ?? '',
        创建时间: r.created_at ?? '',
        状态: r.status === 'done' ? '已办理' : '待办理',
      })
    ),
  });

  sheets.push({
    sheetName: '劳动许可',
    data: (laborApps as any[]).map((r) =>
      toRow(r.employee_id, {
        申请日期: r.application_date ?? '',
        申请内容: r.application_content ?? '',
        申请人: r.applicant ?? '',
        创建时间: r.created_at ?? '',
        状态: r.status === 'done' ? '已办理' : '待办理',
      })
    ),
  });

  sheets.push({
    sheetName: '调岗调薪',
    data: (transferRecs as any[]).map((r) =>
      toRow(r.employee_id, {
        调岗日期: r.transfer_date ?? '',
        原部门: r.from_department ?? '',
        原岗位: r.from_position ?? '',
        新部门: r.to_department ?? '',
        新岗位: r.to_position ?? '',
        操作人: r.operator ?? '',
      })
    ),
  });
  const salaryRecs = await Promise.all(
    ids.map((id) => supabase.from('cn_salary_change_records').select('*').eq('employee_id', id))
  ).then((r) => r.flatMap((x) => x.data || []));
  sheets.push({
    sheetName: '调薪',
    data: (salaryRecs as any[]).map((r) =>
      toRow(r.employee_id, {
        调整日期: r.change_date ?? '',
        调整前: r.salary_before ?? '',
        调整后: r.salary_after ?? '',
        操作人: r.operator ?? '',
      })
    ),
  });

  sheets.push({
    sheetName: '请假',
    data: (leaveRecs as any[]).map((r) =>
      toRow(r.employee_id, {
        开始时间: r.start_at ?? '',
        结束时间: r.end_at ?? '',
        事由: r.reason ?? '',
        时长小时: r.leave_hours ?? '',
        操作人: r.operator ?? '',
      })
    ),
  });

  sheets.push({
    sheetName: '奖惩',
    data: (rewardRecs as any[]).map((r) =>
      toRow(r.employee_id, {
        类型: r.record_type === 'reward' ? '奖励' : '违纪',
        原因: r.reason ?? '',
        金额: r.amount ?? '',
        创建时间: r.created_at ?? '',
        操作人: r.operator ?? '',
      })
    ),
  });

  return sheets;
}
