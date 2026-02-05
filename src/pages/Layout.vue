<template>
  <el-container class="erp-layout" :data-sidebar-collapsed="sidebarCollapsed">
    <el-aside :width="sidebarWidth" class="erp-aside">
      <div class="erp-logo">
        <span v-show="!sidebarCollapsed" class="erp-logo-text">ERP</span>
        <span v-show="sidebarCollapsed" class="erp-logo-text erp-logo-text--short">E</span>
      </div>
      <el-menu
        :default-active="active"
        :collapse="sidebarCollapsed"
        router
        unique-opened
        class="erp-menu"
        background-color="var(--sidebar-bg)"
        text-color="var(--sidebar-text)"
        active-text-color="var(--sidebar-text-active)"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>总览首页</template>
        </el-menu-item>

        <el-sub-menu index="pricing">
          <template #title>
            <el-icon><Money /></el-icon>
            <span>产品价格</span>
          </template>
          <el-menu-item index="/pricing/prices">价格查询与维护</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="master">
          <template #title>
            <el-icon><Folder /></el-icon>
            <span>主数据</span>
          </template>
          <el-menu-item index="/master/customers">客户管理</el-menu-item>
          <el-menu-item index="/master/products">产品管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="business">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>业务管理</span>
          </template>
          <el-menu-item index="/contracts">合同管理</el-menu-item>
          <el-menu-item index="/sales">销售数据</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="hr">
          <template #title>
            <el-icon><User /></el-icon>
            <span>员工管理</span>
          </template>
          <el-menu-item index="/hr/employees-uz">乌兹员工</el-menu-item>
          <el-menu-item index="/hr/employees-cn">中国员工</el-menu-item>
        </el-sub-menu>

        <el-sub-menu v-if="auth.role === 'super_admin'" index="admin">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/admin/users">用户与角色</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container class="erp-main-wrap">
      <el-header class="erp-header">
        <el-button class="erp-sidebar-toggle" text circle @click="sidebarCollapsed = !sidebarCollapsed">
          <el-icon><Expand v-if="sidebarCollapsed" /><Fold v-else /></el-icon>
        </el-button>
        <AppBreadcrumb />
        <div class="erp-header-right">
          <span class="erp-user-email">{{ auth.user?.email }}</span>
          <el-dropdown trigger="click" @command="onCommand">
            <el-button type="primary" link>
              <el-icon><UserFilled /></el-icon>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="erp-main">
        <router-view v-slot="{ Component }">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <div class="erp-page-loading">
                <div class="erp-loading-spinner" />
                <span>加载中...</span>
              </div>
            </template>
          </Suspense>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { Odometer, Money, Folder, Document, User, Setting, UserFilled, ArrowDown, Fold, Expand } from '@element-plus/icons-vue';
import AppBreadcrumb from '../components/common/AppBreadcrumb.vue';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sidebarCollapsed = ref(false);
const sidebarWidth = computed(() => (sidebarCollapsed.value ? '64px' : '220px'));

const active = computed(() => route.path);

function onCommand(cmd: string) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确认退出登录？', '提示', { type: 'warning' })
      .then(async () => {
        await auth.logout();
        router.push('/login');
      })
      .catch(() => {});
  }
}
</script>

<style scoped>
.erp-layout {
  height: 100vh;
  overflow: hidden;
}

.erp-aside {
  background: var(--sidebar-bg);
  transition: width var(--transition-normal);
}

.erp-logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.erp-logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.erp-logo-text--short {
  font-size: 20px;
}

.erp-menu {
  border-right: none;
}

.erp-main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.erp-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  box-shadow: var(--header-shadow);
}

.erp-sidebar-toggle {
  flex-shrink: 0;
}

.erp-header :deep(.erp-breadcrumb) {
  flex: 1;
  min-width: 0;
}

.erp-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex-shrink: 0;
}

.erp-user-email {
  font-size: 13px;
  color: var(--text-secondary);
}

.erp-main {
  flex: 1;
  overflow: auto;
  padding: var(--page-padding);
  background: var(--page-bg);
}
</style>
