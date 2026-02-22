<template>
  <template v-if="loading">
    <el-skeleton :rows="12" animated class="erp-table-skeleton" />
  </template>
  <el-table v-else :data="wideRows" style="width: 100%" stripe border size="small" height="70vh">
    <el-table-column prop="company" label="公司" min-width="120" fixed show-overflow-tooltip />
    <el-table-column prop="account_name" label="账户" width="60" show-overflow-tooltip />
    <el-table-column prop="level" label="等级" width="60" show-overflow-tooltip />
    <el-table-column prop="region" label="国家" width="60" show-overflow-tooltip />
    <el-table-column prop="price_type" label="价格类型" width="80" show-overflow-tooltip />
    <el-table-column v-for="spec in productColumns" :key="spec" :label="spec" width="60" align="right">
      <template #default="{ row }">
        <template v-if="row._cells && row._cells[spec]">
          <el-popover trigger="click" placement="bottom" :width="140">
            <el-button link type="primary" size="small" block @click="$emit('history', row, spec)">历史价格</el-button>
            <el-button v-if="canEdit" link type="primary" size="small" block @click="$emit('edit-cell', row, spec)">修改价格</el-button>
            <template #reference><span class="price-clickable">{{ formatPrice(row._cells[spec].price) }}</span></template>
          </el-popover>
        </template>
        <span v-else>—</span>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
defineProps<{ loading: boolean; wideRows: any[]; productColumns: string[]; canEdit: boolean; formatPrice: (v: number) => string }>();
defineEmits<{ history: [row: any, spec: string]; 'edit-cell': [row: any, spec: string] }>();
</script>
