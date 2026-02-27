<template>
  <div class="page-container admin-users-page">
    <!-- 用户角色管理 -->
    <el-card class="erp-card admin-card" shadow="hover">
      <template #header>
        <div class="admin-card-header">
          <div class="admin-card-header__left">
            <span class="admin-card-title">用户与角色</span>
            <el-tag size="small" type="info" effect="plain">{{ userList.length }} 人</el-tag>
          </div>
          <div class="admin-card-header__right">
            <el-button type="primary" :icon="Plus" size="small" @click="openAddUser">添加用户</el-button>
            <el-button :icon="Refresh" size="small" @click="fetchData">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="userList" v-loading="loading" stripe row-key="user_id" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="90">
          <template #default="{ row }">
            <span class="user-name">{{ row.name || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
        <el-table-column label="角色" min-width="160">
          <template #default="{ row }">
            <template v-if="row.role_codes.length">
              <el-tag
                v-for="code in row.role_codes"
                :key="code"
                :type="(ROLE_TAG_TYPES[code] || 'info') as any"
                size="small"
                effect="light"
                class="role-tag"
              >{{ ROLE_LABELS[code] || code }}</el-tag>
            </template>
            <el-tag v-else size="small" effect="plain" type="info">待分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限" width="70" align="center">
          <template #default="{ row }">
            <el-tooltip :content="`拥有 ${row.perm_count} 项权限`" placement="top">
              <span class="perm-badge">{{ row.perm_count }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="140">
          <template #default="{ row }">
            <template v-if="row.effective_to">
              <el-tag size="small" :type="isExpired(row.effective_to) ? 'danger' : 'warning'" effect="plain">
                {{ isExpired(row.effective_to) ? '已过期' : `至 ${formatDate(row.effective_to)}` }}
              </el-tag>
            </template>
            <span v-else class="text-muted">永久</span>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="155">
          <template #default="{ row }">
            <span v-if="row.last_sign_in_at" class="text-muted">{{ formatTime(row.last_sign_in_at) }}</span>
            <span v-else class="text-placeholder">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openChangeRole(row)">配置</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 角色模板 -->
    <el-card class="erp-card admin-card" shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="admin-card-header">
          <div class="admin-card-header__left">
            <span class="admin-card-title">角色模板</span>
            <el-tag size="small" type="info" effect="plain">{{ roleTemplates.length }} 个</el-tag>
          </div>
        </div>
      </template>
      <div class="role-grid">
        <div v-for="r in roleTemplates" :key="r.id" class="role-card">
          <div class="role-card__header">
            <el-tag :type="(ROLE_TAG_TYPES[r.code] || 'info') as any" size="small" effect="light">{{ r.name }}</el-tag>
            <span class="role-card__code">{{ r.code }}</span>
          </div>
          <div class="role-card__desc">{{ r.description || '—' }}</div>
          <div class="role-card__stats">
            <span>{{ r.perm_count }} 项权限</span>
            <span>{{ r.user_count }} 人使用</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 添加用户弹窗 -->
    <el-dialog v-model="addUserVisible" title="添加用户角色" width="460px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="用户ID">
          <el-input v-model="addUserForm.userId" placeholder="输入 Supabase 用户 UUID" />
          <div class="form-tip">可在 Supabase Dashboard → Authentication → Users 中复制</div>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="addUserForm.roleId" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roleTemplates" :key="r.id" :label="`${r.name}（${r.code}）`" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addUserVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAddUser">添加</el-button>
      </template>
    </el-dialog>

    <!-- 配置角色弹窗 -->
    <el-dialog v-model="changeRoleVisible" title="配置用户角色" width="540px" append-to-body>
      <div v-if="currentUser" class="config-user-info">
        <div class="config-user-name">{{ currentUser.name || currentUser.email }}</div>
        <div class="config-user-email">{{ currentUser.email }}</div>
      </div>
      <el-form label-width="80px" style="margin-top: 20px">
        <el-form-item label="角色">
          <el-select v-model="selectedRoleId" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roleTemplates" :key="r.id" :label="`${r.name}（${r.code}）`" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker v-model="effectiveFrom" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="立即生效（可选）" style="width: 100%" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker v-model="effectiveTo" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="永久有效（可选）" style="width: 100%" />
          <div class="form-tip">设置过期时间可实现临时授权，到期后权限自动失效</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changeRoleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitChangeRole">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Plus } from '@element-plus/icons-vue';
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
  effective_from: string | null;
  effective_to: string | null;
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

const addUserVisible = ref(false);
const addUserForm = ref({ userId: '', roleId: '' });

const changeRoleVisible = ref(false);
const currentUser = ref<UserRow | null>(null);
const selectedRoleId = ref<string | null>(null);
const effectiveFrom = ref<string | null>(null);
const effectiveTo = ref<string | null>(null);

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('zh-CN'); }
  catch { return iso; }
}

function isExpired(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
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
      .select('user_id, name, email, role_id, effective_from, effective_to');
    if (error) throw error;

    const roleMap = new Map<string, { code: string; name: string }>();
    for (const rt of roleTemplates.value) roleMap.set(rt.id, { code: rt.code, name: rt.name });

    const byUser = new Map<string, UserRow>();
    for (const r of (data || []) as any[]) {
      const uid = r.user_id;
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          user_id: uid, name: r.name || '', email: r.email || uid,
          role_ids: [], role_codes: [], perm_count: 0,
          last_sign_in_at: null,
          effective_from: r.effective_from || null,
          effective_to: r.effective_to || null,
        });
      }
      const entry = byUser.get(uid)!;
      if (r.role_id) {
        entry.role_ids.push(r.role_id);
        const role = roleMap.get(r.role_id);
        if (role) entry.role_codes.push(role.code);
      }
      if (r.effective_from) entry.effective_from = r.effective_from;
      if (r.effective_to) entry.effective_to = r.effective_to;
    }

    const userIds = [...byUser.keys()];
    try {
      const { data: authData } = await supabase.rpc('get_users_info', { p_user_ids: userIds });
      if (authData && Array.isArray(authData)) {
        for (const u of authData as any[]) {
          const entry = byUser.get(u.id);
          if (entry) {
            entry.email = u.email || entry.email;
            entry.last_sign_in_at = u.last_sign_in_at || null;
          }
        }
      }
    } catch { /* rpc降级 */ }

    userList.value = userIds.map((uid) => {
      const u = byUser.get(uid)!;
      u.perm_count = getPermissionsByRoles(u.role_codes).size;
      return u;
    });
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  rolesLoading.value = true;
  try {
    const { data: roles, error } = await supabase
      .from('roles').select('id, code, name, description').eq('is_active', true).order('code');
    if (error) throw error;

    const { data: rpCounts } = await supabase.from('role_permissions').select('role_id');
    const { data: urCounts } = await supabase.from('user_roles').select('role_id');

    const permCountMap = new Map<string, number>();
    const userCountMap = new Map<string, number>();
    (rpCounts || []).forEach((r: any) => permCountMap.set(r.role_id, (permCountMap.get(r.role_id) || 0) + 1));
    (urCounts || []).forEach((r: any) => { if (r.role_id) userCountMap.set(r.role_id, (userCountMap.get(r.role_id) || 0) + 1); });

    roleTemplates.value = (roles || []).map((r: any) => ({
      id: r.id, code: r.code, name: r.name, description: r.description,
      perm_count: permCountMap.get(r.id) || 0,
      user_count: userCountMap.get(r.id) || 0,
    }));
  } catch (e: any) {
    ElMessage.error(e?.message || '加载角色失败');
  } finally {
    rolesLoading.value = false;
  }
}

