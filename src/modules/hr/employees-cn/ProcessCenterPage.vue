<template>
  <div class="page-container page process-center-page">
    <el-card class="erp-card hr-main-card hr-tabs-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">流程中心</div>
            <div class="subtitle">邀请函、签证、机票、劳动许可 申请与办理；可直接在本页弹窗办理，无需跳转</div>
          </div>
          <div class="header-actions">
            <el-button v-if="canManage" type="primary" @click="openApply">新建申请</el-button>
            <el-button :icon="Refresh" @click="loadCurrentTab">刷新</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="邀请函" name="invitation">
          <div class="hr-toolbar">
            <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px">
              <el-option label="待办理" value="pending" />
              <el-option label="已办理" value="done" />
            </el-select>
            <el-input v-model="filters.keyword" placeholder="工号/姓名" clearable style="width: 160px" />
            <el-button type="primary" @click="loadCurrentTab">查询</el-button>
          </div>
          <div class="hr-table-wrap">
          <el-table v-loading="loading" :data="filteredInvitationList" stripe border row-key="id">
            <el-table-column prop="employee_name" label="员工" min-width="100" />
            <el-table-column prop="employee_no" label="工号" min-width="100" />
            <el-table-column prop="submitted_at" label="提交时间" width="170">
              <template #default="{ row }">{{ formatDate(row.submitted_at) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="openHandleDialog('invitation', row)">办理</el-button>
                <el-button v-if="row.status === 'done'" link type="primary" size="small" @click="openEditDialog('invitation', row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>
          <div v-if="!loading && !filteredInvitationList.length" class="hr-empty"><el-empty description="暂无邀请函申请" /></div>
        </el-tab-pane>

        <el-tab-pane label="签证" name="visa">
          <div class="hr-toolbar">
            <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px">
              <el-option label="待办理" value="pending" />
              <el-option label="已办理" value="done" />
            </el-select>
            <el-input v-model="filters.keyword" placeholder="工号/姓名" clearable style="width: 160px" />
            <el-button type="primary" @click="loadCurrentTab">查询</el-button>
          </div>
          <div class="hr-table-wrap">
          <el-table v-loading="loading" :data="filteredVisaList" stripe border row-key="id">
            <el-table-column prop="employee_name" label="员工" min-width="100" />
            <el-table-column prop="employee_no" label="工号" min-width="100" />
            <el-table-column prop="application_type" label="类型" width="100" />
            <el-table-column prop="expected_departure_at" label="预计出发" width="110">
              <template #default="{ row }">{{ formatDate(row.expected_departure_at) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="openHandleDialog('visa', row)">办理</el-button>
                <el-button v-if="row.status === 'done'" link type="primary" size="small" @click="openEditDialog('visa', row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>
          <div v-if="!loading && !filteredVisaList.length" class="hr-empty"><el-empty description="暂无签证申请" /></div>
        </el-tab-pane>

        <el-tab-pane label="机票" name="flight">
          <div class="hr-toolbar">
            <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px">
              <el-option label="待办理" value="pending" />
              <el-option label="已办理" value="done" />
            </el-select>
            <el-input v-model="filters.keyword" placeholder="工号/姓名" clearable style="width: 160px" />
            <el-button type="primary" @click="loadCurrentTab">查询</el-button>
          </div>
          <div class="hr-table-wrap">
          <el-table v-loading="loading" :data="filteredFlightList" stripe border row-key="id">
            <el-table-column prop="employee_name" label="员工" min-width="100" />
            <el-table-column prop="employee_no" label="工号" min-width="100" />
            <el-table-column prop="depart_city" label="出发" width="90" />
            <el-table-column prop="arrive_city" label="到达" width="90" />
            <el-table-column prop="expected_departure_at" label="预计出发" width="110">
              <template #default="{ row }">{{ formatDate(row.expected_departure_at) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="openHandleDialog('flight', row)">办理</el-button>
                <el-button v-if="row.status === 'done'" link type="primary" size="small" @click="openEditDialog('flight', row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>
          <div v-if="!loading && !filteredFlightList.length" class="hr-empty"><el-empty description="暂无机票申请" /></div>
        </el-tab-pane>

        <el-tab-pane label="劳动许可" name="labor">
          <div class="hr-toolbar">
            <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px">
              <el-option label="待办理" value="pending" />
              <el-option label="已办理" value="done" />
            </el-select>
            <el-input v-model="filters.keyword" placeholder="工号/姓名" clearable style="width: 160px" />
            <el-button type="primary" @click="loadCurrentTab">查询</el-button>
          </div>
          <div class="hr-table-wrap">
          <el-table v-loading="loading" :data="filteredLaborList" stripe border row-key="id">
            <el-table-column prop="employee_name" label="员工" min-width="100" />
            <el-table-column prop="employee_no" label="工号" min-width="100" />
            <el-table-column prop="application_date" label="申请日期" width="110">
              <template #default="{ row }">{{ formatDate(row.application_date) }}</template>
            </el-table-column>
            <el-table-column prop="application_content" label="申请内容" min-width="140" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="openHandleDialog('labor', row)">办理</el-button>
                <el-button v-if="row.status === 'done'" link type="primary" size="small" @click="openEditDialog('labor', row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>
          <div v-if="!loading && !filteredLaborList.length" class="hr-empty"><el-empty description="暂无劳动许可申请" /></div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新建申请弹窗（按当前 Tab 显示不同表单） -->
    <ProcessApplyDialog
      v-model:visible="applyVisible"
      :tab="activeTab"
      :employees="employees"
      @submitted="onApplySubmitted"
    />

    <!-- 当前页办理弹窗（不跳转详情） -->
    <el-dialog
      v-model="handleDialogVisible"
      :title="handleDialogTitle"
      width="520px"
      destroy-on-close
      append-to-body
      @close="currentHandleRow = null; invLetterPreview = ''; isEditMode = false; currentEditHandleId = null"
    >
      <template v-if="currentHandleRow">
        <p class="dialog-task-info">员工：{{ currentHandleRow.employee_name ?? '—' }}</p>
        <template v-if="handleType === 'invitation'">
          <el-form ref="invHandleFormRef" :model="invHandleForm" label-width="100px">
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
        <template v-else-if="handleType === 'visa'">
          <el-form ref="visaHandleFormRef" :model="visaHandleForm" label-width="100px">
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
            <el-form-item label="操作人">
              <el-input :model-value="currentOperator ?? '—'" disabled />
            </el-form-item>
          </el-form>
        </template>
        <template v-else-if="handleType === 'flight'">
          <el-alert v-if="!isEditMode && !validVisasForHandle.length" type="warning" :closable="false" style="margin-bottom: 12px">
            该员工暂无有效签证，请先在档案详情中办理签证后再办理机票。
          </el-alert>
          <el-form ref="flightHandleFormRef" :model="flightHandleForm" label-width="100px">
            <template v-if="!isEditMode">
              <el-form-item label="使用签证">
                <el-select v-model="flightHandleForm.visa_handle_id" placeholder="必选" style="width: 100%">
                  <el-option
                    v-for="v in validVisasForHandle"
                    :key="v.id"
                    :label="`${formatDateOnly(v.effective_date)} - ${formatDateOnly(v.expiry_date)} 剩余${v.remaining_times === -1 ? '无限' : v.remaining_times}次`"
                    :value="v.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="入境次数">
                <el-input-number v-model="flightHandleForm.entry_count" :min="1" style="width: 100%" />
              </el-form-item>
            </template>
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
            <el-form-item label="操作人">
              <el-input :model-value="currentOperator ?? '—'" disabled />
            </el-form-item>
          </el-form>
        </template>
        <template v-else-if="handleType === 'labor'">
          <el-form ref="laborHandleFormRef" :model="laborHandleForm" label-width="100px">
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
            <el-form-item label="操作人">
              <el-input :model-value="currentOperator ?? '—'" disabled />
            </el-form-item>
          </el-form>
        </template>
      </template>
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="handleSaving" @click="submitHandle">{{ isEditMode ? '保存' : '保存' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import { Refresh } from '@element-plus/icons-vue';
import { useAuthStore } from '../../../stores/auth';
import {
  fetchEmployees,
  fetchInvitationApplications,
  fetchVisaApplications,
  fetchFlightApplications,
  fetchLaborPermitApplications,
  fetchInvitationHandleByApplicationId,
  fetchVisaHandleByApplicationId,
  fetchFlightHandleByApplicationId,
  fetchLaborPermitHandleByApplicationId,
  createInvitationHandle,
  createVisaHandle,
  createFlightHandle,
  createLaborPermitHandle,
  updateInvitationHandle,
  updateVisaHandle,
  updateFlightHandle,
  updateLaborPermitHandle,
  fetchValidVisasForEmployee,
  hasInvitationHandled,
  uploadEmployeeFile,
  getSignedUrl,
} from './api';
import type { InvitationApplication, VisaApplication, FlightApplication, LaborPermitApplication } from './types';
import type { CnEmployee } from './types';
import { formatDateOnly } from './types';
import type { VisaHandle } from './types';
import ProcessApplyDialog from './components/ProcessApplyDialog.vue';
import './employees-cn.css';

const route = useRoute();
const auth = useAuthStore();
const canManage = computed(() => auth.role === 'super_admin');
const currentOperator = computed(() => auth.user?.email ?? (auth as any).email ?? null);

const STATE_KEY = 'hr.employees-cn.process.ui_state.v1';

const activeTab = ref<'invitation' | 'visa' | 'flight' | 'labor'>('invitation');
const employees = ref<CnEmployee[]>([]);
const loading = ref(false);
const filters = ref({ status: '' as string, keyword: '' });

function restoreUiState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    const fromQuery = route.query.tab as string;
    if (!fromQuery && s?.activeTab && ['invitation', 'visa', 'flight', 'labor'].includes(s.activeTab)) {
      activeTab.value = s.activeTab;
    }
    if (s?.filters && typeof s.filters === 'object') {
      if (typeof s.filters.status === 'string') filters.value.status = s.filters.status;
      if (typeof s.filters.keyword === 'string') filters.value.keyword = s.filters.keyword;
    }
  } catch { /* ignore */ }
}

