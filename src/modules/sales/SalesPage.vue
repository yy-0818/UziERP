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
            <el-button type="primary" @click="fetchSalesData">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="resetSalesFilters">
              <el-icon><RefreshRight /></el-icon>
              清空
            </el-button>
            <el-dropdown v-if="canEdit || canExport" trigger="click" @command="onSalesToolbarCommand">
              <el-button>
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="canEdit" command="add"><el-icon><Plus /></el-icon>新增</el-dropdown-item>
                  <el-dropdown-item v-if="canEdit" command="import"><el-icon><Upload /></el-icon>导入</el-dropdown-item>
                  <el-dropdown-item v-if="canExport" command="export" :disabled="exporting"><el-icon><Download /></el-icon>导出</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <el-table :data="salesRows" v-loading="loading" stripe border row-key="id" style="width: 100%" height="62vh" @filter-change="onSalesFilterChange">
            <el-table-column prop="document_date" label="单据日期" width="120" sortable :filters="salesDateFilters" :filtered-value="(salesColumnFilters.document_date || [])" column-key="document_date" />
            <el-table-column prop="document_no" label="单据编号" min-width="170" show-overflow-tooltip sortable :filters="salesDocumentNoFilters" :filtered-value="(salesColumnFilters.document_no || [])" column-key="document_no" />
            <el-table-column prop="payment_method" label="客户分类" min-width="120" show-overflow-tooltip sortable :filters="salesPaymentFilters" :filtered-value="(salesColumnFilters.payment_method || [])" column-key="payment_method" />
            <el-table-column prop="customer_name" label="客户名称" min-width="180" show-overflow-tooltip sortable :filters="salesCustomerNameFilters" :filtered-value="(salesColumnFilters.customer_name || [])" column-key="customer_name" />
            <el-table-column prop="product_name" label="商品名称" min-width="120" show-overflow-tooltip sortable />
            <el-table-column prop="color_code" label="色号" width="60" show-overflow-tooltip />
            <el-table-column prop="spec_model" label="规格型号" min-width="120" show-overflow-tooltip />
            <el-table-column prop="category" label="类别" width="100" show-overflow-tooltip sortable :filters="salesCategoryFilters" :filtered-value="(salesColumnFilters.category || [])" column-key="category" />
            <el-table-column prop="grade" label="等级" width="80" show-overflow-tooltip :filters="salesGradeFilters" :filtered-value="(salesColumnFilters.grade || [])" column-key="grade" />
            <el-table-column prop="box_count" label="箱数" width="80" align="right" sortable />
            <el-table-column prop="area_sqm" label="平方数" width="100" align="right" sortable />
            <el-table-column prop="unit_price_usd" label="单价$" width="100" align="right" sortable />
            <el-table-column prop="amount_usd" label="合计$" width="100" align="right" sortable />
            <el-table-column prop="exchange_rate" label="汇率" width="100" align="right" sortable />
            <el-table-column prop="amount_uzs" label="苏姆合计" width="110" align="right" sortable />
            <el-table-column prop="refund_uzs" label="退货苏姆" width="110" align="right" />
            <el-table-column prop="order_no" label="订单号" min-width="140" show-overflow-tooltip />
            <el-table-column prop="vehicle_no" label="车号" width="100" show-overflow-tooltip :filters="salesLicensePlateFilter" :filtered-value="(salesColumnFilters.vehicle_no || [])" column-key="vehicle_no" />
            <el-table-column prop="export_country" label="出口国" width="100" show-overflow-tooltip :filters="salesCountryFilters" :filtered-value="(salesColumnFilters.export_country || [])" column-key="export_country" />
            <el-table-column prop="dealer_name" label="经销商" min-width="100" show-overflow-tooltip />
            <el-table-column prop="shipper_name" label="发货人" width="100" show-overflow-tooltip />
            <el-table-column prop="driver_tax_no" label="司机税号" min-width="130" show-overflow-tooltip />
            <el-table-column prop="logistics_tax_no" label="物流税号" min-width="130" show-overflow-tooltip />
            <el-table-column prop="vehicle_type" label="车型" width="110" show-overflow-tooltip />
            <el-table-column prop="contract_no" label="合同编号" min-width="150" show-overflow-tooltip sortable :filters="salesContractNoFilters" :filtered-value="(salesColumnFilters.contract_no || [])" column-key="contract_no" />
            <el-table-column prop="note" label="备注" min-width="220" show-overflow-tooltip />
            <el-table-column v-if="canEdit" label="操作" width="120" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditSales(row)">编辑</el-button>
                <el-button v-if="canDelete" type="danger" link size="small" @click="confirmDeleteSales(row)">删除</el-button>
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
            <el-button type="primary" @click="fetchReceiptData">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="resetReceiptFilters">
              <el-icon><RefreshRight /></el-icon>
              清空
            </el-button>
            <el-dropdown v-if="canEdit || canExport" trigger="click" @command="onReceiptToolbarCommand">
              <el-button>
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="canEdit" command="add"><el-icon><Plus /></el-icon>新增</el-dropdown-item>
                  <el-dropdown-item v-if="canEdit" command="import"><el-icon><Upload /></el-icon>导入</el-dropdown-item>
                  <el-dropdown-item v-if="canExport" command="export" :disabled="exporting"><el-icon><Download /></el-icon>导出</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <el-table :data="receiptRows" v-loading="loading" stripe border row-key="id" style="width: 100%" height="62vh" @filter-change="onReceiptFilterChange">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div v-if="row.note" class="receipt-expand-note">{{ row.note }}</div>
                <div v-else class="receipt-expand-note receipt-expand-empty">无备注</div>
              </template>
            </el-table-column>
            <el-table-column prop="receipt_date" label="日期" width="110" sortable :filters="receiptDateFilters" :filtered-value="(receiptColumnFilters.receipt_date || [])" column-key="receipt_date" />
            <el-table-column prop="account_name" label="账户" width="120" sortable :filters="receiptAccountFilters" :filtered-value="(receiptColumnFilters.account_name || [])" column-key="account_name" />
            <el-table-column prop="customer_name" label="客户名称" min-width="160" show-overflow-tooltip sortable :filters="receiptCustomerNameFilters" :filtered-value="(receiptColumnFilters.customer_name || [])" column-key="customer_name" />
            <el-table-column prop="amount_usd" label="美金金额" width="120" align="right" sortable />
            <el-table-column prop="amount_uzs" label="苏姆金额" width="140" align="right" sortable />
            <el-table-column prop="note" label="备注" min-width="220" show-overflow-tooltip />
            <el-table-column v-if="canEdit" label="操作" width="120" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditReceipt(row)">编辑</el-button>
                <el-button v-if="canDelete" type="danger" link size="small" @click="confirmDeleteReceipt(row)">删除</el-button>
              </template>
            </el-table-column>
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

    <!-- ==================== 销售数据 新增/编辑弹窗 ==================== -->
    <el-dialog
      v-model="salesDialogVisible"
      :title="salesDialogIsCreate ? '新增销售数据' : '编辑销售数据'"
      width="960px"
      destroy-on-close
      append-to-body
    >
      <el-radio-group v-if="salesDialogIsCreate" v-model="salesEntryMode" class="entry-mode-switch" size="small">
        <el-radio-button value="single">单条录入</el-radio-button>
        <el-radio-button value="batch">批量粘贴</el-radio-button>
      </el-radio-group>
      <div v-if="salesDialogIsCreate && salesEntryMode === 'batch'" class="batch-paste-wrap">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 10px">
          <template #title>从 Excel 复制一行或多行数据，直接 Ctrl+V 粘贴到下方。列顺序需与导出一致</template>
        </el-alert>
        <el-input
          v-model="salesBatchPasteText"
          type="textarea"
          :rows="10"
          placeholder="粘贴 Excel 数据（Tab 分隔列，换行分隔行）..."
        />
        <div class="batch-paste-actions">
          <span v-if="salesBatchParsedCount > 0" class="batch-paste-count">已识别 {{ salesBatchParsedCount }} 行</span>
          <el-button type="primary" :loading="saving" :disabled="salesBatchParsedCount <= 0" @click.prevent="saveSalesBatch">批量添加</el-button>
        </div>
      </div>
      <el-form v-show="!salesDialogIsCreate || salesEntryMode === 'single'" @submit.prevent ref="salesFormRef" :model="salesForm" label-width="130px" label-position="left">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="单据日期" prop="document_date">
              <el-date-picker v-model="salesForm.document_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单据编号" prop="document_no" :rules="[{ required: true, message: '请输入单据编号' }]">
              <el-input v-model="salesForm.document_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户分类">
              <el-input v-model="salesForm.payment_method" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称" prop="customer_name" :rules="[{ required: true, message: '请输入客户名称' }]">
              <el-input v-model="salesForm.customer_name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="商品名称" prop="product_name" :rules="[{ required: true, message: '请输入商品名称' }]">
              <el-input v-model="salesForm.product_name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="色号">
              <el-input v-model="salesForm.color_code" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="规格型号">
              <el-input v-model="salesForm.spec_model" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="类别">
              <el-input v-model="salesForm.category" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="等级">
              <el-input v-model="salesForm.grade" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="箱数">
              <el-input-number v-model="salesForm.box_count" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="平方数">
              <el-input-number v-model="salesForm.area_sqm" :min="0" :step="0.1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价$">
              <el-input-number v-model="salesForm.unit_price_usd" :min="0" :step="0.01" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="合计$">
              <el-input-number v-model="salesForm.amount_usd" :min="0" :step="0.01" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="汇率">
              <el-input-number v-model="salesForm.exchange_rate" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="苏姆合计">
              <el-input-number v-model="salesForm.amount_uzs" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="退货苏姆">
              <el-input-number v-model="salesForm.refund_uzs" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="订单号">
              <el-input v-model="salesForm.order_no" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="合同编号">
              <el-input v-model="salesForm.contract_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="车号">
              <el-input v-model="salesForm.vehicle_no" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车型">
              <el-input v-model="salesForm.vehicle_type" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出口国">
              <el-input v-model="salesForm.export_country" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经销商">
              <el-input v-model="salesForm.dealer_name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="发货人">
              <el-input v-model="salesForm.shipper_name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="司机税号">
              <el-input v-model="salesForm.driver_tax_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="物流税号">
              <el-input v-model="salesForm.logistics_tax_no" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="salesForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="salesDialogVisible = false">取消</el-button>
        <template v-if="!salesDialogIsCreate || salesEntryMode === 'single'">
          <el-button
            v-if="salesDialogIsCreate"
            type="success"
            :loading="saving"
            @click="saveSalesAndContinue"
          >保存并继续新增</el-button>
          <el-button type="primary" :loading="saving" @click="saveSales">保存</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- ==================== 收款数据 新增/编辑弹窗 ==================== -->
    <el-dialog
      v-model="receiptDialogVisible"
      :title="receiptDialogIsCreate ? '新增收款数据' : '编辑收款数据'"
      width="640px"
      destroy-on-close
      append-to-body
    >
      <el-radio-group v-if="receiptDialogIsCreate" v-model="receiptEntryMode" class="entry-mode-switch" size="small">
        <el-radio-button value="single">单条录入</el-radio-button>
        <el-radio-button value="batch">批量粘贴</el-radio-button>
      </el-radio-group>
      <div v-if="receiptDialogIsCreate && receiptEntryMode === 'batch'" class="batch-paste-wrap">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 10px">
          <template #title>从 Excel 复制一行或多行，列顺序：日期、账户、客户名称、美金金额、苏姆金额、备注</template>
        </el-alert>
        <el-input
          v-model="receiptBatchPasteText"
          type="textarea"
          :rows="8"
          placeholder="粘贴 Excel 数据（Tab 分隔列，换行分隔行）..."
        />
        <div class="batch-paste-actions">
          <span v-if="receiptBatchParsedCount > 0" class="batch-paste-count">已识别 {{ receiptBatchParsedCount }} 行</span>
          <el-button type="primary" :loading="saving" :disabled="receiptBatchParsedCount <= 0" @click.prevent="saveReceiptBatch">批量添加</el-button>
        </div>
      </div>
      <el-form v-show="!receiptDialogIsCreate || receiptEntryMode === 'single'" ref="receiptFormRef" :model="receiptForm" label-width="100px" label-position="left" @submit.prevent>
        <el-form-item label="日期" prop="receipt_date">
          <el-date-picker v-model="receiptForm.receipt_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="账户" prop="account_name">
          <el-input v-model="receiptForm.account_name" />
        </el-form-item>
        <el-form-item label="客户名称" prop="customer_name" :rules="[{ required: true, message: '请输入客户名称' }]">
          <el-input v-model="receiptForm.customer_name" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="美金金额">
              <el-input-number v-model="receiptForm.amount_usd" :min="0" :step="0.01" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="苏姆金额">
              <el-input-number v-model="receiptForm.amount_uzs" :min="0" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="receiptForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="receiptDialogVisible = false">取消</el-button>
        <template v-if="!receiptDialogIsCreate || receiptEntryMode === 'single'">
          <el-button
            v-if="receiptDialogIsCreate"
            type="success"
            :loading="saving"
            @click="saveReceiptAndContinue"
          >保存并继续新增</el-button>
          <el-button type="primary" :loading="saving" @click="saveReceipt">保存</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Search, RefreshRight, ArrowDown, Plus, Upload, Download } from '@element-plus/icons-vue';
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import dayjs from 'dayjs';
import { exportToExcel } from '../../composables/useExport';
import { useAuthStore } from '../../stores/auth';
import {
  fetchAllSalesRows,
  fetchAllReceiptRows,
  importSalesRowsLegacy,
  importReceiptRowsLegacy,
  updateSalesRecord,
  createSalesRecord,
  createReceiptRecord,
  deleteSalesRecord,
  deleteReceiptRecord,
  updateReceiptRecord,
} from './api';
import type { SalesRow, ReceiptRow } from './types';
import { querySales, queryReceipts } from './composables/useSalesPageQueries';
import {
  getErrorMessage,
  normalizeDateForDb,
  normalizeImportRows,
  parseExcelPasteRows,
  parseRowsFromFile,
  type ImportMode,
  type ImportRow,
} from './composables/salesImportUtils';
import { hasAnyRole, hasRole } from '../../utils/permissions';

