<template>
  <div class="page-container page">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">产品价格查询与维护</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <el-button v-if="canEdit" type="success" @click="openEdit">新增价格</el-button>
            <el-button v-if="canEdit" type="warning" plain @click="exportData">导出数据</el-button>
            <el-button type="info" plain @click="refreshData" :loading="loading"><el-icon><Refresh /></el-icon>刷新</el-button>
          </div>
        </div>
      </template>

      <PricingFilterBar
        :filters="filters"
        :level-options="levelOptions"
        :region-options="regionOptions"
        :price-type-options="priceTypeOptions"
        :products="products"
        @query="fetchData"
        @clear="clearFilters"
      />

      <PricingTableSection
        :loading="loading"
        :wide-rows="wideRows"
        :product-columns="productColumns"
        :can-edit="canEdit"
        :format-price="formatPrice"
        @history="openHistoryForCell"
        @edit-cell="openEditForCell"
      />
    </el-card>

    <PriceHistoryDialog v-model:visible="historyVisible" :title="historyTitle" :history="history" />
    <PriceEditDialog
      v-model:visible="editVisible"
      :title="editTitle"
      :customers="customers"
      :accounts-by-customer="accountsByCustomer"
      :products="products"
      :level-options="levelOptions"
      :region-options="regionOptions"
      :price-type-options="priceTypeOptions"
      :model-value="editForm"
      :loading="saving"
      :modifier-email="modifierEmail"
      :is-edit-cell="editModeEditCell"
      :get-current-prices-for-account="getCurrentPricesForAccount"
      @save="savePrice"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { useAuthStore } from '../../stores/auth';
import PriceHistoryDialog from './components/PriceHistoryDialog.vue';
import PriceEditDialog from './components/PriceEditDialog.vue';
import PricingFilterBar from './components/PricingFilterBar.vue';
import PricingTableSection from './components/PricingTableSection.vue';
import { usePricingData } from './composables/usePricingData';
import { usePricingEditFlow } from './composables/usePricingEditFlow';
import { hasAnyRole } from '../../utils/permissions';

const auth = useAuthStore();
const filters = ref({ keyword: '', level: [], region: [], price_type: [], product_ids: [] as number[] });
const canEdit = computed(() => hasAnyRole(auth.role, ['super_admin', 'manager', 'sales']));
const modifierEmail = computed(() => auth.email || '');

const {
  loading,
  customers,
  products,
  accountsByCustomer,
  levelOptions,
  regionOptions,
  priceTypeOptions,
  wideRows,
  productColumns,
  fetchData,
  loadOptions,
  invalidateOptionsCache,
  getHistory,
} = usePricingData(filters as any);

const {
  saving,
  editVisible,
  editTitle,
  editModeEditCell,
  editForm,
  openEdit,
  openEditForCell,
  getCurrentPricesForAccount,
  savePrice,
} = usePricingEditFlow({
  canEdit,
  modifierEmail,
  accountsByCustomer,
  afterSaved: fetchData,
  invalidateCache: invalidateOptionsCache,
});

const historyVisible = ref(false);
const historyTitle = ref('');
const history = ref<any[]>([]);

function formatPrice(v: number) {
  if (v == null || Number.isNaN(v)) return '—';
  return Number(v) === Math.floor(v) ? String(v) : Number(v).toFixed(2);
}

function exportData() {
  if (!canEdit.value) return;
  if (!wideRows.value.length) {
    ElMessage.warning('暂无可导出的数据');
    return;
  }

  const columns = productColumns.value;
  const header = ['公司', '账户', '等级', '国家', '价格类型', ...columns];
  const dataRows = wideRows.value.map((row: any) => {
    const base = [row.company ?? '', row.account_name ?? '', row.level ?? '', row.region ?? '', row.price_type ?? ''];
    const prices = columns.map((spec) => {
      const cell = row._cells?.[spec];
      return cell != null ? formatPrice(cell.price) : '';
    });
    return [...base, ...prices];
  });

  const csvRows = [header, ...dataRows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  const csvContent = `\uFEFF${csvRows.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `价格数据_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  ElMessage.success(`已导出 ${wideRows.value.length} 条记录`);
}

async function openHistoryForCell(row: any, spec: string) {
  const cell = row._cells?.[spec];
  if (!cell) return;
  historyTitle.value = `${row.company} / ${row.account_name} - ${spec}`;
  history.value = await getHistory(row.account_id, cell.product_id);
  historyVisible.value = true;
}

function clearFilters() {
  filters.value = { keyword: '', level: [], region: [], price_type: [], product_ids: [] };
}

async function refreshData() {
  await loadOptions(true);
  await fetchData();
  ElMessage.success('数据已刷新');
}

onMounted(async () => {
  await loadOptions();
  await fetchData();
});
</script>
