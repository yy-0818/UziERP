<template>
  <el-card>
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索产品名称"
        clearable
        style="width: 260px"
        @keyup.enter="fetchData"
      />
      <el-button type="primary" @click="fetchData">查询</el-button>
      <el-button type="success" v-if="canEdit" @click="openEdit(null)">
        新增产品
      </el-button>
    </div>
    <el-table :data="rows" v-loading="loading">
      <el-table-column prop="name" label="产品名称" />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="spec" label="规格" />
      <el-table-column prop="unit" label="单位" width="100" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" v-if="canEdit" @click="openEdit(row)">
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editVisible" :title="editTitle" width="500px" append-to-body>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="editForm.category" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="editForm.spec" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="editForm.unit" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveData">
          保存
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { usePermission, P } from '../permissions';
import {
  listProducts,
  upsertProduct,
  type ProductRecord,
} from '../modules/master-data/api';

const auth = useAuthStore();
const { can } = usePermission();
const keyword = ref('');
const rows = ref<ProductRecord[]>([]);
const loading = ref(false);

const editVisible = ref(false);
const editTitle = ref('');
const editForm = ref<{ id?: string; name: string; category: string; spec: string; unit: string }>({
  name: '',
  category: '',
  spec: '',
  unit: '',
});
const saving = ref(false);

const canEdit = can(P.MASTER_PRODUCT_UPDATE);

async function fetchData() {
  loading.value = true;
  try {
    rows.value = await listProducts(keyword.value);
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '查询失败');
  } finally {
    loading.value = false;
  }
}

function openEdit(row: ProductRecord | null) {
  if (row) {
    editTitle.value = '编辑产品';
    editForm.value = {
      id: row.id,
      name: row.name,
      category: row.category ?? '',
      spec: row.spec ?? '',
      unit: row.unit ?? '',
    };
  } else {
    editTitle.value = '新增产品';
    editForm.value = {
      name: '',
      category: '',
      spec: '',
      unit: '',
    };
  }
  editVisible.value = true;
}

async function saveData() {
  const f = editForm.value;
  if (!f.name) {
    ElMessage.error('名称必填');
    return;
  }
  saving.value = true;
  try {
    await upsertProduct({
      id: f.id,
      name: f.name,
      category: f.category,
      spec: f.spec,
      unit: f.unit,
    });
    ElMessage.success('保存成功');
    editVisible.value = false;
    await fetchData();
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchData);
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
</style>

