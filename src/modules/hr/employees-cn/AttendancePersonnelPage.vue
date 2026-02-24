<template>
  <div class="page-container page attendance-personnel-page">
    <el-card class="erp-card hr-main-card hr-tabs-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">考勤与人事</div>
          </div>
          <div class="header-actions">
            <el-button v-if="canManage && activeTab === 'leave'" type="primary" @click="openLeave">登记请假</el-button>
            <el-button v-if="canManage && activeTab === 'reward'" type="primary" @click="openReward">新增奖励/违纪</el-button>
            <el-button :icon="Refresh" @click="loadCurrentTab">刷新</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="请假管理" name="leave">
          <div class="hr-toolbar">
            <el-input v-model="leaveFilters.keyword" placeholder="工号/姓名" clearable style="width: 160px" />
            <el-button type="primary" @click="loadLeave">查询</el-button>
          </div>
          <div class="hr-table-wrap">
          <el-table v-loading="leaveLoading" :data="filteredLeaveList" stripe border row-key="id">
            <el-table-column prop="employee_name" label="员工" min-width="100" />
            <el-table-column prop="employee_no" label="工号" min-width="100" />
            <el-table-column prop="reason" label="事由" min-width="140" show-overflow-tooltip />
            <el-table-column prop="start_at" label="开始时间" width="160">
              <template #default="{ row }">{{ formatDate(row.start_at) }}</template>
            </el-table-column>
            <el-table-column prop="end_at" label="结束时间" width="160">
              <template #default="{ row }">{{ formatDate(row.end_at) }}</template>
            </el-table-column>
            <el-table-column prop="leave_hours" label="时长(小时)" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag v-if="isActiveLeave(row)" type="warning" size="small">休假中</el-tag>
                <el-tag v-else size="small">已结束</el-tag>
              </template>
            </el-table-column>
          </el-table>
          </div>
          <div v-if="!leaveLoading && !filteredLeaveList.length" class="hr-empty"><el-empty description="暂无请假记录" /></div>
        </el-tab-pane>

        <el-tab-pane label="奖励/违纪" name="reward">
          <div class="hr-toolbar">
            <el-select v-model="rewardFilters.record_type" placeholder="类型" clearable style="width: 100px">
              <el-option label="奖励" value="reward" />
              <el-option label="违纪" value="discipline" />
            </el-select>
            <el-input v-model="rewardFilters.keyword" placeholder="工号/姓名" clearable style="width: 160px" />
            <el-button type="primary" @click="loadReward">查询</el-button>
          </div>
          <div class="hr-table-wrap">
          <el-table v-loading="rewardLoading" :data="filteredRewardList" stripe border row-key="id">
            <el-table-column prop="employee_name" label="员工" min-width="100" />
            <el-table-column prop="employee_no" label="工号" min-width="100" />
            <el-table-column prop="record_type" label="类型" width="90">
              <template #default="{ row }">{{ row.record_type === 'reward' ? '奖励' : '违纪' }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
            <el-table-column prop="amount" label="金额" width="100" align="right" />
            <el-table-column prop="operator" label="经办人" width="120" />
            <el-table-column prop="created_at" label="时间" width="160">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
          </el-table>
          </div>
          <div v-if="!rewardLoading && !filteredRewardList.length" class="hr-empty"><el-empty description="暂无奖励/违纪记录" /></div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 登记请假：默认操作人为当前账户，请假时长可自动计算 -->
    <el-dialog v-model="leaveVisible" title="登记请假" width="500px" append-to-body>
      <el-form ref="leaveFormRef" :model="leaveForm" :rules="leaveRules" label-width="100px">
        <el-form-item label="操作人">
          <el-input :model-value="currentOperator ?? '—'" disabled />
        </el-form-item>
        <el-form-item label="员工" prop="employee_id">
          <el-select v-model="leaveForm.employee_id" filterable placeholder="请选择员工" style="width: 100%">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.employee_no} ${e.name}`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="事由" prop="reason">
          <el-input v-model="leaveForm.reason" placeholder="必填" />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_at">
          <el-date-picker v-model="leaveForm.start_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="leaveForm.end_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选填，归期未知可不填" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假时长">
          <span v-if="leaveDurationText" class="leave-duration-text">{{ leaveDurationText }}</span>
          <el-input-number v-model="leaveForm.leave_hours" :min="0" :precision="2" style="width: 100%" placeholder="可自动计算或手动填写" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="leaveVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitLeave">提交</el-button>
      </template>
    </el-dialog>

    <!-- 新增奖励/违纪 -->
    <el-dialog v-model="rewardVisible" title="新增奖励/违纪记录" width="480px" append-to-body>
      <el-form ref="rewardFormRef" :model="rewardForm" :rules="rewardRules" label-width="90px">
        <el-form-item label="员工" prop="employee_id">
          <el-select v-model="rewardForm.employee_id" filterable placeholder="请选择员工" style="width: 100%">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.employee_no} ${e.name}`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="record_type">
          <el-radio-group v-model="rewardForm.record_type">
            <el-radio value="reward">奖励</el-radio>
            <el-radio value="discipline">违纪</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="原因" prop="reason">
          <el-input v-model="rewardForm.reason" type="textarea" :rows="2" placeholder="必填" />
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="rewardForm.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rewardVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitReward">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { useAuthStore } from '../../../stores/auth';
import {
  fetchEmployees,
  fetchLeaveRecords,
  fetchRewardDisciplineRecords,
  createLeaveRecord,
  createRewardDisciplineRecord,
  isOnLeaveToday,
} from './api';
import type { LeaveRecord, RewardDisciplineRecord } from './types';
import type { CnEmployee } from './types';
import './employees-cn.css';

