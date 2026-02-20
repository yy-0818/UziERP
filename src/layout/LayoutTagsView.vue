<template>
  <div class="erp-tags-view">
    <el-tabs
      :model-value="activeTab"
      class="erp-tabs"
      @tab-click="onTabClick"
      @tab-remove="onTabRemove"
    >
      <el-tab-pane
        v-for="tag in visitedViews"
        :key="tag.fullPath"
        :name="tag.fullPath"
        :closable="tag.closable"
      >
        <template #label>
          <span class="erp-tab-label">
            <el-icon v-if="tag.path === '/dashboard'"><House /></el-icon>
            <span>{{ tag.title }}</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <el-dropdown v-if="tabActions.refresh || tabActions.closeAll" trigger="click" @command="onActionCommand">
      <el-button text class="erp-tabs-more-btn">
        <el-icon><Setting /></el-icon>
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="tabActions.refresh" command="refresh">
            <el-icon><RefreshRight /></el-icon>
            <span>刷新当前页</span>
          </el-dropdown-item>
          <el-dropdown-item v-if="tabActions.closeAll" command="close-all">
            <el-icon><CloseBold /></el-icon>
            <span>关闭全部页签</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router';
import type { TabPaneName } from 'element-plus';
import { House, RefreshRight, CloseBold, Setting, ArrowDown } from '@element-plus/icons-vue';

interface VisitedView {
  fullPath: string;
  path: string;
  title: string;
  closable: boolean;
}

const props = withDefaults(
  defineProps<{
    actions?: {
      refresh?: boolean;
      closeAll?: boolean;
    };
  }>(),
  {
    actions: () => ({
      refresh: true,
      closeAll: true,
    }),
  }
);

const FIXED_TAG: VisitedView = {
  fullPath: '/dashboard',
  path: '/dashboard',
  title: '总览首页',
  closable: false,
};
const TAGS_STORAGE_KEY = 'uzi.tags-view';

const router = useRouter();
const route = useRoute();
const visitedViews = ref<VisitedView[]>([FIXED_TAG]);

const activeTab = computed(() => route.fullPath || route.path);
const tabActions = computed(() => ({
  refresh: props.actions?.refresh !== false,
  closeAll: props.actions?.closeAll !== false,
}));

function normalizeViews(input: unknown): VisitedView[] {
  if (!Array.isArray(input)) return [FIXED_TAG];

  const uniq = new Map<string, VisitedView>();
  uniq.set(FIXED_TAG.fullPath, FIXED_TAG);

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const fullPath = String((raw as { fullPath?: string }).fullPath || '').trim();
    const path = String((raw as { path?: string }).path || '').trim();
    const title = String((raw as { title?: string }).title || '').trim();
    if (!fullPath || !path || !title || path === '/login') continue;

    uniq.set(fullPath, {
      fullPath,
      path,
      title,
      closable: path !== '/dashboard',
    });
  }

  return [...uniq.values()];
}

function restoreViews() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    if (!raw) return;
    visitedViews.value = normalizeViews(JSON.parse(raw));
  } catch {
    visitedViews.value = [FIXED_TAG];
  }
}

function persistViews() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(visitedViews.value));
}

function getRouteTitle(to: RouteLocationNormalizedLoaded): string {
  const title = (to.meta?.title as string | undefined)?.trim();
  if (title) return title;
  if (typeof to.name === 'string' && to.name) return to.name;
  return to.path || '未命名页面';
}

/** 仅用 path 作为 tab 标识的路由（query 不参与，避免待办跳转等产生重复 tab） */
const PATH_ONLY_TAB_PATHS = ['/hr/employees-cn/archives'];

function addView(to: RouteLocationNormalizedLoaded) {
  if (!to.path || to.path === '/login') return;
  const usePathOnly = PATH_ONLY_TAB_PATHS.includes(to.path);
  const fullPath = usePathOnly ? to.path : (to.fullPath || to.path);
  if (visitedViews.value.some((view) => view.fullPath === fullPath)) return;

  visitedViews.value.push({
    fullPath,
    path: to.path,
    title: getRouteTitle(to),
    closable: to.path !== '/dashboard',
  });
}

function removeView(fullPath: string) {
  const idx = visitedViews.value.findIndex((item) => item.fullPath === fullPath);
  if (idx === -1) return;
  const removed = visitedViews.value[idx];
  if (!removed.closable) return;

  visitedViews.value.splice(idx, 1);

  if (activeTab.value !== fullPath) return;

  const fallback = visitedViews.value[idx] || visitedViews.value[idx - 1] || FIXED_TAG;
  router.push(fallback.fullPath);
}

function onTabClick(tab: { paneName: TabPaneName }) {
  const paneName = tab.paneName;
  if (!paneName || typeof paneName !== 'string') return;
  if (paneName !== activeTab.value) router.push(paneName);
}

function onTabRemove(name: TabPaneName) {
  if (!name || typeof name !== 'string') return;
  removeView(name);
}

function refreshCurrent() {
  router.go(0);
}

function closeAllViews() {
  visitedViews.value = [FIXED_TAG];
  if (route.path !== FIXED_TAG.path) {
    router.push(FIXED_TAG.path);
  }
}

function onActionCommand(command: string) {
  if (command === 'refresh') refreshCurrent();
  if (command === 'close-all') closeAllViews();
}

watch(
  () => route.fullPath,
  () => addView(route),
  { immediate: true }
);

watch(
  visitedViews,
  () => persistViews(),
  { deep: true }
);

restoreViews();
addView(route);
</script>

<style scoped>
.erp-tags-view {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 4px 12px;
  border-bottom: 1px solid var(--header-border);
  background: var(--header-bg);
  overflow: hidden;
}

.erp-tabs {
  width: 100%;
  min-width: 0;
}

.erp-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.erp-tabs :deep(.el-tabs__nav-wrap) {
  overflow: hidden;
}

.erp-tabs :deep(.el-tabs__item) {
  transition: all var(--transition-fast);
}

.erp-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.erp-tabs-more-btn {
  color: var(--text-secondary);
  flex-shrink: 0;
}
</style>