function persistUiState() {
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        activeTab: activeTab.value,
        filters: filters.value,
      })
    );
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
const applyVisible = ref(false);
const saving = ref(false);

type HandleRow = { id: string; employee_id: string; employee_name?: string };
const handleType = ref<'invitation' | 'visa' | 'flight' | 'labor'>('invitation');
const currentHandleRow = ref<HandleRow | null>(null);
const handleDialogVisible = ref(false);
const handleSaving = ref(false);
const isEditMode = ref(false);
const currentEditHandleId = ref<string | null>(null);
const validVisasForHandle = ref<VisaHandle[]>([]);
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

const invitationList = ref<(InvitationApplication & { employee_name?: string; employee_no?: string })[]>([]);
const visaList = ref<(VisaApplication & { employee_name?: string; employee_no?: string })[]>([]);
const flightList = ref<(FlightApplication & { employee_name?: string; employee_no?: string })[]>([]);
const laborList = ref<(LaborPermitApplication & { employee_name?: string; employee_no?: string })[]>([]);

const handleTypeLabels: Record<string, string> = {
  invitation: '邀请函办理',
  visa: '签证办理',
  flight: '机票办理',
  labor: '劳动许可办理',
};
const handleDialogTitle = computed(() => {
  if (!currentHandleRow.value || !handleType.value) return '办理';
  const label = handleTypeLabels[handleType.value] || '办理';
  return isEditMode.value ? `编辑${label.replace('办理', '')}` : label;
});