const route = useRoute();
const auth = useAuthStore();
const canManage = computed(() => auth.role === 'super_admin');
const currentOperator = computed(() => auth.user?.email ?? auth.email ?? null);

const STATE_KEY = 'hr.employees-cn.attendance.ui_state.v1';

const activeTab = ref<'leave' | 'reward'>('leave');
const employees = ref<CnEmployee[]>([]);
const leaveList = ref<(LeaveRecord & { employee_name?: string; employee_no?: string })[]>([]);
const rewardList = ref<(RewardDisciplineRecord & { employee_name?: string; employee_no?: string })[]>([]);
const leaveLoading = ref(false);
const rewardLoading = ref(false);
const leaveFilters = ref({ keyword: '' });
const rewardFilters = ref({ record_type: '' as string, keyword: '' });

function restoreUiState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    const fromQuery = route.query.tab as string;
    if (!fromQuery && s?.activeTab && (s.activeTab === 'leave' || s.activeTab === 'reward')) {
      activeTab.value = s.activeTab;
    }
    if (s?.leaveFilters && typeof s.leaveFilters === 'object' && typeof s.leaveFilters.keyword === 'string') {
      leaveFilters.value.keyword = s.leaveFilters.keyword;
    }
    if (s?.rewardFilters && typeof s.rewardFilters === 'object') {
      if (typeof s.rewardFilters.record_type === 'string') rewardFilters.value.record_type = s.rewardFilters.record_type;
      if (typeof s.rewardFilters.keyword === 'string') rewardFilters.value.keyword = s.rewardFilters.keyword;
    }
  } catch { /* ignore */ }
}

