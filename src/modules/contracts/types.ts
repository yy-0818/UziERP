/** 合同主表 */
export interface Contract {
  id: string;
  contract_no: string;
  business_type: 'uz_domestic' | 'export';
  account_name: string | null;
  customer_display_name: string | null;
  created_at: string;
}

/** 合同版本表 */
export interface ContractVersion {
  id: string;
  contract_id: string;
  version_no: number;
  is_current: boolean;
  contract_date: string;
  company_name: string;
  tax_number: string;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_mfo: string | null;
  /** 出口合同：SWIFT 代码 */
  bank_swift: string | null;
  /** 出口合同：OKED 行业代码 */
  oked_code: string | null;
  /** 出口合同：swift_code（兼容） */
  swift_code: string | null;
  director_name: string | null;
  producer: string | null;
  change_reason: string | null;
  created_at: string;
}

/** 附件类型 */
export type AttachmentType =
  | 'contract_pdf'
  | 'didox_screenshot'
  | 'appendix'
  | 'agreement'
  | 'archive_image';

/** 合同附件表 */
export interface ContractAttachment {
  id: string;
  contract_id: string;
  contract_version_id: string | null;
  attachment_type: AttachmentType;
  logical_name: string;
  file_name: string;
  file_path: string;
  file_ext: string | null;
  is_current: boolean;
  replaced_by: string | null;
  source: string | null;
  remark: string | null;
  /** 附件日期（appendix/agreement 表单填写，用于排序） */
  attachment_date?: string | null;
  /** 附件编号（appendix/agreement 表单填写） */
  attachment_no?: string | null;
  created_at: string;
}

/** 列表用：合同 + 版本 + 附件 */
export interface ContractWithDetails extends Contract {
  versions?: ContractVersion[];
  attachments?: ContractAttachment[];
}

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  contract_pdf: '合同 PDF',
  didox_screenshot: '截图',
  appendix: '附件',
  agreement: '协议',
  archive_image: '存档图片',
};

/** 合同文件类型：合同 PDF、截图等 */
export const CONTRACT_FILE_TYPES: AttachmentType[] = ['contract_pdf', 'didox_screenshot'];

/** 附件类型：客户订单、存档图片等 */
export const ATTACHMENT_ONLY_TYPES: AttachmentType[] = ['appendix', 'agreement', 'archive_image'];

export const BUSINESS_TYPE_LABELS: Record<Contract['business_type'], string> = {
  uz_domestic: '乌兹国内',
  export: '出口',
};

/** 合同日期格式化为中文，如 2026年2月5日 */
export function formatContractDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}年${m}月${day}日`;
  } catch {
    return dateStr;
  }
}
