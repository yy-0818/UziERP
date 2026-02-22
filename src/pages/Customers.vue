<template>
  <div class="page-container">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <span>客户管理（公司）</span>
          <el-button type="success" v-if="canEdit" @click="openEdit(null)">新增客户</el-button>
        </div>
      </template>
      <div class="erp-card-body">
        <div class="erp-toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索客户名称"
            clearable
            style="width: 260px"
            @keyup.enter="fetchData"
          />
          <el-button type="primary" @click="fetchData">查询</el-button>
        </div>
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="name" label="公司名称" min-width="160" />
          <el-table-column prop="level" label="等级" width="100" />
          <el-table-column prop="region" label="国家/地区" width="120" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" v-if="canEdit" @click="openEdit(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="editVisible" :title="editTitle" width="500px" append-to-body>
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="公司名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="等级">
          <el-input v-model="editForm.level" placeholder="如 1级、2级" />
        </el-form-item>
        <el-form-item label="国家/地区">
          <el-input v-model="editForm.region" placeholder="如 国内、哈萨克" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveData">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { listCustomers, upsertCustomer } from '../modules/master-data/api';

const auth = useAuthStore();
const keyword = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);
const editVisible = ref(false);
const editTitle = ref('');
const editForm = ref<any>({});
const saving = ref(false);

const canEdit = computed(() =>
  ['super_admin', 'manager'].includes(auth.role || '')
);

async function fetchData() {
  loading.value = true;
  try {
    rows.value = await listCustomers(keyword.value);
  } catch (error: any) {
    ElMessage.error(error.message || '查询失败');
  } finally {
    loading.value = false;
  }
}

function openEdit(row: any | null) {
  if (row) {
    editTitle.value = '编辑客户';
    editForm.value = { ...row };
  } else {
    editTitle.value = '新增客户';
    editForm.value = { name: '', level: '', region: '' };
  }
  editVisible.value = true;
}

async function saveData() {
  const f = editForm.value;
  if (!f.name) {
    ElMessage.error('公司名称必填');
    return;
  }
  saving.value = true;
  try {
    await upsertCustomer({
      id: f.id,
      name: f.name,
      level: f.level,
      region: f.region,
    });
    ElMessage.success('保存成功');
    editVisible.value = false;
    await fetchData();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchData);
</script>

<style scoped>
.erp-toolbar {
  margin-bottom: 16px;
}
</style>
