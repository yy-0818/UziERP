<template>
  <div class="page-container page">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">产品价格查询与维护</div>
            <div class="subtitle">按公司、账户、等级、国家、价格类型严格匹配；仅 super_admin / manager / sales可修改</div>
            <div class="cache-status" v-if="!loading && rows.length > 0">
              <el-icon :color="getCacheStatusColor()"><Warning /></el-icon>
              <span>数据已加载 {{ formatTimeAgo(cacheStats.lastUpdate) }}</span>
            </div>
          </div>
          <template v-if="canEdit">
            <div style="display: flex; align-items: center; gap: 10px;">
              <el-button type="success" @click="openEdit(null)">新增价格</el-button>
              <el-button type="warning" plain @click="exportData">导出数据</el-button>
              <el-button type="info" plain @click="refreshData" :loading="loading">
                <el-icon><Refresh /></el-icon>刷新
              </el-button>
            </div>
          </template>
        </div>
      </template>

      <div class="erp-toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="公司或账户名称"
          clearable
          @keyup.enter="fetchData"
          style="width: 200px"
        />
        <el-select
          v-model="filters.level"
          placeholder="等级（可多选）"
          clearable
          multiple
          collapse-tags
          collapse-tags-tooltip
          style="width: 160px"
        >
          <el-option
            v-for="v in levelOptions"
            :key="v"
            :label="v || '(空)'"
            :value="v"
          />
        </el-select>
        <el-select
          v-model="filters.region"
          placeholder="国家/地区（可多选）"
          clearable
          multiple
          collapse-tags
          collapse-tags-tooltip
          style="width: 180px"
        >
          <el-option
            v-for="v in regionOptions"
            :key="v"
            :label="v || '(空)'"
            :value="v"
          />
        </el-select>
        <el-select
          v-model="filters.price_type"
          placeholder="价格类型（可多选）"
          clearable
          multiple
          collapse-tags
          collapse-tags-tooltip
          style="width: 160px"
        >
          <el-option
            v-for="v in priceTypeOptions"
            :key="v"
            :label="v || '(空)'"
            :value="v"
          />
        </el-select>
        <el-select
          v-model="filters.product_ids"
          placeholder="产品（可多选）"
          clearable
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          style="width: 200px"
        >
          <el-option
            v-for="p in products"
            :key="p.id"
            :label="p.spec ? `${p.name} (${p.spec})` : p.name"
            :value="p.id"
          />
        </el-select>
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button @click="clearFilters">清空筛选</el-button>
        
        <el-dropdown v-if="filterPresets.length > 0" @command="loadFilterPresetCommand">
          <el-button type="text" style="margin-left: auto;">
            筛选预设<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="preset in filterPresets" :key="preset.name" :command="preset">
                {{ preset.name }}
              </el-dropdown-item>
              <el-dropdown-item divided @click="showSavePresetDialog = true">保存当前筛选</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <template v-if="loading">
        <el-skeleton :rows="12" animated class="erp-table-skeleton" />
      </template>
      <el-table v-else :data="wideRows" style="width: 100%" stripe border size="small" height="70vh">
        <el-table-column prop="company" label="公司" min-width="120" fixed show-overflow-tooltip />
        <el-table-column prop="account_name" label="账户" width="60" show-overflow-tooltip />
        <el-table-column prop="level" label="等级" width="60" show-overflow-tooltip />
        <el-table-column prop="region" label="国家" width="60" show-overflow-tooltip />
        <el-table-column prop="price_type" label="价格类型" width="80" show-overflow-tooltip />
        <el-table-column
          v-for="spec in productColumns"
          :key="spec"
          :label="spec"
          width="60"
          align="right"
          class-name="price-cell"
        >
          <template #default="{ row }">
            <template v-if="row._cells && row._cells[spec]">
              <el-popover trigger="click" placement="bottom" :width="140">
                <template #default>
                  <div class="cell-popover-actions">
                    <el-button link type="primary" size="small" block @click="openHistoryForCell(row, spec)">
                      历史价格
                    </el-button>
                    <el-button
                      v-if="canEdit"
                      link
                      type="primary"
                      size="small"
                      block
                      @click="openEditForCell(row, spec)"
                    >
                      修改价格
                    </el-button>
                  </div>
                </template>
                <template #reference>
                  <span class="price-num price-clickable">{{ formatPrice(row._cells[spec].price) }}</span>
                </template>
              </el-popover>
            </template>
            <span v-else class="price-empty">—</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 表格底部信息 -->
      <div class="table-footer" v-if="!loading && wideRows.length > 0">
        <div class="summary-info">
          <span>共 {{ wideRows.length }} 行数据，{{ Object.keys(productColumns).length }} 种产品</span>
          <span>最后更新: {{ formatTimeAgo(cacheStats.lastUpdate) }}</span>
        </div>
      </div>
    </el-card>

    <!-- 保存筛选预设对话框 -->
    <el-dialog
      v-model="showSavePresetDialog"
      title="保存筛选预设"
      width="400px"
      center
      append-to-body
    >
      <el-form :model="newPresetForm" label-width="80px">
        <el-form-item label="预设名称" required>
          <el-input v-model="newPresetForm.name" placeholder="请输入预设名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newPresetForm.description" type="textarea" rows="2" placeholder="可选描述信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSavePresetDialog = false">取消</el-button>
          <el-button type="primary" @click="saveFilterPreset">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <PriceHistoryDialog
      v-model:visible="historyVisible"
      :title="historyTitle"
      :history="history"
    />

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
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { Refresh, Warning, ArrowDown } from '@element-plus/icons-vue';
import { supabase } from '../../supabase';
import { getLocalIsoString } from '../../utils/datetime';
import { useAuthStore } from '../../stores/auth';
import PriceHistoryDialog from './components/PriceHistoryDialog.vue';
import PriceEditDialog from './components/PriceEditDialog.vue';

