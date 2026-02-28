<template>
  <div class="page-container page todos-page">
    <el-card class="erp-card hr-main-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">待办任务中心</div>
            <div class="subtitle">当前待处理的办理事项；可直接在本页弹窗办理，无需跳转</div>
          </div>
          <div class="header-actions">
            <el-button :icon="Refresh" @click="load">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="hr-toolbar">
        <el-select v-model="typeFilter" placeholder="任务类型" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="邀请函办理" value="invitation" />
          <el-option label="签证办理" value="visa" />
          <el-option label="机票办理" value="flight" />
          <el-option label="劳动许可办理" value="labor_permit" />
        </el-select>
      </div>
      <div class="hr-table-wrap">
      <el-table v-loading="loading" :data="displayList" stripe border row-key="applicationId">
        <el-table-column prop="type" label="任务类型" width="120">
          <template #default="{ row }">{{ todoTypeLabel(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="employeeName" label="员工" min-width="100" />
        <el-table-column prop="employeeNo" label="工号" min-width="100" />
        <el-table-column prop="submittedAt" label="申请时间" width="170">
          <template #default="{ row }">{{ formatDate(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column v-if="canManage" label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openHandleDialog(row)">去办理</el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>
      <div v-if="!loading && !displayList.length" class="hr-empty"><el-empty description="暂无待办任务" /></div>
    </el-card>

    <!-- 当前页办理弹窗（不跳转详情） -->
    <el-dialog
      v-model="handleDialogVisible"
      :title="handleDialogTitle"
      width="520px"
      destroy-on-close
      append-to-body
      @close="currentTask = null; invLetterPreview = ''"
    >
      <template v-if="currentTask">
        <!-- 邀请函办理 -->
        <template v-if="currentTask.type === 'invitation'">
          <el-form ref="invHandleFormRef" :model="invHandleForm" label-width="100px">
            <el-form-item label="员工">
              <el-input :model-value="currentTask.employeeName" disabled />
            </el-form-item>
            <el-form-item label="工号">
              <el-input :model-value="currentTask.employeeNo" disabled />
            </el-form-item>
            <el-form-item label="出函时间">
              <el-date-picker v-model="invHandleForm.letter_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="费用金额">
              <el-input-number v-model="invHandleForm.fee_amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
            <el-form-item label="邀请函附件">
              <div class="form-invitation-upload">
                <el-upload :show-file-list="false" :http-request="handleInvitationLetterUpload">
                  <el-image v-if="invLetterPreview" class="inv-letter-preview" :src="invLetterPreview" fit="contain" />
                  <el-button v-else type="primary" plain>上传附件</el-button>
                </el-upload>
                <el-button v-if="invHandleForm.letter_image_url" type="danger" link size="small" @click="clearInvLetter">清除</el-button>
              </div>
            </el-form-item>
            <el-form-item label="操作人">
              <el-input :model-value="currentOperator ?? '—'" disabled />
            </el-form-item>
          </el-form>
        </template>
        <!-- 签证办理 -->
        <template v-else-if="currentTask.type === 'visa'">
          <el-form ref="visaHandleFormRef" :model="visaHandleForm" label-width="100px">
            <el-form-item label="操作人">
              <el-input :model-value="currentOperator ?? '—'" disabled />
            </el-form-item>
            <el-form-item label="生效日期">
              <el-date-picker v-model="visaHandleForm.effective_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="失效日期">
              <el-date-picker v-model="visaHandleForm.expiry_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="签证次数">
              <el-input-number v-model="visaHandleForm.visa_times" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="剩余次数">
              <el-input-number v-model="visaHandleForm.remaining_times" :min="-1" placeholder="-1 表示无限" style="width: 100%" />
            </el-form-item>
            <el-form-item label="费用">
              <el-input-number v-model="visaHandleForm.fee_amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
            <el-form-item label="出证公司">
              <el-input v-model="visaHandleForm.issuer_company" />
            </el-form-item>
            <el-form-item label="签证附件">
              <div class="form-attachment-upload">
                <el-upload :show-file-list="false" :http-request="handleVisaAttachmentUpload">
                  <el-button type="primary" plain size="small">上传附件</el-button>
                </el-upload>
                <el-button v-if="visaHandleForm.visa_image_url" type="danger" link size="small" @click="visaHandleForm.visa_image_url = null">清除</el-button>
              </div>
            </el-form-item>
          </el-form>
        </template>
        <!-- 机票办理 -->
        <template v-else-if="currentTask.type === 'flight'">
          <el-alert v-if="!validVisasForTodo.length" type="warning" :closable="false" style="margin-bottom: 12px">
            该员工暂无有效签证，请先在档案详情中办理签证后再办理机票。
          </el-alert>
          <el-form ref="flightHandleFormRef" :model="flightHandleForm" label-width="100px">
            <el-form-item label="操作人">
              <el-input :model-value="currentOperator ?? '—'" disabled />
            </el-form-item>
            <el-form-item label="使用签证">
              <el-select v-model="flightHandleForm.visa_handle_id" placeholder="必选" style="width: 100%">
                <el-option
                  v-for="v in validVisasForTodo"
                  :key="v.id"
                  :label="`${formatDateOnly(v.effective_date)} - ${formatDateOnly(v.expiry_date)} 剩余${v.remaining_times === -1 ? '无限' : v.remaining_times}次`"
                  :value="v.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="入境次数">
              <el-input-number v-model="flightHandleForm.entry_count" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="实际起飞">
              <el-date-picker v-model="flightHandleForm.actual_departure_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
            </el-form-item>
            <el-form-item label="抵达时间">
              <el-date-picker v-model="flightHandleForm.arrival_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
            </el-form-item>
            <el-form-item label="机票金额">
              <el-input-number v-model="flightHandleForm.ticket_amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
            <el-form-item label="出票公司">
              <el-input v-model="flightHandleForm.issuer_company" />
            </el-form-item>
            <el-form-item label="机票附件">
              <div class="form-attachment-upload">
                <el-upload :show-file-list="false" :http-request="handleFlightAttachmentUpload">
                  <el-button type="primary" plain size="small">上传附件</el-button>
                </el-upload>
                <el-button v-if="flightHandleForm.ticket_image_url" type="danger" link size="small" @click="flightHandleForm.ticket_image_url = null">清除</el-button>
              </div>
            </el-form-item>
          </el-form>
        </template>
        <!-- 劳动许可办理 -->
        <template v-else-if="currentTask.type === 'labor_permit'">
          <el-form ref="laborHandleFormRef" :model="laborHandleForm" label-width="100px">
            <el-form-item label="操作人">
              <el-input :model-value="currentOperator ?? '—'" disabled />
            </el-form-item>
            <el-form-item label="许可日期">
              <el-date-picker v-model="laborHandleForm.permit_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="生效日期">
              <el-date-picker v-model="laborHandleForm.effective_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="失效日期">
              <el-date-picker v-model="laborHandleForm.expiry_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="费用">
              <el-input-number v-model="laborHandleForm.fee_amount" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
            <el-form-item label="劳动许可附件">
              <div class="form-attachment-upload">
                <el-upload :show-file-list="false" :http-request="handleLaborAttachmentUpload">
                  <el-button type="primary" plain size="small">上传附件</el-button>
                </el-upload>
                <el-button v-if="laborHandleForm.image_url" type="danger" link size="small" @click="laborHandleForm.image_url = null">清除</el-button>
              </div>
            </el-form-item>
          </el-form>
        </template>
      </template>
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="handleSaving" @click="submitHandle">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { useAuthStore } from '../../../stores/auth';
import { usePermission, P } from '../../../permissions';
import {
  fetchTodoList,
  subscribeTodoListUpdates,
  createInvitationHandle,
  createVisaHandle,
  createFlightHandle,
  createLaborPermitHandle,
  fetchValidVisasForEmployee,
  hasInvitationHandled,
  uploadEmployeeFile,
  getSignedUrl,
} from './api';
import { formatDateOnly } from './types';
import type { TodoItem } from './types';
import type { VisaHandle } from './types';
import { ElMessage } from 'element-plus';
import './employees-cn.css';