type TabName = 'sales' | 'receipts';

interface SalesFormModel extends Omit<SalesRow, 'id'> {
  id: string | null;
}

interface ReceiptFormModel extends Omit<ReceiptRow, 'id'> {
  id: string | null;
}

const auth = useAuthStore();
const activeTab = ref<TabName>('sales');
const loading = ref(false);
const exporting = ref(false);
const STATE_KEY = 'sales.module.ui_state.v3';

/* ==================== 服务端分页数据 ==================== */
const salesRows = shallowRef<SalesRow[]>([]);
const salesTotalCount = ref(0);
const receiptRows = shallowRef<ReceiptRow[]>([]);
const receiptTotalCount = ref(0);

const salesFilters = ref({ keyword: '', dateRange: null as [string, string] | null });
const receiptFilters = ref({ keyword: '', dateRange: null as [string, string] | null });
/** 销售列筛选（服务端）：columnKey -> 选中的值数组，空数组表示不过滤该列 */
const salesColumnFilters = ref<Record<string, string[]>>({});
/** 收款列筛选（服务端） */
const receiptColumnFilters = ref<Record<string, string[]>>({});
const salesPage = ref(1);
const salesPageSize = ref(200);
const receiptPage = ref(1);
const receiptPageSize = ref(200);

const canEdit = computed(() => hasAnyRole(auth.role, ['super_admin', 'manager', 'sales']));
const canExport = computed(() => !hasRole(auth.role, 'viewer'));
const canDelete = computed(() => hasRole(auth.role, 'super_admin'));

