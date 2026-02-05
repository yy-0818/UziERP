<template>
  <div v-if="loading" class="erp-page-loading">
    <div class="erp-loading-spinner" />
    <span>{{ text }}</span>
  </div>
  <div v-else-if="skeleton" class="erp-skeleton-block">
    <div class="erp-skeleton erp-skeleton-title" />
    <div class="erp-skeleton erp-skeleton-line" />
    <div class="erp-skeleton erp-skeleton-line" />
    <div class="erp-skeleton erp-skeleton-line" />
    <div class="erp-skeleton erp-skeleton-line" style="width: 80%" />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean;
    skeleton?: boolean;
    text?: string;
  }>(),
  {
    loading: false,
    skeleton: false,
    text: '加载中...',
  }
);
</script>

<style scoped>
.erp-skeleton-block {
  padding: 20px;
}
.erp-skeleton-block .erp-skeleton {
  margin-bottom: 12px;
}
.erp-skeleton-block .erp-skeleton:last-child {
  margin-bottom: 0;
}
</style>