const auth = useAuthStore();
const { can } = usePermission();
const canManage = can(P.HR_EMPLOYEE_CN_MANAGE);
const currentOperator = computed(() => auth.user?.email ?? auth.email ?? null);

const STATE_KEY = 'hr.employees-cn.todos.ui_state.v1';

const list = ref<TodoItem[]>([]);
const typeFilter = ref('');
const loading = ref(false);

function restoreUiState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s?.typeFilter != null && ['', 'invitation', 'visa', 'flight', 'labor_permit'].includes(s.typeFilter)) {
      typeFilter.value = s.typeFilter;
    }
  } catch { /* ignore */ }
}

function persistUiState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ typeFilter: typeFilter.value }));
  } catch { /* ignore */ }
}

const PERSIST_DEBOUNCE_MS = 450;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedPersistUiState() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistUiState();
  }, PERSIST_DEBOUNCE_MS);
}

const displayList = computed(() => {
  const f = typeFilter.value;
  if (!f) return list.value;
  return list.value.filter((row) => row.type === f);
});
const currentTask = ref<TodoItem | null>(null);
const handleDialogVisible = ref(false);
const handleSaving = ref(false);
const validVisasForTodo = ref<VisaHandle[]>([]);
const invLetterPreview = ref('');

const invHandleForm = ref({ letter_date: null as string | null, fee_amount: null as number | null, letter_image_url: null as string | null });
const visaHandleForm = ref({
  effective_date: null as string | null,
  expiry_date: null as string | null,
  visa_times: null as number | null,
  remaining_times: null as number | null,
  fee_amount: null as number | null,
  issuer_company: null as string | null,
  visa_image_url: null as string | null,
});
const flightHandleForm = ref({
  visa_handle_id: '',
  entry_count: 1,
  actual_departure_at: null as string | null,
  arrival_at: null as string | null,
  ticket_amount: null as number | null,
  ticket_image_url: null as string | null,
  issuer_company: null as string | null,
});
const laborHandleForm = ref({
  permit_date: null as string | null,
  effective_date: null as string | null,
  expiry_date: null as string | null,
  fee_amount: null as number | null,
  image_url: null as string | null,
});

