<template>
  <div class="tab-wrap">
    <div v-if="canManage" class="tab-actions">
      <el-button type="primary" size="small" @click="openApply">申请机票</el-button>
    </div>
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="depart_city" label="出发城市" min-width="100" />
      <el-table-column prop="arrive_city" label="到达城市" min-width="100" />
      <el-table-column prop="expected_departure_at" label="计划出发" width="110">
        <template #default="{ row }">{{ formatDate(row.expected_departure_at) }}</template>
      </el-table-column>
      <el-table-column prop="planned_return_at" label="计划返回" width="110">
        <template #default="{ row }">{{ formatDate(row.planned_return_at) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">{{ row.status === 'done' ? '已办理' : '待办理' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <template v-if="row.status === 'pending' && canManage">
            <el-button link type="primary" size="small" @click="openHandle(row)">办理</el-button>
          </template>
          <template v-if="row.status === 'done'">
            <el-button link type="primary" size="small" @click="viewHandleDetail(row)">查看</el-button>
            <el-button v-if="canManage" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无机票记录" />

    <!-- 申请机票 -->
    <el-dialog v-model="applyVisible" title="申请机票" width="480px" append-to-body>
      <el-alert v-if="visaBlocked && canManage" type="warning" :closable="false" style="margin-bottom: 12px">
        该员工当前无有效签证或剩余次数为0，请先办理签证。
      </el-alert>
      <el-form ref="applyFormRef" :model="applyForm" label-width="100px">
        <el-form-item label="出发城市">
          <el-select v-model="applyForm.depart_city" filterable allow-create placeholder="请选择或输入" style="width: 100%">
            <el-option v-for="c in CITY_OPTIONS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="到达城市">
          <el-select v-model="applyForm.arrive_city" filterable allow-create placeholder="请选择或输入" style="width: 100%">
            <el-option v-for="c in CITY_OPTIONS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划出发日期">
          <el-date-picker v-model="applyForm.expected_departure_at" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计划返回日期">
          <el-date-picker v-model="applyForm.planned_return_at" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="applyForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="visaBlocked" @click="submitApply">提交</el-button>
      </template>
    </el-dialog>

    <!-- 办理机票 -->
    <el-dialog v-model="handleVisible" title="办理机票" width="560px" append-to-body>
      <el-form ref="handleFormRef" :model="handleForm" label-width="110px">
        <template v-if="!isEditMode">
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
        </template>
        <el-form-item label="实际出发日期">
          <el-date-picker v-model="handleForm.actual_departure_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="实际抵达时间">
          <el-date-picker v-model="handleForm.arrival_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="航班信息">
          <el-input v-model="handleForm.flight_info" placeholder="航班号等信息" />
        </el-form-item>
        <el-form-item label="机票票价">
          <el-input-number v-model="handleForm.ticket_amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="费用承担方">
          <el-select v-model="handleForm.cost_bearer" filterable allow-create placeholder="请选择或输入" style="width: 100%">
            <el-option label="公司" value="公司" />
            <el-option label="个人" value="个人" />
          </el-select>
        </el-form-item>
        <el-form-item label="出票方">
          <el-select v-model="handleForm.issuer_company" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in ISSUER_TYPE_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批人">
          <el-input v-model="handleForm.approver" placeholder="审批人签字记录" />
        </el-form-item>
        <el-form-item label="机票附件">
          <div class="form-attachment-upload">
            <el-upload :show-file-list="false" :http-request="handleTicketAttachmentUpload">
              <el-button type="primary" plain size="small">上传附件</el-button>
            </el-upload>
            <el-button v-if="handleForm.ticket_image_url" type="danger" link size="small" @click="handleForm.ticket_image_url = null">清除</el-button>
            <span v-if="handleForm.ticket_image_url" class="attachment-hint">已选文件</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitHandle">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑机票（独立弹窗） -->
    <el-dialog v-model="editVisible" title="编辑机票办理" width="560px" append-to-body>
      <el-form :model="editForm" label-width="110px">
        <el-form-item label="实际出发日期">
          <el-date-picker v-model="editForm.actual_departure_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="实际抵达时间">
          <el-date-picker v-model="editForm.arrival_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="航班信息">
          <el-input v-model="editForm.flight_info" placeholder="航班号等信息" />
        </el-form-item>
        <el-form-item label="机票票价">
          <el-input-number v-model="editForm.ticket_amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="费用承担方">
          <el-select v-model="editForm.cost_bearer" filterable allow-create placeholder="请选择或输入" style="width: 100%">
            <el-option label="公司" value="公司" />
            <el-option label="个人" value="个人" />
          </el-select>
        </el-form-item>
        <el-form-item label="出票方">
          <el-select v-model="editForm.issuer_company" placeholder="请选择" style="width: 100%">
            <el-option v-for="opt in ISSUER_TYPE_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批人">
          <el-input v-model="editForm.approver" placeholder="审批人签字记录" />
        </el-form-item>
        <el-form-item label="机票附件">
          <div class="form-attachment-upload">
            <el-upload :show-file-list="false" :http-request="handleEditAttachmentUpload">
              <el-button type="primary" plain size="small">上传附件</el-button>
            </el-upload>
            <el-button v-if="editForm.ticket_image_url" type="danger" link size="small" @click="editForm.ticket_image_url = null">清除</el-button>
            <span v-if="editForm.ticket_image_url" class="attachment-hint">已选文件</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看机票办理详情 -->
    <el-dialog v-model="viewDialogVisible" title="机票办理详情" width="520px" append-to-body>
      <template v-if="viewHandleData">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="实际出发日期">{{ formatDateTime(viewHandleData.actual_departure_at) }}</el-descriptions-item>
          <el-descriptions-item label="实际抵达时间">{{ formatDateTime(viewHandleData.arrival_at) }}</el-descriptions-item>
          <el-descriptions-item label="出发城市">{{ viewHandleData.depart_city || '—' }}</el-descriptions-item>
          <el-descriptions-item label="到达城市">{{ viewHandleData.arrive_city || '—' }}</el-descriptions-item>
          <el-descriptions-item label="航班信息">{{ viewHandleData.flight_info || '—' }}</el-descriptions-item>
          <el-descriptions-item label="机票票价">{{ viewHandleData.ticket_amount != null ? viewHandleData.ticket_amount : '—' }}</el-descriptions-item>
          <el-descriptions-item label="费用承担方">{{ viewHandleData.cost_bearer || '—' }}</el-descriptions-item>
          <el-descriptions-item label="出票方">{{ viewHandleData.issuer_company || '—' }}</el-descriptions-item>
          <el-descriptions-item label="审批人">{{ viewHandleData.approver || '—' }}</el-descriptions-item>
          <el-descriptions-item label="入境次数">{{ viewHandleData.entry_count ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ viewHandleData.operator || '—' }}</el-descriptions-item>
          <el-descriptions-item label="附件">
            <el-button v-if="viewHandleData.ticket_image_url" link type="primary" size="small" @click="openAttachment(viewHandleData.ticket_image_url!)">查看/下载</el-button>
            <span v-else>—</span>
          </el-descriptions-item>
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
  fetchFlightApplications,
  fetchFlightHandleByApplicationId,
  createFlightApplication,
  createFlightHandle,
  updateFlightHandle,
  fetchValidVisasForEmployee,
  uploadEmployeeFile,
  getSignedUrl,
} from '../api';
import type { FlightApplication, FlightHandle } from '../types';
import type { VisaHandle } from '../types';
import { CITY_OPTIONS, ISSUER_TYPE_OPTIONS } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();
const auth = useAuthStore();
const submittedBy = computed(() => auth.accountDisplay || null);

