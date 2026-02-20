<template>
  <div class="tab-wrap">
    <el-button size="small" @click="load">刷新</el-button>
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="reason" label="事由" min-width="120" show-overflow-tooltip />
      <el-table-column prop="start_at" label="开始" width="150">
        <template #default="{ row }">{{ formatDate(row.start_at) }}</template>
      </el-table-column>
      <el-table-column prop="end_at" label="结束" width="150">
        <template #default="{ row }">{{ formatDate(row.end_at) }}</template>
      </el-table-column>
      <el-table-column prop="leave_hours" label="时长(小时)" width="100" />
      <el-table-column prop="operator" label="经办人" width="120" />
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无请假记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchLeaveRecords } from '../api';
import type { LeaveRecord } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();

const list = ref<LeaveRecord[]>([]);
const loading = ref(false);

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('zh-CN');
}

async function load() {
  if (!props.employeeId) return;
  loading.value = true;
  try {
    list.value = await fetchLeaveRecords(props.employeeId);
  } finally {
    loading.value = false;
  }
}

watch(() => props.employeeId, load, { immediate: true });
</script>

<style scoped>
.tab-wrap { padding: 0; }
</style>
