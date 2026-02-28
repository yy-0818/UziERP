<template>
  <div class="page-container page operation-log-page">
    <el-card class="erp-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">中方员工日志</div>
          </div>
          <div class="header-actions">
            <el-button :icon="Printer" type="success" :loading="exporting" @click="exportData">
              {{ exporting ? '导出中…' : '导出' }}
            </el-button>
            <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
          </div>
        </div>
      </template>

      <div class="log-toolbar">
        <el-select v-model="filters.category" placeholder="全部分类" clearable style="width: 140px">
          <el-option
            v-for="item in OPERATION_CATEGORIES"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
        />
        <el-input
          v-model="filters.keyword"
          placeholder="操作描述 / 操作人"
          clearable
          style="width: 180px"
          @keyup.enter="applyFilters"
        />
        <el-button type="primary" @click="applyFilters">查询</el-button>
      </div>

      <template v-if="loading">
        <el-skeleton :rows="6" animated class="erp-table-skeleton" />
      </template>
      <div v-else class="log-table-wrap">
        <el-table :data="list" stripe border style="width: 100%" empty-text="暂无操作记录">
          <el-table-column label="序号" width="60" align="center">
            <template #default="{ $index }">
              {{ (pagination.page - 1) * pagination.pageSize + $index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="操作时间" width="180">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="categoryTagType(row.category)" :type="categoryTagType(row.category)" size="small">
                {{ categoryLabel(row.category) }}
              </el-tag>
              <span v-else>{{ categoryLabel(row.category) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="action" label="操作" min-width="100" show-overflow-tooltip />
          <el-table-column prop="operator_name" label="操作人" width="200" show-overflow-tooltip />
          <el-table-column label="关联信息" min-width="220">
            <template #default="{ row }">
              <div class="detail-cells">
                <template v-for="item in detailItems(row.detail, employeeMap)" :key="item.key">
                  <div class="detail-cell">
                    <span class="detail-label">{{ item.label }}</span>
                    <span class="detail-value">{{ item.value }}</span>
                  </div>
                </template>
                <span v-if="!detailItems(row.detail, employeeMap).length" class="detail-empty">—</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          class="log-pagination"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { Refresh, Printer } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { fetchOperationLogs } from './api';
import { OPERATION_CATEGORIES, CATEGORY_TAG_TYPE, DETAIL_LABELS, DETAIL_HIDDEN_KEYS } from './constants';
import { fetchEmployeeById } from '../hr/employees-cn/api';
import type { OperationLogRow } from './api';

const loading = ref(false);
const exporting = ref(false);
const list = ref<OperationLogRow[]>([]);
/** detail 中仅有 employee_id 时，根据 id 查到的员工姓名/工号，用于表格与导出 */
const employeeMap = ref<Record<string, { name: string; employee_no: string }>>({});
const filters = reactive({
  category: '' as string,
  keyword: '',
});
const dateRange = ref<[string, string] | null>(null);
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const categoryLabelMap = Object.fromEntries(OPERATION_CATEGORIES.map((c) => [c.value, c.label]));

function categoryLabel(category: string): string {
  return categoryLabelMap[category] ?? category;
}

function categoryTagType(category: string): string {
  return CATEGORY_TAG_TYPE[category] ?? '';
}

/** 展示顺序：姓名、工号、部门/岗位等，跳过仅内部用的 key */
const DETAIL_ORDER = ['name', 'employee_no', 'from_department', 'to_department', 'from_position', 'to_position'];

/** 若 detail 仅有 employee_id，用 employeeMap 补全姓名/工号再展示 */
function detailItems(
  detail: Record<string, unknown> | null,
  empMap: Record<string, { name: string; employee_no: string }>
): { key: string; label: string; value: string }[] {
  if (!detail || typeof detail !== 'object') return [];
  const merged = { ...detail } as Record<string, unknown>;
  const eid = detail.employee_id as string | undefined;
  if (eid && empMap[eid]) {
    if (merged.name == null) merged.name = empMap[eid].name;
    if (merged.employee_no == null) merged.employee_no = empMap[eid].employee_no;
  }
  const items: { key: string; label: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const key of DETAIL_ORDER) {
    if (DETAIL_HIDDEN_KEYS.includes(key) || seen.has(key)) continue;
    const label = DETAIL_LABELS[key];
    if (!label) continue;
    const raw = merged[key];
    if (raw === undefined || raw === null) continue;
    let value: string;
    if (key === 'from_department' && merged.to_department != null) {
      value = `${String(raw)} → ${merged.to_department}`;
      seen.add('to_department');
    } else if (key === 'from_position' && merged.to_position != null) {
      value = `${String(raw)} → ${merged.to_position}`;
      seen.add('to_position');
    } else {
      value = String(raw);
    }
    items.push({ key, label, value });
  }
  for (const [key, raw] of Object.entries(merged)) {
    if (seen.has(key) || DETAIL_HIDDEN_KEYS.includes(key) || DETAIL_ORDER.includes(key)) continue;
    const label = DETAIL_LABELS[key];
    if (!label) continue;
    if (raw === undefined || raw === null) continue;
    items.push({ key, label, value: String(raw) });
  }
  return items;
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function fetchData() {
  loading.value = true;
  try {
    const [startDate, endDate] = dateRange.value ?? [undefined, undefined];
    const res = await fetchOperationLogs({
      category: filters.category as any,
      keyword: filters.keyword.trim() || undefined,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch (e: any) {
    list.value = [];
    pagination.total = 0;
    console.error(e);
  } finally {
    loading.value = false;
  }
  await loadEmployeeMap(list.value);
}

/** 根据当前列表中的 detail.employee_id 批量拉取员工姓名/工号，用于展示与导出 */
async function loadEmployeeMap(rows: OperationLogRow[]) {
  const ids = new Set<string>();
  for (const row of rows) {
    const eid = row.detail?.employee_id;
    if (eid && typeof eid === 'string') ids.add(eid);
  }
  if (ids.size === 0) {
    employeeMap.value = {};
    return;
  }
  const arr = await Promise.all([...ids].map((id) => fetchEmployeeById(id)));
  const map: Record<string, { name: string; employee_no: string }> = {};
  const idList = [...ids];
  arr.forEach((emp, i) => {
    const id = idList[i];
    if (emp) map[id] = { name: emp.name, employee_no: emp.employee_no };
  });
  employeeMap.value = map;
}

function applyFilters() {
  pagination.page = 1;
  fetchData();
}

watch(
  () => [filters.category, filters.keyword, dateRange.value],
  () => {
    pagination.page = 1;
  },
  { deep: true }
);

/** 导出当前筛选条件下的操作日志为 CSV（最多 5000 条） */
async function exportData() {
  exporting.value = true;
  try {
    const [startDate, endDate] = dateRange.value ?? [undefined, undefined];
    const res = await fetchOperationLogs({
      category: filters.category as any,
      keyword: filters.keyword.trim() || undefined,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      page: 1,
      pageSize: 5000,
    });
    await loadEmployeeMap(res.list);
    const map = employeeMap.value;
    const rows = res.list.map((row, index) => {
      const items = detailItems(row.detail, map);
      const name = items.find((i) => i.key === 'name')?.value ?? '';
      const employeeNo = items.find((i) => i.key === 'employee_no')?.value ?? '';
      const other = items
        .filter((i) => i.key !== 'name' && i.key !== 'employee_no')
        .map((i) => `${i.label}:${i.value}`)
        .join('；');
      return [
        index + 1,
        formatDateTime(row.created_at),
        categoryLabel(row.category),
        row.action,
        row.operator_name ?? '',
        name,
        employeeNo,
        other,
      ];
    });
    const BOM = '\uFEFF';
    const header = '序号,操作时间,分类,操作,操作人,姓名,工号,关联备注\n';
    const body = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([BOM + header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `操作日志_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success(`已导出 ${res.list.length} 条记录`);
  } catch (e: any) {
    ElMessage.error(e?.message ?? '导出失败');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.log-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.log-table-wrap {
  margin-top: 0;
}
.log-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
.erp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.erp-card-header .title {
  font-size: 16px;
  font-weight: 600;
}
.erp-card-header .subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.detail-cells {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: baseline;
}
.detail-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.detail-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.detail-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
}
.detail-empty {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
