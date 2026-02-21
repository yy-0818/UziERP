<template>
  <div class="employees-cn-wrap">
    <router-view v-slot="{ Component, route }">
      <keep-alive :max="8">
        <component :is="Component" :key="route.fullPath" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.employees-cn-wrap {
  height: 100%;
  min-height: 0;
}
</style>
