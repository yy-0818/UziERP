<template>
  <div class="page-container page contracts-page">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">合同与附件管理</div>
            <div class="subtitle">一客户一合同；合同与附件均区分乌兹国内/出口；支持上传合同或为指定合同上传附件</div>
          </div>
          <div class="header-actions">
            <el-button v-if="canManage" type="primary" @click="openUpload('contract')">上传合同</el-button>
            <el-button v-if="canManage" @click="openUpload('attachment')">上传附件</el-button>
            <el-button v-if="canManage" type="success" plain @click="exportData">导出</el-button>
            <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
          </div>
        </div>
      </template>

      <div class="erp-toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="合同号 / 税号 / 账户"
          clearable
          style="width: 200px"
          @keyup.enter="applyFilters"
        />
        <el-select v-model="filters.business_type" placeholder="业务类型" clearable style="width: 120px">
          <el-option
            v-for="(label, key) in BUSINESS_TYPE_LABELS"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="合同日期起"
          end-placeholder="合同日期止"
          value-format="YYYY-MM-DD"
          style="width: 260px"
        />
        <el-checkbox v-model="filters.onlyWithAttachments">仅显示有附件的合同</el-checkbox>
        <el-button type="primary" @click="applyFilters">查询</el-button>
      </div>

      <template v-if="loading">
        <el-skeleton :rows="10" animated class="erp-table-skeleton" />
      </template>
      <el-table
        v-else
        :data="filteredList"
        style="width: 100%"
        stripe
        border
        row-key="id"
        class="contracts-table"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-content">
              <div class="expand-section">
                <div class="expand-section-title">合同信息</div>
                <dl class="contract-info-dl" v-if="currentVersion(row)">
                  <dt>合同号：</dt><dd>{{ row.contract_no }}</dd>
                  <dt>合同日期：</dt><dd>{{ formatContractDate(currentVersion(row)!.contract_date) }}</dd>
                  <dt>公司名称：</dt><dd>{{ currentVersion(row)!.company_name }}</dd>
                  <dt>地址：</dt><dd>{{ currentVersion(row)!.address || '—' }}</dd>
                  <dt>银行：</dt><dd>{{ currentVersion(row)!.bank_name || '—' }}</dd>
                  <dt>账号(р/с)：</dt><dd>{{ currentVersion(row)!.bank_account || '—' }}</dd>
                  <dt>银行代码(МФО)：</dt><dd>{{ currentVersion(row)!.bank_mfo || '—' }}</dd>
                  <template v-if="row.business_type === 'export'">
                    <dt>SWIFT：</dt><dd>{{ currentVersion(row)!.bank_swift || currentVersion(row)!.swift_code || '—' }}</dd>
                    <dt>OKED：</dt><dd>{{ currentVersion(row)!.oked_code || '—' }}</dd>
                  </template>
                  <dt>税号(ИНН)：</dt><dd>{{ currentVersion(row)!.tax_number }}</dd>
                  <dt>老板(Директор)：</dt><dd>{{ currentVersion(row)!.director_name || '—' }}</dd>
                  <dt>制作人：</dt><dd>{{ currentVersion(row)!.producer || '—' }}</dd>
                </dl>
                <div v-else class="expand-empty">暂无版本信息</div>
              </div>
              <div class="expand-section">
                <div class="expand-section-title">合同
                  <el-button v-if="canManage" type="primary" link size="small" @click="openUpload('contract', row.id)">+ 上传合同</el-button>
                </div>
                <div class="file-tags">
                  <template v-for="a in contractFiles(row)" :key="a.id">
                    <el-tag size="small" class="file-tag">
                      <span v-if="(a.file_ext || '').toLowerCase() === 'pdf'">[PDF]</span>
                      <span v-else>[其他]</span>
                      {{ a.logical_name }}
                      <el-button link type="primary" size="small" @click="viewAttachment(a)">查看</el-button>
                      <el-button link type="primary" size="small" @click="downloadAttachment(a)">下载</el-button>
                    </el-tag>
                  </template>
                </div>
                <div v-if="!contractFiles(row).length" class="expand-empty">暂无合同文件</div>
              </div>
              <div class="expand-section">
                <div class="expand-section-title">
                  附件
                  <el-button v-if="canManage" type="primary" link size="small" @click="openUpload('attachment', row.id)">+ 上传附件</el-button>
                </div>
                <div class="file-tags">
                  <template v-for="a in attachmentFiles(row)" :key="a.id">
                    <el-tag size="small" class="file-tag">
                      <span v-if="a.attachment_type === 'archive_image'">[存档图片]</span>
                      <span v-else-if="(a.file_ext || '').toLowerCase() === 'pdf'">[PDF]</span>
                      <span v-else>[其他]</span>
                      {{ a.logical_name }}
                      <el-button link type="primary" size="small" @click="viewAttachment(a)">查看</el-button>
                      <el-button link type="primary" size="small" @click="downloadAttachment(a)">下载</el-button>
                    </el-tag>
                  </template>
                </div>
                <div v-if="!attachmentFiles(row).length" class="expand-empty">暂无附件</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="合同日期" width="100">
          <template #default="{ row }">{{ formatDateOnly(currentVersion(row)?.contract_date) }}</template>
        </el-table-column>
        <el-table-column prop="contract_no" label="合同号" min-width="140" show-overflow-tooltip />
        <el-table-column label="公司名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ currentVersion(row)?.company_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="税号" width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ currentVersion(row)?.tax_number || '—' }}</template>
        </el-table-column>
        <el-table-column label="账户" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.account_name || row.customer_display_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="business_type" label="业务类型" width="96">
          <template #default="{ row }">{{ businessTypeLabel(row.business_type) }}</template>
        </el-table-column>
        <el-table-column label="合同附件数" width="120" align="center">
          <template #default="{ row }">{{ pdfAttachmentCount(row) }}</template>
        </el-table-column>
        <el-table-column v-if="canManage" label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!loading && filteredList.length === 0" class="table-empty">
        <el-empty description="暂无符合条件的合同；可点击「上传合同」新建并上传合同文件" />
      </div>
    </el-card>

    <ContractUploadDialog
      v-model:visible="uploadVisible"
      :mode="uploadMode"
      :contract-list="list"
      :preselected-contract-id="preselectedContractId"
      @uploaded="fetchData"
    />

    <!-- 编辑合同信息：用于修正上传时填错的字段（不修改合同号与业务类型） -->
    <el-dialog v-model="editVisible" title="编辑合同信息" :max-width=" '80%' " destroy-on-close append-to-body>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="120px" label-position="left">
        <el-alert
          type="info"
          show-icon
          :closable="false"
          title="仅支持修正合同信息与当前生效版本字段；合同号与业务类型不允许修改（涉及存储路径）。"
          style="margin-bottom: 12px;"
        />
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同号：">
              <el-input :model-value="editForm.contract_no" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务类型：">
              <el-input :model-value="businessTypeLabel(editForm.business_type)" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="账户名称：">
          <el-input v-model="editForm.account_name" placeholder="可修正账户显示名" />
        </el-form-item>

        <div class="form-section">当前生效版本字段</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同日期：" prop="contract_date">
              <el-date-picker
                v-model="editForm.contract_date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="必填"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公司名称：" prop="company_name">
              <el-input v-model="editForm.company_name" placeholder="必填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="税号(ИНН)：" prop="tax_number">
              <el-input v-model="editForm.tax_number" placeholder="必填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="老板：" prop="director_name">
              <el-input v-model="editForm.director_name" placeholder="必填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址：" prop="address">
          <el-input v-model="editForm.address" type="textarea" :rows="2" placeholder="必填" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="账号(р/с)：" prop="bank_account">
              <el-input v-model="editForm.bank_account" placeholder="必填" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="银行代码：" prop="bank_mfo">
              <el-input v-model="editForm.bank_mfo" placeholder="必填" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="银行：">
              <el-input v-model="editForm.bank_name" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="editForm.business_type === 'export'" :gutter="20">
          <el-col :span="12">
            <el-form-item label="SWIFT：">
              <el-input v-model="editForm.bank_swift" placeholder="出口合同填写，如 - 或 SWIFT 代码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="OKED：">
              <el-input v-model="editForm.oked_code" placeholder="出口合同行业代码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="制作人：" prop="producer">
              <el-input v-model="editForm.producer" placeholder="必填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="修订原因：" prop="change_reason">
              <el-input v-model="editForm.change_reason" placeholder="必填：本次修改原因" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, computed } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { supabase } from '../../supabase';
