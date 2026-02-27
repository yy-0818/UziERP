<template>
  <div class="page-container admin-users-page">
    <!-- 用户角色管理 -->
    <el-card class="erp-card admin-card" shadow="hover">
      <template #header>
        <div class="admin-card-header">
          <div class="admin-card-header__left">
            <span class="admin-card-title">用户与角色</span>
            <el-tag size="small" effect="plain">{{ userList.length }} 人</el-tag>
          </div>
          <div class="admin-card-header__right">
            <el-button type="primary" :icon="Plus" size="small" @click="openAddUser">添加用户</el-button>
            <el-button :icon="Refresh" size="small" @click="fetchData">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="userList" v-loading="loading" stripe row-key="user_id" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="90">
          <template #default="{ row }"><span class="user-name">{{ row.name || '—' }}</span></template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
        <el-table-column label="永久角色" width="130">
          <template #default="{ row }">
            <el-tag v-if="row.role_code" :type="(ROLE_TAG_TYPES[row.role_code] || 'info') as any" size="small" effect="light">{{ ROLE_LABELS[row.role_code] || row.role_code }}</el-tag>
            <el-tag v-else size="small" type="info" effect="plain">待分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="临时权限" width="130">
          <template #default="{ row }">
            <template v-if="row.active_temp_count > 0">
              <el-tag type="warning" size="small" effect="light">{{ row.active_temp_count }} 项生效中</el-tag>
            </template>
            <span v-else class="text-placeholder">无</span>
          </template>
        </el-table-column>
        <el-table-column label="权限" width="65" align="center">
          <template #default="{ row }">
            <span class="perm-badge">{{ row.perm_count }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="140">
          <template #default="{ row }">
            <span v-if="row.last_sign_in_at" class="text-muted">{{ formatTime(row.last_sign_in_at) }}</span>
            <span v-else class="text-placeholder">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">详情</el-button>
            <el-button link size="small" @click="openChangeRole(row)">改角色</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 角色模板 -->
    <el-card class="erp-card admin-card" shadow="hover" style="margin-top: 16px">
      <template #header>
        <div class="admin-card-header">
          <span class="admin-card-title">角色模板</span>
          <el-tag size="small" effect="plain">{{ roleTemplates.length }} 个</el-tag>
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
            <span>{{ r.user_count }} 人</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 添加用户弹窗 -->
    <el-dialog v-model="addUserVisible" title="添加用户" width="480px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="邮箱" required>
          <el-input v-model="addForm.email" placeholder="用户登录邮箱（将用于 Supabase Auth 账户匹配）" />
        </el-form-item>
        <el-form-item label="用户ID" required>
          <el-input v-model="addForm.userId" placeholder="Supabase Authentication UUID" />
          <div class="form-tip">在 Supabase Dashboard → Authentication → Users 中复制对应用户的 UUID</div>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="addForm.name" placeholder="中文姓名（选填，便于识别）" />
        </el-form-item>
        <el-form-item label="永久角色" required>
          <el-select v-model="addForm.roleId" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roleTemplates" :key="r.id" :label="`${r.name}（${r.code}）`" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addUserVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAddUser">添加</el-button>
      </template>
    </el-dialog>

    <!-- 变更永久角色弹窗 -->
    <el-dialog v-model="changeRoleVisible" title="变更永久角色" width="460px" append-to-body>
      <div v-if="currentUser" class="config-user-info">
        <div class="config-user-name">{{ currentUser.name || currentUser.email }}</div>
        <div class="config-user-email">当前角色：{{ ROLE_LABELS[currentUser.role_code] || '未分配' }}</div>
      </div>
      <el-form label-width="80px" style="margin-top: 16px">
        <el-form-item label="新角色">
          <el-select v-model="selectedRoleId" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roleTemplates" :key="r.id" :label="`${r.name}（${r.code}）`" :value="r.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changeRoleVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitChangeRole">保存</el-button>
      </template>
    </el-dialog>

    <!-- 用户详情弹窗（临时权限历史） -->
    <el-dialog v-model="detailVisible" :title="`${detailUser?.name || detailUser?.email || ''} - 权限详情`" width="640px" append-to-body>
      <template v-if="detailUser">
        <div class="detail-section">
          <div class="detail-section__title">永久角色</div>
          <el-tag v-if="detailUser.role_code" :type="(ROLE_TAG_TYPES[detailUser.role_code] || 'info') as any" effect="light">
            {{ ROLE_LABELS[detailUser.role_code] || detailUser.role_code }}
          </el-tag>
          <el-tag v-else type="info" effect="plain">未分配</el-tag>
          <span class="detail-perm-count">（{{ detailUser.perm_count }} 项权限）</span>
        </div>

        <div class="detail-section">
          <div class="detail-section__title">
            <span>临时授权</span>
            <el-button type="primary" size="small" @click="openGrantTemp">授予临时权限</el-button>
          </div>
          <el-table v-if="tempGrants.length" :data="tempGrants" size="small" stripe>
            <el-table-column label="角色" width="130">
              <template #default="{ row }">
                <el-tag :type="(ROLE_TAG_TYPES[row.role_code] || 'info') as any" size="small" effect="light">{{ ROLE_LABELS[row.role_code] || row.role_code }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag v-if="isActive(row)" type="success" size="small" effect="plain">生效中</el-tag>
                <el-tag v-else type="info" size="small" effect="plain">已过期</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="生效" width="110">
              <template #default="{ row }">{{ formatDate(row.effective_from) }}</template>
            </el-table-column>
            <el-table-column label="过期" width="110">
              <template #default="{ row }">{{ formatDate(row.effective_to) }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="120" show-overflow-tooltip />
            <el-table-column label="授权人" width="100">
              <template #default="{ row }">{{ row.granted_by_name || '—' }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无临时授权记录" :image-size="40" />
        </div>
      </template>
    </el-dialog>

    <!-- 授予临时权限弹窗 -->
    <el-dialog v-model="grantTempVisible" title="授予临时权限" width="480px" append-to-body>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        <template #title>临时授予高于当前永久角色的权限，到期自动失效</template>
      </el-alert>
      <el-form label-width="80px">
        <el-form-item label="目标角色">
          <el-select v-model="grantForm.roleId" placeholder="选择要临时授予的角色" style="width: 100%">
            <el-option
              v-for="r in higherRoles"
              :key="r.id"
              :label="`${r.name}（${r.perm_count} 项权限）`"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="过期时间" required>
          <el-date-picker v-model="grantForm.effectiveTo" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="必须设置过期时间" style="width: 100%" />
        </el-form-item>
        <el-form-item label="授权原因">
          <el-input v-model="grantForm.reason" type="textarea" :rows="2" placeholder="说明授权原因（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantTempVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitGrantTemp">授予</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Plus } from '@element-plus/icons-vue';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/auth';
import { ROLE_LABELS, ROLE_TAG_TYPES, getPermissionsByRoles } from '../permissions';

interface UserRow {
  user_id: string;
  name: string;
  email: string;
  role_id: string | null;
  role_code: string;
  perm_count: number;
  active_temp_count: number;
  last_sign_in_at: string | null;
}

interface TempGrant {
  id: string;
  role_id: string;
  role_code: string;
  effective_from: string;
  effective_to: string;
  reason: string | null;
  granted_by: string | null;
  granted_by_name: string;
}

interface RoleTemplate { id: string; code: string; name: string; description: string | null; perm_count: number; user_count: number; }

const auth = useAuthStore();
const userList = ref<UserRow[]>([]);
const roleTemplates = ref<RoleTemplate[]>([]);
const loading = ref(false);
const rolesLoading = ref(false);
const saving = ref(false);

const addUserVisible = ref(false);
const addForm = ref({ userId: '', email: '', name: '', roleId: '' });

const changeRoleVisible = ref(false);
const currentUser = ref<UserRow | null>(null);
const selectedRoleId = ref<string | null>(null);

const detailVisible = ref(false);
const detailUser = ref<UserRow | null>(null);
const tempGrants = ref<TempGrant[]>([]);

const grantTempVisible = ref(false);
const grantForm = ref({ roleId: '', effectiveTo: '', reason: '' });

const higherRoles = computed(() => {
  if (!detailUser.value) return roleTemplates.value;
  const currentPermCount = detailUser.value.perm_count;
  return roleTemplates.value.filter(r => r.perm_count > currentPermCount);
});

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('zh-CN'); }
  catch { return iso; }
}

