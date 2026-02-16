<template>
  <div ref="layoutRef" class="erp-layout">
    <LayoutSidebar />
    <el-container class="erp-main-wrap">
      <LayoutHeader />
      <LayoutTagsView :actions="{ refresh: true, closeAll: true }" />
      <LayoutMain />
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useLayoutStore } from '../stores/layout';
import LayoutSidebar from '../layout/LayoutSidebar.vue';
import LayoutHeader from '../layout/LayoutHeader.vue';
import LayoutTagsView from '../layout/LayoutTagsView.vue';
import LayoutMain from '../layout/LayoutMain.vue';

const layoutRef = ref<HTMLElement | null>(null);
const layout = useLayoutStore();

function syncSidebarAttr() {
  const el = layoutRef.value;
  if (el) el.setAttribute('data-sidebar-collapsed', String(layout.sidebarCollapsed));
}

watch(() => layout.sidebarCollapsed, syncSidebarAttr);
onMounted(syncSidebarAttr);
</script>

<style scoped>
.erp-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
}

.erp-main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  /* 隔离主内容区布局，侧边栏折叠时减少重排范围 */
  contain: layout style;
}
</style>