const list = ref<FlightApplication[]>([]);
const validVisas = ref<VisaHandle[]>([]);
const visaBlocked = computed(() => !validVisas.value.length);
const loading = ref(false);
const applyVisible = ref(false);
const saving = ref(false);
const handleVisible = ref(false);
const editVisible = ref(false);
const isEditMode = ref(false);
const currentEditHandleId = ref<string | null>(null);
const applyForm = ref({
  depart_city: '',
  arrive_city: '',
  expected_departure_at: null as string | null,
  planned_return_at: null as string | null,
  remark: '',
});
const handleForm = ref({
  visa_handle_id: '' as string,
  entry_count: 1,
  actual_departure_at: null as string | null,
  arrival_at: null as string | null,
  actual_return_at: null as string | null,
  depart_city: null as string | null,
  arrive_city: null as string | null,
  flight_info: null as string | null,
  ticket_amount: null as number | null,
  ticket_image_url: null as string | null,
  issuer_company: null as string | null,
  cost_bearer: null as string | null,
  approver: null as string | null,
});
const currentApply = ref<FlightApplication | null>(null);

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('zh-CN');
}

function formatDateTime(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('zh-CN');
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
  applyForm.value = { depart_city: '', arrive_city: '', expected_departure_at: null, planned_return_at: null, remark: '' };
  applyVisible.value = true;
}