function isActive(grant: TempGrant): boolean {
  const now = Date.now();
  return new Date(grant.effective_from).getTime() <= now && new Date(grant.effective_to).getTime() > now;
}

async function fetchData() {
  await fetchRoles();
  await fetchUsers();
}

async function fetchUsers() {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('user_roles').select('user_id, name, email, role_id');
    if (error) throw error;

    const roleMap = new Map<string, { code: string; name: string }>();
    for (const rt of roleTemplates.value) roleMap.set(rt.id, { code: rt.code, name: rt.name });

    const now = new Date().toISOString();
    const { data: activeTempData } = await supabase
      .from('temp_role_grants')
      .select('user_id')
      .gte('effective_to', now);
    const tempCountMap = new Map<string, number>();
    (activeTempData || []).forEach((r: any) => tempCountMap.set(r.user_id, (tempCountMap.get(r.user_id) || 0) + 1));

    const userIds = (data || []).map((r: any) => r.user_id);
    let authInfoMap = new Map<string, { email: string; last_sign_in_at: string | null }>();
    try {
      const { data: authData } = await supabase.rpc('get_users_info', { p_user_ids: userIds });
      if (authData && Array.isArray(authData)) {
        authInfoMap = new Map(authData.map((u: any) => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]));
      }
    } catch {}

    userList.value = (data || []).map((r: any) => {
      const role = r.role_id ? roleMap.get(r.role_id) : null;
      const roleCode = role?.code || '';
      const authInfo = authInfoMap.get(r.user_id);
      const activeTempCodes: string[] = [];
      return {
        user_id: r.user_id,
        name: r.name || '',
        email: authInfo?.email || r.email || r.user_id,
        role_id: r.role_id,
        role_code: roleCode,
        perm_count: getPermissionsByRoles(roleCode ? [roleCode, ...activeTempCodes] : activeTempCodes).size,
        active_temp_count: tempCountMap.get(r.user_id) || 0,
        last_sign_in_at: authInfo?.last_sign_in_at || null,
      };
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
    const { data: roles, error } = await supabase.from('roles').select('id, code, name, description').eq('is_active', true).order('code');
    if (error) throw error;
    const { data: rpCounts } = await supabase.from('role_permissions').select('role_id');
    const { data: urCounts } = await supabase.from('user_roles').select('role_id');
    const permCountMap = new Map<string, number>();
    const userCountMap = new Map<string, number>();
    (rpCounts || []).forEach((r: any) => permCountMap.set(r.role_id, (permCountMap.get(r.role_id) || 0) + 1));
    (urCounts || []).forEach((r: any) => { if (r.role_id) userCountMap.set(r.role_id, (userCountMap.get(r.role_id) || 0) + 1); });
    roleTemplates.value = (roles || []).map((r: any) => ({
      id: r.id, code: r.code, name: r.name, description: r.description,
      perm_count: permCountMap.get(r.id) || 0, user_count: userCountMap.get(r.id) || 0,
    }));
  } catch (e: any) { ElMessage.error(e?.message || '加载角色失败'); }
  finally { rolesLoading.value = false; }
}

