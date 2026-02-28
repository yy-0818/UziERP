<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索客户或产品名称"
          clearable
          @keyup.enter="fetchData"
          style="width: 260px"
        />
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button
          type="success"
          v-if="canEdit"
          @click="openEdit(null)"
        >
          新增价格
        </el-button>
      </div>
      <el-table :data="rows" v-loading="loading" style="width: 100%">
        <el-table-column prop="customer.name" label="客户" />
        <el-table-column prop="customer.level" label="等级" width="90" />
        <el-table-column prop="product.name" label="产品" />
        <el-table-column prop="product.spec" label="规格" width="120" />
        <el-table-column prop="price" label="当前价格" width="120" />
        <el-table-column prop="currency" label="币种" width="80" />
        <el-table-column prop="valid_from" label="生效时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="openHistory(row)">历史价格</el-button>
            <el-button
              size="small"
              type="primary"
              v-if="canEdit"
              @click="openEdit(row)"
            >
              修改价格
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 历史价格 -->
    <el-dialog v-model="historyVisible" :title="historyTitle" width="600px" append-to-body>
      <el-timeline>
        <el-timeline-item
          v-for="h in history"
          :key="h.id"
          :timestamp="formatTime(h.valid_from)"
        >
          {{ h.price }} {{ h.currency || 'CNY' }}
          <span v-if="h.valid_to">
            （截止：{{ formatTime(h.valid_to) }}）
          </span>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>

    <!-- 新增 / 修改价格 -->
    <el-dialog v-model="editVisible" :title="editTitle" width="500px" append-to-body>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="客户">
          <el-select
            v-model="editForm.customer_id"
            filterable
            placeholder="选择客户"
            style="width: 100%"
          >
            <el-option
              v-for="c in customers"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="产品">
          <el-select
            v-model="editForm.product_id"
            filterable
            placeholder="选择产品"
            style="width: 100%"
          >
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="editForm.price" :min="0" :step="0.01" />
        </el-form-item>
        <el-form-item label="币种">
          <el-input v-model="editForm.currency" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="savePrice">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import dayjs from 'dayjs';
import { ElMessage } from 'element-plus';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/auth';
import { usePermission, P } from '../permissions';

const auth = useAuthStore();
const { can } = usePermission();
const keyword = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);

const historyVisible = ref(false);
const historyTitle = ref('');
const history = ref<any[]>([]);

const editVisible = ref(false);
const editTitle = ref('');
const editForm = ref<any>({
  customer_id: null,
  product_id: null,
  price: null,
  currency: 'CNY',
});
const saving = ref(false);
const customers = ref<any[]>([]);
const products = ref<any[]>([]);

const canEdit = can(P.PRICING_PRICE_UPDATE);

function formatTime(v: string | null) {
  if (!v) return '';
  return dayjs(v).format('YYYY-MM-DD HH:mm');
}

async function fetchData() {
  loading.value = true;

  let query = supabase
    .from('current_prices')
    .select(
      `
      id,
      customer_id,
      product_id,
      price,
      currency,
      valid_from,
      customers ( id, name, level ),
      products ( id, name, spec )
    `
    )
    .order('valid_from', { ascending: false });

  if (keyword.value) {
    // 简单策略：先按客户名过滤
    const { data: customerRows } = await supabase
      .from('customers')
      .select('id, name')
      .ilike('name', `%${keyword.value}%`);

    const ids = customerRows?.map((c) => c.id) || [];
    if (ids.length > 0) {
      query = query.in('customer_id', ids);
    } else {
      // 没搜到客户，直接返回空
      rows.value = [];
      loading.value = false;
      return;
    }
  }

  const { data, error } = await query;
  if (error) {
    ElMessage.error(error?.message || '查询失败');
  } else {
    rows.value =
      data?.map((r: any) => ({
        ...r,
        customer: r.customers,
        product: r.products,
      })) || [];
  }

  loading.value = false;
}

async function openHistory(row: any) {
  historyTitle.value = `${row.customer?.name || ''} - ${
    row.product?.name || ''
  }`;
  const { data, error } = await supabase
    .from('prices')
    .select('*')
    .eq('customer_id', row.customer_id)
    .eq('product_id', row.product_id)
    .order('valid_from', { ascending: false });
  if (error) {
    ElMessage.error('历史查询失败');
    return;
  }
  history.value = data || [];
  historyVisible.value = true;
}

function openEdit(row: any | null) {
  if (!canEdit.value) {
    ElMessage.warning('无权限编辑');
    return;
  }
  if (row) {
    editTitle.value = '修改价格';
    editForm.value = {
      customer_id: row.customer_id,
      product_id: row.product_id,
      price: row.price,
      currency: row.currency || 'CNY',
    };
  } else {
    editTitle.value = '新增价格';
    editForm.value = {
      customer_id: null,
      product_id: null,
      price: null,
      currency: 'CNY',
    };
  }
  editVisible.value = true;
}

async function savePrice() {
  const f = editForm.value;
  if (!f.customer_id || !f.product_id || f.price == null) {
    ElMessage.error('请完整填写客户、产品和价格');
    return;
  }
  saving.value = true;
  const now = new Date().toISOString();
  // 关闭旧记录
  await supabase
    .from('prices')
    .update({ valid_to: now })
    .is('valid_to', null)
    .eq('customer_id', f.customer_id)
    .eq('product_id', f.product_id);
  // 插入新记录
  const { error } = await supabase.from('prices').insert({
    customer_id: f.customer_id,
    product_id: f.product_id,
    price: f.price,
    currency: f.currency,
    valid_from: now,
  });
  if (error) {
    ElMessage.error(error?.message || '保存失败');
  } else {
    ElMessage.success('保存成功');
    editVisible.value = false;
    await fetchData();
  }
  saving.value = false;
}

async function loadOptions() {
  const [{ data: cs }, { data: ps }] = await Promise.all([
    supabase.from('customers').select('id, name'),
    supabase.from('products').select('id, name'),
  ]);
  customers.value = cs || [];
  products.value = ps || [];
}

onMounted(async () => {
  await loadOptions();
  await fetchData();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
</style>

