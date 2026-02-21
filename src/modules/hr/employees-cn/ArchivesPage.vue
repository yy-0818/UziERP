<template>
  <div class="page-container page archives-page">
    <el-card class="erp-card hr-main-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">员工档案</div>
            <div class="subtitle">在职/离职、部门岗位、工资标准由调岗/调薪/离职自动更新</div>
          </div>
          <div class="header-actions">
            <el-button v-if="canManage" type="primary" @click="openOnboard">入职登记</el-button>
            <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
          </div>
        </div>
      </template>

      <div class="hr-toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="工号 / 姓名 / 部门"
          clearable
          style="width: 200px"
          @keyup.enter="applyFilters"
        />
        <el-select v-model="filters.statusFilter" placeholder="状态" clearable style="width: 120px">
          <el-option label="在职" value="active" />
          <el-option label="离职" value="resigned" />
          <el-option label="暂未入职" value="pending" />
          <el-option label="休假" value="onLeave" />
        </el-select>
        <el-button type="primary" @click="applyFilters">查询</el-button>
      </div>

      <template v-if="loading">
        <el-skeleton :rows="8" animated class="erp-table-skeleton" />
      </template>
      <div v-else class="hr-table-wrap">
      <el-table
        :data="tableDisplayList"
        stripe
        border
        row-key="id"
        style="width: 100%"
        @sort-change="onSortChange"
        @filter-change="onFilterChange"
      >
        <el-table-column label="头像" width="64" align="center">
          <template #default="{ row }">
            <el-image
              v-if="photoUrlMap[row.id]"
              :src="photoUrlMap[row.id]"
              fit="cover"
              class="table-photo"
            />
            <el-image v-else :src="noPhotoUrl" fit="cover" class="table-photo" />
          </template>
        </el-table-column>
        <el-table-column prop="employee_no" label="工号" width="120" sortable="custom" :filters="employeeNoFilters" :filter-method="filterMethod('employee_no')" column-key="employee_no" />
        <el-table-column prop="name" label="姓名" min-width="100" />
        <el-table-column
          prop="department"
          label="部门"
          min-width="100"
          show-overflow-tooltip
          :filters="departmentFilters"
          :filter-method="filterMethod('department')"
          column-key="department"
        />
        <el-table-column
          prop="position"
          label="岗位"
          min-width="100"
          show-overflow-tooltip
          :filters="positionFilters"
          :filter-method="filterMethod('position')"
          column-key="position"
        />
        <el-table-column label="入职时间" width="110" sortable="custom" prop="hire_date">
          <template #default="{ row }">{{ row.hire_date ? formatDateOnly(row.hire_date) : '—' }}</template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
          :filters="[
            { text: '在职', value: 'active' },
            { text: '暂未入职', value: 'pending' },
            { text: '休假', value: 'onLeave' },
            { text: '离职', value: 'resigned' },
          ]"
          :filter-method="filterMethod('status')"
          column-key="status"
        >
          <template #default="{ row }">
            <el-tag v-if="row.resigned_at" type="info" size="small">离职</el-tag>
            <el-tag v-else-if="!row.hire_date" type="warning" size="small">暂未入职</el-tag>
            <el-tag v-else-if="row.isOnLeave" type="warning" size="small">休假</el-tag>
            <el-tag v-else type="success" size="small">在职</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" class="hr-table-op-btn" @click="openDetail(row)">
              <el-icon><View /></el-icon>
            </el-button>
            <el-button v-if="canManage" link type="primary" size="small" class="hr-table-op-btn" @click="openEdit(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-dropdown v-if="canManage && !row.resigned_at" trigger="click" @command="(cmd: string) => onMoreCommand(cmd, row)">
              <span class="hr-table-op-btn hr-table-op-trigger">
                <el-icon><Finished /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="transfer">调岗</el-dropdown-item>
                  <el-dropdown-item command="salary">调薪</el-dropdown-item>
                  <el-dropdown-item command="resign">离职</el-dropdown-item>
                  <el-dropdown-item command="leave">请假</el-dropdown-item>
                  <el-dropdown-item command="reward">奖励/违纪</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <div v-if="!loading && tableDisplayList.length === 0" class="hr-empty">
        <el-empty description="暂无员工档案；可点击「入职登记」新建" />
      </div>
    </el-card>

    <!-- 详情抽屉：带淡入淡出 -->
    <el-drawer
      v-model="detailVisible"
      title="员工详情"
      size="880"
      destroy-on-close
      append-to-body
      class="hr-detail-drawer hr-detail-drawer--animated"
      :show-close="true"
      @close="detailEmployeeId = null"
    >
      <template v-if="detailEmployee">
        <div class="hr-detail-drawer-body hr-detail-drawer-body--fade">
        <div class="hr-detail-header">
          <div class="hr-detail-header__photo">
            <el-image v-if="detailPhotoUrl" :src="detailPhotoUrl" fit="cover" style="width: 100%; height: 100%" />
            <el-image v-else :src="noPhotoUrl" fit="cover" style="width: 100%; height: 100%" />
          </div>
          <div class="hr-detail-header__info">
            <div class="hr-detail-header__name">{{ detailEmployee.name }}</div>
            <div class="hr-detail-header__meta-row">
              <span class="hr-detail-header__meta-item">
                <span class="hr-detail-header__meta-label">工号</span>
                <span class="hr-detail-header__meta-value">{{ detailEmployee.employee_no }}</span>
              </span>
              <span class="hr-detail-header__meta-item">
                <span class="hr-detail-header__meta-label">部门</span>
                <span class="hr-detail-header__meta-value">{{ detailEmployee.department || '—' }}</span>
              </span>
              <span class="hr-detail-header__meta-item">
                <span class="hr-detail-header__meta-label">岗位</span>
                <span class="hr-detail-header__meta-value">{{ detailEmployee.position || '—' }}</span>
              </span>
            </div>
            <div class="hr-detail-header__meta-row">
              <span class="hr-detail-header__meta-item">
                <span class="hr-detail-header__meta-label">入职</span>
                <span class="hr-detail-header__meta-value">{{ detailEmployee.hire_date ? formatDateOnly(detailEmployee.hire_date) : '暂未入职' }}</span>
              </span>
              <template v-if="detailEmployee.resigned_at">
                <span class="hr-detail-header__meta-item">
                  <span class="hr-detail-header__meta-label">离职</span>
                  <span class="hr-detail-header__meta-value">{{ formatDateOnly(detailEmployee.resigned_at) }}</span>
                </span>
              </template>
              <template v-else-if="!detailEmployee.hire_date && canManage">
                <el-button type="primary" link size="small" class="hr-detail-header__onboard-btn" @click="confirmOnboard">确认正式入职</el-button>
              </template>
            </div>
            <div class="hr-detail-header__meta-row">
              <span class="hr-detail-header__meta-item">
                <span class="hr-detail-header__meta-label">护照号</span>
                <span class="hr-detail-header__meta-value">{{ detailEmployee.passport_no || '—' }}</span>
              </span>
              <span class="hr-detail-header__meta-item">
                <span class="hr-detail-header__meta-label">出生</span>
                <span class="hr-detail-header__meta-value">{{ formatDateOnly(detailEmployee.birth_date) || '—' }}</span>
              </span>
            </div>
          </div>
        </div>
        <el-tabs v-model="detailTab" class="detail-tabs">
          <el-tab-pane label="流程时间线" name="timeline">
            <div class="hr-timeline-wrap">
              <el-timeline v-if="timelineItems.length">
                <el-timeline-item
                  v-for="item in timelineItems"
                  :key="item.id"
                  :timestamp="formatTimelineDate(item.date)"
                  placement="top"
                >
                  <div class="hr-timeline-title">{{ item.title }}</div>
                  <div v-if="item.status" class="hr-timeline-meta">
                    <el-tag size="small" :type="item.status === '已办理' ? 'success' : 'warning'">{{ item.status }}</el-tag>
                  </div>
                  <div v-if="item.description" class="hr-timeline-desc">{{ item.description }}</div>
                  <div v-if="item.operator" class="hr-timeline-operator">操作人：{{ item.operator }}</div>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-else description="暂无流程记录" />
            </div>
          </el-tab-pane>
          <el-tab-pane label="邀请函" name="invitation">
            <EmployeeTabInvitation :employee-id="detailEmployee.id" :can-manage="canManage" @refresh="loadDetailPhoto" />
          </el-tab-pane>
          <el-tab-pane label="签证" name="visa">
            <EmployeeTabVisa :employee-id="detailEmployee.id" :can-manage="canManage" />
          </el-tab-pane>
          <el-tab-pane label="机票" name="flight">
            <EmployeeTabFlight :employee-id="detailEmployee.id" :can-manage="canManage" />
          </el-tab-pane>
          <el-tab-pane label="劳动许可" name="labor">
            <EmployeeTabLabor :employee-id="detailEmployee.id" :can-manage="canManage" />
          </el-tab-pane>
          <el-tab-pane label="调岗调薪" name="transfer">
            <EmployeeTabTransfer :employee-id="detailEmployee.id" :can-manage="canManage" />
          </el-tab-pane>
          <el-tab-pane label="请假" name="leave">
            <EmployeeTabLeave :employee-id="detailEmployee.id" :can-manage="canManage" />
          </el-tab-pane>
          <el-tab-pane label="奖惩" name="reward">
            <EmployeeTabReward :employee-id="detailEmployee.id" :can-manage="canManage" />
          </el-tab-pane>
        </el-tabs>
        </div>
      </template>
      <template v-else>
        <el-skeleton :rows="6" animated />
      </template>
    </el-drawer>

    <!-- 入职/编辑 弹窗：分组布局 + 头像上传美化 -->
    <el-dialog
      v-model="formVisible"
      :title="formMode === 'onboard' ? '入职登记' : '编辑档案'"
      width="640px"
      destroy-on-close
      append-to-body
      class="hr-form-dialog"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="92px" label-position="right">
        <div class="hr-form-section hr-form-section--avatar">
          <el-form-item label="头像">
            <div class="form-avatar-wrap">
              <el-upload
                class="form-avatar-upload"
                :show-file-list="false"
                accept="image/*"
                :http-request="handlePhotoUpload"
              >
                <div class="form-avatar-box">
                  <el-image v-if="formPhotoPreview" class="form-avatar-img" :src="formPhotoPreview" fit="cover" />
                  <div v-else class="form-avatar-placeholder">
                    <el-icon :size="32"><Avatar /></el-icon>
                    <span>上传照片</span>
                  </div>
                  <div class="form-avatar-mask">
                    <span>{{ form.photo_url ? '更换' : '上传' }}</span>
                  </div>
                </div>
              </el-upload>
              <el-button v-if="form.photo_url" type="danger" link size="small" class="form-avatar-clear" @click="clearFormPhoto">清除</el-button>
            </div>
          </el-form-item>
        </div>
        <div class="hr-form-section">
          <div class="hr-form-section__title">基本信息</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="工号" prop="employee_no">
                <el-input v-model="form.employee_no" placeholder="必填" :disabled="formMode === 'edit'" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="姓名" prop="name">
                <el-input v-model="form.name" placeholder="必填" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="护照号">
                <el-input v-model="form.passport_no" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="出生日期">
                <el-date-picker v-model="form.birth_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="性别">
                <el-select v-model="form.gender" placeholder="请选择" clearable style="width: 100%">
                  <el-option label="男" value="男" />
                  <el-option label="女" value="女" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="身份证号">
                <el-input v-model="form.id_card_no" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <div class="hr-form-section">
          <div class="hr-form-section__title">部门与入职</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="部门">
                <el-input v-model="form.department" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="岗位">
                <el-input v-model="form.position" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item v-if="formMode === 'edit'" label="入职时间">
            <el-date-picker v-model="form.hire_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="暂未入职时为空" />
          </el-form-item>
        </div>
        <div class="hr-form-section">
          <div class="hr-form-section__title">联系与紧急</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="联系方式">
                <el-input v-model="form.contact_phone" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="婚姻状况">
                <el-input v-model="form.marital_status" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="家庭地址">
            <el-input v-model="form.home_address" type="textarea" :rows="2" placeholder="选填" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="紧急联系人">
                <el-input v-model="form.emergency_contact" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="紧急联系方式">
                <el-input v-model="form.emergency_phone" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <div class="hr-form-section">
          <div class="hr-form-section__title">银行与薪酬</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="银行卡号">
                <el-input v-model="form.bank_account" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开户行">
                <el-input v-model="form.bank_name" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="工资标准">
                <el-input-number v-model="form.salary_standard" :min="0" :precision="2" style="width: 100%" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="操作人">
                <el-input :model-value="currentOperator ?? '—'" disabled />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 离职确认（必须填写备注理由） -->
    <el-dialog v-model="resignVisible" title="办理离职" width="440px" append-to-body>
      <p>确认为 <strong>{{ resignEmployee?.name }}</strong>（{{ resignEmployee?.employee_no }}）办理离职？</p>
      <p class="dialog-operator">操作人：{{ currentOperator ?? '—' }}</p>
      <el-form ref="resignFormRef" :model="resignForm" :rules="resignRules" label-width="0">
        <el-form-item prop="resign_remark">
          <el-input
            v-model="resignForm.resign_remark"
            type="textarea"
            :rows="3"
            placeholder="请填写离职备注理由（必填）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resignVisible = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="confirmResign">确认离职</el-button>
      </template>
    </el-dialog>

    <!-- 调岗 -->
    <el-dialog v-model="transferVisible" title="调岗" width="480px" append-to-body>
      <el-form ref="transferFormRef" :model="transferForm" :rules="transferRules" label-width="90px">
        <el-form-item label="操作人">
          <el-input :model-value="currentOperator ?? '—'" disabled />
        </el-form-item>
        <el-form-item label="员工">
          <el-input :model-value="transferEmployee?.name" disabled />
        </el-form-item>
        <el-form-item label="原部门">
          <el-input :model-value="transferEmployee?.department" disabled />
        </el-form-item>
        <el-form-item label="原岗位">
          <el-input :model-value="transferEmployee?.position" disabled />
        </el-form-item>
        <el-form-item label="新部门" prop="to_department">
          <el-input v-model="transferForm.to_department" placeholder="必填" />
        </el-form-item>
        <el-form-item label="新岗位" prop="to_position">
          <el-input v-model="transferForm.to_position" placeholder="必填" />
        </el-form-item>
        <el-form-item label="调岗日期" prop="transfer_date">
          <el-date-picker v-model="transferForm.transfer_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitTransfer">提交</el-button>
      </template>
    </el-dialog>

    <!-- 调薪 -->
    <el-dialog v-model="salaryVisible" title="调薪记录" width="440px" append-to-body>
      <el-form ref="salaryFormRef" :model="salaryForm" :rules="salaryRules" label-width="90px">
        <el-form-item label="操作人">
          <el-input :model-value="currentOperator ?? '—'" disabled />
        </el-form-item>
        <el-form-item label="员工">
          <el-input :model-value="salaryEmployee?.name" disabled />
        </el-form-item>
        <el-form-item label="原工资">
          <el-input :model-value="salaryEmployee?.salary_standard" disabled />
        </el-form-item>
        <el-form-item label="现工资" prop="salary_after">
          <el-input-number v-model="salaryForm.salary_after" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="调整日期" prop="change_date">
          <el-date-picker v-model="salaryForm.change_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="salaryVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitSalary">提交</el-button>
      </template>
    </el-dialog>

    <!-- 请假 -->
    <el-dialog v-model="leaveVisible" title="请假登记" width="480px" append-to-body>
      <el-form ref="leaveFormRef" :model="leaveForm" :rules="leaveRules" label-width="90px">
        <el-form-item label="操作人">
          <el-input :model-value="currentOperator ?? '—'" disabled />
        </el-form-item>
        <el-form-item label="员工">
          <el-input :model-value="leaveEmployee?.name" disabled />
        </el-form-item>
        <el-form-item label="事由" prop="reason">
          <el-input v-model="leaveForm.reason" placeholder="必填" />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_at">
          <el-date-picker v-model="leaveForm.start_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_at">
          <el-date-picker v-model="leaveForm.end_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假时长(小时)">
          <el-input-number v-model="leaveForm.leave_hours" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="leaveVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitLeave">提交</el-button>
      </template>
    </el-dialog>

    <!-- 奖励/违纪 -->
    <el-dialog v-model="rewardVisible" title="奖励/违纪记录" width="440px" append-to-body>
      <el-form ref="rewardFormRef" :model="rewardForm" :rules="rewardRules" label-width="90px">
        <el-form-item label="操作人">
          <el-input :model-value="currentOperator ?? '—'" disabled />
        </el-form-item>
        <el-form-item label="员工">
          <el-input :model-value="rewardEmployee?.name" disabled />
        </el-form-item>
        <el-form-item label="类型" prop="record_type">
          <el-radio-group v-model="rewardForm.record_type">
            <el-radio value="reward">奖励</el-radio>
            <el-radio value="discipline">违纪</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="原因" prop="reason">
          <el-input v-model="rewardForm.reason" type="textarea" :rows="2" placeholder="必填" />
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="rewardForm.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rewardVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitReward">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Refresh, View, Edit, Finished, Avatar } from '@element-plus/icons-vue';
import { useAuthStore } from '../../../stores/auth';
import {
  fetchEmployees,
  fetchEmployeeById,
  fetchLeaveRecords,
  createEmployee,
  updateEmployee,
  setEmployeeResigned,
  createTransferRecord,
  createSalaryChangeRecord,
  createLeaveRecord,
  createRewardDisciplineRecord,
  getSignedUrl,
  uploadEmployeeFile,
  fetchEmployeeTimeline,
} from './api';
import './employees-cn.css';
import { formatDateOnly } from './types';
import { isOnLeaveToday } from './api';
import type { CnEmployee, CnEmployeeWithStatus, EmployeeTimelineItem } from './types';