function formatDate(v: string | null | undefined) {
  return v ? new Date(v).toLocaleString('zh-CN') : '—';
}

function filterByKeyword<T extends { employee_name?: string; employee_no?: string }>(rows: T[]): T[] {
  let list = rows;
  if (filters.value.status) list = list.filter((r: any) => r.status === filters.value.status);
  if (filters.value.keyword.trim()) {
    const k = filters.value.keyword.trim().toLowerCase();
    list = list.filter((r) => (r.employee_name || '').toLowerCase().includes(k) || (r.employee_no || '').toLowerCase().includes(k));
  }
  return list;
}

const filteredInvitationList = computed(() => filterByKeyword(invitationList.value));
const filteredVisaList = computed(() => filterByKeyword(visaList.value));
const filteredFlightList = computed(() => filterByKeyword(flightList.value));
const filteredLaborList = computed(() => filterByKeyword(laborList.value));

async function loadAll() {
  loading.value = true;
  try {
    const [emps, inv, vis, fli, lab] = await Promise.all([
      fetchEmployees(),
      fetchInvitationApplications(),
      fetchVisaApplications(),
      fetchFlightApplications(),
      fetchLaborPermitApplications(),
    ]);
    employees.value = emps;
    const empInfoMap = new Map(emps.map((e) => [e.id, { name: e.name, employee_no: e.employee_no }]));
    const enrich = (a: any) => {
      const info = empInfoMap.get(a.employee_id);
      return { ...a, employee_name: info?.name ?? '—', employee_no: info?.employee_no ?? '—' };
    };
    invitationList.value = (inv as any[]).map(enrich);
    visaList.value = (vis as any[]).map(enrich);
    flightList.value = (fli as any[]).map(enrich);
    laborList.value = (lab as any[]).map(enrich);
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function loadCurrentTab() {
  loadAll();
}

function onTabChange() {
  // 切换 tab 时可选清空筛选，此处保留持久化由用户自行切换
}

function openApply() {
  applyVisible.value = true;
}

function onApplySubmitted() {
  loadAll();
}

watch(currentHandleRow, async (row) => {
  if (row && handleType.value === 'flight' && row.employee_id) {
    try {
      validVisasForHandle.value = await fetchValidVisasForEmployee(row.employee_id);
    } catch {
      validVisasForHandle.value = [];
    }
  } else {
    validVisasForHandle.value = [];
  }
});
watch(validVisasForHandle, (visas) => {
  if (currentHandleRow.value && handleType.value === 'flight' && visas.length && !flightHandleForm.value.visa_handle_id) {
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

function openHandleDialog(
  type: 'invitation' | 'visa' | 'flight' | 'labor',
  row: HandleRow
) {
  isEditMode.value = false;
  currentEditHandleId.value = null;
  handleType.value = type;
  currentHandleRow.value = row;
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
    visa_handle_id: '',
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

async function openEditDialog(
  type: 'invitation' | 'visa' | 'flight' | 'labor',
  row: HandleRow
) {
  handleType.value = type;
  currentHandleRow.value = row;
  isEditMode.value = true;
  currentEditHandleId.value = null;
  invLetterPreview.value = '';
  try {
    if (type === 'invitation') {
      const h = await fetchInvitationHandleByApplicationId(row.id);
      if (!h) {
        ElMessage.warning('未找到办理记录');
        return;
      }
      currentEditHandleId.value = h.id;
      invHandleForm.value = {
        letter_date: h.letter_date,
        fee_amount: h.fee_amount,
        letter_image_url: h.letter_image_url,
      };
      if (h.letter_image_url) invLetterPreview.value = await getSignedUrl(h.letter_image_url);
    } else if (type === 'visa') {
      const h = await fetchVisaHandleByApplicationId(row.id);
      if (!h) {
        ElMessage.warning('未找到办理记录');
        return;
      }
      currentEditHandleId.value = h.id;
      visaHandleForm.value = {
        effective_date: h.effective_date,
        expiry_date: h.expiry_date,
        visa_times: h.visa_times,
        remaining_times: h.remaining_times,
        fee_amount: h.fee_amount,
        issuer_company: h.issuer_company ?? null,
        visa_image_url: h.visa_image_url ?? null,
      };
    } else if (type === 'flight') {
      const h = await fetchFlightHandleByApplicationId(row.id);
      if (!h) {
        ElMessage.warning('未找到办理记录');
        return;
      }
      currentEditHandleId.value = h.id;
      validVisasForHandle.value = await fetchValidVisasForEmployee(row.employee_id);
      flightHandleForm.value = {
        visa_handle_id: validVisasForHandle.value[0]?.id ?? '',
        entry_count: h.entry_count ?? 1,
        actual_departure_at: h.actual_departure_at,
        arrival_at: h.arrival_at,
        ticket_amount: h.ticket_amount,
        ticket_image_url: h.ticket_image_url ?? null,
        issuer_company: h.issuer_company ?? null,
      };
    } else if (type === 'labor') {
      const h = await fetchLaborPermitHandleByApplicationId(row.id);
      if (!h) {
        ElMessage.warning('未找到办理记录');
        return;
      }
      currentEditHandleId.value = h.id;
      laborHandleForm.value = {
        permit_date: h.permit_date,
        effective_date: h.effective_date,
        expiry_date: h.expiry_date,
        fee_amount: h.fee_amount,
        image_url: h.image_url ?? null,
      };
    }
    handleDialogVisible.value = true;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载办理记录失败');
  }
}

async function submitHandle() {
  if (handleSaving.value) return;
  const row = currentHandleRow.value;
  const type = handleType.value;
  const handleId = currentEditHandleId.value;
  if (!row) return;
  handleSaving.value = true;
  try {
    if (isEditMode.value && handleId) {
      if (type === 'invitation') {
        await updateInvitationHandle(handleId, {
          letter_date: invHandleForm.value.letter_date,
          letter_image_url: invHandleForm.value.letter_image_url,
          fee_amount: invHandleForm.value.fee_amount,
          operator: currentOperator.value,
        });
      } else if (type === 'visa') {
        await updateVisaHandle(handleId, {
          effective_date: visaHandleForm.value.effective_date,
          expiry_date: visaHandleForm.value.expiry_date,
          visa_times: visaHandleForm.value.visa_times,
          remaining_times: visaHandleForm.value.remaining_times ?? visaHandleForm.value.visa_times ?? null,
          fee_amount: visaHandleForm.value.fee_amount,
          issuer_company: visaHandleForm.value.issuer_company,
          visa_image_url: visaHandleForm.value.visa_image_url,
          operator: currentOperator.value,
        });
      } else if (type === 'flight') {
        await updateFlightHandle(handleId, {
          actual_departure_at: flightHandleForm.value.actual_departure_at,
          arrival_at: flightHandleForm.value.arrival_at,
          ticket_amount: flightHandleForm.value.ticket_amount,
          ticket_image_url: flightHandleForm.value.ticket_image_url,
          issuer_company: flightHandleForm.value.issuer_company,
          operator: currentOperator.value,
        });
      } else if (type === 'labor') {
        await updateLaborPermitHandle(handleId, {
          permit_date: laborHandleForm.value.permit_date,
          effective_date: laborHandleForm.value.effective_date,
          expiry_date: laborHandleForm.value.expiry_date,
          fee_amount: laborHandleForm.value.fee_amount,
          image_url: laborHandleForm.value.image_url,
          operator: currentOperator.value,
        });
      }
      ElMessage.success('已保存');
      handleDialogVisible.value = false;
      currentHandleRow.value = null;
      currentEditHandleId.value = null;
      isEditMode.value = false;
      await loadAll();
      return;
    }
    if (type === 'invitation') {
      await createInvitationHandle({
        application_id: row.id,
        letter_date: invHandleForm.value.letter_date,
        fee_amount: invHandleForm.value.fee_amount,
        letter_image_url: invHandleForm.value.letter_image_url,
        operator: currentOperator.value,
      });
    } else if (type === 'visa') {
      const hasInv = await hasInvitationHandled(row.employee_id);
      if (!hasInv) {
        ElMessage.warning('办理签证前需先有已办理的邀请函');
        handleSaving.value = false;
        return;
      }
      const rt = visaHandleForm.value.remaining_times ?? visaHandleForm.value.visa_times ?? 1;
      await createVisaHandle({
        application_id: row.id,
        effective_date: visaHandleForm.value.effective_date,
        expiry_date: visaHandleForm.value.expiry_date,
        visa_times: visaHandleForm.value.visa_times,
        remaining_times: rt,
        visa_image_url: visaHandleForm.value.visa_image_url,
        fee_amount: visaHandleForm.value.fee_amount,
        issuer_company: visaHandleForm.value.issuer_company,
        operator: currentOperator.value,
      });
    } else if (type === 'flight') {
      if (!flightHandleForm.value.visa_handle_id) {
        ElMessage.warning('请选择使用签证');
        handleSaving.value = false;
        return;
      }
      await createFlightHandle({
        application_id: row.id,
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
    } else if (type === 'labor') {
      await createLaborPermitHandle({
        application_id: row.id,
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
    currentHandleRow.value = null;
    await loadAll();
  } catch (e: any) {
    ElMessage.error(e?.message || '办理失败');
  } finally {
    handleSaving.value = false;
  }
}

// 支持 URL ?tab=xxx 打开指定 Tab（仅在 URL 有值时覆盖，否则用持久化状态）
watch(
  () => route.query.tab as string,
  (tab) => {
    if (tab && ['invitation', 'visa', 'flight', 'labor'].includes(tab)) {
      activeTab.value = tab as any;
    }
  },
  { immediate: true }
);

watch([activeTab, filters], debouncedPersistUiState, { deep: true });

onMounted(() => {
  restoreUiState();
  loadAll();
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
