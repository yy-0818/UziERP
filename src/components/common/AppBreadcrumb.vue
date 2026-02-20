<template>
  <el-breadcrumb class="erp-breadcrumb" separator="/">
    <el-breadcrumb-item v-for="(item, i) in items" :key="i">
      <router-link v-if="i < items.length - 1 && item.path && item.path !== '#'" :to="item.path">{{ item.title }}</router-link>
      <span v-else>{{ item.title }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { rawMenuTree } from '../../layout/config/menuConfig';
import type { MenuNode } from '../../layout/config/types';

const route = useRoute();

type Crumb = { path: string; title: string };

/** 在菜单树中递归查找 path，返回从根到当前项的层级面包屑（含嵌套：员工管理 → 中国员工 → 档案管理） */
function resolveCrumbsFromMenu(nodes: MenuNode[], path: string, parents: Crumb[]): Crumb[] | null {
  for (const node of nodes) {
    if (node.type === 'item') {
      if (node.index === path) {
        return [...parents, { path: node.index, title: node.title }];
      }
      continue;
    }
    const found = resolveCrumbsFromMenu(node.children, path, [...parents, { path: '#', title: node.title }]);
    if (found) return found;
  }
  return null;
}

const items = computed(() => {
  const meta = route.meta as { title?: string; parentTitle?: string; parentPath?: string };
  const crumbs = resolveCrumbsFromMenu(rawMenuTree, route.path, []);

  if (meta?.parentTitle) {
    return [
      { path: meta.parentPath || '#', title: meta.parentTitle },
      { path: route.path, title: meta.title || '' },
    ].filter((c) => c.title);
  }
  if (crumbs && crumbs.length > 0) {
    return crumbs.map((c) => ({ ...c, path: c.path === '#' ? c.path : c.path }));
  }
  if (meta?.title) {
    return [{ path: route.path, title: meta.title }];
  }
  return [{ path: '/dashboard', title: '总览首页' }];
});
</script>

<style scoped>
.erp-breadcrumb {
  font-size: 14px;
}
</style>