const modifierEmail = computed(() => {
  try {
    const fromStorage = typeof localStorage !== 'undefined' && localStorage.getItem('user.email');
    if (fromStorage) return fromStorage;
  } catch { /* ignore */ }
  return auth.email || '';
});

/* ==================== 列筛选选项（从当前页收集，限制条数防卡顿；筛选由服务端执行） ==================== */
const FILTER_OPTIONS_MAX = 150;
function collectFilterOptions(rows: Array<Record<string, unknown>>, field: string): { text: string; value: string }[] {
  const seen = new Set<string>();
  const result: { text: string; value: string }[] = [];
  for (const row of rows) {
    const val = String(row[field] ?? '').trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push({ text: val, value: val });
      if (result.length >= FILTER_OPTIONS_MAX) break;
    }
  }
  return result.sort((a, b) => a.text.localeCompare(b.text));
}

/* ==================== 销售数据 列筛选（从当前页数据动态收集，el-table 用） ==================== */
const salesDateFilters = computed(() => collectFilterOptions(salesRows.value, 'document_date'));
const salesDocumentNoFilters = computed(() => collectFilterOptions(salesRows.value, 'document_no'));
const salesPaymentFilters = computed(() => collectFilterOptions(salesRows.value, 'payment_method'));
const salesCustomerNameFilters = computed(() => collectFilterOptions(salesRows.value, 'customer_name'));
const salesCategoryFilters = computed(() => collectFilterOptions(salesRows.value, 'category'));
const salesGradeFilters = computed(() => collectFilterOptions(salesRows.value, 'grade'));
const salesCountryFilters = computed(() => collectFilterOptions(salesRows.value, 'export_country'));
const salesLicensePlateFilter = computed(() => collectFilterOptions(salesRows.value, 'vehicle_no'));
const salesContractNoFilters = computed(() => collectFilterOptions(salesRows.value, 'contract_no'));
/* ==================== 收款数据 列筛选（从当前页数据动态收集，el-table 用） ==================== */
const receiptDateFilters = computed(() => collectFilterOptions(receiptRows.value, 'receipt_date'));
const receiptAccountFilters = computed(() => collectFilterOptions(receiptRows.value, 'account_name'));
const receiptCustomerNameFilters = computed(() => collectFilterOptions(receiptRows.value, 'customer_name'));