const auth = useAuthStore();
const filters = ref<{
  keyword: string;
  level: string[];
  region: string[];
  price_type: string[];
  product_ids: number[];
}>({
  keyword: '',
  level: [],
  region: [],
  price_type: [],
  product_ids: [],
});
const rows = ref<any[]>([]);
const loading = ref(false);

const historyVisible = ref(false);
const historyTitle = ref('');
const history = ref<any[]>([]);

const editVisible = ref(false);
const editTitle = ref('');
const editModeEditCell = ref(false);
const editForm = ref<any>({
  company_value: null,
  customer_id: null,
  account_id: null,
  product_ids: [],
  product_prices: {},
  product_id: null,
  price: null,
  currency: 'USD',
  level: '',
  region: '',
  price_type: '',
  update_reason: '',
  modifier_email: '',
});
const saving = ref(false);
const customers = ref<any[]>([]);
const accountsByCustomer = ref<Record<number, any[]>>({});
const products = ref<any[]>([]);

// 筛选项：从数据库动态加载
const levelOptions = ref<string[]>([]);
const regionOptions = ref<string[]>([]);
const priceTypeOptions = ref<string[]>([]);

// 筛选预设相关
const showSavePresetDialog = ref(false);
const newPresetForm = ref({
  name: '',
  description: ''
});
const filterPresets = ref<any[]>([]);

// 缓存统计
const cacheStats = ref({
  lastUpdate: 0,
  hitCount: 0,
  missCount: 0,
  cacheSize: 0,
});

/** 仅 super_admin、manager、sales 可编辑价格 */
const canEdit = computed(() =>
  ['super_admin', 'manager', 'sales'].includes(auth.role || '')
);

/** 修改人邮箱：优先 localStorage 的 user.email，其次 auth.email */
const modifierEmail = computed(() => {
  try {
    const fromStorage = typeof localStorage !== 'undefined' && localStorage.getItem('user.email');
    if (fromStorage) return fromStorage;
  } catch {}
  return auth.email || '';
});