function openAddUser() {
  const defaultRole = roleTemplates.value.find(r => r.code === 'biz.viewer');
  addForm.value = { userId: '', email: '', name: '', roleId: defaultRole?.id || '' };
  addUserVisible.value = true;
}

async function submitAddUser() {
  const { userId, email, name, roleId } = addForm.value;
  if (!userId.trim() || !email.trim() || !roleId) { ElMessage.warning('请填写用户ID、邮箱并选择角色'); return; }
  saving.value = true;
  try {
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId.trim(),
      email: email.trim(),
      name: name.trim() || null,
      role_id: roleId,
    });
    if (error) throw error;
    ElMessage.success('添加成功');
    addUserVisible.value = false;
    await fetchData();
  } catch (e: any) { ElMessage.error(e?.message || '添加失败'); }
  finally { saving.value = false; }
}

function openChangeRole(row: UserRow) {
  currentUser.value = row;
  selectedRoleId.value = row.role_id;
  changeRoleVisible.value = true;
}

async function submitChangeRole() {
  if (!currentUser.value || !selectedRoleId.value) { ElMessage.warning('请选择角色'); return; }
  saving.value = true;
  try {
    const { error } = await supabase.from('user_roles').update({ role_id: selectedRoleId.value }).eq('user_id', currentUser.value.user_id);
    if (error) throw error;
    ElMessage.success('角色已变更');
    changeRoleVisible.value = false;
    await fetchData();
  } catch (e: any) { ElMessage.error(e?.message || '变更失败'); }
  finally { saving.value = false; }
}