const noPhotoUrl = 'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png';

const EmployeeTabInvitation = defineAsyncComponent(() => import('./components/EmployeeTabInvitation.vue'));
const EmployeeTabVisa = defineAsyncComponent(() => import('./components/EmployeeTabVisa.vue'));
const EmployeeTabFlight = defineAsyncComponent(() => import('./components/EmployeeTabFlight.vue'));
const EmployeeTabLabor = defineAsyncComponent(() => import('./components/EmployeeTabLabor.vue'));
const EmployeeTabTransfer = defineAsyncComponent(() => import('./components/EmployeeTabTransfer.vue'));
const EmployeeTabLeave = defineAsyncComponent(() => import('./components/EmployeeTabLeave.vue'));
const EmployeeTabReward = defineAsyncComponent(() => import('./components/EmployeeTabReward.vue'));

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const canManage = computed(() => auth.role === 'super_admin');
/** 当前操作人（调岗/调薪/离职/请假/奖励违纪 必写，便于审计） */
const currentOperator = computed(() => auth.user?.email ?? auth.email ?? null);

const PERSIST_KEY = 'employees-cn-archives-state';

const list = ref<CnEmployeeWithStatus[]>([]);
const leaveRecords = ref<Awaited<ReturnType<typeof fetchLeaveRecords>>>([]);
const loading = ref(false);
const filters = ref(restoreFilters());
function restoreFilters(): { keyword: string; statusFilter: '' | 'active' | 'resigned' | 'pending' | 'onLeave' } {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return { keyword: '', statusFilter: '' };
    const data = JSON.parse(raw);
    const statusFilter = data?.statusFilter;
    const validStatus = ['', 'active', 'resigned', 'pending', 'onLeave'].includes(statusFilter)
      ? statusFilter
      : '';
    return {
      keyword: typeof data?.keyword === 'string' ? data.keyword : '',
      statusFilter: validStatus,
    };
  } catch {
    return { keyword: '', statusFilter: '' };
  }
}
function persistState() {
  try {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({
        keyword: filters.value.keyword,
        statusFilter: filters.value.statusFilter,
        detailTab: detailTab.value,
      })
    );
  } catch {
    /* ignore */
  }
}
const photoUrlMap = ref<Record<string, string>>({});
const tableFilters = ref<Record<string, string[]>>({});
const tableSort = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({ prop: '', order: null });