/* ==================== 导入相关 ==================== */
const importVisible = ref(false);
const importMode = ref<ImportMode>('sales');
const importText = ref('');
const importing = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const parsedImportRows = ref<ImportRow[] | null>(null);

const importProgress = ref({ total: 0, done: 0, written: 0 });
const importProgressPercent = computed(() => {
  if (importProgress.value.total <= 0) return 0;
  return Math.round((importProgress.value.done / importProgress.value.total) * 100);
});
const importTitle = computed(() => (importMode.value === 'sales' ? '导入销售数据(xlsx/csv/json)' : '导入收款数据(xlsx/csv/json)'));

/* ==================== 销售数据 新增/编辑 ==================== */
const salesDialogVisible = ref(false);
const salesDialogIsCreate = ref(false);
const salesEntryMode = ref<'single' | 'batch'>('batch');
const salesBatchPasteText = ref('');
const saving = ref(false);
const salesFormRef = ref<FormInstance>();
const salesForm = ref<SalesFormModel>(getEmptySalesForm());

const salesBatchParsedCount = computed(() => parseExcelPasteRows(salesBatchPasteText.value, 'sales').length);

function getEmptySalesForm(): SalesFormModel {
  return {
    id: null,
    document_date: dayjs().format('YYYY-MM-DD'),
    document_no: '',
    payment_method: '',
    customer_name: '',
    product_name: '',
    color_code: '',
    spec_model: '',
    category: '',
    grade: '',
    box_count: null,
    area_sqm: null,
    unit_price_usd: null,
    amount_usd: null,
    exchange_rate: null,
    amount_uzs: null,
    refund_uzs: null,
    order_no: '',
    contract_no: '',
    vehicle_no: '',
    vehicle_type: '',
    export_country: '',
    dealer_name: '',
    shipper_name: '',
    driver_tax_no: '',
    logistics_tax_no: '',
    note: '',
  };
}

