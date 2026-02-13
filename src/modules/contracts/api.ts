import { supabase } from '../../supabase';
import { getLocalIsoString } from '../../utils/datetime';
import type { Contract, ContractVersion, ContractAttachment, ContractWithDetails } from './types';
import type { AttachmentType } from './types';

/** Supabase Storage 桶名（与控制台创建的 contracts 桶一致）。
 * 若上传报 403 "new row violates row-level security policy"，请在 Supabase Dashboard → Storage → contracts → Policies
 * 添加策略：允许已认证用户对桶 contracts 执行 INSERT（上传）与 SELECT（读取/生成 signed URL）。 */
const BUCKET = 'contracts';
const SIGNED_URL_EXPIRES = 3600;

/** 路径中的 segment（如 contract_no）仅保留 ASCII 安全字符，俄语/中文等非 ASCII 会替换 */
function sanitizePathSegment(s: string): string {
  const safe = s.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return safe || 'contract';
}

/** 路径格式: {business_type}/{contract_no}/v{version_no}/{attachment_type}/{filename} */
function buildStoragePath(
  businessType: string,
  contractNo: string,
  versionNo: number,
  attachmentType: string,
  fileName: string
): string {
  const safeContractNo = sanitizePathSegment(contractNo);
  const safeFileName = sanitizeFileName(fileName);
  return `${businessType}/${safeContractNo}/v${versionNo}/${attachmentType}/${safeFileName}`;
}

/** Supabase Storage (S3) 仅支持 ASCII 作为 object key，中文等非 ASCII 需替换 */
function sanitizeFileName(name: string): string {
  const parts = name.split('.');
  const ext = parts.length > 1 ? '.' + (parts.pop() || '').toLowerCase() : '';
  const base = parts.join('.');
  let safe = base
    .replace(/["'<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 非 ASCII 及不安全字符 → 下划线
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!safe || safe.length < 2) safe = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return safe + ext;
}

/** 获取合同列表（含版本与附件） */
export async function fetchContractsWithDetails(): Promise<ContractWithDetails[]> {
  const { data: contracts, error: e1 } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });

  if (e1) throw e1;
  if (!contracts?.length) return [];

  const ids = contracts.map((c: Contract) => c.id);

  const [versRes, attRes] = await Promise.all([
    supabase
      .from('contract_versions')
      .select('*')
      .in('contract_id', ids)
      .order('version_no', { ascending: true }),
    supabase
      .from('contract_attachments')
      .select('*')
      .in('contract_id', ids)
      .order('created_at', { ascending: false }),
  ]);

  const versions = (versRes.data || []) as ContractVersion[];
  const attachments = (attRes.data || []) as ContractAttachment[];

  const byContract = new Map<string, ContractVersion[]>();
  for (const v of versions) {
    if (!byContract.has(v.contract_id)) byContract.set(v.contract_id, []);
    byContract.get(v.contract_id)!.push(v);
  }
  const byContractAtt = new Map<string, ContractAttachment[]>();
  for (const a of attachments) {
    if (!byContractAtt.has(a.contract_id)) byContractAtt.set(a.contract_id, []);
    byContractAtt.get(a.contract_id)!.push(a);
  }

  return contracts.map((c: Contract) => ({
    ...c,
    versions: byContract.get(c.id) || [],
    attachments: byContractAtt.get(c.id) || [],
  }));
}

/** 获取附件下载/预览的临时 URL */
export async function getAttachmentUrl(filePath: string): Promise<string> {
  const path = filePath.startsWith('contracts/') ? filePath.slice('contracts/'.length) : filePath;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES);
  if (error) throw error;
  return data.signedUrl;
}

/** 创建合同 + 当前版本，并上传多个合同文件（contract_pdf / didox_screenshot） */
export async function createContractWithFiles(params: {
  contract_no: string;
  business_type: 'uz_domestic' | 'export';
  account_name: string;
  contract_date: string;
  company_name: string;
  tax_number: string;
  address: string;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_mfo?: string | null;
  /** 出口合同：SWIFT 代码 */
  bank_swift?: string | null;
  /** 出口合同：OKED 行业代码 */
  oked_code?: string | null;
  director_name: string;
  producer: string;
  change_reason: string;
  files: { attachmentType: AttachmentType; logicalName: string; file: File }[];
}): Promise<Contract> {
  const localNow = getLocalIsoString();
  const { data: contract, error: eContract } = await supabase
    .from('contracts')
    .insert({
      contract_no: params.contract_no,
      business_type: params.business_type,
      account_name: params.account_name,
      customer_display_name: null,
      created_at: localNow,
    })
    .select()
    .single();

  if (eContract) {
    const code = String(eContract.code ?? '');
    if (code === '23505') {
      throw new Error('合同号已存在，请更换合同号或使用「上传附件」为该合同补充文件');
    }
    throw eContract;
  }
  const c = contract as Contract;

  const { data: version, error: eVersion } = await supabase
    .from('contract_versions')
    .insert({
      contract_id: c.id,
      version_no: 1,
      is_current: true,
      contract_date: params.contract_date,
      company_name: params.company_name,
      created_at: localNow,
      tax_number: params.tax_number,
      address: params.address,
      bank_name: params.bank_name ?? null,
      bank_account: params.bank_account ?? null,
      bank_mfo: params.bank_mfo ?? null,
      bank_swift: params.bank_swift ?? null,
      oked_code: params.oked_code ?? null,
      director_name: params.director_name,
      producer: params.producer,
      change_reason: params.change_reason,
    })
    .select()
    .single();

  if (eVersion) throw eVersion;
  const v = version as ContractVersion;

  for (const f of params.files) {
    const storagePath = buildStoragePath(
      params.business_type,
      params.contract_no,
      v.version_no,
      f.attachmentType,
      f.file.name
    );
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, f.file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadErr) throw uploadErr;

    await supabase.from('contract_attachments').insert({
      contract_id: c.id,
      contract_version_id: v.id,
      attachment_type: f.attachmentType,
      logical_name: f.logicalName,
      file_name: f.file.name,
      file_path: storagePath,
      file_ext: f.file.name.includes('.') ? f.file.name.split('.').pop()?.toLowerCase() ?? null : null,
      is_current: true,
      source: 'manual',
      created_at: localNow,
    });
  }

  return c;
}

