import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { hasAnyRole } from '../utils/permissions';
import { getPermissionsByRole, type PermissionCode } from '../permissions';

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
const Contracts = () => import('../modules/contracts/ContractsPage.vue'); // 合同与附件管理
const Sales = () => import('../pages/Sales.vue'); // 销售数据管理
const EmployeesUz = () => import('../pages/EmployeesUz.vue'); // 乌兹员工
const EmployeesCn = () => import('../pages/EmployeesCn.vue'); // 中国员工布局（含 router-view）
// 中国员工子页面：合并为 4 个（档案、流程中心、考勤与人事、待办）
import EmployeesCnArchives from '../modules/hr/employees-cn/ArchivesPage.vue';
import EmployeesCnProcess from '../modules/hr/employees-cn/ProcessCenterPage.vue';
import EmployeesCnAttendance from '../modules/hr/employees-cn/AttendancePersonnelPage.vue';
import EmployeesCnTodos from '../modules/hr/employees-cn/TodosPage.vue';
const AdminUsers = () => import('../pages/AdminUsers.vue'); // 系统用户与角色
const OperationLog = () => import('../modules/operation-log/OperationLogPage.vue'); // 操作日志

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

      // 业务管理 - 价格查询与维护
      {
        path: 'business/pricing',
        name: 'business-pricing',
        component: PriceList,
        meta: { module: 'business', parentTitle: '业务管理', title: '价格查询与维护' },
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
        component: EmployeesCn,
        meta: { module: 'hr', title: '中国员工', requiresPermission: 'hr.employee_cn.read' },
        redirect: { name: 'hr-employees-cn-archives' },
        children: [
          {
            path: 'archives',
            name: 'hr-employees-cn-archives',
            component: EmployeesCnArchives,
            meta: { module: 'hr', title: '档案管理', requiresPermission: 'hr.employee_cn.read' },
          },
          {
            path: 'process',
            name: 'hr-employees-cn-process',
            component: EmployeesCnProcess,
            meta: { module: 'hr', title: '流程中心', requiresPermission: 'hr.employee_cn.read' },
          },
          {
            path: 'attendance',
            name: 'hr-employees-cn-attendance',
            component: EmployeesCnAttendance,
            meta: { module: 'hr', title: '考勤与人事', requiresPermission: 'hr.employee_cn.read' },
          },
          {
            path: 'todos',
            name: 'hr-employees-cn-todos',
            component: EmployeesCnTodos,
            meta: { module: 'hr', title: '待办中心', requiresPermission: 'hr.employee_cn.read' },
          },
          // 旧路径重定向到合并页（兼容书签/外链）
          { path: 'invitations', redirect: { name: 'hr-employees-cn-process', query: { tab: 'invitation' } } },
          { path: 'visas', redirect: { name: 'hr-employees-cn-process', query: { tab: 'visa' } } },
          { path: 'flights', redirect: { name: 'hr-employees-cn-process', query: { tab: 'flight' } } },
          { path: 'labor-permits', redirect: { name: 'hr-employees-cn-process', query: { tab: 'labor' } } },
          { path: 'personnel', redirect: { name: 'hr-employees-cn-attendance', query: { tab: 'reward' } } },
        ],
      },

      // 6. 系统管理
      {
        path: 'admin/users',
        name: 'admin-users',
        component: AdminUsers,
        meta: { module: 'admin', title: '用户与角色', requiresPermission: 'admin.user.manage' },
      },
      {
        path: 'admin/operation-log',
        name: 'admin-operation-log',
        component: OperationLog,
        meta: { module: 'admin', title: '操作日志', requiresPermission: 'admin.auditlog.read' },
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

  // 仅首次等待 auth 就绪，避免每次切换页面都强制刷新用户/角色（原逻辑导致每次点击都请求接口，切换卡顿）
  await auth.ensureAuthReady();

  if (to.path === '/login') {
    if (auth.isLoggedIn) return next('/');
    return next();
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return next('/login');
  }

  const needRoles = to.meta.requiresRole as string[] | undefined;
  const needPermission = to.meta.requiresPermission as string | string[] | undefined;

  if (needPermission) {
    const perms = getPermissionsByRole(auth.role);
    const permArr = Array.isArray(needPermission) ? needPermission : [needPermission];
    const hasAccess = permArr.some((p) => perms.has(p as PermissionCode));
    if (!hasAccess) return next('/business/pricing');
  } else if (needRoles && !hasAnyRole(auth.role, needRoles)) {
    return next('/business/pricing');
  }

  next();
});

export default router;