const todoTypeLabels: Record<TodoItem['type'], string> = {
  invitation: '邀请函办理',
  visa: '签证办理',
  flight: '机票办理',
  labor_permit: '劳动许可办理',
};

const handleDialogTitle = computed(() => {
  if (!currentTask.value) return '办理';
  return todoTypeLabels[currentTask.value.type] || '办理';
});

function todoTypeLabel(t: TodoItem['type']) {
  return todoTypeLabels[t] ?? t;
}

function formatDate(v: string) {
  return v ? new Date(v).toLocaleString('zh-CN') : '—';
}

async function load() {
  loading.value = true;
  try {
    list.value = await fetchTodoList();
  } catch (e: any) {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

watch(currentTask, async (task) => {
  if (task?.type === 'flight' && task?.employeeId) {
    try {
      validVisasForTodo.value = await fetchValidVisasForEmployee(task.employeeId);
    } catch {
      validVisasForTodo.value = [];
    }
  } else {
    validVisasForTodo.value = [];
  }
});
watch(validVisasForTodo, (visas) => {
  if (currentTask.value?.type === 'flight' && visas.length && !flightHandleForm.value.visa_handle_id) {
    flightHandleForm.value.visa_handle_id = visas[0].id;
  }
}, { deep: true });

async function handleInvitationLetterUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('invitation', options.file.name, options.file);
    invHandleForm.value.letter_image_url = path;
    if (options.file.type.startsWith('image/')) {
      invLetterPreview.value = await getSignedUrl(path);
    } else {
      invLetterPreview.value = '';
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}
function clearInvLetter() {
  invHandleForm.value.letter_image_url = null;
  invLetterPreview.value = '';
}
async function handleVisaAttachmentUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('visa', options.file.name, options.file);
    visaHandleForm.value.visa_image_url = path;
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}
async function handleFlightAttachmentUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('flight', options.file.name, options.file);
    flightHandleForm.value.ticket_image_url = path;
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}
async function handleLaborAttachmentUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('labor', options.file.name, options.file);
    laborHandleForm.value.image_url = path;
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}

function openHandleDialog(row: TodoItem) {
  currentTask.value = row;
  invLetterPreview.value = '';
  invHandleForm.value = { letter_date: null, fee_amount: null, letter_image_url: null };
  visaHandleForm.value = {
    effective_date: null,
    expiry_date: null,
    visa_times: null,
    remaining_times: null,
    fee_amount: null,
    issuer_company: null,
    visa_image_url: null,
  };
  flightHandleForm.value = {
    visa_handle_id: validVisasForTodo.value[0]?.id ?? '',
    entry_count: 1,
    actual_departure_at: null,
    arrival_at: null,
    ticket_amount: null,
    ticket_image_url: null,
    issuer_company: null,
  };
  laborHandleForm.value = { permit_date: null, effective_date: null, expiry_date: null, fee_amount: null, image_url: null };
  handleDialogVisible.value = true;
}

