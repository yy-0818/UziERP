<template>
  <div class="page-container dashboard">
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :lg="6" v-for="card in cards" :key="card.title">
        <el-card class="erp-card stat-card" v-loading="card.loading" shadow="hover">
          <div class="stat-title">{{ card.title }}</div>
          <div class="stat-value">{{ card.loading ? '—' : card.value }}</div>
          <div class="stat-sub">{{ card.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="16">
        <el-card class="erp-card chart-card" shadow="hover">
          <template #header>
            <div class="erp-card-header">
              <span>近30天销售与收款趋势</span>
              <el-tag size="small" type="info">美元 $</el-tag>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container" v-loading="chartLoading"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card class="erp-card chart-card" shadow="hover">
          <template #header>
            <div class="erp-card-header">
              <span>收款占比</span>
              <el-tag size="small">销售 vs 收款</el-tag>
            </div>
          </template>
          <div ref="ratioChartRef" class="chart-container chart-container--compact" v-loading="chartLoading"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :span="24">
        <el-card class="erp-card chart-card" shadow="hover">
          <template #header>
            <div class="erp-card-header">
              <span>每日销售与收款对比</span>
            </div>
          </template>
          <div ref="barChartRef" class="chart-container chart-container--bar" v-loading="chartLoading"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="table-row">
      <el-col :xs="24" :lg="14">
        <el-card class="erp-card" shadow="hover">
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
      <el-col :xs="24" :lg="10">
        <el-card class="erp-card" shadow="hover">
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
import { ref, onMounted, onActivated, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import { supabase } from '../../supabase';
import {
  fetchRecentSales,
  fetchRecentReceipts,
  fetchDashboardTotals,
  fetchDashboardChartData,
} from '../sales/api';
import type { SalesRow, ReceiptRow } from '../sales/types';
import { useTheme } from '../../composables/useTheme';

const { isDark } = useTheme();

const recentContractCount = ref<number | null>(null);
const recentAttachmentCount = ref<number | null>(null);
const salesTotalUsd = ref<number | null>(null);
const receiptTotalUsd = ref<number | null>(null);
const receiptTotalUzs = ref<number | null>(null);

const recentSales = ref<SalesRow[]>([]);
const recentReceipts = ref<ReceiptRow[]>([]);
const salesTableLoading = ref(true);
const receiptsTableLoading = ref(true);
const chartLoading = ref(true);

const trendChartRef = ref<HTMLElement | null>(null);
const ratioChartRef = ref<HTMLElement | null>(null);
const barChartRef = ref<HTMLElement | null>(null);
let trendChart: ECharts | null = null;
let ratioChart: ECharts | null = null;
let barChart: ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

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

function getChartTheme() {
  return isDark.value ? 'dark' : null;
}

function getChartColors() {
  if (isDark.value) {
    return {
      sales: '#5B8FF9',
      receipts: '#5AD8A6',
      ratioSales: '#5B8FF9',
      ratioReceipts: '#5AD8A6',
      text: '#a7b3c3',
    };
  }
  return {
    sales: '#1890ff',
    receipts: '#52c41a',
    ratioSales: '#1890ff',
    ratioReceipts: '#52c41a',
    text: '#595959',
  };
}

function initTrendChart(labels: string[], sales: number[], receipts: number[]) {
  if (!trendChartRef.value) return;
  trendChart?.dispose();
  trendChart = echarts.init(trendChartRef.value, getChartTheme());
  const colors = getChartColors();

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        const lines = params.map((p: any) => `${p.marker} ${p.seriesName}: $${(p.value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`);
        return `<div style="font-size:12px">${params[0]?.axisValue ?? ''}</div>${lines.join('<br/>')}`;
      },
    },
    legend: {
      data: ['销售金额', '收款金额'],
      bottom: 0,
      textStyle: { color: colors.text },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels.map((l) => l.slice(5)),
      axisLabel: { color: colors.text, rotate: 45 },
      axisLine: { lineStyle: { color: isDark.value ? '#283241' : '#e8e8e8' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.text },
      splitLine: { lineStyle: { color: isDark.value ? '#283241' : '#f0f0f0' } },
      axisLine: { show: false },
    },
    series: [
      {
        name: '销售金额',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.2 },
        lineStyle: { color: colors.sales },
        itemStyle: { color: colors.sales },
        data: sales,
      },
      {
        name: '收款金额',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.2 },
        lineStyle: { color: colors.receipts },
        itemStyle: { color: colors.receipts },
        data: receipts,
      },
    ],
  });
}

