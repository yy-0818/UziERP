<template>
  <el-main class="erp-main">
    <router-view v-slot="{ Component }">
      <Suspense>
        <component :is="Component" />
        <template #fallback>
          <div class="erp-page-loading">
            <div class="erp-loading-spinner" />
            <span>加载中...</span>
          </div>
        </template>
      </Suspense>
    </router-view>
  </el-main>
</template>

<script setup lang="ts">
</script>

<style scoped>
.erp-main {
  flex: 1;
  overflow: auto;
  padding: var(--page-padding);
  background: var(--page-bg);
}

.erp-page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
  color: var(--text-secondary);
  font-size: 14px;
}

.erp-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--erp-primary);
  border-radius: 50%;
  animation: erp-spin 0.8s linear infinite;
}

@keyframes erp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