async function openDetail(row: UserRow) {
  detailUser.value = row;
  detailVisible.value = true;
  try {
    const { data } = await supabase
      .from('temp_role_grants')
      .select('id, role_id, effective_from, effective_to, reason, granted_by, granted_at')
      .eq('user_id', row.user_id)
      .order('effective_to', { ascending: false });

    const roleMap = new Map<string, string>();
    for (const rt of roleTemplates.value) roleMap.set(rt.id, rt.code);

    const granterIds = [...new Set((data || []).map((g: any) => g.granted_by).filter(Boolean))];
    let granterMap = new Map<string, string>();
    if (granterIds.length) {
      const { data: granters } = await supabase.from('user_roles').select('user_id, name, email').in('user_id', granterIds);
      if (granters) granterMap = new Map(granters.map((g: any) => [g.user_id, g.name || g.email || g.user_id]));
    }

    tempGrants.value = (data || []).map((g: any) => ({
      id: g.id,
      role_id: g.role_id,
      role_code: roleMap.get(g.role_id) || '',
      effective_from: g.effective_from,
      effective_to: g.effective_to,
      reason: g.reason,
      granted_by: g.granted_by,
      granted_by_name: g.granted_by ? (granterMap.get(g.granted_by) || g.granted_by) : '—',
    }));
  } catch { tempGrants.value = []; }
}

function openGrantTemp() {
  grantForm.value = { roleId: '', effectiveTo: '', reason: '' };
  grantTempVisible.value = true;
}

async function submitGrantTemp() {
  if (!detailUser.value || !grantForm.value.roleId || !grantForm.value.effectiveTo) {
    ElMessage.warning('请选择角色并设置过期时间');
    return;
  }
  saving.value = true;
  try {
    const { error } = await supabase.from('temp_role_grants').insert({
      user_id: detailUser.value.user_id,
      role_id: grantForm.value.roleId,
      granted_by: auth.user?.id || null,
      effective_from: new Date().toISOString(),
      effective_to: grantForm.value.effectiveTo,
      reason: grantForm.value.reason.trim() || null,
    });
    if (error) throw error;
    ElMessage.success('临时权限已授予');
    grantTempVisible.value = false;
    await openDetail(detailUser.value);
    await fetchData();
  } catch (e: any) { ElMessage.error(e?.message || '授予失败'); }
  finally { saving.value = false; }
}

onMounted(fetchData);
</script>

<style scoped>
.admin-card { border-radius: 12px; }
.admin-card-header { display: flex; justify-content: space-between; align-items: center; }
.admin-card-header__left { display: flex; align-items: center; gap: 10px; }
.admin-card-header__right { display: flex; gap: 8px; }
.admin-card-title { font-size: 15px; font-weight: 600; }
.user-name { font-weight: 500; }
.perm-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 28px; height: 22px; border-radius: 11px; padding: 0 6px;
  font-size: 12px; font-weight: 600;
  background: var(--el-color-primary-light-9); color: var(--el-color-primary);
}
.text-muted { font-size: 12px; color: var(--el-text-color-secondary); }
.text-placeholder { font-size: 12px; color: var(--el-text-color-placeholder); }
.role-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.role-card {
  border: 1px solid var(--el-border-color-lighter); border-radius: 10px;
  padding: 14px 16px; transition: box-shadow 0.2s, border-color 0.2s;
}
.role-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-color: var(--el-color-primary-light-5); }
.role-card__header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.role-card__code { font-size: 11px; color: var(--el-text-color-placeholder); font-family: monospace; }
.role-card__desc {
  font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; margin-bottom: 10px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.role-card__stats { display: flex; gap: 16px; font-size: 12px; color: var(--el-text-color-placeholder); }
.config-user-info { padding: 14px 18px; background: var(--el-fill-color-light); border-radius: 10px; }
.config-user-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.config-user-email { font-size: 13px; color: var(--el-text-color-secondary); }
.form-tip { font-size: 12px; color: var(--el-text-color-placeholder); margin-top: 4px; line-height: 1.4; }
.detail-section { margin-bottom: 20px; }
.detail-section__title {
  font-size: 14px; font-weight: 600; margin-bottom: 10px;
  display: flex; justify-content: space-between; align-items: center;
}
.detail-perm-count { font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px; }
</style>