/** 宽表：按 (公司,账户,等级,国家,价格类型) 一行，产品各一列 */
const wideRows = computed(() => {
  const list = rows.value as any[];
  const byKey = new Map<string, { 
    company: string; 
    account_name: string; 
    level: string; 
    region: string; 
    price_type: string; 
    account_id: number; 
    customer_id: number | null; 
    _cells: Record<string, { price: number; product_id: number }> 
  }>();
  
  for (const r of list) {
    const key = `${r.account_id}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        company: r.company || '',
        account_name: r.account_name || '',
        level: r.level || '',
        region: r.region || '',
        price_type: r.price_type || '',
        account_id: r.account_id,
        customer_id: r.customer_id ?? null,
        _cells: {},
      });
    }
    const row = byKey.get(key)!;
    const spec = r.product_spec || r.product_name || String(r.product_id);
    row._cells[spec] = { price: r.price, product_id: r.product_id };
  }
  return [...byKey.values()];
});

/** 产品列顺序：使用全部产品的规格名 */
const productColumns = computed(() => {
  const ps = products.value || [];
  return [...ps]
    .map((p: any) => p.spec || p.name || String(p.id))
    .filter((v) => v != null && v !== '')
    .sort();
});

function formatPrice(v: number) {
  if (v == null || Number.isNaN(v)) return '—';
  return Number(v) === Math.floor(v) ? String(v) : Number(v).toFixed(2);
}

function formatTimeAgo(timestamp: number) {
  if (!timestamp) return '从未更新';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
}

function getCacheStatusColor() {
  if (!cacheStats.value.lastUpdate) return '#909399';
  const age = Date.now() - cacheStats.value.lastUpdate;
  if (age < 300000) return '#67C23A'; // 5分钟内
  if (age < 3600000) return '#E6A23C'; // 1小时内
  return '#F56C6C'; // 超过1小时
}

function exportData() {
  if (!canEdit.value) return;
  
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在导出数据...',
    background: 'rgba(0, 0, 0, 0.7)'
  });
  
  try {
    const cols = productColumns.value;
    const header = ['公司', '账户', '等级', '国家', '价格类型', ...cols];
    const dataRows = wideRows.value.map((row: any) => {
      const base = [
        row.company ?? '', 
        row.account_name ?? '', 
        row.level ?? '', 
        row.region ?? '', 
        row.price_type ?? ''
      ];
      const cells = cols.map((spec) => {
        const cell = row._cells?.[spec];
        return cell != null ? formatPrice(cell.price) : '';
      });
      return [...base, ...cells];
    });
    
    const BOM = '\uFEFF';
    const csvContent = BOM + [header.join(','), ...dataRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `价格数据_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    loadingInstance.close();
    ElMessage.success(`已导出 ${wideRows.value.length} 条记录`);
  } catch (error: any) {
    loadingInstance.close();
    console.error('导出失败:', error);
    ElMessage.error('导出失败: ' + error.message);
  }
}

function openHistoryForCell(row: any, spec: string) {
  const cell = row._cells && row._cells[spec];
  if (!cell) return;
  openHistory({ 
    account_id: row.account_id, 
    product_id: cell.product_id, 
    company: row.company, 
    account_name: row.account_name, 
    product_name: spec, 
    product_spec: spec 
  });
}

function openEditForCell(row: any, spec: string) {
  const cell = row._cells && row._cells[spec];
  if (!cell) return;
  editModeEditCell.value = true;
  editTitle.value = '修改价格';
  editForm.value = {
    company_display: row.company ?? '',
    account_name_display: row.account_name ?? '',
    level: row.level ?? '',
    region: row.region ?? '',
    price_type: row.price_type ?? '',
    product_spec_display: spec,
    customer_id: row.customer_id ?? null,
    account_id: row.account_id,
    product_id: cell.product_id,
    price: cell.price,
    currency: 'USD',
    update_reason: '',
    modifier_email: modifierEmail.value,
  };
  editVisible.value = true;
}

async function fetchData() {
  loading.value = true;

  let accountIds: number[] | null = null;

  const toPriceAccountId = (a: any) => (a.account_id != null ? a.account_id : a.id);

  if (filters.value.keyword) {
    const { data: custRows } = await supabase
      .from('customers')
      .select('id')
      .or(`name.ilike.%${filters.value.keyword}%,region.ilike.%${filters.value.keyword}%`);
    const cIds = (custRows || []).map((c) => c.id);
    if (cIds.length) {
      const { data: accRows } = await supabase
        .from('customer_accounts')
        .select('id, account_id')
        .in('customer_id', cIds);
      accountIds = (accRows || []).map(toPriceAccountId);
    }
    const { data: accByName } = await supabase
      .from('customer_accounts')
      .select('id, account_id')
      .ilike('account_name', `%${filters.value.keyword}%`);
    const byName = (accByName || []).map(toPriceAccountId);
    accountIds = accountIds ? [...new Set([...accountIds, ...byName])] : byName.length ? byName : null;
  }
  const levels = Array.isArray(filters.value.level) ? filters.value.level : [];
  const regions = Array.isArray(filters.value.region) ? filters.value.region : [];
  const priceTypes = Array.isArray(filters.value.price_type) ? filters.value.price_type : [];
  const productIds = Array.isArray(filters.value.product_ids) ? filters.value.product_ids : [];

  if (levels.length > 0) {
    const { data: custRows } = await supabase
      .from('customers')
      .select('id')
      .in('level', levels);
    const cIds = (custRows || []).map((c) => c.id);
    if (cIds.length) {
      const { data: accRows } = await supabase
        .from('customer_accounts')
        .select('id, account_id')
        .in('customer_id', cIds);
      const ids = (accRows || []).map(toPriceAccountId);
      accountIds = accountIds ? accountIds.filter((id) => ids.includes(id)) : ids;
    } else accountIds = [];
  }
  if (regions.length > 0) {
    const { data: custRows } = await supabase
      .from('customers')
      .select('id')
      .in('region', regions);
    const cIds = (custRows || []).map((c) => c.id);
    if (cIds.length) {
      const { data: accRows } = await supabase
        .from('customer_accounts')
        .select('id, account_id')
        .in('customer_id', cIds);
      const ids = (accRows || []).map(toPriceAccountId);
      accountIds = accountIds ? accountIds.filter((id) => ids.includes(id)) : ids;
    } else accountIds = [];
  }
  if (priceTypes.length > 0) {
    const { data: accRows } = await supabase
      .from('customer_accounts')
      .select('id, account_id')
      .in('price_type', priceTypes);
    const ids = (accRows || []).map(toPriceAccountId);
    accountIds = accountIds ? accountIds.filter((id) => ids.includes(id)) : ids;
  }

  if (accountIds !== null && accountIds.length === 0) {
    rows.value = [];
    loading.value = false;
    return;
  }

  let query = supabase
    .from('prices')
    .select('id, account_id, product_id, price, currency, valid_from, valid_to, update_reason')
    .is('valid_to', null)
    .order('valid_from', { ascending: false });
  if (accountIds && accountIds.length > 0) query = query.in('account_id', accountIds);
  if (productIds.length > 0) query = query.in('product_id', productIds);

  // 分页拉取全量价格数据（Supabase 默认单次最多 1000 条）
  const PAGE_SIZE = 1000;
  let list: any[] = [];
  let from = 0;
  while (true) {
    const { data: chunk, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(error);
      ElMessage.error('查询失败');
      rows.value = [];
      loading.value = false;
      return;
    }
    const part = chunk || [];
    list = list.concat(part);
    if (part.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  if (list.length === 0) {
    rows.value = [];
    loading.value = false;
    return;
  }

  const accIds = [...new Set(list.map((r: any) => r.account_id).filter((x) => x != null && x !== ''))];
  const prodIds = [...new Set(list.map((r: any) => r.product_id).filter((x) => x != null && x !== ''))];

  if (accIds.length === 0 && prodIds.length === 0) {
    rows.value = [];
    loading.value = false;
    return;
  }

  const [{ data: accounts }, { data: productsData }] = await Promise.all([
    accIds.length > 0
      ? supabase.from('customer_accounts').select('id, account_id, account_name, price_type, customer_id').or(`id.in.(${accIds.join(',')}),account_id.in.(${accIds.join(',')})`)
      : { data: [] },
    prodIds.length > 0
      ? supabase.from('products').select('id, name, spec').in('id', prodIds)
      : { data: [] },
  ]);

  const custIds = [...new Set((accounts || []).map((a: any) => a.customer_id).filter((x) => x != null && x !== ''))];
  let customersData: any[] = [];
  if (custIds.length > 0) {
    const res = await supabase.from('customers').select('id, name, region, level').in('id', custIds);
    customersData = res.data || [];
  }

  const toKey = (x: any) => (x == null ? '' : String(x));
  const accountMap: Record<string, any> = {};
  (accounts || []).forEach((a: any) => {
    accountMap[toKey(a.id)] = a;
    if (a.account_id != null) accountMap[toKey(a.account_id)] = a;
  });
  const customerMap: Record<string, any> = {};
  customersData.forEach((c: any) => { customerMap[toKey(c.id)] = c; });
  const productMap: Record<string, any> = {};
  (productsData || []).forEach((p: any) => { productMap[toKey(p.id)] = p; });

  rows.value = list.map((r: any) => {
    const acc = accountMap[toKey(r.account_id)] || {};
    const cust = customerMap[toKey(acc.customer_id)] || {};
    const prod = productMap[toKey(r.product_id)] || {};
    return {
      id: r.id,
      customer_id: cust.id ?? acc.customer_id,
      account_id: r.account_id,
      product_id: r.product_id,
      company: cust.name || '',
      account_name: acc.account_name || '',
      level: cust.level || '',
      region: cust.region || '',
      price_type: acc.price_type || '',
      product_name: prod.name || '',
      product_spec: prod.spec || '',
      price: r.price,
      currency: r.currency || 'USD',
      valid_from: r.valid_from,
      valid_to: r.valid_to,
      update_reason: r.update_reason,
    };
  });
  
  // 更新缓存统计
  cacheStats.value.lastUpdate = Date.now();
  cacheStats.value.cacheSize = JSON.stringify(rows.value).length;
  loading.value = false;
}

async function openHistory(row: any) {
  historyTitle.value = `${row.company} / ${row.account_name} - ${row.product_name || row.product_spec}`;
  const { data, error } = await supabase
    .from('prices')
    .select('*')
    .eq('account_id', row.account_id)
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
    ElMessage.warning('无权限编辑，仅 super_admin / manager 可修改');
    return;
  }
  editModeEditCell.value = false;
  editTitle.value = '新增价格';
  editForm.value = {
    company_value: null,
    customer_id: null,
    account_id: null,
    new_account_name: '',
    product_ids: [],
    product_prices: {},
    product_id: null,
    price: null,
    currency: 'USD',
    level: '',
    region: '',
    price_type: '',
    update_reason: '',
    modifier_email: modifierEmail.value,
  };
  editVisible.value = true;
}

function findAccountById(accountRowId: number): any {
  const byCustomer = accountsByCustomer.value as Record<string, any[]>;
  for (const cid of Object.keys(byCustomer)) {
    const acc = byCustomer[cid]?.find((a: any) => a.id === accountRowId);
    if (acc) return acc;
  }
  return null;
}

/** 已有账户时拉取当前价格：accountRowId（customer_accounts.id）=> { productId: price }，无则 0 */
async function getCurrentPricesForAccount(accountRowId: number): Promise<Record<number, number>> {
  const acc = findAccountById(accountRowId);
  if (!acc) return {};
  const priceAccountId = acc.account_id != null ? acc.account_id : acc.id;
  const { data } = await supabase
    .from('prices')
    .select('product_id, price')
    .eq('account_id', priceAccountId)
    .is('valid_to', null);
  const map: Record<number, number> = {};
  (data || []).forEach((r: any) => {
    if (r.product_id != null) map[r.product_id] = Number(r.price) || 0;
  });
  return map;
}

async function savePrice(payload: any) {
  const f = payload;
  saving.value = true;
  invalidateOptionsCache();
  const now = getLocalIsoString();
  const reason = String(f.update_reason || '').trim();
  if (!reason) {
    ElMessage.error('修改理由必填');
    saving.value = false;
    return;
  }
  const emailForDb = modifierEmail.value || (f.modifier_email != null ? String(f.modifier_email).trim() : '') || '';

  try {
    const doInsert = async (accountId: number, productId: number, price: number) => {
      await supabase
        .from('prices')
        .update({ valid_to: now })
        .is('valid_to', null)
        .eq('account_id', accountId)
        .eq('product_id', productId);
      const insertPayload: Record<string, unknown> = {
        account_id: accountId,
        product_id: productId,
        price,
        currency: f.currency || 'USD',
        valid_from: now,
        update_reason: reason,
        created_at: now,
      };
      if (emailForDb) insertPayload.modifier_email = emailForDb;
      const { error } = await supabase.from('prices').insert(insertPayload);
      if (error) throw error;
    };

    if (editModeEditCell.value) {
      if (f.account_id == null || f.product_id == null || f.price == null) {
        ElMessage.error('缺少账户或产品信息');
        return;
      }
      await doInsert(f.account_id, f.product_id, Number(f.price));
      ElMessage.success('保存成功');
      editVisible.value = false;
      await fetchData();
      return;
    }

    let accountId: number;
    const companyVal = f.company_value;
    if (companyVal != null && typeof companyVal === 'string') {
      const { data: newCustomer, error: errC } = await supabase
        .from('customers')
        .insert({
          name: companyVal.trim(),
          level: f.level || null,
          region: f.region || null,
          created_at: now,
        })
        .select('id')
        .single();
      if (errC || !newCustomer) {
        console.error(errC);
        if (errC?.code === '23505') {
          ElMessage.error('创建客户失败：主键冲突，请在 Supabase SQL 中执行以修复序列：SELECT setval(pg_get_serial_sequence(\'public.customers\', \'id\'), COALESCE((SELECT MAX(id) FROM public.customers), 1));');
        } else {
          ElMessage.error('创建客户失败');
        }
        return;
      }
      const { data: newAccount, error: errA } = await supabase
        .from('customer_accounts')
        .insert({
          customer_id: newCustomer.id,
          account_name: (f.new_account_name || '').trim(),
          price_type: f.price_type || null,
          created_at: now,
        })
        .select('id')
        .single();
      if (errA || !newAccount) {
        console.error(errA);
        if (errA?.code === '23505') {
          ElMessage.error(
            '创建账户失败：主键冲突。请在 Supabase SQL 中执行：SELECT setval(pg_get_serial_sequence(\'public.customer_accounts\', \'id\'), COALESCE((SELECT MAX(id) FROM public.customer_accounts), 1));'
          );
        } else {
          ElMessage.error('创建账户失败');
        }
        return;
      }
      accountId = newAccount.id;
    } else if (typeof companyVal === 'number' && f.account_id != null) {
      const selectedAcc = findAccountById(f.account_id);
      accountId = selectedAcc ? (selectedAcc.account_id != null ? selectedAcc.account_id : selectedAcc.id) : f.account_id;
    } else {
      ElMessage.error('请选择或输入公司并选择/输入账户');
      return;
    }

    const productIds = Array.isArray(f.product_ids) ? f.product_ids : [];
    if (productIds.length === 0) {
      ElMessage.error('请至少选择一个产品');
      return;
    }
    const productPrices = f.product_prices || {};
    for (const pid of productIds) {
      const raw = productPrices[pid];
      const num = Number(raw);
      const value = (raw == null || raw === '' || Number.isNaN(num) || num < 0) ? 0 : num;
      await doInsert(accountId, pid, value);
    }
    ElMessage.success('保存成功');
    editVisible.value = false;
    await fetchData();
  } catch (e: any) {
    console.error(e);
    if (e?.code === '23505') {
      ElMessage.error(
        '保存失败：主键冲突。请在 Supabase SQL 编辑器中执行以下语句修复 prices 表序列：\n' +
          "SELECT setval(pg_get_serial_sequence('public.prices', 'id'), COALESCE((SELECT MAX(id) FROM public.prices), 1));"
      );
    } else {
      ElMessage.error(e?.message || '保存失败');
    }
  } finally {
    saving.value = false;
  }
}

const OPTIONS_CACHE_TTL = 5 * 60 * 1000;
let optionsCache: {
  customers: any[];
  products: any[];
  accountsByCustomer: Record<number, any[]>;
  levelOptions: string[];
  regionOptions: string[];
  priceTypeOptions: string[];
  ts: number;
} | null = null;

function invalidateOptionsCache() {
  optionsCache = null;
  localStorage.removeItem('price_options_cache');
}

async function loadOptions(forceRefresh = false) {
  const now = Date.now();
  
  // 尝试从本地存储加载缓存
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem('price_options_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (now - parsed.ts < OPTIONS_CACHE_TTL) {
          optionsCache = parsed;
          assignOptionsFromCache();
          return;
        }
      }
    } catch (e) {
      console.warn('缓存读取失败', e);
    }
  }
  
  try {
    const [{ data: cs }, { data: ps }] = await Promise.all([
      supabase.from('customers').select('id, name, region, level').order('name'),
      supabase.from('products').select('id, name, spec').order('name'),
    ]);
    const custList = cs || [];
    const prodList = ps || [];
    customers.value = custList;
    products.value = prodList;

    const { data: accounts } = await supabase
      .from('customer_accounts')
      .select('id, account_id, customer_id, account_name, price_type')
      .order('account_name');
    const byCustomer: Record<string, any[]> = {};
    (accounts || []).forEach((a: any) => {
      const cid = a.customer_id;
      if (cid == null) return;
      const key = String(cid);
      if (!byCustomer[key]) byCustomer[key] = [];
      byCustomer[key].push(a);
    });
    accountsByCustomer.value = byCustomer;

    const levelOpts = [...new Set(custList.map((c: any) => c.level).filter((v) => v != null && v !== ''))].sort();
    const regionOpts = [...new Set(custList.map((c: any) => c.region).filter((v) => v != null && v !== ''))].sort();
    const priceTypeOpts = [...new Set((accounts || []).map((a: any) => a.price_type).filter((v) => v != null && v !== ''))].sort();
    
    levelOptions.value = levelOpts;
    regionOptions.value = regionOpts;
    priceTypeOptions.value = priceTypeOpts;

    optionsCache = {
      customers: custList,
      products: prodList,
      accountsByCustomer: byCustomer,
      levelOptions: levelOpts,
      regionOptions: regionOpts,
      priceTypeOptions: priceTypeOpts,
      ts: now,
    };
    
    // 保存到本地存储
    try {
      localStorage.setItem('price_options_cache', JSON.stringify(optionsCache));
    } catch (e) {
      console.warn('缓存保存失败', e);
    }
  } catch (error: any) {
    console.error('加载选项失败:', error);
    ElMessage.error('选项数据加载失败');
  }
}