function persistUiState() {
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        activeTab: activeTab.value,
        leaveFilters: leaveFilters.value,
        rewardFilters: rewardFilters.value,
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

watch(
  () => route.query.tab as string,
  (tab) => {
    if (tab === 'leave' || tab === 'reward') activeTab.value = tab;
  },
  { immediate: true }
);
const leaveDurationText = computed(() => {
  const start = leaveForm.value.start_at;
  const end = leaveForm.value.end_at;
  if (!start || !end) return '';
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (b <= a) return '';
  const hours = (b - a) / (1000 * 60 * 60);
  if (hours >= 24) return `约 ${(hours / 24).toFixed(1)} 天`;
  return `约 ${hours.toFixed(1)} 小时`;
});

const leaveVisible = ref(false);
const rewardVisible = ref(false);
const leaveFormRef = ref<FormInstance>();
const rewardFormRef = ref<FormInstance>();
const leaveForm = ref({
  employee_id: '',
  reason: '',
  start_at: null as string | null,
  end_at: null as string | null,
  leave_hours: null as number | null,
});
const rewardForm = ref({
  employee_id: '',
  record_type: 'reward' as 'reward' | 'discipline',
  reason: '',
  amount: null as number | null,
});
const leaveRules: FormRules = {
  employee_id: [{ required: true, message: '请选择员工', trigger: 'change' }],
  reason: [{ required: true, message: '请输入事由', trigger: 'blur' }],
  start_at: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  /* 结束时间非必填，支持归期未知 */
};
const rewardRules: FormRules = {
  employee_id: [{ required: true, message: '请选择员工', trigger: 'change' }],
  record_type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  reason: [{ required: true, message: '请输入原因', trigger: 'blur' }],
};
const saving = ref(false);

const filteredLeaveList = computed(() => {
  let rows = leaveList.value;
  if (leaveFilters.value.keyword.trim()) {
    const k = leaveFilters.value.keyword.trim().toLowerCase();
    rows = rows.filter((r) => (r.employee_name || '').toLowerCase().includes(k) || (r.employee_no || '').toLowerCase().includes(k));
  }
  return rows;
});

const filteredRewardList = computed(() => {
  let rows = rewardList.value;
  if (rewardFilters.value.record_type) rows = rows.filter((r) => r.record_type === rewardFilters.value.record_type);
  if (rewardFilters.value.keyword.trim()) {
    const k = rewardFilters.value.keyword.trim().toLowerCase();
    rows = rows.filter((r) => (r.employee_name || '').toLowerCase().includes(k) || (r.employee_no || '').toLowerCase().includes(k));
  }
  return rows;
});

function formatDate(v: string | null) {
  return v ? new Date(v).toLocaleString('zh-CN') : '—';
}

function isActiveLeave(row: LeaveRecord): boolean {
  return isOnLeaveToday([row]);
}

async function loadEmployees() {
  try {
    employees.value = await fetchEmployees();
  } catch {
    employees.value = [];
  }
}

async function loadLeave() {
  leaveLoading.value = true;
  try {
    const [records, emps] = await Promise.all([fetchLeaveRecords(), fetchEmployees()]);
    employees.value = emps;
    const empInfoMap = new Map(emps.map((e) => [e.id, { name: e.name, employee_no: e.employee_no }]));
    leaveList.value = records.map((r) => {
      const info = empInfoMap.get(r.employee_id);
      return { ...r, employee_name: info?.name ?? '—', employee_no: info?.employee_no ?? '—' };
    });
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    leaveLoading.value = false;
  }
}

async function loadReward() {
  rewardLoading.value = true;
  try {
    const [records, emps] = await Promise.all([fetchRewardDisciplineRecords(), fetchEmployees()]);
    employees.value = emps;
    const empInfoMap = new Map(emps.map((e) => [e.id, { name: e.name, employee_no: e.employee_no }]));
    rewardList.value = records.map((r) => {
      const info = empInfoMap.get(r.employee_id);
      return { ...r, employee_name: info?.name ?? '—', employee_no: info?.employee_no ?? '—' };
    });
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    rewardLoading.value = false;
  }
}

function loadCurrentTab() {
  if (activeTab.value === 'leave') loadLeave();
  else loadReward();
}

function onTabChange() {
  loadCurrentTab();
}

watch(
  () => [leaveForm.value.start_at, leaveForm.value.end_at],
  ([start, end]) => {
    if (!start || !end) return;
    const a = new Date(start as string).getTime();
    const b = new Date(end as string).getTime();
    if (b > a) leaveForm.value.leave_hours = (b - a) / (1000 * 60 * 60);
  },
  { deep: true }
);

function openLeave() {
  leaveForm.value = { employee_id: '', reason: '', start_at: null, end_at: null, leave_hours: null };
  leaveVisible.value = true;
}

async function submitLeave() {
  await leaveFormRef.value?.validate().catch(() => {});
  if (!leaveForm.value.employee_id || !leaveForm.value.reason || !leaveForm.value.start_at) return;
  saving.value = true;
  try {
    await createLeaveRecord({
      employee_id: leaveForm.value.employee_id,
      reason: leaveForm.value.reason,
      start_at: leaveForm.value.start_at,
      end_at: leaveForm.value.end_at,
      operator: currentOperator.value,
      leave_hours: leaveForm.value.leave_hours,
    });
    ElMessage.success('请假已登记');
    leaveVisible.value = false;
    await loadLeave();
    /* 刷新请假列表后员工休假状态会更新，列表已是最新 */
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

function openReward() {
  rewardForm.value = { employee_id: '', record_type: 'reward', reason: '', amount: null };
  rewardVisible.value = true;
}

async function submitReward() {
  await rewardFormRef.value?.validate().catch(() => {});
  if (!rewardForm.value.employee_id || !rewardForm.value.reason) return;
  saving.value = true;
  try {
    await createRewardDisciplineRecord({
      employee_id: rewardForm.value.employee_id,
      reason: rewardForm.value.reason,
      operator: currentOperator.value,
      amount: rewardForm.value.amount,
      record_type: rewardForm.value.record_type,
    });
    ElMessage.success('已记录');
    rewardVisible.value = false;
    await loadReward();
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadEmployees();
  await loadLeave();
  await loadReward();
});
</script>

<style scoped>
.erp-card-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.title { font-size: 16px; font-weight: 600; }
.subtitle { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.leave-duration-text { margin-right: 8px; font-size: 13px; color: var(--el-text-color-secondary); }
</style>
