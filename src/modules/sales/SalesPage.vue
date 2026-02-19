<template>
  <div class="page-container page sales-page">
    <el-card class="erp-card">
      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <!-- ==================== 销售数据 ==================== -->
        <el-tab-pane label="销售数据" name="sales">
          <div class="erp-toolbar">
            <el-input
              v-model="salesFilters.keyword"
              placeholder="单据号 / 客户 / 商品 / 合同号"
              clearable
              style="width: 280px"
              @keyup.enter="fetchSalesData"
            />
            <el-date-picker
              v-model="salesFilters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 260px"
            />
            <el-button type="primary" @click="fetchSalesData">查询</el-button>
            <el-button @click="resetSalesFilters">清空</el-button>
            <el-button v-if="canEdit" type="success" plain @click="openImportDialog('sales')">导入</el-button>
            <el-button v-if="canExport" type="warning" plain :loading="exporting" @click="exportSales">导出</el-button>
          </div>

          <el-table :data="salesRows" v-loading="loading" stripe border row-key="id" style="width: 100%" height="62vh">
            <el-table-column prop="document_date" label="单据日期" width="110" sortable />
            <el-table-column prop="document_no" label="单据编号" min-width="170" show-overflow-tooltip sortable />
            <el-table-column prop="payment_method" label="客户分类" min-width="120" show-overflow-tooltip sortable />
            <el-table-column prop="customer_name" label="客户名称" min-width="180" show-overflow-tooltip sortable />
            <el-table-column prop="product_name" label="商品名称" min-width="120" show-overflow-tooltip sortable />
            <el-table-column prop="color_code" label="色号" width="60" show-overflow-tooltip />
            <el-table-column prop="spec_model" label="规格型号" min-width="120" show-overflow-tooltip />
            <el-table-column prop="category" label="类别" width="80" show-overflow-tooltip sortable />
            <el-table-column prop="grade" label="等级" width="80" show-overflow-tooltip sortable />
            <el-table-column prop="box_count" label="箱数" width="80" align="right" sortable />
            <el-table-column prop="area_sqm" label="平方数" width="100" align="right" sortable />
            <el-table-column prop="unit_price_usd" label="单价$" width="100" align="right" sortable />
            <el-table-column prop="amount_usd" label="合计$" width="100" align="right" sortable />
            <el-table-column prop="exchange_rate" label="汇率" width="100" align="right" sortable />
            <el-table-column prop="amount_uzs" label="苏姆合计" width="110" align="right" sortable />
            <el-table-column prop="refund_uzs" label="退货苏姆" width="110" align="right" sortable />
            <el-table-column prop="order_no" label="订单号" min-width="140" show-overflow-tooltip sortable />
            <el-table-column prop="vehicle_no" label="车号" width="100" show-overflow-tooltip />
            <el-table-column prop="export_country" label="出口国" width="100" show-overflow-tooltip sortable />
            <el-table-column prop="dealer_name" label="经销商" min-width="100" show-overflow-tooltip />
            <el-table-column prop="shipper_name" label="发货人" width="100" show-overflow-tooltip />
            <el-table-column prop="driver_tax_no" label="司机税号" min-width="130" show-overflow-tooltip />
            <el-table-column prop="logistics_tax_no" label="物流税号" min-width="130" show-overflow-tooltip />
            <el-table-column prop="vehicle_type" label="车型" width="110" show-overflow-tooltip />
            <el-table-column prop="contract_no" label="合同编号" min-width="150" show-overflow-tooltip sortable />
            <el-table-column prop="note" label="备注" min-width="220" show-overflow-tooltip />
            <el-table-column v-if="canEdit" label="操作" width="90" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pager-wrap">
            <el-pagination
              v-model:current-page="salesPage"
              v-model:page-size="salesPageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :page-sizes="[200, 500, 1000]"
              :total="salesTotalCount"
              @current-change="fetchSalesData"
              @size-change="onSalesPageSizeChange"
            />
          </div>
        </el-tab-pane>

        <!-- ==================== 收款数据 ==================== -->
        <el-tab-pane label="收款数据" name="receipts">
          <div class="erp-toolbar">
            <el-input
              v-model="receiptFilters.keyword"
              placeholder="账户 / 客户"
              clearable
              style="width: 280px"
              @keyup.enter="fetchReceiptData"
            />
            <el-date-picker
              v-model="receiptFilters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 260px"
            />
            <el-button type="primary" @click="fetchReceiptData">查询</el-button>
            <el-button @click="resetReceiptFilters">清空</el-button>
            <el-button v-if="canEdit" type="success" plain @click="openImportDialog('receipt')">导入</el-button>
            <el-button v-if="canExport" type="warning" plain :loading="exporting" @click="exportReceipts">导出</el-button>
          </div>

          <el-table :data="receiptRows" v-loading="loading" stripe border row-key="id" style="width: 100%" height="62vh">
            <el-table-column prop="receipt_date" label="日期" width="110" sortable />
            <el-table-column prop="account_name" label="账户" width="80" sortable />
            <el-table-column prop="customer_name" label="客户名称" min-width="100" show-overflow-tooltip sortable />
            <el-table-column prop="amount_usd" label="美金金额" width="110" align="right" sortable />
            <el-table-column prop="amount_uzs" label="苏姆金额" width="130" align="right" sortable />
            <el-table-column prop="note" label="备注" min-width="400" show-overflow-tooltip />
          </el-table>
          <div class="pager-wrap">
            <el-pagination
              v-model:current-page="receiptPage"
              v-model:page-size="receiptPageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :page-sizes="[200, 500, 1000]"
              :total="receiptTotalCount"
              @current-change="fetchReceiptData"
              @size-change="onReceiptPageSizeChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ==================== 导入弹窗 ==================== -->
    <el-dialog v-model="importVisible" :title="importTitle" width="760px" destroy-on-close append-to-body>
      <el-alert type="info" :closable="false" show-icon title="支持 xlsx/csv/json；大文件自动分批写入，全部行直接提交给服务器" style="margin-bottom: 12px" />
      <div class="import-actions">
        <input ref="fileInputRef" type="file" accept=".json,.csv,.xlsx,.xls,application/json,text/csv" @change="onPickImportFile" />
      </div>
      <el-input v-model="importText" type="textarea" :rows="12" placeholder="粘贴 JSON 数组，或选择 xlsx/csv/json 文件" />

      <!-- 进度条 -->
      <div v-if="importProgress.total > 0" class="import-progress-wrap">
        <div class="import-progress-info">
          <span>进度：{{ importProgress.done }} / {{ importProgress.total }} 行</span>
          <span style="margin-left: 12px">已写入 {{ importProgress.written }}</span>
        </div>
        <el-progress
          :percentage="importProgressPercent"
          :status="importProgressPercent >= 100 ? 'success' : undefined"
          :stroke-width="18"
          :text-inside="true"
        />
      </div>

      <template #footer>
        <el-button @click="importVisible = false" :disabled="importing">取消</el-button>
        <el-button type="primary" :loading="importing" @click="submitImport">
          {{ importing ? '导入中...' : '开始导入' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 编辑弹窗（展示全部字段） ==================== -->
    <el-dialog v-model="editVisible" title="编辑销售数据" width="960px" destroy-on-close append-to-body>
      <el-form label-width="130px" label-position="left">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="单据日期">
              <el-date-picker v-model="editForm.document_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单据编号">
              <el-input v-model="editForm.document_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户分类">
              <el-input v-model="editForm.payment_method" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称">
              <el-input v-model="editForm.customer_name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="商品名称">
              <el-input v-model="editForm.product_name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="色号">
              <el-input v-model="editForm.color_code" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="规格型号">
              <el-input v-model="editForm.spec_model" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="类别">
              <el-input v-model="editForm.category" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="等级">
              <el-input v-model="editForm.grade" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="箱数">
              <el-input-number v-model="editForm.box_count" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="平方数">
              <el-input-number v-model="editForm.area_sqm" :min="0" :step="0.1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价$">
              <el-input-number v-model="editForm.unit_price_usd" :min="0" :step="0.01" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="合计$">
              <el-input-number v-model="editForm.amount_usd" :min="0" :step="0.01" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="汇率">
              <el-input-number v-model="editForm.exchange_rate" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="苏姆合计">
              <el-input-number v-model="editForm.amount_uzs" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="退货苏姆">
              <el-input-number v-model="editForm.refund_uzs" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="订单号">
              <el-input v-model="editForm.order_no" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="合同编号">
              <el-input v-model="editForm.contract_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="车号">
              <el-input v-model="editForm.vehicle_no" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车型">
              <el-input v-model="editForm.vehicle_type" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出口国">
              <el-input v-model="editForm.export_country" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经销商">
              <el-input v-model="editForm.dealer_name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="发货人">
              <el-input v-model="editForm.shipper_name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="司机税号">
              <el-input v-model="editForm.driver_tax_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="物流税号">
              <el-input v-model="editForm.logistics_tax_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="editForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../../composables/useExport';
import { useAuthStore } from '../../stores/auth';
import {
  fetchSalesPage,
  fetchReceiptPage,
  fetchAllSalesRows,
  fetchAllReceiptRows,
  importSalesRowsLegacy,
  importReceiptRowsLegacy,
  updateSalesRecord,
} from './api';
import type { SalesRow, ReceiptRow } from './types';

type ImportMode = 'sales' | 'receipt';
type TabName = 'sales' | 'receipts';

const auth = useAuthStore();
const activeTab = ref<TabName>('sales');
const loading = ref(false);
const exporting = ref(false);
const STATE_KEY = 'sales.module.ui_state.v3';

/* ==================== 服务端分页数据（shallowRef 降低大列表响应式开销） ==================== */
const salesRows = shallowRef<SalesRow[]>([]);
const salesTotalCount = ref(0);
const receiptRows = shallowRef<ReceiptRow[]>([]);
const receiptTotalCount = ref(0);

const salesFilters = ref({ keyword: '', dateRange: null as [string, string] | null });
const receiptFilters = ref({ keyword: '', dateRange: null as [string, string] | null });
const salesPage = ref(1);
const salesPageSize = ref(200);
const receiptPage = ref(1);
const receiptPageSize = ref(200);

const canEdit = computed(() => ['super_admin', 'manager', 'sales'].includes(auth.role || ''));
const canExport = computed(() => (auth.role || '') !== 'viewer');

const modifierEmail = computed(() => {
  try {
    const fromStorage = typeof localStorage !== 'undefined' && localStorage.getItem('user.email');
    if (fromStorage) return fromStorage;
  } catch { /* ignore */ }
  return auth.email || '';
});

/* ==================== 导入相关 ==================== */
const importVisible = ref(false);
const importMode = ref<ImportMode>('sales');
const importText = ref('');
const importing = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const parsedImportRows = ref<Record<string, any>[] | null>(null);

const importProgress = ref({ total: 0, done: 0, written: 0 });
const importProgressPercent = computed(() => {
  if (importProgress.value.total <= 0) return 0;
  return Math.round((importProgress.value.done / importProgress.value.total) * 100);
});
const importTitle = computed(() => (importMode.value === 'sales' ? '导入销售数据(xlsx/csv/json)' : '导入收款数据(xlsx/csv/json)'));

/* ==================== 编辑相关 ==================== */
const editVisible = ref(false);
const saving = ref(false);
const editForm = ref<any>({});

/* ==================== 数据获取 (服务端分页) ==================== */
async function fetchSalesData() {
  loading.value = true;
  try {
    const res = await fetchSalesPage({
      page: salesPage.value,
      pageSize: salesPageSize.value,
      dateFrom: salesFilters.value.dateRange?.[0] || null,
      dateTo: salesFilters.value.dateRange?.[1] || null,
      keyword: salesFilters.value.keyword || undefined,
    });
    salesRows.value = res.rows;
    salesTotalCount.value = res.total;
  } catch (e: any) {
    ElMessage.error(e?.message || '销售数据加载失败');
    salesRows.value = [];
    salesTotalCount.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchReceiptData() {
  loading.value = true;
  try {
    const res = await fetchReceiptPage({
      page: receiptPage.value,
      pageSize: receiptPageSize.value,
      dateFrom: receiptFilters.value.dateRange?.[0] || null,
      dateTo: receiptFilters.value.dateRange?.[1] || null,
      keyword: receiptFilters.value.keyword || undefined,
    });
    receiptRows.value = res.rows;
    receiptTotalCount.value = res.total;
  } catch (e: any) {
    ElMessage.error(e?.message || '收款数据加载失败');
    receiptRows.value = [];
    receiptTotalCount.value = 0;
  } finally {
    loading.value = false;
  }
}

function fetchActiveTabData(_force = false) {
  if (activeTab.value === 'sales') return fetchSalesData();
  return fetchReceiptData();
}

function onTabChange() {
  fetchActiveTabData();
}

function onSalesPageSizeChange() {
  salesPage.value = 1;
  fetchSalesData();
}
function onReceiptPageSizeChange() {
  receiptPage.value = 1;
  fetchReceiptData();
}

function resetSalesFilters() {
  salesFilters.value = { keyword: '', dateRange: null };
  salesPage.value = 1;
  fetchSalesData();
}
function resetReceiptFilters() {
  receiptFilters.value = { keyword: '', dateRange: null };
  receiptPage.value = 1;
  fetchReceiptData();
}

/* ==================== 导出（拉取全部数据） ==================== */
const SALES_EXPORT_COLS = [
  { key: 'document_date', label: '单据日期' },
  { key: 'document_no', label: '单据编号' },
  { key: 'payment_method', label: '客户分类' },
  { key: 'customer_name', label: '客户名称' },
  { key: 'product_name', label: '商品名称' },
  { key: 'color_code', label: '色号' },
  { key: 'spec_model', label: '规格型号' },
  { key: 'category', label: '类别' },
  { key: 'grade', label: '等级' },
  { key: 'box_count', label: '箱数' },
  { key: 'area_sqm', label: '平方数' },
  { key: 'unit_price_usd', label: '单价$' },
  { key: 'amount_usd', label: '合计$' },
  { key: 'exchange_rate', label: '汇率' },
  { key: 'amount_uzs', label: '苏姆合计' },
  { key: 'refund_uzs', label: '退货苏姆' },
  { key: 'order_no', label: '订单号' },
  { key: 'vehicle_no', label: '车号' },
  { key: 'export_country', label: '出口国' },
  { key: 'dealer_name', label: '经销商' },
  { key: 'shipper_name', label: '发货人' },
  { key: 'driver_tax_no', label: '司机税号' },
  { key: 'logistics_tax_no', label: '物流税号' },
  { key: 'vehicle_type', label: '车型' },
  { key: 'contract_no', label: '合同编号' },
  { key: 'note', label: '备注' },
];

const RECEIPT_EXPORT_COLS = [
  { key: 'receipt_date', label: '日期' },
  { key: 'account_name', label: '账户' },
  { key: 'customer_name', label: '客户名称' },
  { key: 'amount_usd', label: '美金金额$' },
  { key: 'amount_uzs', label: '苏姆金额' },
  { key: 'note', label: '备注' },
];

async function exportSales() {
  exporting.value = true;
  try {
    const allRows = await fetchAllSalesRows({
      dateFrom: salesFilters.value.dateRange?.[0] || null,
      dateTo: salesFilters.value.dateRange?.[1] || null,
      keyword: salesFilters.value.keyword || undefined,
    });
    if (!allRows.length) {
      ElMessage.warning('暂无可导出销售数据');
      return;
    }
    exportToExcel(
      allRows.map((r) => {
        const row: Record<string, any> = {};
        for (const col of SALES_EXPORT_COLS) {
          row[col.key] = (r as any)[col.key] ?? '';
        }
        return row;
      }),
      SALES_EXPORT_COLS,
      'sales_export'
    );
    ElMessage.success(`已导出 ${allRows.length} 条销售记录`);
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

async function exportReceipts() {
  exporting.value = true;
  try {
    const allRows = await fetchAllReceiptRows({
      dateFrom: receiptFilters.value.dateRange?.[0] || null,
      dateTo: receiptFilters.value.dateRange?.[1] || null,
      keyword: receiptFilters.value.keyword || undefined,
    });
    if (!allRows.length) {
      ElMessage.warning('暂无可导出收款数据');
      return;
    }
    exportToExcel(
      allRows.map((r) => {
        const row: Record<string, any> = {};
        for (const col of RECEIPT_EXPORT_COLS) {
          row[col.key] = (r as any)[col.key] ?? '';
        }
        return row;
      }),
      RECEIPT_EXPORT_COLS,
      'sales_receipts_export'
    );
    ElMessage.success(`已导出 ${allRows.length} 条收款记录`);
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

/* ==================== 导入逻辑 ==================== */
function normalizeKey(k: string) {
  return String(k || '').trim().toLowerCase().replace(/\s+/g, '');
}

const LEGACY_KEY_ALIASES: Record<string, string> = {
  '单据日期датадокумента': '单据日期 Дата документа',
  '单据编号номердокумента': '单据编号 Номер документа',
  '客户分类способоплаты': '客户分类 способ  оплаты',
  '客户名称названиеклиента': '客户名称 Название клиента',
  '商品名称названиетовара': '商品名称 Название товара',
  '色号партия': '色号 партия',
  '规格型号спецификация': '规格型号 спецификация',
  '类别категория': '类别 Категория',
  '等级класс': '等级 Класс',
  '箱数количествокоробок': '箱数 Количество  коробок',
  '平方数квадратныеметры': '平方数 Квадратные метры',
  '单价$ценазаединицу': '单价$ цена за единицу',
  '合计$итог': '合计$ итог',
  '汇率курсвалют': '汇率 Курс валют',
  '苏姆合计суммавсумах': '苏姆合计 Сумма в сумах',
  '订单号номерзаказа': '订单号 Номер заказа',
  '车号номеравтомобиля': '车号 Номер  автомобиля',
  '出口国страна': '出口国 Страна',
  '经销商дилер': '经销商 Дилер',
  '发货人отправитель': '发货人 Отправитель',
  '司机税号': '司机税号',
  '物流税号': '物流税号',
  '车型': '车型',
  '合同编号': '合同编号',
  '整单备注': '备注',
  '日期датадокумента': '日期 Дата документа',
  '美金金额$итог': '美金金额 $ итог',
  '苏姆金额somсуммавсумах': '苏姆金额 som Сумма в сумах',
  '备注': '备注',
};

function normalizeImportRowKeys(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row || {})) {
    const original = String(k || '').trim();
    if (!original) continue;
    out[original] = v;
    const alias = LEGACY_KEY_ALIASES[normalizeKey(original)];
    if (alias && out[alias] == null) out[alias] = v;
  }
  return out;
}

function normalizeNumericValue(v: any): string {
  if (v == null) return '';
  let s = String(v).trim();
  if (!s) return '';
  s = s.replace(/\u00a0/g, ' ').replace(/[，]/g, ',');
  s = s.replace(/\s+/g, '');
  s = s.replace(/[^\d\.\-,]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 4) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = parts.join('');
    }
  }
  const dot = s.indexOf('.');
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  }
  return s;
}

function normalizeImportRows(rows: Record<string, any>[], mode: ImportMode): Record<string, any>[] {
  return rows.map((r) => {
    const out = normalizeImportRowKeys(r || {});
    const numericKeys = mode === 'sales'
      ? ['box_count', 'area_sqm', 'unit_price_usd', 'amount_usd', 'exchange_rate', 'amount_uzs', 'refund_uzs',
         '箱数 Количество  коробок', '平方数 Квадратные метры', '单价$ цена за единицу', '合计$ итог',
         '汇率 Курс валют', '苏姆合计 Сумма в сумах', '退货苏姆']
      : ['amount_usd', 'amount_uzs', '美金金额 $ итог', '苏姆金额 som Сумма в сумах'];
    numericKeys.forEach((k) => { if (k in out) out[k] = normalizeNumericValue(out[k]); });
    return out;
  });
}

async function parseRowsFromFile(file: File): Promise<Record<string, any>[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.json')) {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) throw new Error('JSON 文件内容必须是数组');
    return parsed.map((r) => normalizeImportRowKeys(r || {}));
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false });
  return rows.map((r) => normalizeImportRowKeys(r || {}));
}

function openImportDialog(mode: ImportMode) {
  if (!canEdit.value) return;
  importMode.value = mode;
  importText.value = '';
  parsedImportRows.value = null;
  importProgress.value = { total: 0, done: 0, written: 0 };
  if (fileInputRef.value) fileInputRef.value.value = '';
  importVisible.value = true;
}

async function onPickImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  try {
    const rows = await parseRowsFromFile(file);
    parsedImportRows.value = rows;
    importText.value = JSON.stringify(rows.slice(0, 50), null, 2);
    ElMessage.success(`已解析 ${rows.length} 行数据（文本框仅预览前 50 行，提交会导入全部）`);
  } catch (e: any) {
    ElMessage.error(e?.message || '读取文件失败');
  }
}

