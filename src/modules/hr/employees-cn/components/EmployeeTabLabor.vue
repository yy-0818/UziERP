<template>
  <div class="tab-wrap">
    <div v-if="canManage" class="tab-actions">
      <el-button type="primary" size="small" @click="openApply">申请劳动许可</el-button>
    </div>
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="application_date" label="申请日期" width="110">
        <template #default="{ row }">{{ formatDate(row.application_date) }}</template>
      </el-table-column>
      <el-table-column prop="application_content" label="申请内容" min-width="120" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <template v-if="row.status === 'pending' && canManage">
            <el-button link type="primary" size="small" @click="openHandle(row)">办理</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无劳动许可记录" />
    <el-dialog v-model="applyVisible" title="申请劳动许可" width="480px" append-to-body>
      <el-form ref="applyFormRef" :model="applyForm" label-width="100px">
        <el-form-item label="申请日期">
          <el-date-picker v-model="applyForm.application_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="申请内容">
          <el-input v-model="applyForm.application_content" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="申请人">
          <el-input v-model="applyForm.applicant" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitApply">提交</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="handleVisible" title="办理劳动许可" width="480px" append-to-body>
      <el-form ref="handleFormRef" :model="handleForm" label-width="100px">
        <el-form-item label="出证时间">
          <el-date-picker v-model="handleForm.permit_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker v-model="handleForm.effective_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="失效日期">
          <el-date-picker v-model="handleForm.expiry_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="费用">
          <el-input-number v-model="handleForm.fee_amount" :min="0" :precision="2" style="width: 100%" />
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
  fetchLaborPermitApplications,
  createLaborPermitApplication,
  createLaborPermitHandle,
} from '../api';
import type { LaborPermitApplication } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();
const auth = useAuthStore();
const applicantValue = computed(() => auth.email || null);

const list = ref<LaborPermitApplication[]>([]);
const loading = ref(false);
const applyVisible = ref(false);
const saving = ref(false);
const handleVisible = ref(false);
const applyForm = ref({
  application_date: null as string | null,
  application_content: '',
  applicant: '',
});
const handleForm = ref({
  permit_date: null as string | null,
  effective_date: null as string | null,
  expiry_date: null as string | null,
  fee_amount: null as number | null,
});
const currentApply = ref<LaborPermitApplication | null>(null);

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('zh-CN');
}

async function load() {
  if (!props.employeeId) return;
  loading.value = true;
  try {
    list.value = await fetchLaborPermitApplications(props.employeeId);
  } finally {
    loading.value = false;
  }
}

watch(() => props.employeeId, load, { immediate: true });

function openApply() {
  applyForm.value = {
    application_date: new Date().toISOString().slice(0, 10),
    application_content: '',
    applicant: '',
  };
  applyVisible.value = true;
}

async function submitApply() {
  saving.value = true;
  try {
    await createLaborPermitApplication({
      employee_id: props.employeeId,
      application_date: applyForm.value.application_date,
      application_content: applyForm.value.application_content || null,
      applicant: applyForm.value.applicant || applicantValue.value,
      image_url: null,
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

function openHandle(row: LaborPermitApplication) {
  currentApply.value = row;
  handleForm.value = {
    permit_date: null,
    effective_date: null,
    expiry_date: null,
    fee_amount: null,
  };
  handleVisible.value = true;
}

async function submitHandle() {
  if (!currentApply.value) return;
  saving.value = true;
  try {
    await createLaborPermitHandle({
      application_id: currentApply.value.id,
      permit_date: handleForm.value.permit_date,
      effective_date: handleForm.value.effective_date,
      expiry_date: handleForm.value.expiry_date,
      fee_amount: handleForm.value.fee_amount,
      image_url: null,
      operator: auth.user?.email ?? auth.email ?? null,
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
</script>

<style scoped>
.tab-wrap { padding: 0; }
.tab-actions { margin-bottom: 0; display: flex; gap: 8px; }
</style>
