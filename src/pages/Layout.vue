<template>
  <el-container class="erp-layout" :data-sidebar-collapsed="sidebarCollapsed">
    <LayoutSidebar :collapsed="sidebarCollapsed" />
    <el-container class="erp-main-wrap">
      <LayoutHeader :collapsed="sidebarCollapsed" @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />
      <LayoutTagsView :actions="{ refresh: true, closeAll: true }" />
      <LayoutMain />
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LayoutSidebar from '../layout/LayoutSidebar.vue';
import LayoutHeader from '../layout/LayoutHeader.vue';
import LayoutTagsView from '../layout/LayoutTagsView.vue';
import LayoutMain from '../layout/LayoutMain.vue';

const sidebarCollapsed = ref(false);
</script>

<style scoped>
.erp-layout {
  height: 100vh;
  overflow: hidden;
}

.erp-main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