async function submitImport() {
  if (!canEdit.value) return;
  const txt = importText.value.trim();
  if (!txt && !parsedImportRows.value?.length) {
    ElMessage.warning('请粘贴或选择数据');
    return;
  }
  importing.value = true;
  importProgress.value = { total: 0, done: 0, written: 0 };
  try {
    let payload: Record<string, any>[];
    if (parsedImportRows.value && parsedImportRows.value.length > 0) {
      payload = parsedImportRows.value;
    } else {
      const parsed = JSON.parse(txt);
      if (!Array.isArray(parsed)) throw new Error('导入数据必须是 JSON 数组');
      payload = parsed;
    }
    payload = normalizeImportRows(payload, importMode.value);
    importProgress.value.total = payload.length;

    const BATCH = 500;
    let written = 0;
    for (let i = 0; i < payload.length; i += BATCH) {
      const chunk = payload.slice(i, i + BATCH);
      const res = importMode.value === 'sales'
        ? await importSalesRowsLegacy(chunk)
        : await importReceiptRowsLegacy(chunk);
      written += Number(res?.written ?? 0);
      importProgress.value.done = Math.min(i + BATCH, payload.length);
      importProgress.value.written = written;
    }
    ElMessage.success(`导入完成：共 ${payload.length} 行，已写入 ${written} 行`);
    importVisible.value = false;
    await fetchActiveTabData(true);
  } catch (e: any) {
    console.error('import failed', e);
    const msg = e?.message || e?.error_description || e?.details || (typeof e === 'string' ? e : '') || '导入失败';
    ElMessage.error(msg);
  } finally {
    importing.value = false;
  }
}