const filteredList = computed(() => {
  let rows = list.value;
  const k = filters.value.keyword.trim().toLowerCase();
  if (k) {
    rows = rows.filter(
      (e) =>
        e.employee_no?.toLowerCase().includes(k) ||
        e.name?.toLowerCase().includes(k) ||
        e.department?.toLowerCase().includes(k)
    );
  }
  if (filters.value.statusFilter === 'active') rows = rows.filter((e) => !e.resigned_at);
  if (filters.value.statusFilter === 'resigned') rows = rows.filter((e) => !!e.resigned_at);
  if (filters.value.statusFilter === 'pending') rows = rows.filter((e) => !e.hire_date && !e.resigned_at);
  if (filters.value.statusFilter === 'onLeave') rows = rows.filter((e) => !!e.hire_date && !e.resigned_at && !!e.isOnLeave);
  return rows;
});

function createFilter(field: keyof CnEmployeeWithStatus) {
  return computed(() =>
    Array.from(
      new Set(
        filteredList.value
          .map(e => {
            const val = e[field];
            return typeof val === 'string' ? val.trim() : typeof val === 'number' ? String(val) : '';
          })
          .filter(v => v)
      )
    )
      .sort()
      .map(text => ({ text, value: text }))
  );
}
const departmentFilters = createFilter('department');
const positionFilters = createFilter('position');
const employeeNoFilters = createFilter('employee_no');

