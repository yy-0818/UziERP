import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// 认证模块
const Login = () => import('../pages/Login.vue');

// 布局
const Layout = () => import('../pages/Layout.vue');

// 控制台首页
const Dashboard = () => import('../modules/dashboard/DashboardPage.vue');

// 业务模块页面
const PriceList = () => import('../modules/pricing/PriceListPage.vue'); // 产品价格查询
const Customers = () => import('../pages/Customers.vue'); // 客户主数据
const Products = () => import('../pages/Products.vue'); // 产品主数据
const Contracts = () => import('../pages/Contracts.vue'); // 合同管理
const Sales = () => import('../pages/Sales.vue'); // 销售数据管理
const EmployeesUz = () => import('../pages/EmployeesUz.vue'); // 乌兹员工
const EmployeesCn = () => import('../pages/EmployeesCn.vue'); // 中国员工
const AdminUsers = () => import('../pages/AdminUsers.vue'); // 系统用户与角色

const routes: RouteRecordRaw[] = [
  // 登录
  {
    path: '/login',
    name: 'login',
    component: Login,
  },
  // 应用主布局 & 业务路由
  {
    path: '/',
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      // 默认跳到控制台首页
      { path: '', redirect: '/dashboard' },

      // 控制台
      {
        path: 'dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: { module: 'dashboard', title: '总览首页' },
      },

      // 1. 产品价格模块
      {
        path: 'pricing/prices',
        name: 'pricing-prices',
        component: PriceList,
        meta: { module: 'pricing', parentTitle: '产品价格', title: '价格查询与维护' },
      },

      // 2. 主数据（客户 / 产品）
      {
        path: 'master/customers',
        name: 'master-customers',
        component: Customers,
        meta: { module: 'master', title: '客户管理' },
      },
      {
        path: 'master/products',
        name: 'master-products',
        component: Products,
        meta: { module: 'master', title: '产品管理' },
      },

      // 3. 合同管理
      {
        path: 'contracts',
        name: 'contracts',
        component: Contracts,
        meta: { module: 'contracts', title: '合同管理' },
      },

      // 4. 销售数据管理
      {
        path: 'sales',
        name: 'sales',
        component: Sales,
        meta: { module: 'sales', title: '销售数据' },
      },

      // 5. 员工管理（HR）
      {
        path: 'hr/employees-uz',
        name: 'hr-employees-uz',
        component: EmployeesUz,
        meta: { module: 'hr', title: '乌兹员工' },
      },
      {
        path: 'hr/employees-cn',
        name: 'hr-employees-cn',
        component: EmployeesCn,
        meta: { module: 'hr', title: '中国员工' },
      },

      // 6. 系统管理
      {
        path: 'admin/users',
        name: 'admin-users',
        component: AdminUsers,
        meta: { module: 'admin', title: '用户与角色', requiresRole: ['super_admin'] },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.loadUser();
  }

  if (to.path === '/login') {
    if (auth.isLoggedIn) return next('/');
    return next();
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next('/login');
  }

  const needRoles = to.meta.requiresRole as string[] | undefined;
  if (needRoles && !needRoles.includes(auth.role || '')) {
    return next('/pricing/prices');
  }

  next();
});

export default router;

