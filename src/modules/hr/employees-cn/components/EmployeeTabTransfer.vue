<template>
  <div class="tab-wrap">
    <el-button size="small" @click="load">刷新</el-button>
    <div class="section-title">调岗记录</div>
    <el-table :data="transferList" size="small" stripe border style="margin-top: 8px">
      <el-table-column prop="from_department" label="原部门" width="100" />
      <el-table-column prop="from_position" label="原岗位" width="100" />
      <el-table-column prop="to_department" label="新部门" width="100" />
      <el-table-column prop="to_position" label="新岗位" width="100" />
      <el-table-column prop="transfer_date" label="调岗日期" width="110">
        <template #default="{ row }">{{ formatDate(row.transfer_date) }}</template>
      </el-table-column>
      <el-table-column prop="operator" label="经办人" width="120" />
    </el-table>
    <el-empty v-if="!loading && !transferList.length" description="暂无调岗记录" />
    <div class="section-title" style="margin-top: 16px">调薪记录</div>
    <el-table :data="salaryList" size="small" stripe border style="margin-top: 8px">
      <el-table-column prop="change_date" label="调整日期" width="110">
        <template #default="{ row }">{{ formatDate(row.change_date) }}</template>
      </el-table-column>
      <el-table-column prop="salary_before" label="原工资" width="100" align="right" />
      <el-table-column prop="salary_after" label="现工资" width="100" align="right" />
      <el-table-column prop="operator" label="经办人" width="120" />
    </el-table>
    <el-empty v-if="!loading && !salaryList.length" description="暂无调薪记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchTransferRecords, fetchSalaryChangeRecords } from '../api';
import type { TransferRecord, SalaryChangeRecord } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();

const transferList = ref<TransferRecord[]>([]);
const salaryList = ref<SalaryChangeRecord[]>([]);
const loading = ref(false);

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('zh-CN');
}

async function load() {
  if (!props.employeeId) return;
  loading.value = true;
  try {
    const [t, s] = await Promise.all([
      fetchTransferRecords(props.employeeId),
      fetchSalaryChangeRecords(props.employeeId),
    ]);
    transferList.value = t;
    salaryList.value = s;
  } finally {
    loading.value = false;
  }
}

watch(() => props.employeeId, load, { immediate: true });
</script>

<style scoped>
.tab-wrap { padding: 0; }
.section-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
</style>
