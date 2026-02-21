<template>
  <div class="tab-wrap">
    <el-table :data="list" size="small" stripe border style="margin-top: 12px">
      <el-table-column prop="record_type" label="类型" width="90">
        <template #default="{ row }">{{ row.record_type === 'reward' ? '奖励' : '违纪' }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
      <el-table-column prop="amount" label="金额" width="100" align="right" />
      <el-table-column prop="operator" label="经办人" width="120" />
      <el-table-column prop="created_at" label="时间" width="160">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && list.length === 0" description="暂无奖惩记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchRewardDisciplineRecords } from '../api';
import type { RewardDisciplineRecord } from '../types';

const props = defineProps<{ employeeId: string; canManage: boolean }>();

const list = ref<RewardDisciplineRecord[]>([]);
const loading = ref(false);

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('zh-CN');
}

async function load() {
  if (!props.employeeId) return;
  loading.value = true;
  try {
    list.value = await fetchRewardDisciplineRecords(props.employeeId);
  } finally {
    loading.value = false;
  }
}

watch(() => props.employeeId, load, { immediate: true });
</script>

<style scoped>
.tab-wrap { padding: 0; }
</style>