/* ==================== 编辑 ==================== */
function openEdit(row: SalesRow) {
  if (!canEdit.value) return;
  editForm.value = {
    id: row.id,
    document_date: row.document_date || null,
    document_no: row.document_no || '',
    payment_method: row.payment_method || '',
    customer_name: row.customer_name || '',
    product_name: row.product_name || '',
    color_code: row.color_code || '',
    spec_model: row.spec_model || '',
    category: row.category || '',
    grade: row.grade || '',
    box_count: row.box_count,
    area_sqm: row.area_sqm,
    unit_price_usd: row.unit_price_usd,
    amount_usd: row.amount_usd,
    exchange_rate: row.exchange_rate,
    amount_uzs: row.amount_uzs,
    refund_uzs: row.refund_uzs,
    order_no: row.order_no || '',
    contract_no: row.contract_no || '',
    vehicle_no: row.vehicle_no || '',
    vehicle_type: row.vehicle_type || '',
    export_country: row.export_country || '',
    dealer_name: row.dealer_name || '',
    shipper_name: row.shipper_name || '',
    driver_tax_no: row.driver_tax_no || '',
    logistics_tax_no: row.logistics_tax_no || '',
    note: row.note || '',
  };
  editVisible.value = true;
}

async function saveEdit() {
  if (!canEdit.value) return;
  const f = editForm.value;
  if (!f.id) return;
  if (!String(f.document_no || '').trim()) { ElMessage.error('单据编号不能为空'); return; }
  if (!String(f.customer_name || '').trim()) { ElMessage.error('客户名称不能为空'); return; }
  if (!String(f.product_name || '').trim()) { ElMessage.error('商品名称不能为空'); return; }
  saving.value = true;
  try {
    await updateSalesRecord({
      id: f.id,
      modifierEmail: modifierEmail.value || undefined,
      modifierUserId: auth.user?.id || undefined,
      payload: {
        document_date: f.document_date || null,
        document_no: String(f.document_no || '').trim(),
        payment_method: f.payment_method?.trim() || null,
        customer_name: String(f.customer_name || '').trim(),
        product_name: String(f.product_name || '').trim(),
        color_code: f.color_code?.trim() || null,
        spec_model: f.spec_model?.trim() || null,
        category: f.category?.trim() || null,
        grade: f.grade?.trim() || null,
        box_count: f.box_count,
        area_sqm: f.area_sqm,
        unit_price_usd: f.unit_price_usd,
        amount_usd: f.amount_usd,
        exchange_rate: f.exchange_rate,
        amount_uzs: f.amount_uzs,
        refund_uzs: f.refund_uzs,
        order_no: f.order_no?.trim() || null,
        contract_no: f.contract_no?.trim() || null,
        vehicle_no: f.vehicle_no?.trim() || null,
        vehicle_type: f.vehicle_type?.trim() || null,
        export_country: f.export_country?.trim() || null,
        dealer_name: f.dealer_name?.trim() || null,
        shipper_name: f.shipper_name?.trim() || null,
        driver_tax_no: f.driver_tax_no?.trim() || null,
        logistics_tax_no: f.logistics_tax_no?.trim() || null,
        note: f.note?.trim() || null,
      },
    });
    ElMessage.success('保存成功');
    editVisible.value = false;
    await fetchSalesData();
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

/* ==================== UI 持久化 ==================== */
function restoreUiState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s?.activeTab === 'sales' || s?.activeTab === 'receipts') activeTab.value = s.activeTab;
    if (s?.salesFilters) salesFilters.value = { ...salesFilters.value, ...s.salesFilters };
    if (s?.receiptFilters) receiptFilters.value = { ...receiptFilters.value, ...s.receiptFilters };
    if (Number(s?.salesPage) > 0) salesPage.value = Number(s.salesPage);
    if (Number(s?.salesPageSize) > 0) salesPageSize.value = Number(s.salesPageSize);
    if (Number(s?.receiptPage) > 0) receiptPage.value = Number(s.receiptPage);
    if (Number(s?.receiptPageSize) > 0) receiptPageSize.value = Number(s.receiptPageSize);
  } catch { /* ignore */ }
}

function persistUiState() {
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        activeTab: activeTab.value,
        salesFilters: salesFilters.value,
        receiptFilters: receiptFilters.value,
        salesPage: salesPage.value,
        salesPageSize: salesPageSize.value,
        receiptPage: receiptPage.value,
        receiptPageSize: receiptPageSize.value,
      })
    );
  } catch { /* ignore */ }
}

const PERSIST_DEBOUNCE_MS = 450;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedPersistUiState() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistUiState();
  }, PERSIST_DEBOUNCE_MS);
}

watch(
  [activeTab, salesFilters, receiptFilters, salesPage, salesPageSize, receiptPage, receiptPageSize],
  debouncedPersistUiState,
  { deep: true }
);

onMounted(() => {
  restoreUiState();
  fetchActiveTabData(true);
});
</script>

<style scoped>
.sales-page .erp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.sales-page .title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.sales-page .subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.sales-page .header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sales-page .erp-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.import-actions {
  margin-bottom: 10px;
}
.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.import-progress-wrap {
  margin-top: 16px;
}
.import-progress-info {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}
</style>
