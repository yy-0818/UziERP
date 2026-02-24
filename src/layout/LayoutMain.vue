<template>
  <el-main class="erp-main">
    <router-view v-slot="{ Component, route }">
      <Suspense>
        <template #default>
          <transition name="erp-page" mode="out-in" appear>
            <keep-alive :max="8">
              <component :is="Component" :key="mainViewKey(route)" />
            </keep-alive>
          </transition>
        </template>
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
import type { RouteLocationNormalizedLoaded } from 'vue-router';

/** 中国员工子路由（档案/流程/考勤/待办）共用一个父实例，避免切换时父组件重建导致子页重复请求 */
function mainViewKey(route: RouteLocationNormalizedLoaded): string {
  const path = route.path || route.fullPath;
  if (path.startsWith('/hr/employees-cn')) return '/hr/employees-cn';
  return route.fullPath;
}
</script>

<style scoped>
.erp-main {
  flex: 1;
  overflow: auto;
  /* padding: var(--page-padding); */
  padding: 2px;
  background: var(--page-bg);
  /* 主内容区独立渲染层，减少侧边栏折叠触发的重绘 */
  contain: layout;
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

/* 页签切换：先离开再进入，淡入淡出 + 轻微水平滑动 */
.erp-page-enter-active,
.erp-page-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.erp-page-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.erp-page-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

@keyframes erp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