function filterMethod(columnKey: string) {
  return (value: string, row: CnEmployeeWithStatus) => {
    if (columnKey === 'status') {
      if (value === 'resigned') return !!row.resigned_at;
      if (value === 'pending') return !row.hire_date && !row.resigned_at;
      if (value === 'onLeave') return !!row.hire_date && !row.resigned_at && !!row.isOnLeave;
      if (value === 'active') return !!row.hire_date && !row.resigned_at && !row.isOnLeave;
    }
    if (columnKey === 'department') return (row.department || '') === value;
    if (columnKey === 'position') return (row.position || '') === value;
    return true;
  };
}

function onFilterChange(filters: Record<string, string[]>) {
  tableFilters.value = { ...filters };
}

function onSortChange({ prop, order }: { prop: string; order: string | null }) {
  tableSort.value = { prop: prop || '', order: order as 'ascending' | 'descending' | null };
}

const tableDisplayList = computed(() => {
  let rows = filteredList.value;
  Object.entries(tableFilters.value).forEach(([key, values]) => {
    if (!values?.length) return;
    if (key === 'status') {
      rows = rows.filter((r) => {
        const status = r.resigned_at ? 'resigned' : !r.hire_date ? 'pending' : r.isOnLeave ? 'onLeave' : 'active';
        return values.includes(status);
      });
    } else if (key === 'department') {
      rows = rows.filter((r) => values.includes(r.department || ''));
    } else if (key === 'position') {
      rows = rows.filter((r) => values.includes(r.position || ''));
    }
  });
  const { prop, order } = tableSort.value;
  if (prop && order) {
    rows = [...rows].sort((a, b) => {
      const av = prop === 'hire_date' ? (a.hire_date || '') : (a as any)[prop] || '';
      const bv = prop === 'hire_date' ? (b.hire_date || '') : (b as any)[prop] || '';
      const cmp = String(av).localeCompare(String(bv), 'zh-CN');
      return order === 'ascending' ? cmp : -cmp;
    });
  }
  return rows;
});

