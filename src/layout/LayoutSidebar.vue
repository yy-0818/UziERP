<template>
  <el-aside :width="sidebarWidth" class="erp-aside">
    <div class="erp-logo">
      <span v-show="!layout.sidebarCollapsed" class="erp-logo-text">ERP</span>
      <span v-show="layout.sidebarCollapsed" class="erp-logo-text erp-logo-text--short">E</span>
    </div>
    <el-menu
      :default-active="active"
      :collapse="layout.sidebarCollapsed"
      :collapse-transition="false"
      router
      unique-opened
      class="erp-menu"
      background-color="var(--sidebar-bg)"
      text-color="var(--sidebar-text)"
      active-text-color="var(--sidebar-text-active)"
    >
      <template v-for="node in menuTree" :key="node.index">
        <el-menu-item v-if="node.type === 'item'" :index="node.index">
          <el-icon v-if="node.icon"><component :is="iconComponent(node.icon)" /></el-icon>
          <template #title>{{ node.title }}</template>
        </el-menu-item>
        <el-sub-menu v-else :index="node.index">
          <template #title>
            <el-icon v-if="node.icon"><component :is="iconComponent(node.icon)" /></el-icon>
            <span>{{ node.title }}</span>
          </template>
          <el-menu-item
            v-for="child in node.children"
            :key="child.index"
            :index="child.index"
          >
            {{ child.title }}
          </el-menu-item>
        </el-sub-menu>
      </template>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  Odometer,
  Money,
  Document,
  User,
  Setting as SettingIcon,
  Tools,
  FolderOpened,
} from '@element-plus/icons-vue';
import type { Component } from 'vue';
import { filterMenuByRole, rawMenuTree } from './config/menuConfig';
import type { MenuNode } from './config/types';
import { useAuthStore } from '../stores/auth';
import { useLayoutStore } from '../stores/layout';

const route = useRoute();
const auth = useAuthStore();
const layout = useLayoutStore();

const sidebarWidth = computed(() => (layout.sidebarCollapsed ? '64px' : '220px'));
const active = computed(() => route.path);

const menuTree = computed<MenuNode[]>(() =>
  filterMenuByRole(rawMenuTree, auth.role)
);

const iconMap: Record<string, Component> = {
  Odometer,
  Money,
  Document,
  User,
  Setting: SettingIcon,
  Tools,
  FolderOpened,
};

function iconComponent(name: string | undefined): Component | undefined {
  return name ? (iconMap[name] ?? FolderOpened) : FolderOpened;
}
</script>

<style scoped>
.erp-aside {
  background: var(--sidebar-bg);
  transition: width 0.15s cubic-bezier(0.25, 0, 0.2, 1);
  overflow: hidden;
  will-change: width;
  /* 提升到独立合成层，动画由 GPU 处理，减少主线程卡顿 */
  transform: translateZ(0);
  /* 侧边栏独立布局层，避免影响主内容重排 */
  contain: layout style;
}

.erp-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.erp-logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.erp-logo-text--short {
  font-size: 20px;
}

.erp-menu {
  border-right: none;
  transition: none !important;
}

.erp-menu :deep(.el-sub-menu__title),
.erp-menu :deep(.el-menu-item) {
  transition: background-color var(--transition-fast), color var(--transition-fast);
}
</style>
