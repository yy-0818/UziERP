<template>
  <el-dialog
    v-model="dialogVisible"
    :title="contractDialogTitle"
    width="55vw"
    top="8vh"
    :class="['contract-upload-dialog', uploadMode === 'contract' ? 'dialog--contract' : 'dialog--attachment']"
    destroy-on-close
    @closed="reset"
  >
    <div class="upload-mode-tabs">
      <el-radio-group v-model="uploadMode" size="small">
        <el-radio-button value="contract">上传合同</el-radio-button>
        <el-radio-button value="attachment">上传附件</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 上传合同：新建时全部可编辑；从展开行打开时当前合同信息只读，仅可上传文件 -->
    <el-form
      v-if="uploadMode === 'contract'"
      ref="contractFormRef"
      :model="contractForm"
      :rules="isContractAddToExisting ? {} : contractRules"
      label-width="120px"
      label-position="left"
      class="upload-form contract-form"
    >
      <div class="form-section">{{ isContractAddToExisting ? '当前合同信息（只读）' : '业务类型与合同号' }}</div>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="国内/出口：" prop="business_type">
            <el-select v-model="contractForm.business_type" placeholder="请选择" style="width: 100%" :disabled="isContractAddToExisting">
              <el-option v-for="(label, key) in BUSINESS_TYPE_LABELS" :key="key" :label="label" :value="key" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="合同号：" prop="contract_no">
            <el-input v-model="contractForm.contract_no" placeholder="如 ZP20260205A10187" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="账户名称：" prop="account_name">
        <el-input v-model="contractForm.account_name" placeholder="如 1账户_撒马尔罕罗马SKS" :disabled="isContractAddToExisting" />
      </el-form-item>

      <div class="form-section">{{ isContractAddToExisting ? '合同版本信息（只读）' : '合同版本信息' }}</div>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="合同日期：" prop="contract_date">
            <el-date-picker
              v-model="contractForm.contract_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
              :disabled="isContractAddToExisting"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="公司名称：" prop="company_name">
            <el-input v-model="contractForm.company_name" placeholder="如 SAM KERAMIK STROY MCHJ" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="税号(ИНН)：" prop="tax_number">
            <el-input v-model="contractForm.tax_number" placeholder="如 305934029" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="老板：" prop="director_name">
            <el-input v-model="contractForm.director_name" placeholder="必填" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="地址：" prop="address">
        <el-input v-model="contractForm.address" type="textarea" :rows="2" placeholder="必填" :disabled="isContractAddToExisting" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="账号：" prop="bank_account">
            <el-input v-model="contractForm.bank_account" placeholder="必填" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="银行代码：" prop="bank_mfo">
            <el-input v-model="contractForm.bank_mfo" placeholder="必填" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="银行：">
            <el-input v-model="contractForm.bank_name" placeholder="选填" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
      </el-row>
      <!-- 出口合同专属：SWIFT、OKED -->
      <el-row v-if="contractForm.business_type === 'export'" :gutter="20">
        <el-col :span="12">
          <el-form-item label="SWIFT：" prop="bank_swift">
            <el-input v-model="contractForm.bank_swift" placeholder="出口合同填写，如 - 或 SWIFT 代码" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="OKED：" prop="oked_code">
            <el-input v-model="contractForm.oked_code" placeholder="出口合同行业代码" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="制作人：" prop="producer">
            <el-input v-model="contractForm.producer" placeholder="必填" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="修订原因：" prop="change_reason">
            <el-input v-model="contractForm.change_reason" placeholder="必填" :disabled="isContractAddToExisting" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="form-section">合同文件（PDF + 配图，可多选）</div>
      <div v-for="(item, idx) in contractFileList" :key="idx" class="file-row">
        <el-select v-model="item.attachmentType" placeholder="类型" style="width: 120px">
          <el-option
            v-for="t in CONTRACT_FILE_TYPES"
            :key="t"
            :label="ATTACHMENT_TYPE_LABELS[t]"
            :value="t"
          />
        </el-select>
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          :on-change="(e: any) => (item.file = e.raw)"
          accept=".pdf,.png,.jpg,.jpeg"
        >
          <el-button size="small" type="primary" plain>{{ item.file ? item.file.name : '选择文件' }}</el-button>
        </el-upload>
        <el-button size="small" text type="danger" @click="removeContractFile(idx)">删除</el-button>
      </div>
      <el-button size="small" type="primary" link @click="addContractFile">+ 添加文件</el-button>
    </el-form>

    <!-- 上传附件：从展开行打开时为当前合同补传附件（合同只读）；从顶栏打开时需选择合同 -->
    <el-form
      v-else
      ref="attachmentFormRef"
      :model="attachmentForm"
      :rules="attachmentRules"
      label-width="120px"
      label-position="left"
      class="upload-form attachment-form"
    >
      <div class="form-section">{{ isAttachmentAddToExisting ? '当前合同（只读）' : '指定合同' }}</div>
      <el-form-item label="选择合同" prop="contractId">
        <el-select
          v-model="attachmentForm.contractId"
          placeholder="请先选择合同"
          filterable
          style="width: 100%"
          :disabled="isAttachmentAddToExisting"
          @change="onContractChange"
        >
          <el-option
            v-for="c in contractList"
            :key="c.id"
            :label="`${c.contract_no} ${c.account_name || ''}（${BUSINESS_TYPE_LABELS[c.business_type]}）`"
            :value="c.id"
          />
        </el-select>
      </el-form-item>

      <div class="form-section">附件信息（日期、编号等）</div>
      <el-form-item label="合同源编号">
        <el-input :model-value="selectedContractSourceNo" disabled placeholder="选择合同后自动带出" />
      </el-form-item>
      <el-form-item label="账号名称">
        <el-input :model-value="selectedAccountName" disabled placeholder="选择合同后自动带出" />
      </el-form-item>
      <el-form-item label="客户税号">
        <el-input :model-value="selectedTaxNumber" disabled placeholder="选择合同后自动带出" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="日期" prop="attachmentDate">
            <el-date-picker
              v-model="attachmentForm.attachmentDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="必填"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="附件编号" prop="attachmentNo">
            <el-input v-model="attachmentForm.attachmentNo" placeholder="必填" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="form-section">附件文件（订单 PDF / 配图 / 存档图片，可多选）</div>
      <div v-for="(item, idx) in attachmentFileList" :key="idx" class="file-row">
        <el-select v-model="item.attachmentType" placeholder="类型" style="width: 120px">
          <el-option
            v-for="t in ATTACHMENT_ONLY_TYPES"
            :key="t"
            :label="ATTACHMENT_TYPE_LABELS[t]"
            :value="t"
          />
        </el-select>
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          :on-change="(e: any) => onAttachmentFileChange(idx, e.raw)"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
        >
          <el-button size="small" type="primary" plain>{{ item.file ? item.file.name : '选择文件' }}</el-button>
        </el-upload>
        <el-button size="small" text type="danger" @click="removeAttachmentFile(idx)">删除</el-button>
      </div>
      <el-button size="small" type="primary" link @click="addAttachmentFile">+ 添加文件</el-button>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="uploading" @click="submit">提交</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import {
  ATTACHMENT_TYPE_LABELS,
  BUSINESS_TYPE_LABELS,
  CONTRACT_FILE_TYPES,
  ATTACHMENT_ONLY_TYPES,
} from '../types';
import type { ContractWithDetails } from '../types';
import type { AttachmentType } from '../types';
import { createContractWithFiles, uploadContractFiles, uploadAttachmentFiles } from '../api';