/* ==================== 收款数据 新增/编辑 ==================== */
const receiptDialogVisible = ref(false);
const receiptDialogIsCreate = ref(false);
const receiptEntryMode = ref<'single' | 'batch'>('batch');
const receiptBatchPasteText = ref('');
const receiptFormRef = ref<FormInstance>();
const receiptForm = ref<ReceiptFormModel>(getEmptyReceiptForm());

const receiptBatchParsedCount = computed(() => parseExcelPasteRows(receiptBatchPasteText.value, 'receipt').length);

function getEmptyReceiptForm(): ReceiptFormModel {
  return {
    id: null,
    receipt_date: dayjs().format('YYYY-MM-DD'),
    account_name: '',
    customer_name: '',
    amount_usd: null,
    amount_uzs: null,
    note: '',
  };
}

async function saveSalesBatch() {
  if (!canEdit.value) return;
  const rows = parseExcelPasteRows(salesBatchPasteText.value, 'sales');
  if (!rows.length) { ElMessage.warning('未识别到有效数据'); return; }
  saving.value = true;
  try {
    const payload = rows.map((r) => ({
      ...r,
      document_date: normalizeDateForDb(r.document_date) || dayjs().format('YYYY-MM-DD'),
      source_type: 'paste',
    }));
    const norm = normalizeImportRows(payload, 'sales');
    const BATCH = 500;
    let written = 0;
    for (let i = 0; i < norm.length; i += BATCH) {
      const chunk = norm.slice(i, i + BATCH);
      const res = await importSalesRowsLegacy(chunk);
      written += Number(res?.written ?? 0);
    }
    ElMessage.success(`批量添加成功：${written} 条`);
    salesBatchPasteText.value = '';
    salesDialogVisible.value = false;
    await fetchSalesData();
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '批量添加失败'));
  } finally {
    saving.value = false;
  }
}

