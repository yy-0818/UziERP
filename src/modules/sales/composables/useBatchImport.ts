import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  importSalesRowsLegacy,
  importReceiptRowsLegacy,
} from '../api';
import {
  getErrorMessage,
  normalizeImportRows,
  parseRowsFromFile,
  type ImportMode,
  type ImportRow,
} from './salesImportUtils';

export function useBatchImport(afterImport: () => Promise<void>) {
  const visible = ref(false);
  const mode = ref<ImportMode>('sales');
  const text = ref('');
  const importing = ref(false);
  const fileInputRef = ref<HTMLInputElement | null>(null);
  const parsedRows = ref<ImportRow[] | null>(null);
  const progress = ref({ total: 0, done: 0, written: 0 });

  const progressPercent = computed(() => {
    if (progress.value.total <= 0) return 0;
    return Math.round((progress.value.done / progress.value.total) * 100);
  });

  const title = computed(() =>
    mode.value === 'sales'
      ? '导入销售数据(xlsx/csv/json)'
      : '导入收款数据(xlsx/csv/json)'
  );

  function open(importMode: ImportMode) {
    mode.value = importMode;
    text.value = '';
    parsedRows.value = null;
    progress.value = { total: 0, done: 0, written: 0 };
    if (fileInputRef.value) fileInputRef.value.value = '';
    visible.value = true;
  }

  async function onPickFile(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseRowsFromFile(file);
      parsedRows.value = rows;
      text.value = JSON.stringify(rows.slice(0, 50), null, 2);
      ElMessage.success(
        `已解析 ${rows.length} 行数据（文本框仅预览前 50 行，提交会导入全部）`
      );
    } catch (error: unknown) {
      ElMessage.error(getErrorMessage(error, '读取文件失败'));
    }
  }

  async function submit() {
    const txt = text.value.trim();
    if (!txt && !parsedRows.value?.length) {
      ElMessage.warning('请粘贴或选择数据');
      return;
    }
    importing.value = true;
    progress.value = { total: 0, done: 0, written: 0 };
    try {
      let payload: ImportRow[];
      if (parsedRows.value && parsedRows.value.length > 0) {
        payload = parsedRows.value;
      } else {
        const parsed = JSON.parse(txt);
        if (!Array.isArray(parsed)) throw new Error('导入数据必须是 JSON 数组');
        payload = parsed;
      }
      payload = normalizeImportRows(payload, mode.value);
      progress.value.total = payload.length;
      const payloadWithSource = payload.map((r) => ({ ...r, source_type: 'excel' }));

      const BATCH = 500;
      let written = 0;
      for (let i = 0; i < payloadWithSource.length; i += BATCH) {
        const chunk = payloadWithSource.slice(i, i + BATCH);
        const res =
          mode.value === 'sales'
            ? await importSalesRowsLegacy(chunk)
            : await importReceiptRowsLegacy(chunk);
        written += Number(res?.written ?? 0);
        progress.value.done = Math.min(i + BATCH, payload.length);
        progress.value.written = written;
      }
      ElMessage.success(
        `导入完成：共 ${payload.length} 行，已写入 ${written} 行`
      );
      visible.value = false;
      await afterImport();
    } catch (error: unknown) {
      ElMessage.error(getErrorMessage(error, '导入失败'));
    } finally {
      importing.value = false;
    }
  }

  return {
    visible,
    mode,
    text,
    importing,
    fileInputRef,
    progress,
    progressPercent,
    title,
    open,
    onPickFile,
    submit,
  };
}