import { fetchContractsWithDetails, getAttachmentUrl } from './api';
import { BUSINESS_TYPE_LABELS, formatContractDate, CONTRACT_FILE_TYPES, ATTACHMENT_ONLY_TYPES } from './types';
import type { ContractWithDetails, ContractVersion, ContractAttachment } from './types';
import ContractUploadDialog from './components/ContractUploadDialog.vue';
import { exportToExcel } from '../../composables/useExport';
import { useAuthStore } from '../../stores/auth';

const list = shallowRef<ContractWithDetails[]>([]);
const loading = ref(false);
const auth = useAuthStore();
const canManage = computed(() => (auth.role || '') !== 'viewer');
const filters = ref({
  keyword: '',
  business_type: '' as string,
  dateRange: null as [string, string] | null,
  onlyWithAttachments: false,
});

const filteredList = computed(() => {
  let rows = list.value;
  const k = filters.value.keyword.trim().toLowerCase();
  if (k) {
    rows = rows.filter((c) => {
      const v = currentVersion(c);
      return (
        c.contract_no?.toLowerCase().includes(k) ||
        c.account_name?.toLowerCase().includes(k) ||
        c.customer_display_name?.toLowerCase().includes(k) ||
        v?.tax_number?.toLowerCase().includes(k)
      );
    });
  }
  if (filters.value.business_type) {
    rows = rows.filter((c) => c.business_type === filters.value.business_type);
  }
  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    const [start, end] = filters.value.dateRange;
    rows = rows.filter((c) => {
      const v = currentVersion(c);
      const d = v?.contract_date;
      if (!d) return false;
      return d >= start && d <= end;
    });
  }
  if (filters.value.onlyWithAttachments) {
    rows = rows.filter((c) => (c.attachments || []).some((a) => ATTACHMENT_ONLY_TYPES.includes(a.attachment_type)));
  }
  // 默认按合同日期倒序（无日期则按 created_at 倒序兜底）
  return [...rows].sort((a, b) => {
    const da = currentVersion(a)?.contract_date || '';
    const db = currentVersion(b)?.contract_date || '';
    if (da && db) return db.localeCompare(da);
    if (da) return -1;
    if (db) return 1;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
});

const uploadVisible = ref(false);
const uploadMode = ref<'contract' | 'attachment'>('contract');
const preselectedContractId = ref<string | null>(null);

function currentVersion(row: ContractWithDetails): ContractVersion | undefined {
  const vers = row.versions || [];
  return vers.find((v) => v.is_current) || vers[vers.length - 1];
}

/** 合同文件（contract_pdf/didox_screenshot），按对应版本的合同日期倒序 */
function contractFiles(row: ContractWithDetails): ContractAttachment[] {
  const atts = (row.attachments || []).filter((a) => CONTRACT_FILE_TYPES.includes(a.attachment_type));
  const vers = row.versions || [];
  const getDate = (a: ContractAttachment) => {
    if (!a.contract_version_id) return '';
    const v = vers.find((x) => x.id === a.contract_version_id);
    return v?.contract_date || '';
  };
  return [...atts].sort((a, b) => (getDate(b) || '').localeCompare(getDate(a) || ''));
}

/** 附件（appendix/agreement/archive_image），按 attachment_date 或解析 remark 中的日期倒序 */
function attachmentFiles(row: ContractWithDetails): ContractAttachment[] {
  const atts = (row.attachments || []).filter((a) => ATTACHMENT_ONLY_TYPES.includes(a.attachment_type));
  const getDate = (a: ContractAttachment): string => {
    if (a.attachment_date) return a.attachment_date;
    const m = a.remark?.match(/日期:([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    return m ? m[1] : '';
  };
  return [...atts].sort((a, b) => (getDate(b) || '').localeCompare(getDate(a) || ''));
}

function pdfAttachmentCount(row: ContractWithDetails): number {
  const atts = row.attachments || [];
  return atts.filter((a) => (a.file_ext || '').toLowerCase() === 'pdf').length;
}

function formatDateOnly(v: string | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('zh-CN');
  } catch {
    return v;
  }
}

function businessTypeLabel(bt: string): string {
  return (BUSINESS_TYPE_LABELS as Record<string, string>)[bt] ?? bt;
}

async function fetchData() {
  loading.value = true;
  try {
    list.value = await fetchContractsWithDetails();
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function applyFilters() {}

function openUpload(mode: 'contract' | 'attachment', contractId?: string) {
  uploadMode.value = mode;
  preselectedContractId.value = contractId ?? null;
  uploadVisible.value = true;
}

function exportData() {
  if (!canManage.value) return;
  const rows = filteredList.value;
  if (!rows.length) {
    ElMessage.warning('暂无可导出的数据');
    return;
  }
  const data = rows.map((c) => {
    const v = currentVersion(c);
    return {
      contract_no: c.contract_no,
      business_type: businessTypeLabel(c.business_type),
      contract_date: v?.contract_date || '',
      account_name: c.account_name || '',
      company_name: v?.company_name || '',
      tax_number: v?.tax_number || '',
      address: v?.address || '',
      bank_name: v?.bank_name || '',
      bank_account: v?.bank_account || '',
      bank_mfo: v?.bank_mfo || '',
      bank_swift: v?.bank_swift || v?.swift_code || '',
      oked_code: v?.oked_code || '',
      director_name: v?.director_name || '',
      producer: v?.producer || '',
      attachments_count: pdfAttachmentCount(c),
    };
  });
  exportToExcel(
    data,
    [
      { key: 'contract_no', label: '合同号' },
      { key: 'business_type', label: '业务类型' },
      { key: 'contract_date', label: '合同日期' },
      { key: 'account_name', label: '账户名称' },
      { key: 'company_name', label: '公司名称' },
      { key: 'tax_number', label: '税号(ИНН)' },
      { key: 'address', label: '地址' },
      { key: 'bank_name', label: '银行' },
      { key: 'bank_account', label: '账号(р/с)' },
      { key: 'bank_mfo', label: '银行代码(МФО)' },
      { key: 'bank_swift', label: 'SWIFT' },
      { key: 'oked_code', label: 'OKED' },
      { key: 'director_name', label: '老板(Директор)' },
      { key: 'producer', label: '制作人' },
      { key: 'attachments_count', label: '合同附件数' },
    ],
    'contracts'
  );
  ElMessage.success(`已导出 ${data.length} 条`);
}

async function viewAttachment(a: ContractAttachment) {
  try {
    const url = await getAttachmentUrl(a.file_path);
    window.open(url, '_blank');
  } catch (e: any) {
    ElMessage.error(e?.message || '获取预览链接失败');
  }
}

async function downloadAttachment(a: ContractAttachment) {
  try {
    const url = await getAttachmentUrl(a.file_path);
    const aEl = document.createElement('a');
    aEl.href = url;
    aEl.download = a.file_name || 'download';
    aEl.target = '_blank';
    aEl.click();
  } catch (e: any) {
    ElMessage.error(e?.message || '获取下载链接失败');
  }
}

onMounted(() => fetchData());

// 编辑合同信息
const editVisible = ref(false);
const saving = ref(false);
const editFormRef = ref<FormInstance>();
const editForm = ref<any>({
  contract_id: '',
  version_id: '',
  contract_no: '',
  business_type: '' as string,
  account_name: '',
  customer_display_name: '',
  contract_date: '',
  company_name: '',
  tax_number: '',
  address: '',
  bank_name: '',
  bank_account: '',
  bank_mfo: '',
  bank_swift: '',
  oked_code: '',
  director_name: '',
  producer: '',
  change_reason: '',
});

const editRules: FormRules = {
  contract_date: [{ required: true, message: '请选择合同日期', trigger: 'change' }],
  company_name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  tax_number: [{ required: true, message: '请输入税号', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  director_name: [{ required: true, message: '请输入老板', trigger: 'blur' }],
  bank_account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  bank_mfo: [{ required: true, message: '请输入银行代码(МФО)', trigger: 'blur' }],
  producer: [{ required: true, message: '请输入制作人', trigger: 'blur' }],
  change_reason: [{ required: true, message: '请输入修订原因', trigger: 'blur' }],
};

function openEdit(row: ContractWithDetails) {
  if (!canManage.value) return;
  const v = currentVersion(row);
  if (!v) {
    ElMessage.warning('暂无可编辑的版本信息');
    return;
  }
  editForm.value = {
    contract_id: row.id,
    version_id: v.id,
    contract_no: row.contract_no,
    business_type: row.business_type,
    account_name: row.account_name || '',
    customer_display_name: row.customer_display_name || '',
    contract_date: v.contract_date || '',
    company_name: v.company_name || '',
    tax_number: v.tax_number || '',
    address: v.address || '',
    bank_name: v.bank_name || '',
    bank_account: v.bank_account || '',
    bank_mfo: v.bank_mfo || '',
    bank_swift: (v as any).bank_swift || (v as any).swift_code || '',
    oked_code: (v as any).oked_code || '',
    director_name: v.director_name || '',
    producer: v.producer || '',
    change_reason: '',
  };
  editVisible.value = true;
  editFormRef.value?.clearValidate();
}

async function saveEdit() {
  if (!canManage.value) return;
  try {
    await editFormRef.value?.validate();
  } catch {
    return;
  }
  const f = editForm.value;
  const reason = String(f.change_reason || '').trim();
  if (!reason) {
    ElMessage.error('修订原因必填');
    return;
  }
  saving.value = true;
  try {
    const { error: e1 } = await supabase
      .from('contracts')
      .update({
        account_name: f.account_name?.trim() || null,
        customer_display_name: f.customer_display_name?.trim() || null,
      })
      .eq('id', f.contract_id);
    if (e1) throw e1;

    const payload: Record<string, any> = {
      contract_date: f.contract_date,
      company_name: String(f.company_name || '').trim(),
      tax_number: String(f.tax_number || '').trim(),
      address: String(f.address || '').trim(),
      bank_name: f.bank_name?.trim() || null,
      bank_account: String(f.bank_account || '').trim() || null,
      bank_mfo: String(f.bank_mfo || '').trim() || null,
      director_name: String(f.director_name || '').trim() || null,
      producer: String(f.producer || '').trim() || null,
      change_reason: reason,
    };
    if (f.business_type === 'export') {
      payload.bank_swift = f.bank_swift?.trim() || null;
      payload.oked_code = f.oked_code?.trim() || null;
    } else {
      payload.bank_swift = null;
      payload.oked_code = null;
    }

    const { error: e2 } = await supabase.from('contract_versions').update(payload).eq('id', f.version_id);
    if (e2) throw e2;

    ElMessage.success('已保存');
    editVisible.value = false;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.contracts-page .erp-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.contracts-page .header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contracts-page .erp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.contracts-page .title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.contracts-page .subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.expand-content {
  padding: 20px 28px;
  background: var(--page-bg);
  border-left: 3px solid var(--erp-primary-light);
}

.expand-section {
  margin-bottom: 20px;
}

.expand-section:last-child {
  margin-bottom: 0;
}

.expand-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.contract-info-dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 24px;
  font-size: 13px;
  margin: 0;
}

.contract-info-dl dt {
  color: var(--text-secondary);
  font-weight: 500;
  margin: 0;
}

.contract-info-dl dd {
  margin: 0;
  color: var(--text-primary);
}

.file-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.expand-empty {
  font-size: 13px;
  color: var(--text-placeholder);
  padding: 8px 0;
}

.expand-actions {
  margin-top: 10px;
}

.form-section {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 18px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.table-empty {
  padding: 40px 0;
}

.erp-table-skeleton {
  padding: 8px 0;
}
</style>
