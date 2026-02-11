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
          仅 super_admin 可访问。为已注册用户分配角色：super_admin、manager、sales、viewer。请从 Supabase Dashboard → Authentication → Users 中复制对应用户的 UUID 填入下方。
        </p>
        <div class="erp-toolbar">
          <el-input
            v-model="email"
            placeholder="输入用户 UUID（Supabase 认证页可复制）"
            style="width: 320px"
          />
          <el-select v-model="role" placeholder="选择角色" style="width: 160px">
            <el-option label="决策者" value="super_admin" />
            <el-option label="管理者" value="manager" />
            <el-option label="执行者" value="sales" />
            <el-option label="操作者" value="viewer" />
          </el-select>
          <el-button type="primary" :loading="saving" @click="setRole">设置角色</el-button>
        </div>
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="user_id" label="用户 UUID" min-width="280" show-overflow-tooltip />
          <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
          <el-table-column prop="name" label="姓名" min-width="120" show-overflow-tooltip />
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
    super_admin: '决策者',
    manager: '管理者',
    sales: '执行者',
    viewer: '操作者',
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
  const { data, error } = await supabase.from('user_roles').select('user_id, email, name, role');
  if (error) {
    ElMessage.error('查询失败');
    rows.value = [];
  } else {
    rows.value = data || [];
  }
  loading.value = false;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function setRole() {
  const input = (email.value || '').trim();
  if (!input || !role.value) {
    ElMessage.error('请输入用户 UUID 并选择角色');
    return;
  }
  saving.value = true;
  try {
    let userId: string;
    if (UUID_REGEX.test(input)) {
      userId = input;
    } else {
      const admin = (supabase as any).auth?.admin;
      if (typeof admin?.getUserByEmail !== 'function') {
        ElMessage.error('按邮箱查询需 service_role，请直接输入用户 UUID（Supabase Dashboard → Authentication → Users 中复制）');
        return;
      }
      const { data: userData, error: e1 } = await admin.getUserByEmail(input);
      if (e1 || !userData?.user) {
        ElMessage.error('未找到该邮箱对应用户，请确认已在 Supabase 认证中注册，或改用用户 UUID');
        return;
      }
      userId = userData.user.id;
    }
    const { data: updated, error: updateErr } = await supabase
      .from('user_roles')
      .update({ role: role.value })
      .eq('user_id', userId)
      .select('id');
    if (updateErr) {
      ElMessage.error('设置失败：' + (updateErr.message || ''));
      return;
    }
    if (updated && updated.length > 0) {
      ElMessage.success('设置成功');
      email.value = '';
      await fetchData();
      return;
    }
    const { error: insertErr } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: role.value });
    if (insertErr) {
      ElMessage.error('设置失败：' + (insertErr.message || ''));
    } else {
      ElMessage.success('设置成功');
      email.value = '';
      await fetchData();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '设置失败');
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
