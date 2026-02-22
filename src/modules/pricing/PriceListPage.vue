<template>
  <div class="page-container page">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">产品价格查询与维护</div>
            <div class="subtitle">页面只负责状态编排，查询/缓存/编辑流程已拆分到 composables</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <el-button v-if="canEdit" type="success" @click="openEdit">新增价格</el-button>
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

const auth = useAuthStore();
const filters = ref({ keyword: '', level: [], region: [], price_type: [], product_ids: [] as number[] });
const canEdit = computed(() => ['super_admin', 'manager', 'sales'].includes(auth.role || ''));
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
