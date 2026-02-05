<template>
  <div class="page-container">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <span>权限管理 · 用户与角色</span>
        </div>
      </template>
      <div class="erp-card-body">
        <p class="page-desc">
          仅 super_admin 可访问。为已注册用户分配角色：super_admin（超级管理员）、manager（经理，可改价格/客户/产品）、sales（销售，仅查看）、viewer（只读）。
        </p>
        <div class="erp-toolbar">
          <el-input
            v-model="email"
            placeholder="输入用户邮箱（需已注册）"
            style="width: 280px"
          />
          <el-select v-model="role" placeholder="选择角色" style="width: 160px">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="经理" value="manager" />
            <el-option label="销售" value="sales" />
            <el-option label="只读" value="viewer" />
          </el-select>
          <el-button type="primary" :loading="saving" @click="setRole">设置角色</el-button>
        </div>
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="user_id" label="用户 ID" min-width="280" show-overflow-tooltip />
          <el-table-column prop="role" label="角色" width="140">
            <template #default="{ row }">
              <el-tag :type="roleTagType(row.role)">{{ roleLabel(row.role) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { supabase } from '../supabase';

const rows = ref<any[]>([]);
const loading = ref(false);
const email = ref('');
const role = ref<string | null>(null);
const saving = ref(false);

function roleLabel(r: string) {
  const map: Record<string, string> = {
    super_admin: '超级管理员',
    manager: '经理',
    sales: '销售',
    viewer: '只读',
  };
  return map[r] || r;
}

function roleTagType(r: string) {
  if (r === 'super_admin') return 'danger';
  if (r === 'manager') return 'warning';
  if (r === 'sales') return 'success';
  return 'info';
}

async function fetchData() {
  loading.value = true;
  const { data, error } = await supabase.from('user_roles').select('user_id, role');
  if (error) {
    ElMessage.error('查询失败');
    rows.value = [];
  } else {
    rows.value = data || [];
  }
  loading.value = false;
}

async function setRole() {
  if (!email.value || !role.value) {
    ElMessage.error('请输入邮箱并选择角色');
    return;
  }
  saving.value = true;
  try {
    const { data: userData, error: e1 } = await supabase.auth.admin.getUserByEmail(email.value);
    if (e1 || !userData?.user) {
      ElMessage.error('未找到该邮箱对应的用户（需在 Supabase Dashboard 中先注册）');
      return;
    }
    const userId = userData.user.id;
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role.value });
    if (error) {
      ElMessage.error('设置失败：' + (error.message || ''));
    } else {
      ElMessage.success('设置成功');
      await fetchData();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '设置失败（设置角色需在 Supabase Dashboard 或后端用 service_role 操作）');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchData);
</script>

<style scoped>
.page-desc {
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-size: 13px;
}
</style>
