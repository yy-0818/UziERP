<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="title">价格管理系统</h2>
      <el-form :model="form" @submit.prevent="onSubmit" label-position="top">
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="onSubmit" block>
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const form = reactive({
  email: '',
  password: '',
});

const loading = ref(false);
const router = useRouter();
const auth = useAuthStore();

const onSubmit = async () => {
  if (!form.email || !form.password) {
    ElMessage.error('请输入邮箱和密码');
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.email, form.password);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d8cf8, #3358f4);
}

.login-card {
  width: 360px;
}

.title {
  text-align: center;
  margin-bottom: 24px;
}
</style>

