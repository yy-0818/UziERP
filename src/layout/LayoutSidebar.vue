<template>
  <el-aside :width="sidebarWidth" class="erp-aside">
    <div class="erp-logo">
      <span v-show="!collapsed" class="erp-logo-text">ERP</span>
      <span v-show="collapsed" class="erp-logo-text erp-logo-text--short">E</span>
    </div>
    <el-menu
      :default-active="active"
      :collapse="collapsed"
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
  Setting,
  FolderOpened,
} from '@element-plus/icons-vue';
import type { Component } from 'vue';
import { filterMenuByRole, rawMenuTree } from './config/menuConfig';
import type { MenuNode } from './config/types';
import { useAuthStore } from '../stores/auth';

const props = defineProps<{
  collapsed: boolean;
}>();

const route = useRoute();
const auth = useAuthStore();

const sidebarWidth = computed(() => (props.collapsed ? '64px' : '220px'));
const active = computed(() => route.path);

const menuTree = computed<MenuNode[]>(() =>
  filterMenuByRole(rawMenuTree, auth.role)
);

const iconMap: Record<string, Component> = {
  Odometer,
  Money,
  Document,
  User,
  Setting,
  FolderOpened,
};

function iconComponent(name: string | undefined): Component | undefined {
  return name ? iconMap[name] : undefined;
}
</script>

<style scoped>
.erp-aside {
  background: var(--sidebar-bg);
  transition: width var(--transition-normal);
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
}
</style>
