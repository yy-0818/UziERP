<template>
  <div class="erp-toolbar">
    <el-input v-model="filters.keyword" placeholder="公司或账户名称" clearable @keyup.enter="$emit('query')" style="width: 200px" />
    <el-select v-model="filters.account_name" placeholder="账户（可多选）" clearable multiple collapse-tags style="width: 140px">
      <el-option v-for="v in accountNameOptions" :key="v" :label="v" :value="v" />
    </el-select>
    <el-select v-model="filters.level" placeholder="等级（可多选）" clearable multiple collapse-tags style="width: 160px">
      <el-option v-for="v in levelOptions" :key="v" :label="v || '(空)'" :value="v" />
    </el-select>
    <el-select v-model="filters.region" placeholder="国家/地区（可多选）" clearable multiple collapse-tags style="width: 180px">
      <el-option v-for="v in regionOptions" :key="v" :label="v || '(空)'" :value="v" />
    </el-select>
    <el-select v-model="filters.price_type" placeholder="价格类型（可多选）" clearable multiple collapse-tags style="width: 160px">
      <el-option v-for="v in priceTypeOptions" :key="v" :label="v || '(空)'" :value="v" />
    </el-select>
    <el-select v-model="filters.product_ids" placeholder="产品（可多选）" clearable multiple filterable collapse-tags style="width: 200px">
      <el-option v-for="p in products" :key="p.id" :label="p.spec ? `${p.name} (${p.spec})` : p.name" :value="p.id" />
    </el-select>
    <div>
      <el-button type="primary" @click="$emit('query')">查询</el-button>
      <el-button @click="$emit('clear')">清空筛选</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  filters: any;
  levelOptions: string[];
  regionOptions: string[];
  priceTypeOptions: string[];
  accountNameOptions: string[];
  products: any[];
}>();
defineEmits<{ query: []; clear: [] }>();
</script>
