<template>
  <el-header class="erp-header">
    <el-button
      class="erp-sidebar-toggle"
      text
      circle
      @click="layout.toggleSidebar()"
    >
      <el-icon><Expand v-if="layout.sidebarCollapsed" /><Fold v-else /></el-icon>
    </el-button>
    <AppBreadcrumb />
    <div class="erp-header-right">
      <el-badge v-if="canSeeTodo" :hidden="todoCount === 0" :value="todoCount" :max="99">
        <el-button link type="primary" @click="router.push('/hr/employees-cn/todos')">
          <el-icon><BellFilled /></el-icon>
        </el-button>
      </el-badge>
      <el-tooltip :content="isDark ? '切换浅色模式' : '切换深色模式'" placement="bottom">
        <el-button class="erp-theme-toggle" text circle @click="toggleTheme">
          <el-icon><Sunny v-if="isDark" /><Moon v-else /></el-icon>
        </el-button>
      </el-tooltip>
      <span class="erp-user-email">{{ auth.user?.email }}</span>
      <el-dropdown trigger="click" @command="onCommand">
        <el-button type="primary" link>
          <el-icon><UserFilled /></el-icon>
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { UserFilled, ArrowDown, Expand, Fold, Moon, Sunny, SwitchButton, BellFilled } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import AppBreadcrumb from '../components/common/AppBreadcrumb.vue';
import { useAuthStore } from '../stores/auth';
import { useLayoutStore } from '../stores/layout';
import { useTheme } from '../composables/useTheme';
import { fetchTodoCount } from '../modules/hr/employees-cn/api';

const router = useRouter();
const layout = useLayoutStore();
const auth = useAuthStore();
const { isDark, toggleTheme } = useTheme();
const todoCount = ref<number | undefined>(undefined);
const canSeeTodo = computed(() => auth.role === 'super_admin');

onMounted(async () => {
  if (!canSeeTodo.value) return;
  try {
    todoCount.value = await fetchTodoCount();
  } catch {
    todoCount.value = 0;
  }
});

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
.erp-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  box-shadow: var(--header-shadow);
}

.erp-sidebar-toggle {
  flex-shrink: 0;
}

.erp-header :deep(.el-icon) {
  font-size: 20px;
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
  font-size: 14px;
  color: var(--text-secondary);
}

.erp-theme-toggle {
  color: var(--text-secondary);
}

.erp-theme-toggle:hover {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>
