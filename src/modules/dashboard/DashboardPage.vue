<template>
  <div class="page-container dashboard">
    <el-row :gutter="16">
      <el-col :span="6" v-for="card in cards" :key="card.title">
        <el-card class="erp-card stat-card" v-loading="card.loading">
          <div class="stat-title">{{ card.title }}</div>
          <div class="stat-value">{{ card.loading ? '—' : card.value }}</div>
          <div class="stat-sub">{{ card.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="14">
        <el-card class="erp-card">
          <template #header>
            <div class="erp-card-header">
              <span>最近 7 天价格变更（示例数据）</span>
            </div>
          </template>
          <el-table :data="recentPriceChanges" size="small">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="customer" label="客户" />
            <el-table-column prop="product" label="产品" />
            <el-table-column prop="oldPrice" label="原价" width="100" />
            <el-table-column prop="newPrice" label="新价" width="100" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card class="erp-card">
          <template #header>
            <div class="erp-card-header">
              <span>待处理事项（示例数据）</span>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="item in todos"
              :key="item.id"
              :timestamp="item.due"
              :type="item.type"
            >
              {{ item.title }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '../../supabase';

const customerCount = ref<number | null>(null);
const productCount = ref<number | null>(null);
const statsLoading = ref(true);

const cards = ref([
  {
    title: '客户总数',
    value: '—',
    sub: '来自 customers 表',
    loading: true,
  },
  {
    title: '产品种类',
    value: '—',
    sub: '来自 products 表',
    loading: true,
  },
  {
    title: '本月合同金额',
    value: '¥ 3,580,000',
    sub: '较上月 +12.3%',
    loading: false,
  },
  {
    title: '待处理代办',
    value: '18',
    sub: 'HR 7 / 合同 6 / 价格 5',
    loading: false,
  },
]);

async function loadStats() {
  statsLoading.value = true;
  try {
    const [custRes, prodRes] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
    ]);
    customerCount.value = custRes.count ?? 0;
    productCount.value = prodRes.count ?? 0;
    cards.value[0].value = String(customerCount.value);
    cards.value[0].loading = false;
    cards.value[1].value = String(productCount.value);
    cards.value[1].loading = false;
  } catch (e) {
    console.error(e);
    cards.value[0].value = '—';
    cards.value[0].loading = false;
    cards.value[1].value = '—';
    cards.value[1].loading = false;
  } finally {
    statsLoading.value = false;
  }
}

onMounted(() => {
  loadStats();
});

const recentPriceChanges = [
  {
    date: '2026-02-01',
    customer: '蓝森电器',
    product: '12P 普通款',
    oldPrice: '5.30',
    newPrice: '5.55',
  },
  {
    date: '2026-02-02',
    customer: '宏达批发',
    product: '12F 加厚款',
    oldPrice: '6.10',
    newPrice: '6.35',
  },
  {
    date: '2026-02-03',
    customer: '边贸公司 A',
    product: '12G 特级',
    oldPrice: '7.80',
    newPrice: '8.05',
  },
];

const todos = [
  {
    id: 1,
    title: '审核蓝森 2 月价格调整方案',
    due: '今日',
    type: 'danger',
  },
  {
    id: 2,
    title: '签署与乌兹经销商年度合同',
    due: '明日',
    type: 'warning',
  },
  {
    id: 3,
    title: '完成 3 名新入职乌兹员工入职手续',
    due: '本周内',
    type: 'primary',
  },
];
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-card {
  text-align: left;
}

.stat-title {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 600;
  color: #303133;
}

.stat-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #a0a0a0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>

