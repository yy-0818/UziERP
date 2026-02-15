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
              <span>最近销售记录</span>
            </div>
          </template>
          <el-table :data="recentSales" size="small" v-loading="salesTableLoading">
            <el-table-column prop="document_date" label="日期" width="110" />
            <el-table-column prop="document_no" label="单据编号" min-width="160" show-overflow-tooltip />
            <el-table-column prop="customer_name" label="客户" min-width="160" show-overflow-tooltip />
            <el-table-column prop="product_name" label="商品" min-width="120" show-overflow-tooltip />
            <el-table-column prop="amount_usd" label="合计$" width="110" align="right" />
            <el-table-column prop="amount_uzs" label="苏姆合计" width="130" align="right" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card class="erp-card">
          <template #header>
            <div class="erp-card-header">
              <span>最近收款记录</span>
            </div>
          </template>
          <el-table :data="recentReceipts" size="small" v-loading="receiptsTableLoading">
            <el-table-column prop="receipt_date" label="日期" width="110" />
            <el-table-column prop="customer_name" label="客户" min-width="160" show-overflow-tooltip />
            <el-table-column prop="amount_usd" label="美金$" width="110" align="right" />
            <el-table-column prop="amount_uzs" label="苏姆" width="130" align="right" />
            <el-table-column prop="note" label="备注" min-width="140" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue';
import { supabase } from '../../supabase';
import { fetchRecentSales, fetchRecentReceipts, fetchDashboardTotals } from '../sales/api';
import type { SalesRow, ReceiptRow } from '../sales/types';

const recentContractCount = ref<number | null>(null);
const recentAttachmentCount = ref<number | null>(null);
const salesTotalUsd = ref<number | null>(null);
const receiptTotalUsd = ref<number | null>(null);
const receiptTotalUzs = ref<number | null>(null);

const recentSales = ref<SalesRow[]>([]);
const recentReceipts = ref<ReceiptRow[]>([]);
const salesTableLoading = ref(true);
const receiptsTableLoading = ref(true);

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const rangeEnd = toLocalDateString(new Date());
const rangeStart = toLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

const cards = ref([
  { title: '销售总销售额', value: '—', sub: '美元合计 $', loading: true },
  { title: '收款合计（美金）', value: '—', sub: '美金金额 $', loading: true },
  { title: '收款合计（苏姆）', value: '—', sub: '苏姆金额', loading: true },
  {
    title: '近30天新增（合同/附件）',
    value: '—',
    sub: `${rangeStart} ~ ${rangeEnd}`,
    loading: true,
  },
]);

function fmtMoney(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadStats() {
  try {
    const [totalsRes, contractRes, attachmentRes] = await Promise.all([
      fetchDashboardTotals(),
      supabase
        .from('contract_versions')
        .select('id', { count: 'exact', head: true })
        .not('contract_date', 'is', null)
        .gte('contract_date', rangeStart),
      supabase
        .from('contract_attachments')
        .select('id', { count: 'exact', head: true })
        .not('attachment_date', 'is', null)
        .gte('attachment_date', rangeStart),
    ]);
    salesTotalUsd.value = totalsRes.sales_total_usd;
    receiptTotalUsd.value = totalsRes.receipt_total_usd;
    receiptTotalUzs.value = totalsRes.receipt_total_uzs;
    recentContractCount.value = contractRes.count ?? 0;
    recentAttachmentCount.value = attachmentRes.count ?? 0;

    cards.value[0].value = fmtMoney(totalsRes.sales_total_usd);
    cards.value[0].loading = false;
    cards.value[1].value = fmtMoney(totalsRes.receipt_total_usd);
    cards.value[1].loading = false;
    cards.value[2].value = fmtMoney(totalsRes.receipt_total_uzs);
    cards.value[2].loading = false;
    cards.value[3].value = `${recentContractCount.value} / ${recentAttachmentCount.value}`;
    cards.value[3].loading = false;
  } catch (e) {
    console.error(e);
    cards.value.forEach((c) => { c.value = '—'; c.loading = false; });
  }
}

async function loadRecentSales() {
  salesTableLoading.value = true;
  try {
    recentSales.value = await fetchRecentSales(10);
  } catch (e) {
    console.error(e);
    recentSales.value = [];
  } finally {
    salesTableLoading.value = false;
  }
}

async function loadRecentReceipts() {
  receiptsTableLoading.value = true;
  try {
    recentReceipts.value = await fetchRecentReceipts(10);
  } catch (e) {
    console.error(e);
    recentReceipts.value = [];
  } finally {
    receiptsTableLoading.value = false;
  }
}

function refreshDashboard() {
  loadStats();
  loadRecentSales();
  loadRecentReceipts();
}

onMounted(refreshDashboard);
onActivated(refreshDashboard);
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

.erp-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
