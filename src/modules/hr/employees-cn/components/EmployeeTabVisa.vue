<template>
  <div class="tab-wrap">
    <div v-if="canManage" class="tab-actions">
      <el-button type="primary" size="small" @click="openApply">申请签证</el-button>
    </div>
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="application_type" label="类型" min-width="100" />
      <el-table-column prop="expected_departure_at" label="预计出发" width="110">
        <template #default="{ row }">{{ formatDate(row.expected_departure_at) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <template v-if="row.status === 'pending' && canManage">
            <el-button link type="primary" size="small" @click="openHandle(row)">办理</el-button>
          </template>
          <template v-else-if="row.status === 'done'">
            <el-button link type="primary" size="small" @click="viewHandle(row)">查看</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无签证记录" />
    <el-dialog v-model="applyVisible" title="申请签证" width="440px" append-to-body>
      <el-form ref="applyFormRef" :model="applyForm" label-width="100px">
        <el-form-item label="申请类型">
          <el-input v-model="applyForm.application_type" placeholder="如：旅游签、工作签" />
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
    <el-dialog v-model="handleVisible" title="办理签证" width="520px" append-to-body>
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
        <el-form-item label="签证照片路径">
          <el-input v-model="handleForm.visa_image_url" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitHandle">保存</el-button>
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
  hasInvitationHandled,
} from '../api';
import type { VisaApplication } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();
const auth = useAuthStore();
const submittedBy = computed(() => auth.email || null);

const list = ref<VisaApplication[]>([]);
const loading = ref(false);
const applyVisible = ref(false);
const saving = ref(false);
const handleVisible = ref(false);
const applyForm = ref({ application_type: '', expected_departure_at: null as string | null });
const handleForm = ref({
  effective_date: null as string | null,
  expiry_date: null as string | null,
  visa_times: null as number | null,
  remaining_times: null as number | null,
  fee_amount: null as number | null,
  issuer_company: null as string | null,
  visa_image_url: null as string | null,
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
    list.value = await fetchVisaApplications(props.employeeId);
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
  currentApply.value = row;
  handleForm.value = {
    effective_date: null,
    expiry_date: null,
    visa_times: null,
    remaining_times: null,
    fee_amount: null,
    issuer_company: null,
    visa_image_url: null,
  };
  handleVisible.value = true;
}

async function submitHandle() {
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

function viewHandle(row: VisaApplication) {
  ElMessage.info('查看办理结果可在签证流程页操作');
}
</script>

<style scoped>
.tab-wrap { padding: 0; }
.tab-actions { margin-bottom: 0; display: flex; gap: 8px; }
</style>
