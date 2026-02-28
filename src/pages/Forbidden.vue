<template>
  <div class="forbidden-page">
    <div class="forbidden-content">
      <div class="code">403</div>
      <h1>无访问权限</h1>
      <p>您没有权限访问该页面，如有疑问请联系管理员。</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome() {
  router.push('/');
}
</script>

<style scoped>
.forbidden-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
}
.forbidden-content {
  text-align: center;
}
.code {
  font-size: 6rem;
  font-weight: 700;
  color: var(--el-color-danger);
  line-height: 1;
}
h1 {
  margin: 1rem 0 0.5rem;
  font-size: 1.5rem;
}
p {
  color: var(--el-text-color-secondary);
  margin-bottom: 1.5rem;
}
</style>
