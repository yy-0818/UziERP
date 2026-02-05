<template>
  <el-dialog v-model="visible" :title="title" width="680px" class="price-history-dialog">
    <div class="history-body">
      <el-timeline>
        <el-timeline-item
          v-for="h in history"
          :key="h.id"
          :timestamp="formatTime(h.valid_from)"
          placement="top"
        >
          <div class="history-card">
            <div class="history-row">
              <span class="history-price">{{ h.price }} {{ h.currency || 'CNY' }}</span>
              <span v-if="h.valid_to" class="history-to">
                截止 {{ formatTime(h.valid_to) }}
              </span>
            </div>
            <template v-if="h.update_reason || h.modifier_email">
              <div v-if="h.update_reason" class="history-reason">
                <span class="history-label">修改理由：</span>{{ h.update_reason }}
              </div>
              <div v-if="h.modifier_email" class="history-modifier">
                <span class="history-label">修改人：</span>{{ h.modifier_email }}
              </div>
            </template>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';

interface HistoryRecord {
  id: number;
  price: number;
  currency: string | null;
  valid_from: string;
  valid_to: string | null;
  update_reason?: string | null;
  modifier_email?: string | null;
}

defineProps<{
  visible: boolean;
  title: string;
  history: HistoryRecord[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

function formatTime(v: string | null) {
  if (!v) return '';
  return dayjs(v).format('YYYY-MM-DD HH:mm');
}

const visible = defineModel<boolean>('visible', { required: true });
</script>

<style scoped>
.price-history-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
  max-height: 65vh;
  overflow-y: auto;
}

.history-body {
  padding-left: 4px;
}

.history-card {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 4px;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.history-price {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.history-to {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-reason,
.history-modifier {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.history-label {
  color: var(--el-text-color-secondary);
  margin-right: 4px;
}
</style>
