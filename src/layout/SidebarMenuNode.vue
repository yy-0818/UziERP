<template>
  <template v-if="node.type === 'item'">
    <el-menu-item :index="node.index">
      <el-icon v-if="iconComponent && node.icon"><component :is="iconComponent(node.icon)" /></el-icon>
      <template #title>
        <span>{{ node.title }}</span>
        <el-badge v-if="node.badge != null && node.badge > 0" is-dot />
      </template>
    </el-menu-item>
  </template>
  <el-sub-menu v-else :index="node.index">
    <template #title>
      <el-icon v-if="iconComponent && node.icon"><component :is="iconComponent(node.icon)" /></el-icon>
      <span>{{ node.title }}</span>
    </template>
    <sidebar-menu-node
      v-for="child in node.children"
      :key="child.index"
      :node="child"
      :icon-component="iconComponent"
    />
  </el-sub-menu>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import type { MenuNode } from './config/types';

defineOptions({ name: 'SidebarMenuNode' });

defineProps<{
  node: MenuNode;
  iconComponent?: (name: string | undefined) => Component | undefined;
}>();
</script>