function onMoreCommand(cmd: string, row: CnEmployeeWithStatus) {
  if (cmd === 'transfer') openTransfer(row);
  else if (cmd === 'salary') openSalary(row);
  else if (cmd === 'resign') openResign(row);
  else if (cmd === 'leave') openLeave(row);
  else if (cmd === 'reward') openRewardDiscipline(row);
}

async function fetchData() {
  loading.value = true;
  try {
    const [employees, leaves] = await Promise.all([
      fetchEmployees(),
      fetchLeaveRecords(),
    ]);
    leaveRecords.value = leaves;
    const todayLeaves = new Set(
      leaves.filter((r) => isOnLeaveToday([r])).map((r) => r.employee_id)
    );
    list.value = employees.map((e) => ({
      ...e,
      isOnLeave: todayLeaves.has(e.id),
    }));
    loadListPhotoUrls();
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadListPhotoUrls() {
  const map: Record<string, string> = {};
  const withPhoto = list.value.filter((e) => e.photo_url);
  await Promise.all(
    withPhoto.map(async (e) => {
      try {
        map[e.id] = await getSignedUrl(e.photo_url!);
      } catch {
        /* ignore */
      }
    })
  );
  photoUrlMap.value = { ...photoUrlMap.value, ...map };
}

function applyFilters() {}

// 详情（详情 tab 参与持久化，再次打开详情时恢复上次选中的 tab）
const detailVisible = ref(false);
const detailEmployeeId = ref<string | null>(null);
const detailTab = ref(restoreDetailTab());
function restoreDetailTab(): string {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return 'invitation';
    const data = JSON.parse(raw);
    const tab = data?.detailTab;
    return typeof tab === 'string' && tab ? tab : 'invitation';
  } catch {
    return 'invitation';
  }
}
const detailPhotoUrl = ref('');
const timelineItems = ref<EmployeeTimelineItem[]>([]);
const detailEmployee = computed(() => {
  if (!detailEmployeeId.value) return null;
  return list.value.find((e) => e.id === detailEmployeeId.value) ?? null;
});

watch(detailEmployeeId, async (id) => {
  if (!id) return;
  const emp = await fetchEmployeeById(id);
  if (emp && !list.value.find((e) => e.id === emp.id)) {
    list.value = [...list.value, { ...emp, isOnLeave: false }];
  }
});

watch(
  [detailEmployeeId, detailTab],
  async ([id, tab]) => {
    if (id && tab === 'timeline') {
      try {
        timelineItems.value = await fetchEmployeeTimeline(id);
      } catch {
        timelineItems.value = [];
      }
    } else if (tab !== 'timeline') {
      timelineItems.value = [];
    }
  },
  { immediate: true }
);

function formatTimelineDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

async function loadDetailPhoto() {
  if (!detailEmployee.value?.photo_url) {
    detailPhotoUrl.value = '';
    return;
  }
  try {
    detailPhotoUrl.value = await getSignedUrl(detailEmployee.value.photo_url);
  } catch {
    detailPhotoUrl.value = '';
  }
}

function openDetail(row: CnEmployeeWithStatus) {
  detailEmployeeId.value = row.id;
  detailVisible.value = true;
  loadDetailPhoto();
}

async function confirmOnboard() {
  if (!detailEmployee.value?.id || detailEmployee.value.hire_date) return;
  saving.value = true;
  try {
    const today = new Date().toISOString().slice(0, 10);
    await updateEmployee(detailEmployee.value.id, { hire_date: today });
    ElMessage.success('已确认正式入职');
    await fetchData();
    const idx = list.value.findIndex((e) => e.id === detailEmployee.value!.id);
    if (idx >= 0) list.value[idx] = { ...list.value[idx], hire_date: today };
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    saving.value = false;
  }
}

// 入职/编辑表单
const formVisible = ref(false);
const formMode = ref<'onboard' | 'edit'>('onboard');
const formRef = ref<FormInstance>();
const saving = ref(false);
const form = ref<Partial<CnEmployee>>({
  employee_no: '',
  name: '',
  passport_no: null,
  birth_date: null,
  photo_url: null,
  department: null,
  position: null,
  hire_date: null,
  gender: null,
  id_card_no: null,
  home_address: null,
  marital_status: null,
  contact_phone: null,
  emergency_contact: null,
  emergency_phone: null,
  bank_account: null,
  bank_name: null,
  salary_standard: null,
});
const formPhotoPreview = ref('');
const formRules: FormRules = {
  employee_no: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
};

function openOnboard() {
  formMode.value = 'onboard';
  form.value = {
    employee_no: '',
    name: '',
    passport_no: null,
    birth_date: null,
    photo_url: null,
    department: null,
    position: null,
    hire_date: null,
    gender: null,
    id_card_no: null,
    home_address: null,
    marital_status: null,
    contact_phone: null,
    emergency_contact: null,
    emergency_phone: null,
    bank_account: null,
    bank_name: null,
    salary_standard: null,
  };
  formPhotoPreview.value = '';
  formVisible.value = true;
}

function openEdit(row: CnEmployeeWithStatus) {
  formMode.value = 'edit';
  form.value = {
    id: row.id,
    employee_no: row.employee_no,
    name: row.name,
    passport_no: row.passport_no,
    birth_date: row.birth_date ?? null,
    photo_url: row.photo_url ?? null,
    department: row.department,
    position: row.position,
    hire_date: row.hire_date ?? null,
    gender: row.gender,
    id_card_no: row.id_card_no,
    home_address: row.home_address,
    marital_status: row.marital_status,
    contact_phone: row.contact_phone,
    emergency_contact: row.emergency_contact,
    emergency_phone: row.emergency_phone,
    bank_account: row.bank_account,
    bank_name: row.bank_name,
    salary_standard: row.salary_standard ?? null,
  };
  formPhotoPreview.value = '';
  if (row.photo_url) {
    getSignedUrl(row.photo_url).then((url) => (formPhotoPreview.value = url)).catch(() => {});
  }
  formVisible.value = true;
}
async function handlePhotoUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('photos', options.file.name, options.file);
    form.value.photo_url = path;
    formPhotoPreview.value = await getSignedUrl(path);
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}
function clearFormPhoto() {
  form.value.photo_url = null;
  formPhotoPreview.value = '';
}