const props = defineProps<{
  visible: boolean;
  mode: 'contract' | 'attachment';
  contractList: ContractWithDetails[];
  preselectedContractId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'uploaded'): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});

const uploadMode = ref<'contract' | 'attachment'>(props.mode);

watch(() => props.mode, (m) => { uploadMode.value = m; });

/** 从展开行打开时为当前合同补传文件：表单只读，仅上传文件 */
const isContractAddToExisting = computed(
  () => uploadMode.value === 'contract' && !!props.preselectedContractId
);

const contractDialogTitle = computed(() => {
  if (uploadMode.value === 'attachment') return isAttachmentAddToExisting.value ? '附件补传文件' : '上传附件';
  return isContractAddToExisting.value ? '为当前合同补传文件' : '上传新合同';
});

/** 从展开行打开时为当前合同补传附件：合同不可改，仅填日期/编号并上传文件 */
const isAttachmentAddToExisting = computed(
  () => uploadMode.value === 'attachment' && !!props.preselectedContractId
);

/** 当前选中的合同（用于合同表单预填，或附件表单只读信息） */
const selectedContractForContract = computed(() => {
  if (!props.preselectedContractId || uploadMode.value !== 'contract') return null;
  return props.contractList.find((c) => c.id === props.preselectedContractId) ?? null;
});

const contractFormRef = ref<FormInstance>();
const attachmentFormRef = ref<FormInstance>();

