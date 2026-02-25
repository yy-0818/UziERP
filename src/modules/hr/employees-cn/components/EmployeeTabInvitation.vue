<template>
  <div class="tab-wrap">
    <div v-if="canManage" class="tab-actions">
      <el-button type="primary" size="small" @click="openApply">申请邀请函</el-button>
    </div>
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="submitted_at" label="提交时间" min-width="160">
        <template #default="{ row }">{{ formatDate(row.submitted_at) }}</template>
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
            <el-button link type="primary" size="small" @click="viewHandle(row)">查看</el-button>
            <el-button v-if="canManage" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无邀请函记录" />

    <!-- 申请邀请函 -->
    <el-dialog v-model="applyVisible" title="申请邀请函" width="400px" append-to-body>
      <p>确认为该员工提交邀请函申请？</p>
      <template #footer>
        <el-button @click="applyVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitApply">提交</el-button>
      </template>
    </el-dialog>

    <!-- 办理/编辑邀请函 -->
    <el-dialog v-model="handleVisible" :title="isEditMode ? '编辑邀请函' : '办理邀请函'" width="500px" append-to-body @close="isEditMode = false; currentEditHandleId = null">
      <el-form ref="handleFormRef" :model="handleForm" label-width="100px">
        <el-form-item label="出函时间">
          <el-date-picker v-model="handleForm.letter_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="费用金额">
          <el-input-number v-model="handleForm.fee_amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="邀请函附件" required>
          <div class="form-attachment-upload">
            <input ref="fileRef" type="file" style="display: none" @change="onFileChange" />
            <el-button size="small" @click="fileRef?.click()">上传附件</el-button>
            <el-button v-if="handleForm.letter_image_url" type="danger" link size="small" @click="handleForm.letter_image_url = null">清除</el-button>
            <span v-if="handleForm.letter_image_url" class="attachment-hint">已选文件</span>
          </div>
          <div v-if="!handleForm.letter_image_url" class="form-hint form-hint--required">必须上传邀请函附件</div>
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
import { ElMessage, type FormInstance } from 'element-plus';
import { useAuthStore } from '../../../../stores/auth';
import {
  fetchInvitationApplications,
  fetchInvitationHandleByApplicationId,
  createInvitationApplication,
  createInvitationHandle,
  updateInvitationHandle,
  uploadEmployeeFile,
  getSignedUrl,
} from '../api';
import type { InvitationApplication, InvitationHandle } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();
const emit = defineEmits<{ (e: 'refresh'): void }>();
const auth = useAuthStore();
const submittedBy = computed(() => auth.email || null);

const list = ref<InvitationApplication[]>([]);
const loading = ref(false);
const applyVisible = ref(false);
const saving = ref(false);
const handleVisible = ref(false);
const isEditMode = ref(false);
const currentEditHandleId = ref<string | null>(null);
const handleFormRef = ref<FormInstance>();
const handleForm = ref({
  letter_date: null as string | null,
  fee_amount: null as number | null,
  letter_image_url: null as string | null,
});
const currentApply = ref<InvitationApplication | null>(null);
const fileRef = ref<HTMLInputElement | null>(null);

function formatDate(v: string) {
  if (!v) return '—';
  return new Date(v).toLocaleString('zh-CN');
}

async function load() {
  if (!props.employeeId) return;
  loading.value = true;
  try {
    list.value = await fetchInvitationApplications(props.employeeId);
  } finally {
    loading.value = false;
  }
}

watch(() => props.employeeId, load, { immediate: true });

function openApply() {
  applyVisible.value = true;
}

async function submitApply() {
  saving.value = true;
  try {
    await createInvitationApplication({
      employee_id: props.employeeId,
      submitted_by: submittedBy.value,
    });
    ElMessage.success('申请已提交');
    applyVisible.value = false;
    await load();
    emit('refresh');
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

function openHandle(row: InvitationApplication) {
  isEditMode.value = false;
  currentEditHandleId.value = null;
  currentApply.value = row;
  handleForm.value = { letter_date: null, fee_amount: null, letter_image_url: null };
  handleVisible.value = true;
}

async function openEdit(row: InvitationApplication) {
  const h = await fetchInvitationHandleByApplicationId(row.id);
  if (!h) {
    ElMessage.warning('未找到办理记录');
    return;
  }
  isEditMode.value = true;
  currentEditHandleId.value = h.id;
  currentApply.value = row;
  handleForm.value = {
    letter_date: h.letter_date,
    fee_amount: h.fee_amount,
    letter_image_url: h.letter_image_url,
  };
  handleVisible.value = true;
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const path = await uploadEmployeeFile('invitation', file.name, file);
    handleForm.value.letter_image_url = path;
    ElMessage.success('附件已选择');
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
  input.value = '';
}

async function submitHandle() {
  if (!handleForm.value.letter_image_url) {
    ElMessage.warning('请上传邀请函附件，附件为必传项');
    return;
  }

  if (isEditMode.value && currentEditHandleId.value) {
    saving.value = true;
    try {
      await updateInvitationHandle(currentEditHandleId.value, {
        letter_date: handleForm.value.letter_date,
        letter_image_url: handleForm.value.letter_image_url,
        fee_amount: handleForm.value.fee_amount,
        operator: submittedBy.value,
      });
      ElMessage.success('已保存');
      handleVisible.value = false;
      isEditMode.value = false;
      currentEditHandleId.value = null;
      await load();
      emit('refresh');
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败');
    } finally {
      saving.value = false;
    }
    return;
  }

  if (!currentApply.value) return;
  saving.value = true;
  try {
    await createInvitationHandle({
      application_id: currentApply.value.id,
      letter_date: handleForm.value.letter_date,
      letter_image_url: handleForm.value.letter_image_url,
      fee_amount: handleForm.value.fee_amount,
      operator: submittedBy.value,
    });
    ElMessage.success('办理完成');
    handleVisible.value = false;
    currentApply.value = null;
    await load();
    emit('refresh');
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function viewHandle(row: InvitationApplication) {
  const h = await fetchInvitationHandleByApplicationId(row.id);
  if (h?.letter_image_url) {
    try {
      const url = await getSignedUrl(h.letter_image_url);
      window.open(url, '_blank');
    } catch {
      ElMessage.warning('无法打开附件');
    }
  } else {
    ElMessage.info('暂无邀请函附件');
  }
}
</script>

<style scoped>
.tab-wrap { padding: 0; }
.tab-actions { margin-bottom: 0; display: flex; gap: 8px; }
.form-attachment-upload { display: flex; align-items: center; gap: 8px; }
.attachment-hint { font-size: 12px; color: var(--el-text-color-secondary); }
.form-hint { font-size: 12px; color: var(--el-text-color-placeholder); margin-top: 4px; }
.form-hint--required { color: var(--el-color-danger); }
</style>