async function submitForm() {
  await formRef.value?.validate().catch(() => {});
  if (!form.value.employee_no || !form.value.name) return;
  saving.value = true;
  try {
    if (formMode.value === 'onboard') {
      await createEmployee({ ...form.value, hire_date: null } as Partial<CnEmployee>);
      ElMessage.success('入职登记成功（暂未入职，流程办理后可点击「确认正式入职」）');
    } else {
      if (!form.value.id) return;
      await updateEmployee(form.value.id, form.value);
      ElMessage.success('保存成功');
    }
    formVisible.value = false;
    await fetchData();
    if (detailEmployeeId.value && form.value.id) loadDetailPhoto();
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

// 离职（必填备注理由）
const resignVisible = ref(false);
const resignEmployee = ref<CnEmployeeWithStatus | null>(null);
const resignFormRef = ref<FormInstance>();
const resignForm = ref({ resign_remark: '' });
const resignRules: FormRules = {
  resign_remark: [{ required: true, message: '请填写离职备注理由', trigger: 'blur' }],
};

function openResign(row: CnEmployeeWithStatus) {
  resignEmployee.value = row;
  resignForm.value = { resign_remark: '' };
  resignVisible.value = true;
}

async function confirmResign() {
  await resignFormRef.value?.validate().catch(() => {});
  if (!resignEmployee.value || !resignForm.value.resign_remark?.trim()) return;
  saving.value = true;
  try {
    await setEmployeeResigned(
      resignEmployee.value.id,
      currentOperator.value,
      resignForm.value.resign_remark.trim()
    );
    ElMessage.success('已办理离职');
    resignVisible.value = false;
    resignEmployee.value = null;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    saving.value = false;
  }
}

// 调岗
const transferVisible = ref(false);
const transferEmployee = ref<CnEmployeeWithStatus | null>(null);
const transferFormRef = ref<FormInstance>();
const transferForm = ref({ to_department: '', to_position: '', transfer_date: '' as string | null });
const transferRules: FormRules = {
  to_department: [{ required: true, message: '请输入新部门', trigger: 'blur' }],
  to_position: [{ required: true, message: '请输入新岗位', trigger: 'blur' }],
  transfer_date: [{ required: true, message: '请选择调岗日期', trigger: 'change' }],
};

function openTransfer(row: CnEmployeeWithStatus) {
  transferEmployee.value = row;
  transferForm.value = {
    to_department: '',
    to_position: '',
    transfer_date: new Date().toISOString().slice(0, 10),
  };
  transferVisible.value = true;
}

async function submitTransfer() {
  await transferFormRef.value?.validate().catch(() => {});
  if (!transferEmployee.value) return;
  saving.value = true;
  try {
    await createTransferRecord({
      employee_id: transferEmployee.value.id,
      from_department: transferEmployee.value.department ?? null,
      from_position: transferEmployee.value.position ?? null,
      to_department: transferForm.value.to_department || null,
      to_position: transferForm.value.to_position || null,
      operator: currentOperator.value,
      transfer_date: transferForm.value.transfer_date,
    });
    ElMessage.success('调岗成功');
    transferVisible.value = false;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

// 调薪
const salaryVisible = ref(false);
const salaryEmployee = ref<CnEmployeeWithStatus | null>(null);
const salaryFormRef = ref<FormInstance>();
const salaryForm = ref({ salary_after: null as number | null, change_date: '' as string | null });
const salaryRules: FormRules = {
  salary_after: [{ required: true, message: '请输入现工资', trigger: 'blur' }],
  change_date: [{ required: true, message: '请选择调整日期', trigger: 'change' }],
};

function openSalary(row: CnEmployeeWithStatus) {
  salaryEmployee.value = row;
  salaryForm.value = {
    salary_after: row.salary_standard ?? null,
    change_date: new Date().toISOString().slice(0, 10),
  };
  salaryVisible.value = true;
}

async function submitSalary() {
  await salaryFormRef.value?.validate().catch(() => {});
  if (!salaryEmployee.value) return;
  saving.value = true;
  try {
    await createSalaryChangeRecord({
      employee_id: salaryEmployee.value.id,
      change_date: salaryForm.value.change_date,
      salary_before: salaryEmployee.value.salary_standard ?? null,
      salary_after: salaryForm.value.salary_after,
      operator: currentOperator.value,
    });
    ElMessage.success('调薪记录已保存');
    salaryVisible.value = false;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

// 请假
const leaveVisible = ref(false);
const leaveEmployee = ref<CnEmployeeWithStatus | null>(null);
const leaveFormRef = ref<FormInstance>();
const leaveForm = ref({
  reason: '',
  start_at: null as string | null,
  end_at: null as string | null,
  leave_hours: null as number | null,
});
const leaveRules: FormRules = {
  reason: [{ required: true, message: '请输入事由', trigger: 'blur' }],
  start_at: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_at: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
};

function openLeave(row: CnEmployeeWithStatus) {
  leaveEmployee.value = row;
  leaveForm.value = { reason: '', start_at: null, end_at: null, leave_hours: null };
  leaveVisible.value = true;
}

async function submitLeave() {
  await leaveFormRef.value?.validate().catch(() => {});
  if (!leaveEmployee.value) return;
  saving.value = true;
  try {
    await createLeaveRecord({
      employee_id: leaveEmployee.value.id,
      reason: leaveForm.value.reason || null,
      start_at: leaveForm.value.start_at,
      end_at: leaveForm.value.end_at,
      operator: currentOperator.value,
      leave_hours: leaveForm.value.leave_hours,
    });
    ElMessage.success('请假已登记');
    leaveVisible.value = false;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

// 奖励/违纪
const rewardVisible = ref(false);
const rewardEmployee = ref<CnEmployeeWithStatus | null>(null);
const rewardFormRef = ref<FormInstance>();
const rewardForm = ref({
  reason: '',
  amount: null as number | null,
  record_type: 'reward' as 'reward' | 'discipline',
});
const rewardRules: FormRules = {
  reason: [{ required: true, message: '请输入原因', trigger: 'blur' }],
  record_type: [{ required: true, message: '请选择类型', trigger: 'change' }],
};

function openRewardDiscipline(row: CnEmployeeWithStatus) {
  rewardEmployee.value = row;
  rewardForm.value = { reason: '', amount: null, record_type: 'reward' };
  rewardVisible.value = true;
}

async function submitReward() {
  await rewardFormRef.value?.validate().catch(() => {});
  if (!rewardEmployee.value) return;
  saving.value = true;
  try {
    await createRewardDisciplineRecord({
      employee_id: rewardEmployee.value.id,
      reason: rewardForm.value.reason || null,
      operator: currentOperator.value,
      amount: rewardForm.value.amount,
      record_type: rewardForm.value.record_type,
    });
    ElMessage.success('已记录');
    rewardVisible.value = false;
    await fetchData();
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
}

// 监听路由 query：从待办「去办理」跳转过来时打开对应员工详情并切到对应 Tab
watch(
  () => ({ detail: route.query.detail, tab: route.query.tab }),
  async (q) => {
    const detailId = q.detail as string | undefined;
    const tab = q.tab as string | undefined;
    if (!detailId || !tab) return;
    const emp = await fetchEmployeeById(detailId);
    if (emp && !list.value.find((e) => e.id === emp.id)) {
      list.value = [...list.value, { ...emp, isOnLeave: false }];
    }
    detailEmployeeId.value = detailId;
    detailTab.value = tab;
    detailVisible.value = true;
    nextTick(() => loadDetailPhoto());
    // 清除 URL 上的 query，避免重复跳转与多余历史记录
    router.replace({ name: 'hr-employees-cn-archives', query: {} });
  },
  { immediate: true }
);

watch([() => filters.value.keyword, () => filters.value.statusFilter, detailTab], persistState, { deep: true });

onMounted(async () => {
  await fetchData();
});
</script>

<style scoped>
.erp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}
.title { font-size: 16px; font-weight: 600; }
.subtitle { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.header-actions { display: flex; gap: 8px; flex-shrink: 0; }
.detail-tabs { margin-top: 8px; }
.ml-2 { margin-left: 8px; }

/* 入职/编辑弹窗：分组与头像 */
.hr-form-dialog :deep(.el-dialog__body) { padding-top: 12px; max-height: 70vh; overflow-y: auto; }
.hr-form-section { margin-bottom: 20px; }
.hr-form-section--avatar { margin-bottom: 16px; }
.hr-form-section__title {
  font-size: 12px; font-weight: 600; color: var(--el-text-color-secondary);
  margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--el-border-color-lighter);
}
.form-avatar-wrap { display: flex; align-items: center; gap: 12px; }
.form-avatar-upload :deep(.el-upload) { display: block; }
.form-avatar-box {
  position: relative;
  width: 88px; height: 88px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px dashed var(--el-border-color);
  background: var(--el-fill-color-light);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.form-avatar-box:hover { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.form-avatar-box:hover .form-avatar-mask { opacity: 1; }
.form-avatar-img { width: 100%; height: 100%; display: block; }
.form-avatar-placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--el-text-color-placeholder); font-size: 12px; gap: 4px;
}
.form-avatar-mask {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  color: #fff; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.form-avatar-clear { margin-left: 4px; }
.hr-timeline-wrap { padding: 8px 0; }
.hr-timeline-title { font-weight: 600; }
.hr-timeline-meta { margin-top: 4px; }
.hr-timeline-desc { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.hr-timeline-operator { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }
.dialog-operator { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 8px; }
.table-photo { width: 40px; height: 40px; border-radius: 6px; display: block; margin: 0 auto; }
.table-photo-placeholder { font-size: 12px; color: var(--el-text-color-placeholder); }
/* 操作列图标统一放大、无 tooltip，与容器对齐 */
.hr-table-op-btn { padding: 4px 6px; }
.hr-table-op-btn .el-icon { font-size: 18px; }
.hr-table-op-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-color-primary);
  transition: opacity 0.2s;
}
.hr-table-op-trigger:hover { opacity: 0.8; }
</style>
