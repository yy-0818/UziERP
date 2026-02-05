<template>
  <el-card>
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索姓名 / 部门 / 岗位"
        clearable
        style="width: 260px"
        @keyup.enter="fetchData"
      />
      <el-button type="primary" @click="fetchData">查询</el-button>
    </div>

    <el-table :data="rows" v-loading="loading" style="width: 100%">
      <el-table-column prop="employee_id" label="工号" width="120" />
      <el-table-column prop="chinese_name" label="中文名" width="120" />
      <el-table-column prop="surname" label="姓(英)" width="120" />
      <el-table-column prop="given_name" label="名(英)" width="120" />
      <el-table-column prop="department" label="部门" width="160" />
      <el-table-column prop="position" label="岗位" width="160" />
      <el-table-column prop="position_salary" label="岗位工资" width="120" />
      <el-table-column prop="salary_currency" label="币种" width="80" />
      <el-table-column prop="status" label="状态" width="120" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { supabase } from '../supabase';

const keyword = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);

async function fetchData() {
  loading.value = true;

  let query = supabase.from('employees').select('*').order('created_at', {
    ascending: false,
  });

  if (keyword.value) {
    const k = `%${keyword.value}%`;
    // 简单多字段模糊搜索
    query = query.or(
      `chinese_name.ilike.${k},surname.ilike.${k},given_name.ilike.${k},department.ilike.${k},position.ilike.${k}`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    ElMessage.error('员工数据查询失败');
  } else {
    rows.value = data || [];
  }
  loading.value = false;
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

