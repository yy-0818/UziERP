import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { supabase } from '../../../supabase';
import { getLocalIsoString } from '../../../utils/datetime';

export function usePricingEditFlow(options: {
  canEdit: { value: boolean };
  modifierEmail: { value: string };
  accountsByCustomer: { value: Record<string, any[]> };
  afterSaved: () => Promise<void>;
  invalidateCache: () => void;
}) {
  const saving = ref(false);
  const editVisible = ref(false);
  const editTitle = ref('新增价格');
  const editModeEditCell = ref(false);
  const editForm = ref<any>({});

  const resetForm = () => {
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
      modifier_email: options.modifierEmail.value,
    };
  };

  const findAccountById = (accountRowId: number) => {
    for (const cid of Object.keys(options.accountsByCustomer.value || {})) {
      const found = options.accountsByCustomer.value[cid]?.find((a: any) => a.id === accountRowId);
      if (found) return found;
    }
    return null;
  };

  const openEdit = () => {
    if (!options.canEdit.value) return ElMessage.warning('无权限编辑');
    editModeEditCell.value = false;
    editTitle.value = '新增价格';
    resetForm();
    editVisible.value = true;
  };

  const openEditForCell = (row: any, spec: string) => {
    const cell = row._cells?.[spec];
    if (!cell) return;
    editModeEditCell.value = true;
    editTitle.value = '修改价格';
    editForm.value = {
      company_display: row.company,
      account_name_display: row.account_name,
      level: row.level,
      region: row.region,
      price_type: row.price_type,
      product_spec_display: spec,
      customer_id: row.customer_id,
      account_id: row.account_id,
      product_id: cell.product_id,
      price: cell.price,
      currency: 'USD',
      update_reason: '',
      modifier_email: options.modifierEmail.value,
    };
    editVisible.value = true;
  };

  async function getCurrentPricesForAccount(accountRowId: number) {
    const acc = findAccountById(accountRowId);
    if (!acc) return {};
    const priceAccountId = acc.account_id != null ? acc.account_id : acc.id;
    const { data } = await supabase.from('prices').select('product_id, price').eq('account_id', priceAccountId).is('valid_to', null);
    return Object.fromEntries((data || []).map((r: any) => [r.product_id, Number(r.price) || 0]));
  }

  async function savePrice(payload: any) {
    const reason = String(payload.update_reason || '').trim();
    if (!reason) return ElMessage.error('修改理由必填');
    saving.value = true;
    options.invalidateCache();
    const now = getLocalIsoString();
    try {
      const doInsert = async (accountId: number, productId: number, price: number) => {
        await supabase.from('prices').update({ valid_to: now }).is('valid_to', null).eq('account_id', accountId).eq('product_id', productId);
        const { error } = await supabase.from('prices').insert({
          account_id: accountId,
          product_id: productId,
          price,
          currency: payload.currency || 'USD',
          valid_from: now,
          update_reason: reason,
          created_at: now,
          modifier_email: options.modifierEmail.value,
        });
        if (error) throw error;
      };

      if (editModeEditCell.value) {
        await doInsert(payload.account_id, payload.product_id, Number(payload.price));
      } else {
        let accountId: number;
        if (typeof payload.company_value === 'string') {
          const { data: customer } = await supabase.from('customers').insert({
            name: payload.company_value.trim(),
            level: payload.level || null,
            region: payload.region || null,
            created_at: now,
          }).select('id').single();
          const { data: account } = await supabase.from('customer_accounts').insert({
            customer_id: customer!.id,
            account_name: String(payload.new_account_name || '').trim(),
            price_type: payload.price_type || null,
            created_at: now,
          }).select('id').single();
          accountId = account!.id;
        } else {
          const selectedAcc = findAccountById(payload.account_id);
          accountId = selectedAcc ? (selectedAcc.account_id ?? selectedAcc.id) : payload.account_id;
        }

        for (const pid of payload.product_ids || []) {
          const raw = payload.product_prices?.[pid];
          const num = Number(raw);
          await doInsert(accountId, pid, !raw || Number.isNaN(num) || num < 0 ? 0 : num);
        }
      }
      ElMessage.success('保存成功');
      editVisible.value = false;
      await options.afterSaved();
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败');
    } finally {
      saving.value = false;
    }
  }

  return {
    saving,
    editVisible,
    editTitle,
    editModeEditCell,
    editForm,
    openEdit,
    openEditForCell,
    getCurrentPricesForAccount,
    savePrice,
  };
}
