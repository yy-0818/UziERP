<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="isEditCell ? '520px' : '780px'"
    class="price-edit-dialog"
    destroy-on-close
    @closed="formRef?.resetFields()"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="112px"
      class="price-edit-form"
    >
      <!-- 修改价格（表格内）：仅价格与备注可编辑 -->
      <template v-if="isEditCell">
        <el-form-item label="公司名称">
          <el-input :model-value="form.company_display" disabled />
        </el-form-item>
        <el-form-item label="账户">
          <el-input :model-value="form.account_name_display" disabled />
        </el-form-item>
        <el-form-item label="等级">
          <el-input :model-value="form.level" disabled />
        </el-form-item>
        <el-form-item label="国家/地区">
          <el-input :model-value="form.region" disabled />
        </el-form-item>
        <el-form-item label="价格类型">
          <el-input :model-value="form.price_type" disabled />
        </el-form-item>
        <el-form-item label="产品">
          <el-input :model-value="form.product_spec_display" disabled />
        </el-form-item>
        <el-form-item label="单价" prop="price">
          <el-input-number v-model="form.price" :min="0" :step="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="修改理由" prop="update_reason">
          <el-input
            v-model="form.update_reason"
            type="textarea"
            :rows="3"
            placeholder="必填"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="修改人">
          <el-input :model-value="modifierEmail" disabled />
        </el-form-item>
      </template>

      <!-- 新增价格：统一表单，五条件下拉，产品多选+单价 -->
      <template v-else>
        <div class="form-section">客户与账户（公司可下拉可自填）</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公司名称" prop="company_value">
              <el-select
                v-model="form.company_value"
                filterable
                allow-create
                default-first-option
                placeholder="选择已有或输入新公司名称"
                style="width: 100%"
                @change="onCompanyChange"
              >
                <el-option
                  v-for="c in customers"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="isNewCompany" label="账户" prop="new_account_name">
              <el-input v-model="form.new_account_name" placeholder="请输入新账户名" clearable />
            </el-form-item>
            <el-form-item v-else label="账户" prop="account_id">
              <el-select
                v-model="form.account_id"
                filterable
                placeholder="请选择账户"
                style="width: 100%"
                @change="onAccountChange"
              >
                <el-option
                  v-for="a in accountOptions"
                  :key="a.id"
                  :label="`${a.account_name} (${a.price_type || '-'})`"
                  :value="a.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="等级" prop="level">
              <el-select
                v-model="form.level"
                placeholder="请选择等级"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option v-for="v in levelOptions" :key="v" :label="v || '(空)'" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="国家/地区" prop="region">
              <el-select
                v-model="form.region"
                placeholder="请选择国家/地区"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option v-for="v in regionOptions" :key="v" :label="v || '(空)'" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="价格类型" prop="price_type">
              <el-select
                v-model="form.price_type"
                placeholder="请选择价格类型"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option v-for="v in priceTypeOptions" :key="v" :label="v || '(空)'" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section">产品与价格（可多选，未填单价视为 0）</div>
        <el-form-item label="产品" prop="product_ids">
          <el-select
            v-model="form.product_ids"
            multiple
            filterable
            placeholder="多选产品"
            style="width: 100%"
            @change="onProductIdsChange"
          >
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="p.spec ? `${p.name} (${p.spec})` : p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <template v-if="selectedProductsWithPrices.length">
          <el-form-item label="各产品单价（未填视为 0）">
            <div class="product-prices-grid">
              <div
                v-for="item in selectedProductsWithPrices"
                :key="item.id"
                class="product-price-cell"
              >
                <span class="product-label">{{ item.spec || item.name }}</span>
                <el-input-number
                  v-model="form.product_prices[item.id]"
                  :min="0"
                  :step="0.01"
                  :precision="2"
                  size="small"
                  controls-position="right"
                  class="product-price-input"
                />
              </div>
            </div>
          </el-form-item>
        </template>

        <div class="form-section">修改信息</div>
        <el-form-item label="修改理由" prop="update_reason">
          <el-input
            v-model="form.update_reason"
            type="textarea"
            :rows="3"
            placeholder="必填"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="修改人">
          <el-input :model-value="modifierEmail" disabled placeholder="以 localStorage 的 user.email 或当前登录为准" />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="onSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch, computed, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

interface Customer {
  id: number;
  name: string;
  region?: string;
  level?: string;
}

interface Account {
  id: number;
  account_id?: number | null;
  customer_id: number;
  account_name: string;
  price_type?: string;
}

interface Product {
  id: number;
  name: string;
  spec?: string;
}

export interface EditForm {
  /** 表格内修改：只读展示 */
  company_display?: string;
  account_name_display?: string;
  product_spec_display?: string;
  /** 新增：公司为 number(已有) 或 string(新名称) */
  company_value?: number | string | null;
  customer_id: number | null;
  account_id: number | null;
  new_account_name?: string;
  level: string;
  region: string;
  price_type: string;
  /** 新增：多选产品 */
  product_ids?: number[];
  product_prices: Record<number, number>;
  /** 单条编辑 */
  product_id: number | null;
  price: number | null;
  currency: string;
  update_reason: string;
  modifier_email: string;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    customers: Customer[];
    products: Product[];
    accountsByCustomer: Record<number, Account[]>;
    levelOptions: string[];
    regionOptions: string[];
    priceTypeOptions: string[];
    modelValue: EditForm | null;
    loading: boolean;
    modifierEmail?: string;
    /** 是否为表格内“修改价格”（只改价格与备注） */
    isEditCell?: boolean;
    /** 已有账户时拉取当前价格：accountRowId => { productId: price }，无则 0 */
    getCurrentPricesForAccount?: (accountRowId: number) => Promise<Record<number, number>>;
  }>(),
  { modifierEmail: '', isEditCell: false }
);

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'save', value: EditForm): void;
}>();