const contractForm = ref({
  business_type: '' as 'uz_domestic' | 'export' | '',
  contract_no: '',
  account_name: '',
  contract_date: '',
  company_name: '',
  tax_number: '',
  address: '',
  bank_name: '',
  bank_account: '',
  bank_mfo: '',
  bank_swift: '' as string,
  oked_code: '' as string,
  director_name: '',
  producer: '',
  change_reason: '',
});

const emptyContractForm = () => ({
  business_type: '' as 'uz_domestic' | 'export' | '',
  contract_no: '',
  account_name: '',
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

const contractRules: FormRules = {
  business_type: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  contract_no: [{ required: true, message: '请输入合同号', trigger: 'blur' }],
  account_name: [{ required: true, message: '请输入账户名称', trigger: 'blur' }],
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

interface FileItem {
  attachmentType: AttachmentType;
  file: File | null;
}

const contractFileList = ref<FileItem[]>([]);
const attachmentFileList = ref<FileItem[]>([]);

const attachmentForm = ref({
  contractId: '' as string,
  attachmentDate: '' as string,
  attachmentNo: '' as string,
});

const attachmentRules: FormRules = {
  contractId: [{ required: true, message: '请选择合同', trigger: 'change' }],
  attachmentDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  attachmentNo: [{ required: true, message: '请输入附件编号', trigger: 'blur' }],
};

const uploading = ref(false);

const contractList = computed(() => props.contractList);

const selectedContract = computed(() => {
  if (!attachmentForm.value.contractId) return null;
  return props.contractList.find((c) => c.id === attachmentForm.value.contractId) ?? null;
});

const selectedContractSourceNo = computed(() => selectedContract.value?.contract_no ?? '');
const selectedAccountName = computed(() => selectedContract.value?.account_name ?? '');
const selectedTaxNumber = computed(() => {
  const c = selectedContract.value;
  const v = c?.versions?.find((x) => x.is_current) ?? c?.versions?.[c.versions.length - 1];
  return v?.tax_number ?? '';
});

watch(
  () => props.preselectedContractId,
  (id) => { if (id) attachmentForm.value.contractId = id; },
  { immediate: true }
);

watch(
  () => props.visible,
  (v) => {
    if (v) {
      uploadMode.value = props.mode;
      if (props.preselectedContractId) attachmentForm.value.contractId = props.preselectedContractId;
      if (uploadMode.value === 'contract') {
        if (isContractAddToExisting.value && selectedContractForContract.value) {
          const c = selectedContractForContract.value;
          const ver = c.versions?.find((x) => x.is_current) ?? c.versions?.[c.versions.length - 1];
          if (ver) {
            contractForm.value = {
              business_type: c.business_type,
              contract_no: c.contract_no,
              account_name: c.account_name ?? '',
              contract_date: ver.contract_date,
              company_name: ver.company_name,
              tax_number: ver.tax_number,
              address: ver.address ?? '',
              bank_name: ver.bank_name ?? '',
              bank_account: ver.bank_account ?? '',
              bank_mfo: ver.bank_mfo ?? '',
              bank_swift: ver.bank_swift ?? ver.swift_code ?? '',
              oked_code: ver.oked_code ?? '',
              director_name: ver.director_name ?? '',
              producer: ver.producer ?? '',
              change_reason: ver.change_reason ?? '',
            };
          }
        } else if (!props.preselectedContractId) {
          contractForm.value = emptyContractForm();
        }
        if (contractFileList.value.length === 0) addContractFile();
      }
      if (uploadMode.value === 'attachment' && attachmentFileList.value.length === 0) addAttachmentFile();
    }
  }
);

function onContractChange() {}

/** 附件文件选择时：若为 PDF 且附件编号为空，则用文件名（去扩展名）自动填充 */
function onAttachmentFileChange(idx: number, file: File | null) {
  const item = attachmentFileList.value[idx];
  if (item) item.file = file;
  if (file && /\.pdf$/i.test(file.name) && !attachmentForm.value.attachmentNo?.trim()) {
    const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
    attachmentForm.value.attachmentNo = nameWithoutExt;
  }
}

function addContractFile() {
  contractFileList.value.push({ attachmentType: 'contract_pdf', file: null });
}
function removeContractFile(idx: number) {
  contractFileList.value.splice(idx, 1);
}
function addAttachmentFile() {
  attachmentFileList.value.push({ attachmentType: 'appendix', file: null });
}
function removeAttachmentFile(idx: number) {
  attachmentFileList.value.splice(idx, 1);
}

function reset() {
  contractForm.value = emptyContractForm();
  contractFileList.value = [];
  attachmentForm.value = {
    contractId: props.preselectedContractId || '',
    attachmentDate: '',
    attachmentNo: '',
  };
  attachmentFileList.value = [];
  contractFormRef.value?.clearValidate();
  attachmentFormRef.value?.clearValidate();
}

async function submit() {
  if (uploadMode.value === 'contract') {
    const valid = contractFileList.value.filter((x) => x.file);
    if (!valid.length) {
      ElMessage.warning('请至少添加一个合同文件（PDF 或图片）');
      return;
    }
    if (!isContractAddToExisting.value) {
      try {
        await contractFormRef.value?.validate();
      } catch {
        return;
      }
    }
    uploading.value = true;
    try {
      if (isContractAddToExisting.value && props.preselectedContractId) {
        await uploadContractFiles({
          contractId: props.preselectedContractId,
          files: valid.map((x) => ({
            attachmentType: x.attachmentType,
            logicalName: x.file!.name,
            file: x.file!,
          })),
        });
        ElMessage.success('合同文件补传成功');
      } else {
        await createContractWithFiles({
          contract_no: contractForm.value.contract_no.trim(),
          business_type: contractForm.value.business_type as 'uz_domestic' | 'export',
          account_name: contractForm.value.account_name.trim(),
          contract_date: contractForm.value.contract_date,
          company_name: contractForm.value.company_name.trim(),
          tax_number: contractForm.value.tax_number.trim(),
          address: contractForm.value.address.trim(),
          bank_name: contractForm.value.bank_name?.trim() || null,
          bank_account: contractForm.value.bank_account?.trim() || null,
          bank_mfo: contractForm.value.bank_mfo?.trim() || null,
          bank_swift: contractForm.value.business_type === 'export' ? (contractForm.value.bank_swift?.trim() || null) : null,
          oked_code: contractForm.value.business_type === 'export' ? (contractForm.value.oked_code?.trim() || null) : null,
          director_name: contractForm.value.director_name.trim(),
          producer: contractForm.value.producer.trim(),
          change_reason: contractForm.value.change_reason.trim(),
          files: valid.map((x) => ({
            attachmentType: x.attachmentType,
            logicalName: x.file!.name,
            file: x.file!,
          })),
        });
        ElMessage.success('合同创建并上传成功');
      }
      emit('uploaded');
      dialogVisible.value = false;
    } catch (e: any) {
      ElMessage.error(e?.message || '提交失败');
    } finally {
      uploading.value = false;
    }
    return;
  }

  try {
    await attachmentFormRef.value?.validate();
  } catch {
    return;
  }
  const valid = attachmentFileList.value.filter((x) => x.file);
  if (!valid.length) {
    ElMessage.warning('请至少添加一个附件文件');
    return;
  }
  uploading.value = true;
  try {
    await uploadAttachmentFiles({
      contractId: attachmentForm.value.contractId,
      attachmentDate: attachmentForm.value.attachmentDate || undefined,
      attachmentNo: attachmentForm.value.attachmentNo.trim() || undefined,
      files: valid.map((x) => ({
        attachmentType: x.attachmentType,
        logicalName: x.file!.name,
        file: x.file!,
      })),
    });
    ElMessage.success('附件上传成功');
    emit('uploaded');
    dialogVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
.upload-mode-tabs {
  margin-bottom: 20px;
}

.form-section {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 18px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.form-section:first-of-type {
  margin-top: 0;
}

.upload-form {
  max-height: 62vh;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
}

.upload-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.upload-form :deep(.el-input),
.upload-form :deep(.el-select) {
  width: 100%;
}

.upload-form :deep(.el-row) {
  margin-left: 0;
  margin-right: 0;
}

.upload-form :deep(.el-col) {
  padding-left: 10px;
  padding-right: 10px;
  min-width: 0;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.file-row > * {
  min-width: 0;
  flex-shrink: 0;
}

.file-row .el-input {
  max-width: 140px;
}

.attachment-form :deep(.el-input.is-disabled .el-input__inner) {
  color: var(--text-secondary);
}

.contract-upload-dialog.dialog--contract :deep(.el-dialog) {
  max-width: 680px;
}

.contract-upload-dialog.dialog--attachment :deep(.el-dialog) {
  max-width: 520px;
}

.contract-upload-dialog :deep(.el-dialog__body) {
  overflow-x: hidden;
  padding-right: 16px;
}
</style>
