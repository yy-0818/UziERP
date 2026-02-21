<template>
  <div class="tab-wrap">
    <div v-if="canManage" class="tab-actions">
      <el-button type="primary" size="small" @click="openApply">申请机票</el-button>
    </div>
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="depart_city" label="出发城市" min-width="100" />
      <el-table-column prop="arrive_city" label="到达城市" min-width="100" />
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
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无机票记录" />
    <el-dialog v-model="applyVisible" title="申请机票" width="480px" append-to-body>
      <el-alert v-if="!validVisas.length && canManage" type="warning" :closable="false" style="margin-bottom: 12px">
        当前无有效签证（或剩余次数为0），请先办理签证后再申请机票。
      </el-alert>
      <el-form ref="applyFormRef" :model="applyForm" label-width="100px">
        <el-form-item label="出发城市">
          <el-input v-model="applyForm.depart_city" />
        </el-form-item>
        <el-form-item label="到达城市">
          <el-input v-model="applyForm.arrive_city" />
        </el-form-item>
        <el-form-item label="预计出发时间">
          <el-date-picker v-model="applyForm.expected_departure_at" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="applyForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!validVisas.length" @click="submitApply">提交</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="handleVisible" title="办理机票" width="520px" append-to-body>
      <el-form ref="handleFormRef" :model="handleForm" label-width="100px">
        <el-form-item label="使用签证">
          <el-select v-model="handleForm.visa_handle_id" placeholder="必选" style="width: 100%">
            <el-option
              v-for="v in validVisas"
              :key="v.id"
              :label="`${formatDate(v.effective_date)} - ${formatDate(v.expiry_date)} 剩余${v.remaining_times === -1 ? '无限' : v.remaining_times}次`"
              :value="v.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="入境次数">
          <el-input-number v-model="handleForm.entry_count" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="实际起飞时间">
          <el-date-picker v-model="handleForm.actual_departure_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="抵达时间">
          <el-date-picker v-model="handleForm.arrival_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="机票金额">
          <el-input-number v-model="handleForm.ticket_amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="出票公司">
          <el-input v-model="handleForm.issuer_company" />
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
  fetchFlightApplications,
  createFlightApplication,
  createFlightHandle,
  fetchValidVisasForEmployee,
} from '../api';
import type { FlightApplication } from '../types';
import type { VisaHandle } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();
const auth = useAuthStore();
const submittedBy = computed(() => auth.email || null);

const list = ref<FlightApplication[]>([]);
const validVisas = ref<VisaHandle[]>([]);
const loading = ref(false);
const applyVisible = ref(false);
const saving = ref(false);
const handleVisible = ref(false);
const applyForm = ref({
  depart_city: '',
  arrive_city: '',
  expected_departure_at: null as string | null,
  remark: '',
});
const handleForm = ref({
  visa_handle_id: '' as string,
  entry_count: 1,
  actual_departure_at: null as string | null,
  arrival_at: null as string | null,
  depart_city: null as string | null,
  arrive_city: null as string | null,
  ticket_amount: null as number | null,
  issuer_company: null as string | null,
});
const currentApply = ref<FlightApplication | null>(null);

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('zh-CN');
}

async function load() {
  if (!props.employeeId) return;
  loading.value = true;
  try {
    const [apps, visas] = await Promise.all([
      fetchFlightApplications(props.employeeId),
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
  applyForm.value = { depart_city: '', arrive_city: '', expected_departure_at: null, remark: '' };
  applyVisible.value = true;
}

async function submitApply() {
  saving.value = true;
  try {
    await createFlightApplication({
      employee_id: props.employeeId,
      depart_city: applyForm.value.depart_city || null,
      arrive_city: applyForm.value.arrive_city || null,
      expected_departure_at: applyForm.value.expected_departure_at,
      remark: applyForm.value.remark || null,
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

function openHandle(row: FlightApplication) {
  currentApply.value = row;
  handleForm.value = {
    visa_handle_id: validVisas.value[0]?.id ?? '',
    entry_count: 1,
    actual_departure_at: null,
    arrival_at: null,
    depart_city: row.depart_city ?? null,
    arrive_city: row.arrive_city ?? null,
    ticket_amount: null,
    issuer_company: null,
  };
  handleVisible.value = true;
}

async function submitHandle() {
  if (!currentApply.value || !handleForm.value.visa_handle_id) {
    ElMessage.warning('请选择使用签证');
    return;
  }
  saving.value = true;
  try {
    await createFlightHandle({
      application_id: currentApply.value.id,
      visa_handle_id: handleForm.value.visa_handle_id,
      entry_count: handleForm.value.entry_count,
      actual_departure_at: handleForm.value.actual_departure_at,
      arrival_at: handleForm.value.arrival_at,
      depart_city: handleForm.value.depart_city,
      arrive_city: handleForm.value.arrive_city,
      ticket_amount: handleForm.value.ticket_amount,
      ticket_image_url: null,
      issuer_company: handleForm.value.issuer_company,
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