async function saveReceiptBatch() {
  if (!canEdit.value) return;
  const rows = parseExcelPasteRows(receiptBatchPasteText.value, 'receipt');
  if (!rows.length) { ElMessage.warning('未识别到有效数据'); return; }
  saving.value = true;
  try {
    const payload = rows.map((r) => ({
      ...r,
      receipt_date: normalizeDateForDb(r.receipt_date) || dayjs().format('YYYY-MM-DD'),
      source_type: 'paste',
    }));
    const norm = normalizeImportRows(payload, 'receipt');
    const BATCH = 500;
    let written = 0;
    for (let i = 0; i < norm.length; i += BATCH) {
      const chunk = norm.slice(i, i + BATCH);
      const res = await importReceiptRowsLegacy(chunk);
      written += Number(res?.written ?? 0);
    }
    ElMessage.success(`批量添加成功：${written} 条`);
    receiptBatchPasteText.value = '';
    receiptDialogVisible.value = false;
    await fetchReceiptData();
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '批量添加失败'));
  } finally {
    saving.value = false;
  }
}

/* ==================== 数据获取 (服务端分页) ==================== */
async function fetchSalesData() {
  loading.value = true;
  try {
    const columnFilters = Object.keys(salesColumnFilters.value).length
      ? { ...salesColumnFilters.value }
      : undefined;
    const res = await querySales({
      page: salesPage.value,
      pageSize: salesPageSize.value,
      dateFrom: salesFilters.value.dateRange?.[0] || null,
      dateTo: salesFilters.value.dateRange?.[1] || null,
      keyword: salesFilters.value.keyword || undefined,
      columnFilters,
    });
    salesRows.value = res.rows;
    salesTotalCount.value = res.total;
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '销售数据加载失败'));
    salesRows.value = [];
    salesTotalCount.value = 0;
  } finally {
    loading.value = false;
  }
}

async function fetchReceiptData() {
  loading.value = true;
  try {
    const columnFilters = Object.keys(receiptColumnFilters.value).length
      ? { ...receiptColumnFilters.value }
      : undefined;
    const res = await queryReceipts({
      page: receiptPage.value,
      pageSize: receiptPageSize.value,
      dateFrom: receiptFilters.value.dateRange?.[0] || null,
      dateTo: receiptFilters.value.dateRange?.[1] || null,
      keyword: receiptFilters.value.keyword || undefined,
      columnFilters,
    });
    receiptRows.value = res.rows;
    receiptTotalCount.value = res.total;
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '收款数据加载失败'));
    receiptRows.value = [];
    receiptTotalCount.value = 0;
  } finally {
    loading.value = false;
  }
}

/** 销售列筛选变更：服务端筛选，重置到第一页 */
function onSalesFilterChange(filters: Record<string, string[]>) {
  salesColumnFilters.value = { ...filters };
  salesPage.value = 1;
  fetchSalesData();
}

/** 收款列筛选变更：服务端筛选，重置到第一页 */
function onReceiptFilterChange(filters: Record<string, string[]>) {
  receiptColumnFilters.value = { ...filters };
  receiptPage.value = 1;
  fetchReceiptData();
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
  salesColumnFilters.value = {};
  salesPage.value = 1;
  fetchSalesData();
}
function resetReceiptFilters() {
  receiptFilters.value = { keyword: '', dateRange: null };
  receiptColumnFilters.value = {};
  receiptPage.value = 1;
  fetchReceiptData();
}

function onSalesToolbarCommand(cmd: string) {
  if (cmd === 'add') openCreateSales();
  else if (cmd === 'import') openImportDialog('sales');
  else if (cmd === 'export') exportSales();
}