async function submitApply() {
  if (!validVisas.value.length) {
    ElMessage.warning('该员工当前无有效签证或剩余次数为0，请先办理签证');
    return;
  }
  saving.value = true;
  try {
    await createFlightApplication({
      employee_id: props.employeeId,
      depart_city: applyForm.value.depart_city || null,
      arrive_city: applyForm.value.arrive_city || null,
      expected_departure_at: applyForm.value.expected_departure_at,
      planned_return_at: applyForm.value.planned_return_at || null,
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
  isEditMode.value = false;
  currentEditHandleId.value = null;
  currentApply.value = row;
  handleForm.value = {
    visa_handle_id: validVisas.value[0]?.id ?? '',
    entry_count: 1,
    actual_departure_at: null,
    arrival_at: null,
    actual_return_at: null,
    depart_city: row.depart_city ?? null,
    arrive_city: row.arrive_city ?? null,
    flight_info: null,
    ticket_amount: null,
    ticket_image_url: null,
    issuer_company: null,
    cost_bearer: null,
    approver: null,
  };
  handleVisible.value = true;
}

const editForm = ref({
  actual_departure_at: null as string | null,
  arrival_at: null as string | null,
  flight_info: null as string | null,
  ticket_amount: null as number | null,
  ticket_image_url: null as string | null,
  issuer_company: null as string | null,
  cost_bearer: null as string | null,
  approver: null as string | null,
});

async function openEdit(row: FlightApplication) {
  const h = await fetchFlightHandleByApplicationId(row.id);
  if (!h) {
    ElMessage.warning('未找到办理记录');
    return;
  }
  currentEditHandleId.value = h.id;
  editForm.value = {
    actual_departure_at: h.actual_departure_at,
    arrival_at: h.arrival_at,
    flight_info: h.flight_info ?? null,
    ticket_amount: h.ticket_amount,
    ticket_image_url: h.ticket_image_url,
    issuer_company: h.issuer_company ?? null,
    cost_bearer: h.cost_bearer ?? null,
    approver: h.approver ?? null,
  };
  editVisible.value = true;
}

async function handleEditAttachmentUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('flight', options.file.name, options.file);
    editForm.value.ticket_image_url = path;
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}

async function submitEdit() {
  if (!currentEditHandleId.value) return;
  saving.value = true;
  try {
    await updateFlightHandle(currentEditHandleId.value, {
      actual_departure_at: editForm.value.actual_departure_at,
      arrival_at: editForm.value.arrival_at,
      flight_info: editForm.value.flight_info,
      ticket_amount: editForm.value.ticket_amount,
      ticket_image_url: editForm.value.ticket_image_url,
      issuer_company: editForm.value.issuer_company,
      cost_bearer: editForm.value.cost_bearer,
      approver: editForm.value.approver,
      operator: auth.accountDisplay || null,
    });
    ElMessage.success('已保存');
    editVisible.value = false;
    currentEditHandleId.value = null;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

const viewDialogVisible = ref(false);
const viewHandleData = ref<FlightHandle | null>(null);

async function viewHandleDetail(row: FlightApplication) {
  const h = await fetchFlightHandleByApplicationId(row.id);
  if (!h) {
    ElMessage.warning('未找到办理记录');
    return;
  }
  viewHandleData.value = h;
  viewDialogVisible.value = true;
}

async function handleTicketAttachmentUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('flight', options.file.name, options.file);
    handleForm.value.ticket_image_url = path;
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
      ticket_image_url: handleForm.value.ticket_image_url,
      issuer_company: handleForm.value.issuer_company,
      operator: auth.accountDisplay || null,
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
.form-attachment-upload { display: flex; align-items: center; gap: 8px; }
.attachment-hint { font-size: 12px; color: var(--el-text-color-secondary); }
</style>
