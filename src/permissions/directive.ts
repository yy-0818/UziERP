/**
 * v-can 指令：按权限点控制元素可见性，以 auth.permissions 为数据源
 * 用法: v-can="'sales.record.create'" 或 v-can="['sales.record.create', 'sales.record.update']"
 */
import type { Directive, DirectiveBinding } from 'vue';
import { useAuthStore } from '../stores/auth';

function checkPermission(el: HTMLElement, binding: DirectiveBinding) {
  const auth = useAuthStore();
  const perms = new Set(auth.permissions);

  const value = binding.value;
  let hasPermission = false;

  if (typeof value === 'string') {
    hasPermission = perms.has(value);
  } else if (Array.isArray(value)) {
    hasPermission = value.some((p: string) => perms.has(p));
  }

  if (!hasPermission) {
    if (el.parentNode) el.parentNode.removeChild(el);
  }
}

export const vCan: Directive = {
  mounted: checkPermission,
};