function onReceiptToolbarCommand(cmd: string) {
  if (cmd === 'add') openCreateReceipt();
  else if (cmd === 'import') openImportDialog('receipt');
  else if (cmd === 'export') exportReceipts();
}

/* ==================== 新增/编辑 销售数据 ==================== */
function openCreateSales() {
  if (!canEdit.value) return;
  salesDialogIsCreate.value = true;
  salesEntryMode.value = 'batch';
  salesBatchPasteText.value = '';
  salesForm.value = getEmptySalesForm();
  salesDialogVisible.value = true;
}

function openEditSales(row: SalesRow) {
  if (!canEdit.value) return;
  salesDialogIsCreate.value = false;
  salesForm.value = {
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
  salesDialogVisible.value = true;
}

function buildSalesPayload() {
  const f = salesForm.value;
  return {
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
  };
}

async function validateSalesForm(): Promise<boolean> {
  const f = salesForm.value;
  if (!String(f.document_no || '').trim()) { ElMessage.error('单据编号不能为空'); return false; }
  if (!String(f.customer_name || '').trim()) { ElMessage.error('客户名称不能为空'); return false; }
  if (!String(f.product_name || '').trim()) { ElMessage.error('商品名称不能为空'); return false; }
  return true;
}

async function saveSales() {
  if (!canEdit.value) return;
  if (!(await validateSalesForm())) return;
  saving.value = true;
  try {
    const payload = buildSalesPayload();
    if (salesDialogIsCreate.value) {
      await createSalesRecord(payload);
      ElMessage.success('新增成功');
    } else {
      await updateSalesRecord({
        id: salesForm.value.id,
        modifierEmail: modifierEmail.value || undefined,
        modifierUserId: auth.user?.id || undefined,
        payload,
      });
      ElMessage.success('保存成功');
    }
    salesDialogVisible.value = false;
    await fetchSalesData();
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '操作失败'));
  } finally {
    saving.value = false;
  }
}

async function saveSalesAndContinue() {
  if (!canEdit.value) return;
  if (!(await validateSalesForm())) return;
  saving.value = true;
  try {
    const payload = buildSalesPayload();
    await createSalesRecord(payload);
    ElMessage.success('新增成功，可继续添加');
    const prev = salesForm.value;
    salesForm.value = {
      ...getEmptySalesForm(),
      payment_method: prev.payment_method,
      export_country: prev.export_country,
      dealer_name: prev.dealer_name,
      shipper_name: prev.shipper_name,
      exchange_rate: prev.exchange_rate,
    };
    await fetchSalesData();
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '新增失败'));
  } finally {
    saving.value = false;
  }
}