async function submitHandle() {
  if (handleSaving.value) return;
  const task = currentTask.value;
  if (!task) return;
  handleSaving.value = true;
  try {
    if (task.type === 'invitation') {
      await createInvitationHandle({
        application_id: task.applicationId,
        letter_date: invHandleForm.value.letter_date,
        fee_amount: invHandleForm.value.fee_amount,
        letter_image_url: invHandleForm.value.letter_image_url,
        operator: currentOperator.value,
      });
    } else if (task.type === 'visa') {
      const hasInv = await hasInvitationHandled(task.employeeId);
      if (!hasInv) {
        ElMessage.warning('办理签证前需先有已办理的邀请函');
        handleSaving.value = false;
        return;
      }
      const rt = visaHandleForm.value.remaining_times ?? visaHandleForm.value.visa_times ?? 1;
      await createVisaHandle({
        application_id: task.applicationId,
        effective_date: visaHandleForm.value.effective_date,
        expiry_date: visaHandleForm.value.expiry_date,
        visa_times: visaHandleForm.value.visa_times,
        remaining_times: rt,
        visa_image_url: visaHandleForm.value.visa_image_url,
        fee_amount: visaHandleForm.value.fee_amount,
        issuer_company: visaHandleForm.value.issuer_company,
        operator: currentOperator.value,
      });
    } else if (task.type === 'flight') {
      if (!flightHandleForm.value.visa_handle_id) {
        ElMessage.warning('请选择使用签证');
        handleSaving.value = false;
        return;
      }
      await createFlightHandle({
        application_id: task.applicationId,
        visa_handle_id: flightHandleForm.value.visa_handle_id,
        entry_count: flightHandleForm.value.entry_count,
        actual_departure_at: flightHandleForm.value.actual_departure_at,
        arrival_at: flightHandleForm.value.arrival_at,
        depart_city: null,
        arrive_city: null,
        ticket_amount: flightHandleForm.value.ticket_amount,
        ticket_image_url: flightHandleForm.value.ticket_image_url,
        issuer_company: flightHandleForm.value.issuer_company,
        operator: currentOperator.value,
      });
    } else if (task.type === 'labor_permit') {
      await createLaborPermitHandle({
        application_id: task.applicationId,
        permit_date: laborHandleForm.value.permit_date,
        effective_date: laborHandleForm.value.effective_date,
        expiry_date: laborHandleForm.value.expiry_date,
        fee_amount: laborHandleForm.value.fee_amount,
        image_url: laborHandleForm.value.image_url,
        operator: currentOperator.value,
      });
    }
    ElMessage.success('办理完成');
    handleDialogVisible.value = false;
    currentTask.value = null;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.message || '办理失败');
  } finally {
    handleSaving.value = false;
  }
}

watch(typeFilter, debouncedPersistUiState);

const POLL_INTERVAL_MS = 30000;
let unsubscribeRealtime: (() => void) | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startRealtimeAndPolling() {
  const onUpdate = () => {
    if (document.visibilityState === 'visible') load();
  };
  unsubscribeRealtime = subscribeTodoListUpdates(onUpdate);
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') load();
  }, POLL_INTERVAL_MS);
}

function stopRealtimeAndPolling() {
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

onMounted(() => {
  restoreUiState();
  load();
  startRealtimeAndPolling();
});

onUnmounted(() => {
  stopRealtimeAndPolling();
});
</script>

<style scoped>
.erp-card-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.title { font-size: 16px; font-weight: 600; }
.subtitle { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.dialog-task-info { margin-bottom: 16px; color: var(--el-text-color-regular); }
.form-invitation-upload { display: flex; align-items: center; gap: 12px; }
.inv-letter-preview { width: 120px; height: 90px; border-radius: 6px; display: block; border: 1px solid var(--el-border-color); }
.form-attachment-upload { display: flex; align-items: center; gap: 8px; }
</style>
