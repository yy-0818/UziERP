<template>
  <div class="tab-wrap">
    <div v-if="canManage" class="tab-actions">
      <el-button type="primary" size="small" @click="openApply">申请签证</el-button>
    </div>
    <!-- 当前有效签证：次数/剩余/已消耗 实时显示 -->
    <div v-if="validVisas.length" class="visa-summary-section">
      <div class="visa-summary-title">当前有效签证</div>
      <el-table :data="validVisas" size="small" stripe border>
        <el-table-column prop="effective_date" label="生效日" width="110">
          <template #default="{ row }">{{ formatDate(row.effective_date) }}</template>
        </el-table-column>
        <el-table-column prop="expiry_date" label="失效日" width="110">
          <template #default="{ row }">{{ formatDate(row.expiry_date) }}</template>
        </el-table-column>
        <el-table-column label="签证次数" width="90" align="center">
          <template #default="{ row }">{{ row.visa_times ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="剩余次数" width="90" align="center">
          <template #default="{ row }">{{ row.remaining_times === -1 ? '无限' : (row.remaining_times ?? '—') }}</template>
        </el-table-column>
        <el-table-column label="已消耗次数" width="100" align="center">
          <template #default="{ row }">
            {{ row.remaining_times === -1 ? '—' : ((row.visa_times ?? 0) - (row.remaining_times ?? 0)) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="application_type" label="类型" min-width="100" />
      <el-table-column prop="expected_departure_at" label="预计出发" width="110">
        <template #default="{ row }">{{ formatDate(row.expected_departure_at) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <template v-if="row.status === 'pending' && canManage">
            <el-button link type="primary" size="small" @click="openHandle(row)">办理</el-button>
          </template>
          <template v-if="row.status === 'done'">
            <el-button link type="primary" size="small" @click="viewHandle(row)">查看</el-button>
            <el-button v-if="canManage" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无签证记录" />

    <!-- 申请签证 -->
    <el-dialog v-model="applyVisible" title="申请签证" width="440px" append-to-body>
      <el-form ref="applyFormRef" :model="applyForm" label-width="100px">
        <el-form-item label="申请类型">
          <el-select v-model="applyForm.application_type" filterable allow-create placeholder="请选择或输入" style="width: 100%">
            <el-option v-for="opt in VISA_TYPE_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计出发时间">
          <el-date-picker v-model="applyForm.expected_departure_at" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitApply">提交</el-button>
      </template>
    </el-dialog>

    <!-- 办理/编辑签证 -->
    <el-dialog v-model="handleVisible" :title="isEditMode ? '编辑签证' : '办理签证'" width="520px" append-to-body @close="isEditMode = false; currentEditHandleId = null">
      <el-form ref="handleFormRef" :model="handleForm" label-width="100px">
        <el-form-item label="生效日期">
          <el-date-picker v-model="handleForm.effective_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="失效日期">
          <el-date-picker v-model="handleForm.expiry_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="签证次数">
          <el-input-number v-model="handleForm.visa_times" :min="1" placeholder="单次填1，多次可填-1表示无限" style="width: 100%" />
        </el-form-item>
        <el-form-item label="剩余次数">
          <el-input-number v-model="handleForm.remaining_times" :min="-1" placeholder="-1表示无限" style="width: 100%" />
        </el-form-item>
        <el-form-item label="费用">
          <el-input-number v-model="handleForm.fee_amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="出证公司">
          <el-input v-model="handleForm.issuer_company" />
        </el-form-item>
        <el-form-item label="签证附件">
          <div class="form-attachment-upload">
            <el-upload :show-file-list="false" :http-request="handleVisaAttachmentUpload">
              <el-button type="primary" plain size="small">上传附件</el-button>
            </el-upload>
            <el-button v-if="handleForm.visa_image_url" type="danger" link size="small" @click="handleForm.visa_image_url = null">清除</el-button>
            <span v-if="handleForm.visa_image_url" class="attachment-hint">已选文件</span>
          </div>
        </el-form-item>
        <el-form-item label="小白条地址">
          <el-input v-model="handleForm.address_slip" type="textarea" :rows="2" placeholder="落地塔什干后3天内需填写地址信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitHandle">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情 -->
    <el-dialog v-model="viewDialogVisible" title="签证办理详情" width="480px" append-to-body @close="viewHandleData = null">
      <template v-if="viewHandleData">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="生效日期">{{ formatDate(viewHandleData.effective_date) }}</el-descriptions-item>
          <el-descriptions-item label="失效日期">{{ formatDate(viewHandleData.expiry_date) }}</el-descriptions-item>
          <el-descriptions-item label="签证次数">{{ viewHandleData.visa_times ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="剩余次数">{{ viewHandleData.remaining_times === -1 ? '无限' : (viewHandleData.remaining_times ?? '—') }}</el-descriptions-item>
          <el-descriptions-item label="已消耗次数">{{ viewHandleData.remaining_times === -1 ? '—' : ((viewHandleData.visa_times ?? 0) - (viewHandleData.remaining_times ?? 0)) }}</el-descriptions-item>
          <el-descriptions-item label="费用">{{ viewHandleData.fee_amount != null ? viewHandleData.fee_amount : '—' }}</el-descriptions-item>
          <el-descriptions-item label="出证公司">{{ viewHandleData.issuer_company || '—' }}</el-descriptions-item>
          <el-descriptions-item label="签证附件">
            <el-button v-if="viewHandleData.visa_image_url" link type="primary" size="small" @click="openAttachment(viewHandleData.visa_image_url!)">查看/下载</el-button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="小白条地址">{{ viewHandleData.address_slip || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../../../stores/auth';
import {
  fetchVisaApplications,
  fetchVisaHandleByApplicationId,
  createVisaApplication,
  createVisaHandle,
  updateVisaHandle,
  hasInvitationHandled,
  fetchValidVisasForEmployee,
  uploadEmployeeFile,
  getSignedUrl,
} from '../api';
import type { VisaApplication, VisaHandle } from '../types';
import { VISA_TYPE_OPTIONS } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();
const auth = useAuthStore();
const submittedBy = computed(() => auth.email || null);

const list = ref<VisaApplication[]>([]);
const validVisas = ref<VisaHandle[]>([]);
const loading = ref(false);
const applyVisible = ref(false);
const saving = ref(false);
const handleVisible = ref(false);
const isEditMode = ref(false);
const currentEditHandleId = ref<string | null>(null);
const applyForm = ref({ application_type: '', expected_departure_at: null as string | null });
const handleForm = ref({
  effective_date: null as string | null,
  expiry_date: null as string | null,
  visa_times: null as number | null,
  remaining_times: null as number | null,
  fee_amount: null as number | null,
  issuer_company: null as string | null,
  visa_image_url: null as string | null,
  address_slip: null as string | null,
});
const currentApply = ref<VisaApplication | null>(null);

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('zh-CN');
}

async function load() {
  if (!props.employeeId) return;
  loading.value = true;
  try {
    const [apps, visas] = await Promise.all([
      fetchVisaApplications(props.employeeId),
      fetchValidVisasForEmployee(props.employeeId),
    ]);
    list.value = apps;
    validVisas.value = visas;
  } finally {
    loading.value = false;
  }
}

watch(() => props.employeeId, load, { immediate: true });

function openApply() {
  applyForm.value = { application_type: '', expected_departure_at: null };
  applyVisible.value = true;
}

async function submitApply() {
  saving.value = true;
  try {
    await createVisaApplication({
      employee_id: props.employeeId,
      application_type: applyForm.value.application_type || null,
      expected_departure_at: applyForm.value.expected_departure_at,
      submitted_by: submittedBy.value,
    });
    ElMessage.success('申请已提交');
    applyVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

function openHandle(row: VisaApplication) {
  isEditMode.value = false;
  currentEditHandleId.value = null;
  currentApply.value = row;
  handleForm.value = {
    effective_date: null,
    expiry_date: null,
    visa_times: null,
    remaining_times: null,
    fee_amount: null,
    issuer_company: null,
    visa_image_url: null,
    address_slip: null,
  };
  handleVisible.value = true;
}

async function openEdit(row: VisaApplication) {
  const h = await fetchVisaHandleByApplicationId(row.id);
  if (!h) {
    ElMessage.warning('未找到办理记录');
    return;
  }
  isEditMode.value = true;
  currentEditHandleId.value = h.id;
  currentApply.value = row;
  handleForm.value = {
    effective_date: h.effective_date,
    expiry_date: h.expiry_date,
    visa_times: h.visa_times,
    remaining_times: h.remaining_times,
    fee_amount: h.fee_amount,
    issuer_company: h.issuer_company,
    visa_image_url: h.visa_image_url,
    address_slip: h.address_slip ?? null,
  };
  handleVisible.value = true;
}

async function submitHandle() {
  if (isEditMode.value && currentEditHandleId.value) {
    saving.value = true;
    try {
      await updateVisaHandle(currentEditHandleId.value, {
        effective_date: handleForm.value.effective_date,
        expiry_date: handleForm.value.expiry_date,
        visa_times: handleForm.value.visa_times,
        remaining_times: handleForm.value.remaining_times,
        fee_amount: handleForm.value.fee_amount,
        issuer_company: handleForm.value.issuer_company,
        visa_image_url: handleForm.value.visa_image_url,
        address_slip: handleForm.value.address_slip,
        operator: submittedBy.value,
      });
      ElMessage.success('已保存');
      handleVisible.value = false;
      isEditMode.value = false;
      currentEditHandleId.value = null;
      await load();
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败');
    } finally {
      saving.value = false;
    }
    return;
  }

  if (!currentApply.value) return;
  const hasInv = await hasInvitationHandled(props.employeeId);
  if (!hasInv) {
    ElMessage.warning('办理签证前需先有已办理的邀请函');
    return;
  }
  saving.value = true;
  try {
    const rt = handleForm.value.remaining_times ?? handleForm.value.visa_times ?? 1;
    await createVisaHandle({
      application_id: currentApply.value.id,
      effective_date: handleForm.value.effective_date,
      expiry_date: handleForm.value.expiry_date,
      visa_times: handleForm.value.visa_times,
      remaining_times: rt,
      visa_image_url: handleForm.value.visa_image_url,
      fee_amount: handleForm.value.fee_amount,
      issuer_company: handleForm.value.issuer_company,
      address_slip: handleForm.value.address_slip,
      operator: submittedBy.value,
    });
    ElMessage.success('办理完成');
    handleVisible.value = false;
    currentApply.value = null;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

const viewDialogVisible = ref(false);
const viewHandleData = ref<VisaHandle | null>(null);

async function viewHandle(row: VisaApplication) {
  const h = await fetchVisaHandleByApplicationId(row.id);
  if (!h) {
    ElMessage.warning('未找到办理记录');
    return;
  }
  viewHandleData.value = h;
  viewDialogVisible.value = true;
}

async function handleVisaAttachmentUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('visa', options.file.name, options.file);
    handleForm.value.visa_image_url = path;
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}

async function openAttachment(path: string) {
  try {
    const url = await getSignedUrl(path);
    window.open(url, '_blank');
  } catch {
    ElMessage.warning('无法打开附件');
  }
}
</script>

<style scoped>
.tab-wrap { padding: 0; }
.tab-actions { margin-bottom: 0; display: flex; gap: 8px; }
.visa-summary-section { margin-bottom: 16px; }
.visa-summary-title { font-weight: 600; margin-bottom: 8px; color: var(--el-text-color-primary); }
.form-attachment-upload { display: flex; align-items: center; gap: 8px; }
.attachment-hint { font-size: 12px; color: var(--el-text-color-secondary); }
.form-hint { font-size: 12px; color: var(--el-text-color-placeholder); margin-top: 4px; }
</style>