async function confirmDeleteSales(row: SalesRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除该销售记录？（单据号：${row.document_no || '-'}）`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    );
    await deleteSalesRecord(row.id);
    ElMessage.success('已删除');
    await fetchSalesData();
  } catch { /* cancelled */ }
}

/* ==================== 新增/编辑 收款数据 ==================== */
function openCreateReceipt() {
  if (!canEdit.value) return;
  receiptDialogIsCreate.value = true;
  receiptEntryMode.value = 'batch';
  receiptBatchPasteText.value = '';
  receiptForm.value = getEmptyReceiptForm();
  receiptDialogVisible.value = true;
}

function openEditReceipt(row: ReceiptRow) {
  if (!canEdit.value) return;
  receiptDialogIsCreate.value = false;
  receiptForm.value = {
    id: row.id,
    receipt_date: row.receipt_date || null,
    account_name: row.account_name || '',
    customer_name: row.customer_name || '',
    amount_usd: row.amount_usd,
    amount_uzs: row.amount_uzs,
    note: row.note || '',
  };
  receiptDialogVisible.value = true;
}

async function saveReceipt() {
  if (!canEdit.value) return;
  const f = receiptForm.value;
  if (!String(f.customer_name || '').trim()) { ElMessage.error('客户名称不能为空'); return; }
  saving.value = true;
  try {
    const payload = {
      receipt_date: f.receipt_date || null,
      account_name: f.account_name?.trim() || null,
      customer_name: String(f.customer_name || '').trim(),
      amount_usd: f.amount_usd,
      amount_uzs: f.amount_uzs,
      note: f.note?.trim() || null,
    };
    if (receiptDialogIsCreate.value) {
      await createReceiptRecord(payload);
      ElMessage.success('新增成功');
    } else {
      await updateReceiptRecord(f.id, payload);
      ElMessage.success('保存成功');
    }
    receiptDialogVisible.value = false;
    await fetchReceiptData();
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '操作失败'));
  } finally {
    saving.value = false;
  }
}

async function saveReceiptAndContinue() {
  if (!canEdit.value) return;
  const f = receiptForm.value;
  if (!String(f.customer_name || '').trim()) { ElMessage.error('客户名称不能为空'); return; }
  saving.value = true;
  try {
    const payload = {
      receipt_date: f.receipt_date || null,
      account_name: f.account_name?.trim() || null,
      customer_name: String(f.customer_name || '').trim(),
      amount_usd: f.amount_usd,
      amount_uzs: f.amount_uzs,
      note: f.note?.trim() || null,
    };
    await createReceiptRecord(payload);
    ElMessage.success('新增成功，可继续添加');
    const prev = receiptForm.value;
    receiptForm.value = {
      ...getEmptyReceiptForm(),
      account_name: prev.account_name,
    };
    await fetchReceiptData();
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '新增失败'));
  } finally {
    saving.value = false;
  }
}

async function confirmDeleteReceipt(row: ReceiptRow) {
  try {
    await ElMessageBox.confirm(
      `确定删除该收款记录？（客户：${row.customer_name || '-'}）`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    );
    await deleteReceiptRecord(row.id);
    ElMessage.success('已删除');
    await fetchReceiptData();
  } catch { /* cancelled */ }
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
      columnFilters: Object.keys(salesColumnFilters.value).length ? { ...salesColumnFilters.value } : undefined,
    });
    if (!allRows.length) {
      ElMessage.warning('暂无可导出销售数据');
      return;
    }
    exportToExcel(
      allRows.map((r) => {
        const row: ImportRow = {};
        for (const col of SALES_EXPORT_COLS) {
          row[col.key] = r[col.key as keyof typeof r] ?? '';
        }
        return row;
      }),
      SALES_EXPORT_COLS,
      'sales_export'
    );
    ElMessage.success(`已导出 ${allRows.length} 条销售记录`);
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '导出失败'));
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
      columnFilters: Object.keys(receiptColumnFilters.value).length ? { ...receiptColumnFilters.value } : undefined,
    });
    if (!allRows.length) {
      ElMessage.warning('暂无可导出收款数据');
      return;
    }
    exportToExcel(
      allRows.map((r) => {
        const row: ImportRow = {};
        for (const col of RECEIPT_EXPORT_COLS) {
          row[col.key] = r[col.key as keyof typeof r] ?? '';
        }
        return row;
      }),
      RECEIPT_EXPORT_COLS,
      'sales_receipts_export'
    );
    ElMessage.success(`已导出 ${allRows.length} 条收款记录`);
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '导出失败'));
  } finally {
    exporting.value = false;
  }
}

/* ==================== 导入逻辑 ==================== */
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
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '读取文件失败'));
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
    let payload: ImportRow[];
    if (parsedImportRows.value && parsedImportRows.value.length > 0) {
      payload = parsedImportRows.value;
    } else {
      const parsed = JSON.parse(txt);
      if (!Array.isArray(parsed)) throw new Error('导入数据必须是 JSON 数组');
      payload = parsed;
    }
    payload = normalizeImportRows(payload, importMode.value);
    importProgress.value.total = payload.length;
    const payloadWithSource = payload.map((r) => ({ ...r, source_type: 'excel' }));

    const BATCH = 500;
    let written = 0;
    for (let i = 0; i < payloadWithSource.length; i += BATCH) {
      const chunk = payloadWithSource.slice(i, i + BATCH);
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
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '导入失败'));
  } finally {
    importing.value = false;
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

onUnmounted(() => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
});
</script>

<style scoped>
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
.entry-mode-switch {
  margin-bottom: 16px;
}
.batch-paste-wrap {
  min-height: 200px;
}
.batch-paste-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.batch-paste-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.receipt-expand-note {
  padding: 12px 20px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}
.receipt-expand-empty {
  color: var(--el-text-color-placeholder);
}
</style>
