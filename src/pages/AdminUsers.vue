<template>
  <div class="page-container admin-users-page">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <span>权限管理 · 用户与角色</span>
          <el-button type="primary" size="small" :icon="Refresh" @click="fetchData">刷新</el-button>
        </div>
      </template>

      <el-table :data="userList" v-loading="loading" stripe border row-key="user_id" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
        <el-table-column label="角色" min-width="200">
          <template #default="{ row }">
            <template v-if="row.role_codes.length">
              <el-tag
                v-for="code in row.role_codes"
                :key="code"
                :type="(roleTagType(code) as any)"
                size="small"
                class="role-tag"
              >{{ ROLE_LABELS[code] || code }}</el-tag>
            </template>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限数" width="80" align="center">
          <template #default="{ row }">
            <span class="perm-count">{{ row.perm_count }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="170">
          <template #default="{ row }">
            <span v-if="row.last_sign_in_at" class="sign-in-time">{{ formatTime(row.last_sign_in_at) }}</span>
            <span v-else class="sign-in-time sign-in-never">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openChangeRole(row)">配置角色</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 角色模板一览 -->
    <el-card class="erp-card" style="margin-top: 16px">
      <template #header>
        <div class="erp-card-header">
          <span>角色模板一览</span>
          <el-tag size="small" type="info">{{ roleTemplates.length }} 个角色</el-tag>
        </div>
      </template>
      <el-table :data="roleTemplates" v-loading="rolesLoading" stripe border size="small">
        <el-table-column prop="code" label="角色编码" width="200" />
        <el-table-column prop="name" label="名称" width="150">
          <template #default="{ row }">
            <el-tag :type="(roleTagType(row.code) as any)" size="small">{{ row.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column label="权限数" width="80" align="center">
          <template #default="{ row }">{{ row.perm_count }}</template>
        </el-table-column>
        <el-table-column label="用户数" width="80" align="center">
          <template #default="{ row }">{{ row.user_count }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 配置角色弹窗（多选） -->
    <el-dialog v-model="changeRoleVisible" title="配置用户角色" width="520px" append-to-body>
      <div v-if="currentUser" class="change-role-info">
        <div class="change-role-user">{{ currentUser.name || currentUser.email }}</div>
        <div class="change-role-email">{{ currentUser.email }}</div>
      </div>
      <el-form label-width="80px" style="margin-top: 16px">
        <el-form-item label="角色分配">
          <el-checkbox-group v-model="selectedRoleIds">
            <el-checkbox
              v-for="r in roleTemplates"
              :key="r.id"
              :value="r.id"
              :label="r.id"
              class="role-checkbox"
            >
              <el-tag :type="(roleTagType(r.code) as any)" size="small">{{ r.name }}</el-tag>
              <span class="role-checkbox-desc">{{ r.description || r.code }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changeRoleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitChangeRole">确认保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { supabase } from '../supabase';
import { ROLE_LABELS, ROLE_TAG_TYPES, getPermissionsByRoles } from '../permissions';

interface UserRow {
  user_id: string;
  name: string;
  email: string;
  role_ids: string[];
  role_codes: string[];
  perm_count: number;
  last_sign_in_at: string | null;
}

interface RoleTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  perm_count: number;
  user_count: number;
}

const userList = ref<UserRow[]>([]);
const roleTemplates = ref<RoleTemplate[]>([]);
const loading = ref(false);
const rolesLoading = ref(false);
const saving = ref(false);

const changeRoleVisible = ref(false);
const currentUser = ref<UserRow | null>(null);
const selectedRoleIds = ref<string[]>([]);

function roleTagType(code: string): string {
  return ROLE_TAG_TYPES[code] || 'info';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

async function fetchData() {
  await fetchRoles();
  await fetchUsers();
}

async function fetchUsers() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, name, email, role_id');
    if (error) throw error;

    const roleMap = new Map<string, { code: string; name: string }>();
    for (const rt of roleTemplates.value) {
      roleMap.set(rt.id, { code: rt.code, name: rt.name });
    }

    const byUser = new Map<string, { name: string; email: string; role_ids: string[]; role_codes: string[] }>();
    for (const r of (data || []) as any[]) {
      const uid = r.user_id;
      if (!byUser.has(uid)) {
        byUser.set(uid, { name: r.name || '', email: r.email || uid, role_ids: [], role_codes: [] });
      }
      const entry = byUser.get(uid)!;
      if (r.role_id) {
        entry.role_ids.push(r.role_id);
        const role = roleMap.get(r.role_id);
        if (role) entry.role_codes.push(role.code);
      }
    }

    const userIds = [...byUser.keys()];
    let authInfoMap = new Map<string, { email: string; last_sign_in_at: string | null }>();
    try {
      const { data: authData } = await supabase.rpc('get_users_info', { p_user_ids: userIds });
      if (authData && Array.isArray(authData)) {
        authInfoMap = new Map(authData.map((u: any) => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]));
      }
    } catch { /* rpc不可用时降级 */ }

    userList.value = userIds.map((uid) => {
      const u = byUser.get(uid)!;
      const authInfo = authInfoMap.get(uid);
      return {
        user_id: uid,
        name: u.name,
        email: authInfo?.email || u.email || uid,
        role_ids: u.role_ids,
        role_codes: u.role_codes,
        perm_count: getPermissionsByRoles(u.role_codes).size,
        last_sign_in_at: authInfo?.last_sign_in_at || null,
      };
    });
  } catch (e: any) {
    ElMessage.error(e?.message || '加载用户列表失败');
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  rolesLoading.value = true;
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, code, name, description')
      .eq('is_active', true)
      .order('code');
    if (error) throw error;

    const { data: rpCounts } = await supabase.from('role_permissions').select('role_id');
    const { data: urCounts } = await supabase.from('user_roles').select('role_id');

    const permCountMap = new Map<string, number>();
    const userCountMap = new Map<string, number>();
    (rpCounts || []).forEach((r: any) => permCountMap.set(r.role_id, (permCountMap.get(r.role_id) || 0) + 1));
    (urCounts || []).forEach((r: any) => { if (r.role_id) userCountMap.set(r.role_id, (userCountMap.get(r.role_id) || 0) + 1); });

    roleTemplates.value = (roles || []).map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      perm_count: permCountMap.get(r.id) || 0,
      user_count: userCountMap.get(r.id) || 0,
    }));
  } catch (e: any) {
    ElMessage.error(e?.message || '加载角色模板失败');
  } finally {
    rolesLoading.value = false;
  }
}

function openChangeRole(row: UserRow) {
  currentUser.value = row;
  selectedRoleIds.value = [...row.role_ids];
  changeRoleVisible.value = true;
}

async function submitChangeRole() {
  if (!currentUser.value) return;
  if (!selectedRoleIds.value.length) {
    ElMessage.warning('请至少选择一个角色');
    return;
  }
  saving.value = true;
  try {
    const userId = currentUser.value.user_id;
    const primaryRoleId = selectedRoleIds.value[0];

    const { error } = await supabase
      .from('user_roles')
      .update({ role_id: primaryRoleId })
      .eq('user_id', userId);
    if (error) throw error;

    ElMessage.success('角色配置已保存');
    changeRoleVisible.value = false;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchData);
</script>

<style scoped>
.admin-users-page .erp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.perm-count {
  font-weight: 600;
  color: var(--el-color-primary);
}
.role-tag {
  margin-right: 4px;
  margin-bottom: 2px;
}
.sign-in-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.sign-in-never {
  color: var(--el-text-color-placeholder);
}
.change-role-info {
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}
.change-role-user {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.change-role-email {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.role-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  width: 100%;
}
.role-checkbox-desc {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-left: 4px;
}
</style>
