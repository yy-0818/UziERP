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
            <el-button type="primary" @click="openUpload('contract')">上传合同</el-button>
            <el-button @click="openUpload('attachment')">上传附件</el-button>
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
                  <dt>税号(ИНН)：</dt><dd>{{ currentVersion(row)!.tax_number }}</dd>
                  <dt>老板(Директор)：</dt><dd>{{ currentVersion(row)!.director_name || '—' }}</dd>
                  <dt>制作人：</dt><dd>{{ currentVersion(row)!.producer || '—' }}</dd>
                </dl>
                <div v-else class="expand-empty">暂无版本信息</div>
              </div>
              <div class="expand-section">
                <div class="expand-section-title">合同
                  <el-button type="primary" link size="small" @click="openUpload('contract', row.id)">+ 上传合同</el-button>
                </div>
                <div class="file-tags">
                  <template v-for="a in contractFiles(row)" :key="a.id">
                    <el-tag size="small" class="file-tag">
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
                  <el-button type="primary" link size="small" @click="openUpload('attachment', row.id)">+ 上传附件</el-button>
                </div>
                <div class="file-tags">
                  <template v-for="a in attachmentFiles(row)" :key="a.id">
                    <el-tag size="small" class="file-tag">
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
        <el-table-column label="合同日期" width="110">
          <template #default="{ row }">{{ formatDateOnly(currentVersion(row)?.contract_date) }}</template>
        </el-table-column>
        <el-table-column prop="contract_no" label="合同号" min-width="140" show-overflow-tooltip />
        <el-table-column label="税号" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ currentVersion(row)?.tax_number || '—' }}</template>
        </el-table-column>
        <el-table-column label="账户" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.account_name || row.customer_display_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="business_type" label="业务类型" width="96">
          <template #default="{ row }">{{ businessTypeLabel(row.business_type) }}</template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { fetchContractsWithDetails, getAttachmentUrl } from './api';
import { BUSINESS_TYPE_LABELS, formatContractDate, CONTRACT_FILE_TYPES, ATTACHMENT_ONLY_TYPES } from './types';
import type { ContractWithDetails, ContractVersion, ContractAttachment } from './types';
import ContractUploadDialog from './components/ContractUploadDialog.vue';

const list = ref<ContractWithDetails[]>([]);
const loading = ref(false);
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
  return rows;
});

const uploadVisible = ref(false);
const uploadMode = ref<'contract' | 'attachment'>('contract');
const preselectedContractId = ref<string | null>(null);

function currentVersion(row: ContractWithDetails): ContractVersion | undefined {
  const vers = row.versions || [];
  return vers.find((v) => v.is_current) || vers[vers.length - 1];
}

function contractFiles(row: ContractWithDetails): ContractAttachment[] {
  return (row.attachments || []).filter((a) => CONTRACT_FILE_TYPES.includes(a.attachment_type));
}

function attachmentFiles(row: ContractWithDetails): ContractAttachment[] {
  return (row.attachments || []).filter((a) => ATTACHMENT_ONLY_TYPES.includes(a.attachment_type));
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

.table-empty {
  padding: 40px 0;
}

.erp-table-skeleton {
  padding: 8px 0;
}
</style>