function assignOptionsFromCache() {
  if (!optionsCache) return;
  
  customers.value = optionsCache.customers;
  products.value = optionsCache.products;
  accountsByCustomer.value = optionsCache.accountsByCustomer;
  levelOptions.value = optionsCache.levelOptions;
  regionOptions.value = optionsCache.regionOptions;
  priceTypeOptions.value = optionsCache.priceTypeOptions;
}

// 筛选预设功能
function loadFilterPresets() {
  try {
    const presets = localStorage.getItem('price_filter_presets');
    filterPresets.value = presets ? JSON.parse(presets) : [];
  } catch (e) {
    console.warn('加载筛选预设失败', e);
    filterPresets.value = [];
  }
}

function saveFilterPreset() {
  if (!newPresetForm.value.name.trim()) {
    ElMessage.error('请输入预设名称');
    return;
  }
  
  const preset = {
    name: newPresetForm.value.name.trim(),
    description: newPresetForm.value.description.trim(),
    filters: { ...filters.value },
    timestamp: new Date().toISOString(),
  };
  
  // 检查是否已存在同名预设
  const existingIndex = filterPresets.value.findIndex(p => p.name === preset.name);
  if (existingIndex !== -1) {
    // 更新现有预设
    filterPresets.value[existingIndex] = preset;
  } else {
    // 添加新预设
    filterPresets.value.push(preset);
  }
  
  // 保存到本地存储
  try {
    localStorage.setItem('price_filter_presets', JSON.stringify(filterPresets.value));
    ElMessage.success(`筛选预设 "${preset.name}" 已保存`);
    showSavePresetDialog.value = false;
    newPresetForm.value = { name: '', description: '' };
  } catch (e) {
    console.error('保存筛选预设失败', e);
    ElMessage.error('保存失败');
  }
}

function loadFilterPresetCommand(preset: any) {
  filters.value = { ...preset.filters };
  ElMessage.success(`已加载预设 "${preset.name}"`);
  fetchData();
}

function clearFilters() {
  filters.value = {
    keyword: '',
    level: [],
    region: [],
    price_type: [],
    product_ids: []
  };
}

async function refreshData() {
  await loadOptions(true);
  await fetchData();
  ElMessage.success('数据已刷新');
}

onMounted(async () => {
  await loadOptions();
  await fetchData();
  loadFilterPresets();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.erp-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom:0cap;
  padding:0;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.subtitle {
  font-size: 12px;
  color: #909399;
}

.cache-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: #606266;
}

.erp-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.price-cell {
  font-size: 12px;
}
.price-num {
  white-space: nowrap;
}
.price-clickable {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}
.price-clickable:hover {
  background: var(--erp-primary-light);
  color: var(--erp-primary);
}
.price-empty {
  color: var(--text-disabled);
}
.cell-popover-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cell-popover-actions .el-button {
  justify-content: flex-start;
}

.erp-table-skeleton {
  padding: 16px;
}

.erp-table-skeleton :deep(.el-skeleton__item) {
  height: 32px;
  margin-bottom: 12px;
}

.table-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>