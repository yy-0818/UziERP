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

const route = useRoute();

type Crumb = { path: string; title: string };

function resolveFromMenu(path: string): { parent: Crumb | null; leaf: Crumb | null } {
  for (const node of rawMenuTree) {
    if (node.type === 'item' && node.index === path) {
      return {
        parent: null,
        leaf: { path: node.index, title: node.title },
      };
    }

    if (node.type === 'group') {
      const child = node.children.find((item) => item.index === path);
      if (child) {
        return {
          parent: { path: '#', title: node.title },
          leaf: { path: child.index, title: child.title },
        };
      }
    }
  }

  return { parent: null, leaf: null };
}

const items = computed(() => {
  const list: Crumb[] = [];
  const meta = route.meta as { title?: string; parentTitle?: string; parentPath?: string };
  const menuResolved = resolveFromMenu(route.path);

  if (meta?.parentTitle) {
    list.push({ path: meta.parentPath || '#', title: meta.parentTitle });
  } else if (menuResolved.parent) {
    list.push(menuResolved.parent);
  }

  if (meta?.title) {
    list.push({ path: route.path, title: meta.title });
  } else if (menuResolved.leaf) {
    list.push(menuResolved.leaf);
  }

  if (list.length === 0) {
    list.push({ path: '/dashboard', title: '总览首页' });
  }

  return list;
});
</script>

<style scoped>
.erp-breadcrumb {
  font-size: 14px;
}
</style>
