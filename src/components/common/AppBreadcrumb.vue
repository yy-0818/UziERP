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

const route = useRoute();

const items = computed(() => {
  const list: { path: string; title: string }[] = [];
  const matched = route.matched;
  const leaf = matched.length > 0 ? matched[matched.length - 1] : null;
  const meta = (leaf?.meta || route.meta) as { title?: string; parentTitle?: string; parentPath?: string };

  if (meta?.parentTitle) {
    list.push({ path: (meta.parentPath as string) || '#', title: meta.parentTitle });
  }
  if (meta?.title) {
    list.push({ path: route.path, title: meta.title });
  }
  if (list.length === 0) {
    list.push({ path: '/dashboard', title: route.path === '/' || route.path === '' ? '总览首页' : '首页' });
  }
  return list;
});
</script>

<style scoped>
.erp-breadcrumb {
  font-size: 14px;
}
</style>