function openAddUser() {
  addUserForm.value = { userId: '', roleId: roleTemplates.value.find(r => r.code === 'biz.viewer')?.id || '' };
  addUserVisible.value = true;
}

async function submitAddUser() {
  const { userId, roleId } = addUserForm.value;
  if (!userId.trim() || !roleId) { ElMessage.warning('请填写用户ID并选择角色'); return; }
  saving.value = true;
  try {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId.trim(), role_id: roleId });
    if (error) throw error;
    ElMessage.success('添加成功');
    addUserVisible.value = false;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败');
  } finally {
    saving.value = false;
  }
}

function openChangeRole(row: UserRow) {
  currentUser.value = row;
  selectedRoleId.value = row.role_ids[0] || null;
  effectiveFrom.value = row.effective_from;
  effectiveTo.value = row.effective_to;
  changeRoleVisible.value = true;
}

async function submitChangeRole() {
  if (!currentUser.value || !selectedRoleId.value) { ElMessage.warning('请选择角色'); return; }
  saving.value = true;
  try {
    const { error } = await supabase
      .from('user_roles')
      .update({
        role_id: selectedRoleId.value,
        effective_from: effectiveFrom.value || null,
        effective_to: effectiveTo.value || null,
      })
      .eq('user_id', currentUser.value.user_id);
    if (error) throw error;
    ElMessage.success('保存成功');
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
.admin-card { border-radius: 12px; }
.admin-card-header {
  display: flex; justify-content: space-between; align-items: center;
}
.admin-card-header__left {
  display: flex; align-items: center; gap: 10px;
}
.admin-card-header__right {
  display: flex; gap: 8px;
}
.admin-card-title {
  font-size: 15px; font-weight: 600;
}
.user-name { font-weight: 500; }
.role-tag { margin: 1px 3px 1px 0; }
.perm-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 28px; height: 22px; border-radius: 11px; padding: 0 6px;
  font-size: 12px; font-weight: 600;
  background: var(--el-color-primary-light-9); color: var(--el-color-primary);
}
.text-muted { font-size: 12px; color: var(--el-text-color-secondary); }
.text-placeholder { font-size: 12px; color: var(--el-text-color-placeholder); }

/* 角色卡片网格 */
.role-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.role-card {
  border: 1px solid var(--el-border-color-lighter); border-radius: 10px;
  padding: 14px 16px; transition: box-shadow 0.2s, border-color 0.2s;
}
.role-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-color: var(--el-color-primary-light-5);
}
.role-card__header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
}
.role-card__code {
  font-size: 11px; color: var(--el-text-color-placeholder); font-family: monospace;
}
.role-card__desc {
  font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; margin-bottom: 10px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.role-card__stats {
  display: flex; gap: 16px; font-size: 12px; color: var(--el-text-color-placeholder);
}

/* 弹窗 */
.config-user-info {
  padding: 14px 18px; background: var(--el-fill-color-light); border-radius: 10px;
}
.config-user-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.config-user-email { font-size: 13px; color: var(--el-text-color-secondary); }
.form-tip { font-size: 12px; color: var(--el-text-color-placeholder); margin-top: 4px; line-height: 1.4; }
</style>