function initRatioChart(salesTotal: number, receiptTotal: number) {
  if (!ratioChartRef.value) return;
  ratioChart?.dispose();
  ratioChart = echarts.init(ratioChartRef.value, getChartTheme());
  const colors = getChartColors();

  const total = salesTotal + receiptTotal || 1;
  const salesPercent = ((salesTotal / total) * 100).toFixed(1);
  const receiptPercent = ((receiptTotal / total) * 100).toFixed(1);

  ratioChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) =>
        `${params.marker} ${params.name}: $${(params.value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} (${params.percent}%)`,
    },
    legend: {
      orient: 'vertical',
      right: '8%',
      top: 'center',
      textStyle: { color: colors.text },
    },
    series: [
      {
        name: '金额分布',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: isDark.value ? '#141a23' : '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: false },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
        },
        data: [
          { value: salesTotal, name: '销售', itemStyle: { color: colors.ratioSales } },
          { value: receiptTotal, name: '收款', itemStyle: { color: colors.ratioReceipts } },
        ],
      },
    ],
  });
}

function initBarChart(labels: string[], sales: number[], receipts: number[]) {
  if (!barChartRef.value) return;
  barChart?.dispose();
  barChart = echarts.init(barChartRef.value, getChartTheme());
  const colors = getChartColors();

  barChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        const lines = params.map((p: any) => `${p.marker} ${p.seriesName}: $${(p.value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`);
        return `<div style="font-size:12px">${params[0]?.axisValue ?? ''}</div>${lines.join('<br/>')}`;
      },
    },
    legend: {
      data: ['销售', '收款'],
      bottom: 0,
      textStyle: { color: colors.text },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels.map((l) => l.slice(5)),
      axisLabel: { color: colors.text, rotate: 45 },
      axisLine: { lineStyle: { color: isDark.value ? '#283241' : '#e8e8e8' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.text },
      splitLine: { lineStyle: { color: isDark.value ? '#283241' : '#f0f0f0' } },
      axisLine: { show: false },
    },
    series: [
      { name: '销售', type: 'bar', data: sales, itemStyle: { color: colors.sales }, barMaxWidth: 24 },
      { name: '收款', type: 'bar', data: receipts, itemStyle: { color: colors.receipts }, barMaxWidth: 24 },
    ],
  });
}

function resizeCharts() {
  trendChart?.resize();
  ratioChart?.resize();
  barChart?.resize();
}

async function loadChartData() {
  chartLoading.value = true;
  try {
    const [chartRes, totalsRes] = await Promise.all([
      fetchDashboardChartData(30),
      fetchDashboardTotals(),
    ]);

    const { labels, sales, receipts_usd } = chartRes;
    if (labels.length > 0) {
      initTrendChart(labels, sales, receipts_usd);
      initBarChart(labels, sales, receipts_usd);
    }

    initRatioChart(totalsRes.sales_total_usd, totalsRes.receipt_total_usd);
    resizeCharts();
  } catch (e) {
    console.error(e);
  } finally {
    chartLoading.value = false;
  }
}

watch(isDark, () => {
  loadChartData();
});

onMounted(() => {
  resizeObserver = new ResizeObserver(resizeCharts);
  if (trendChartRef.value) resizeObserver.observe(trendChartRef.value);
  if (ratioChartRef.value) resizeObserver.observe(ratioChartRef.value);
  if (barChartRef.value) resizeObserver.observe(barChartRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  trendChart?.dispose();
  ratioChart?.dispose();
  barChart?.dispose();
});

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
  loadChartData();
}

onMounted(refreshDashboard);
onActivated(refreshDashboard);
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-card {
  text-align: left;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-title {
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-placeholder);
}

.chart-row {
  margin-top: 0;
}

.chart-card .erp-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.chart-container--compact {
  height: 240px;
}

.chart-container--bar {
  height: 300px;
}

.table-row {
  margin-top: 0;
}

.erp-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