/** 为已有合同补传合同文件（contract_pdf / didox_screenshot），使用该合同当前版本 */
export async function uploadContractFiles(params: {
  contractId: string;
  files: { attachmentType: AttachmentType; logicalName: string; file: File }[];
}): Promise<void> {
  const { data: contract, error: eContract } = await supabase
    .from('contracts')
    .select('contract_no, business_type')
    .eq('id', params.contractId)
    .single();

  if (eContract || !contract) throw new Error('合同不存在');

  const { data: currentVersion, error: eVer } = await supabase
    .from('contract_versions')
    .select('id, version_no')
    .eq('contract_id', params.contractId)
    .eq('is_current', true)
    .maybeSingle();

  if (eVer) throw eVer;
  const versionNo = currentVersion?.version_no ?? 1;
  const versionId = currentVersion?.id ?? null;
  const localNow = getLocalIsoString();

  for (const f of params.files) {
    const storagePath = buildStoragePath(
      contract.business_type,
      contract.contract_no,
      versionNo,
      f.attachmentType,
      f.file.name
    );
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, f.file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadErr) throw uploadErr;

    const { error: insertErr } = await supabase.from('contract_attachments').insert({
      contract_id: params.contractId,
      contract_version_id: versionId,
      attachment_type: f.attachmentType,
      logical_name: f.logicalName,
      file_name: f.file.name,
      file_path: storagePath,
      file_ext: f.file.name.includes('.') ? f.file.name.split('.').pop()?.toLowerCase() ?? null : null,
      is_current: true,
      source: 'manual',
      created_at: localNow,
    });
    if (insertErr) throw insertErr;
  }
}

/** 为指定合同上传多个附件（appendix / agreement / archive_image），使用该合同当前版本；attachment_date、attachment_no 存表单日期与编号 */
export async function uploadAttachmentFiles(params: {
  contractId: string;
  attachmentDate?: string;
  attachmentNo?: string;
  files: { attachmentType: AttachmentType; logicalName: string; file: File }[];
}): Promise<void> {
  const remarkText =
    [params.attachmentDate && `日期:${params.attachmentDate}`, params.attachmentNo && `附件编号:${params.attachmentNo}`]
      .filter(Boolean)
      .join(' ') || null;
  const attachmentDateVal = params.attachmentDate || null;
  const attachmentNoVal = params.attachmentNo?.trim() || null;
  const { data: contract, error: eContract } = await supabase
    .from('contracts')
    .select('contract_no, business_type')
    .eq('id', params.contractId)
    .single();

  if (eContract || !contract) throw new Error('合同不存在');

  const { data: currentVersion, error: eVer } = await supabase
    .from('contract_versions')
    .select('id, version_no')
    .eq('contract_id', params.contractId)
    .eq('is_current', true)
    .maybeSingle();

  if (eVer) throw eVer;
  const versionNo = currentVersion?.version_no ?? 1;
  const versionId = currentVersion?.id ?? null;
  const localNow = getLocalIsoString();

  for (const f of params.files) {
    const storagePath = buildStoragePath(
      contract.business_type,
      contract.contract_no,
      versionNo,
      f.attachmentType,
      f.file.name
    );
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, f.file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadErr) throw uploadErr;

    const { error: insertErr } = await supabase.from('contract_attachments').insert({
      contract_id: params.contractId,
      contract_version_id: versionId,
      attachment_type: f.attachmentType,
      logical_name: f.logicalName,
      file_name: f.file.name,
      file_path: storagePath,
      file_ext: f.file.name.includes('.') ? f.file.name.split('.').pop()?.toLowerCase() ?? null : null,
      is_current: true,
      source: 'manual',
      remark: remarkText,
      attachment_date: attachmentDateVal,
      attachment_no: attachmentNoVal,
      created_at: localNow,
    });
    if (insertErr) throw insertErr;
  }
}