const visible = defineModel<boolean>('visible', { required: true });
const formRef = ref<FormInstance>();

const defaultForm = (): EditForm => ({
  customer_id: null,
  account_id: null,
  product_id: null,
  price: null,
  currency: 'USD',
  level: '',
  region: '',
  price_type: '',
  update_reason: '',
  modifier_email: props.modifierEmail || '',
  product_ids: [],
  product_prices: {} as Record<number, number>,
});

const form = reactive<EditForm>(defaultForm());

const isEditCell = computed(() => props.isEditCell);

/** 公司为自填（非已有 id） */
const isNewCompany = computed(() => {
  const v = form.company_value;
  return v != null && typeof v === 'string';
});

const accountOptions = computed(() => {
  const cid = form.customer_id;
  if (cid == null) return [];
  const byId = props.accountsByCustomer as Record<string, Account[]>;
  return byId[String(cid)] || [];
});

const selectedProductsWithPrices = computed(() => {
  const ids = form.product_ids || [];
  return ids.map((id) => props.products.find((p) => p.id === id)).filter(Boolean) as Product[];
});

const rules = computed<FormRules>(() => {
  if (isEditCell.value) {
    return {
      price: [
        { required: true, message: '请输入单价', trigger: 'blur' },
        { type: 'number', min: 0, message: '单价不能为负', trigger: 'blur' },
      ],
      update_reason: [{ required: true, message: '修改理由必填', trigger: 'blur' }],
    };
  }
  const r: FormRules = {
    company_value: [{ required: true, message: '请选择或输入公司名称', trigger: 'change' }],
    level: [{ required: true, message: '请选择等级', trigger: 'change' }],
    region: [{ required: true, message: '请选择国家/地区', trigger: 'change' }],
    price_type: [{ required: true, message: '请选择价格类型', trigger: 'change' }],
    product_ids: [
      { required: true, type: 'array', min: 1, message: '请至少选择一个产品', trigger: 'change' },
    ],
    update_reason: [{ required: true, message: '修改理由必填', trigger: 'blur' }],
  };
  if (isNewCompany.value) r.new_account_name = [{ required: true, message: '请输入账户名', trigger: 'blur' }];
  else r.account_id = [{ required: true, message: '请选择账户', trigger: 'change' }];
  return r;
});

watch(
  () => props.modelValue,
  (v) => {
    const src = v ?? defaultForm();
    Object.assign(form, { ...defaultForm(), ...src });
    if (!form.product_prices || typeof form.product_prices !== 'object') form.product_prices = {};
    src?.product_ids?.forEach((id) => {
      if (form.product_prices[id] === undefined) form.product_prices[id] = 0;
    });
    form.modifier_email = props.modifierEmail || form.modifier_email || '';
  },
  { immediate: true }
);

watch(
  () => props.modifierEmail,
  (email) => {
    form.modifier_email = email || form.modifier_email || '';
  }
);

function onCompanyChange() {
  const v = form.company_value;
  if (typeof v === 'number') {
    form.customer_id = v;
    const c = props.customers.find((x) => x.id === v);
    if (c) {
      form.level = c.level ?? form.level;
      form.region = c.region ?? form.region;
    }
    form.account_id = null;
  } else {
    form.customer_id = null;
    form.account_id = null;
  }
}

function onAccountChange() {
  const acc = accountOptions.value.find((a) => a.id === form.account_id);
  if (acc) form.price_type = acc.price_type ?? form.price_type;
}

async function onProductIdsChange() {
  const ids = form.product_ids || [];
  const next: Record<number, number> = { ...(form.product_prices || {}) };
  const accountRowId = form.account_id;
  const fetchPrices = props.getCurrentPricesForAccount;
  if (ids.length > 0 && accountRowId != null && typeof fetchPrices === 'function' && !isNewCompany.value) {
    try {
      const current = await fetchPrices(accountRowId);
      ids.forEach((id) => { next[id] = current[id] ?? 0; });
    } catch {
      ids.forEach((id) => { if (next[id] === undefined) next[id] = 0; });
    }
  } else {
    ids.forEach((id) => { if (next[id] === undefined) next[id] = 0; });
  }
  form.product_prices = next;
}

function onSave() {
  if (!formRef.value) return;
  formRef.value.validate((valid) => {
    if (!valid) return;
    form.modifier_email = props.modifierEmail || form.modifier_email || '';
    emit('save', { ...form });
  });
}
</script>

<style scoped>
.price-edit-dialog :deep(.el-dialog__body) {
  padding: 16px 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.form-section {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 16px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.form-section:first-child {
  margin-top: 0;
}

.price-edit-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.product-prices-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 10px 16px;
  width: 100%;
  overflow-x: auto;
  padding-bottom: 6px;
}

.product-price-cell {
  flex: 0 0 auto;
  width: 140px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.product-price-cell .product-label {
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-price-input {
  width: 100%;
  min-width: 0;
}

.product-price-input :deep(.el-input-number) {
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
