<template>
  <div class="page-container page archives-page">
    <el-card class="erp-card hr-main-card">
      <template #header>
        <div class="erp-card-header">
          <div>
            <div class="title">员工档案</div>
          </div>
          <div class="header-actions">
            <el-button v-if="canManage" type="success" plain :icon="Download" :loading="exporting" @click="exportArchives">导出档案</el-button>
            <el-button v-if="canManage" type="primary" @click="openOnboard" :icon="FolderAdd">入职登记</el-button>
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
              :preview-src-list="[photoUrlMap[row.id]]"
              fit="cover"
              class="table-photo"
              preview-teleported
              show-progress
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

    <!-- 详情抽屉：不销毁内容以缓存 tab 数据，提升再次打开速度 -->
    <el-drawer
      v-model="detailVisible"
      title="员工详情"
      size="880"
      append-to-body
      class="hr-detail-drawer hr-detail-drawer--animated"
      :show-close="true"
    >
      <template v-if="detailEmployee">
        <div class="hr-detail-drawer-body hr-detail-drawer-body--fade">
        <div class="hr-detail-header">
          <div class="hr-detail-header__photo">
            <el-image
              v-if="detailPhotoUrl"
              :src="detailPhotoUrl"
              :preview-src-list="[detailPhotoUrl]"
              fit="cover"
              style="width: 100%; height: 100%"
              preview-teleported
              show-progress
            />
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
              <el-timeline v-if="timelineDisplayItems.length">
                <el-timeline-item
                  v-for="item in timelineDisplayItems"
                  :key="item.id"
                  :timestamp="formatTimelineDate(item.date)"
                  placement="top"
                  :color="timelineTypeConfig[item.type]?.color ?? '#909399'"
                >
                  <template #dot>
                    <span class="hr-timeline-dot" :style="{ backgroundColor: timelineTypeConfig[item.type]?.color ?? '#909399' }">
                      <el-icon v-if="timelineTypeConfig[item.type]?.icon" :component="timelineTypeConfig[item.type].icon" class="hr-timeline-dot-icon" />
                    </span>
                  </template>
                  <div class="hr-timeline-title">{{ item.title }}</div>
                  <div v-if="item.status" class="hr-timeline-meta">
                    <el-tag size="small" :type="item.status === '已办理' ? 'success' : 'warning'">{{ item.status }}</el-tag>
                  </div>
                  <div v-if="item.description" class="hr-timeline-desc">{{ item.description }}</div>
                  <div v-if="item.operator" class="hr-timeline-operator">操作人：{{ item.operator }}</div>
                </el-timeline-item>
              </el-timeline>
              <div v-if="timelineItems.length && timelineHasMore" class="hr-timeline-more">
                <el-button v-if="timelineFolded" type="primary" link @click="timelineFolded = false">查看更多历史记录</el-button>
                <el-button v-else type="primary" link @click="timelineFolded = true">收起</el-button>
              </div>
              <el-empty v-else-if="!timelineItems.length" description="暂无流程记录" />
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

    <!-- 入职/编辑 弹窗：横向两栏布局 + 头像上传美化，宽度由 CSS 自适应 -->
    <el-dialog
      v-model="formVisible"
      :title="formMode === 'onboard' ? '入职登记' : '编辑档案'"
      width="1200px"
      destroy-on-close
      append-to-body
      class="hr-form-dialog hr-form-dialog--horizontal"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto" label-position="right">
        <div class="hr-form-dialog__layout">
          <!-- 左栏：头像 + 基本信息 + 部门与入职 -->
          <div class="hr-form-dialog__col">
            <div class="hr-form-section__title">身份照片</div>
            <div class="hr-form-section hr-form-section--avatar">
              <el-form-item>
                <div class="form-avatar-wrap">
                  <el-upload
                    class="form-avatar-upload"
                    :show-file-list="false"
                    accept="image/*"
                    :http-request="handlePhotoUpload"
                  >
                    <div class="form-avatar-box">
                      <el-image
                        v-if="formPhotoPreview"
                        class="form-avatar-img"
                        :src="formPhotoPreview"
                        :preview-src-list="[formPhotoPreview]"
                        fit="cover"
                        preview-teleported
                        show-progress
                      />
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
              <div class="hr-form-row">
                <div class="hr-form-cell">
                  <el-form-item label="工号" prop="employee_no">
                    <el-input v-model="form.employee_no" placeholder="必填" :disabled="formMode === 'edit'" />
                  </el-form-item>
                </div>
                <div class="hr-form-cell">
                  <el-form-item label="姓名" prop="name">
                    <el-input v-model="form.name" placeholder="必填" />
                  </el-form-item>
                </div>
              </div>
              <div class="hr-form-row">
                <div class="hr-form-cell">
                  <el-form-item label="护照号">
                    <el-input v-model="form.passport_no" placeholder="选填" />
                  </el-form-item>
                </div>
                <div class="hr-form-cell">
                  <el-form-item label="出生日期">
                    <el-date-picker v-model="form.birth_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="选填" />
                  </el-form-item>
                </div>
              </div>
              <el-form-item label="护照附件">
                <div class="form-passport-upload">
                  <el-upload class="passport-upload-btn" :show-file-list="false" accept="image/*,.pdf" :http-request="handlePassportUpload">
                    <el-button size="small" type="primary" plain>上传护照附件</el-button>
                  </el-upload>
                  <template v-if="form.passport_photo_url">
                    <el-button link type="primary" size="small" @click="previewPassport">查看</el-button>
                    <el-button link type="danger" size="small" @click="clearPassportPhoto">清除</el-button>
                    <span class="passport-upload-hint">已上传</span>
                  </template>
                  <span v-else class="passport-upload-hint">支持图片或 PDF</span>
                </div>
              </el-form-item>
              <div class="hr-form-row">
                <div class="hr-form-cell">
                  <el-form-item label="性别">
                    <el-select v-model="form.gender" placeholder="请选择" clearable style="width: 100%">
                      <el-option label="男" value="男" />
                      <el-option label="女" value="女" />
                    </el-select>
                  </el-form-item>
                </div>
                <div class="hr-form-cell">
                  <el-form-item label="身份证号">
                    <el-input v-model="form.id_card_no" placeholder="选填" />
                  </el-form-item>
                </div>
              </div>
            </div>
            <div class="hr-form-section">
              <div class="hr-form-section__title">部门与入职</div>
              <div class="hr-form-row">
                <div class="hr-form-cell">
                  <el-form-item label="部门">
                    <el-input v-model="form.department" placeholder="选填" />
                  </el-form-item>
                </div>
                <div class="hr-form-cell">
                  <el-form-item label="岗位">
                    <el-input v-model="form.position" placeholder="选填" />
                  </el-form-item>
                </div>
              </div>
              <el-form-item v-if="formMode === 'edit'" label="入职时间">
                <el-date-picker v-model="form.hire_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" placeholder="暂未入职时为空" />
              </el-form-item>
            </div>

          </div>
          <!-- 右栏：联系与紧急 + 银行与薪酬 -->
          <div class="hr-form-dialog__col">
            <div class="hr-form-section">
              <div class="hr-form-section__title">联系与紧急</div>
              <div class="hr-form-row">
                <div class="hr-form-cell">
                  <el-form-item label="联系方式">
                    <el-input v-model="form.contact_phone" placeholder="选填" />
                  </el-form-item>
                </div>
                <div class="hr-form-cell">
                  <el-form-item label="婚姻状况">
                    <el-input v-model="form.marital_status" placeholder="选填" />
                  </el-form-item>
                </div>
              </div>
              <el-form-item label="家庭地址">
                <el-input v-model="form.home_address" type="textarea" :rows="2" placeholder="选填" />
              </el-form-item>
              <div class="hr-form-row">
                <div class="hr-form-cell">
                  <el-form-item label="紧急联系人">
                    <el-input v-model="form.emergency_contact" placeholder="选填" />
                  </el-form-item>
                </div>
                <div class="hr-form-cell">
                  <el-form-item label="紧急电话">
                    <el-input v-model="form.emergency_phone" placeholder="选填" />
                  </el-form-item>
                </div>
              </div>
            </div>
            <div class="hr-form-section">
              <div class="hr-form-section__title">银行与薪酬</div>
              <div class="hr-form-row">
                <div class="hr-form-cell">
                  <el-form-item label="银行卡号">
                    <el-input v-model="form.bank_account" placeholder="选填" />
                  </el-form-item>
                </div>
                <div class="hr-form-cell">
                  <el-form-item label="开户行">
                    <el-input v-model="form.bank_name" placeholder="选填" />
                  </el-form-item>
                </div>
              </div>
              <div class="hr-form-row">
                <div class="hr-form-cell hr-form-cell--full">
                  <el-form-item label="工资标准">
                    <el-input-number v-model="form.salary_standard" :min="0" :precision="2" style="width: 100%" placeholder="选填" />
                  </el-form-item>
                </div>
              </div>
            </div>
            <div class="hr-form-section">
              <div class="hr-form-section__title">操作人</div>
              <div class="hr-form-row">
                <div class="hr-form-cell hr-form-cell--full">
                  <el-form-item label="操作人">
                    <el-input :model-value="currentOperator ?? '—'" disabled />
                  </el-form-item>
                </div>
              </div>
            </div>
          </div>
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
        <el-form-item label="结束时间">
          <el-date-picker v-model="leaveForm.end_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选填，归期未知可不填" style="width: 100%" />
        </el-form-item>
        <el-form-item label="请假时长">
          <span v-if="leaveDurationText" class="leave-duration-text">{{ leaveDurationText }}</span>
          <el-input-number v-model="leaveForm.leave_hours" :min="0" :precision="2" style="width: 80%" placeholder="可自动计算或手动填写" />
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
import { Refresh, View, Edit, Finished, Avatar, FolderAdd, Download, Document, Stamp, Ticket, Notebook, Sort, Calendar, Medal } from '@element-plus/icons-vue';
import { useAuthStore } from '../../../stores/auth';
import { usePermission } from '../../../permissions';
import { P } from '../../../permissions/constants';
import {
  fetchEmployees,
  fetchEmployeeById,
  fetchLeaveRecords,
  fetchArchiveForExportByEmployeeNos,
  createEmployee,
  updateEmployee,
  setEmployeeResigned,
  createTransferRecord,
  createSalaryChangeRecord,
  createLeaveRecord,
  createRewardDisciplineRecord,
  getSignedUrl,
  uploadEmployeeFile,
  isOnLeaveToday
} from './api';
import { exportToExcelMultiSheet } from '../../../composables/useExport';
import './employees-cn.css';
import { formatDateOnly } from './types';
import type { CnEmployee, CnEmployeeWithStatus } from './types';
import { useArchiveFilters } from './composables/useArchiveFilters';
import { useArchivePhotoMap } from './composables/useArchivePhotoMap';
import { useArchiveTimeline } from './composables/useArchiveTimeline';

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
const { can } = usePermission();
const canManage = can(P.HR_EMPLOYEE_CN_MANAGE);
/** 当前操作人（调岗/调薪/离职/请假/奖励违纪 必写，便于审计） */
const currentOperator = computed(() => auth.user?.email ?? auth.email ?? null);

const STATE_KEY = 'hr.employees-cn.archives.ui_state.v1';

const list = ref<CnEmployeeWithStatus[]>([]);
const leaveRecords = ref<Awaited<ReturnType<typeof fetchLeaveRecords>>>([]);
const loading = ref(false);
const exporting = ref(false);
const filters = ref<{ keyword: string; statusFilter: '' | 'active' | 'resigned' | 'pending' | 'onLeave' }>({ keyword: '', statusFilter: '' });
const { photoUrlMap, loadListPhotoUrls: _loadListPhotoUrls, loadSinglePhoto } = useArchivePhotoMap();
const archiveFilters = useArchiveFilters(list);
const { tableFilters, tableSort, displayList: tableDisplayList, departmentFilters, positionFilters, employeeNoFilters, filterMethod, onFilterChange, onSortChange } = archiveFilters;

watch(filters, (f) => {
  archiveFilters.keyword.value = f.keyword;
  archiveFilters.statusFilter.value = f.statusFilter;
}, { deep: true, immediate: true });

function restoreUiState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s?.filters && typeof s.filters === 'object') {
      if (typeof s.filters.keyword === 'string') filters.value.keyword = s.filters.keyword;
      if (['', 'active', 'resigned', 'pending', 'onLeave'].includes(s.filters.statusFilter)) {
        filters.value.statusFilter = s.filters.statusFilter;
      }
    }
    if (s?.detailTab && typeof s.detailTab === 'string') detailTab.value = s.detailTab;
    if (s?.tableFilters && typeof s.tableFilters === 'object') tableFilters.value = { ...s.tableFilters };
    if (s?.tableSort && typeof s.tableSort === 'object' && s.tableSort.prop != null) {
      tableSort.value = {
        prop: typeof s.tableSort.prop === 'string' ? s.tableSort.prop : '',
        order: s.tableSort.order === 'ascending' || s.tableSort.order === 'descending' ? s.tableSort.order : null,
      };
    }
  } catch { /* ignore */ }
}

function persistUiState() {
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        filters: filters.value,
        detailTab: detailTab.value,
        tableFilters: tableFilters.value,
        tableSort: tableSort.value,
      })
    );
  } catch { /* ignore */ }
}

const PERSIST_DEBOUNCE_MS = 450;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedPersistUiState() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistUiState();
  }, PERSIST_DEBOUNCE_MS);
}


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

/** 导出档案：按工号导出全部员工及其关联数据（邀请函、签证、机票、劳动许可、调岗调薪、请假、奖惩） */
async function exportArchives() {
  exporting.value = true;
  try {
    const employees = await fetchEmployees();
    const nos = employees.map((e) => e.employee_no).filter(Boolean);
    if (!nos.length) {
      ElMessage.warning('暂无可导出的员工');
      return;
    }
    const sheets = await fetchArchiveForExportByEmployeeNos(nos);
    const data = sheets.filter((s) => s.data.length).map((s) => ({ name: s.sheetName, data: s.data }));
    if (!data.length) {
      ElMessage.warning('暂无可导出的数据');
      return;
    }
    exportToExcelMultiSheet(data, '员工档案');
    ElMessage.success('导出成功');
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

function loadListPhotoUrls() {
  return _loadListPhotoUrls(list.value);
}

function applyFilters() {}

// 详情（详情 tab 参与持久化，再次打开详情时恢复上次选中的 tab）
const detailVisible = ref(false);
const detailEmployeeId = ref<string | null>(null);
const detailTab = ref('invitation');
/** 与表格共用 photoUrlMap 缓存，避免详情头像闪烁并保持持久化一致 */
const detailPhotoUrl = computed(() =>
  detailEmployeeId.value ? (photoUrlMap.value[detailEmployeeId.value] ?? '') : ''
);
const { items: timelineItems, folded: timelineFolded, displayItems: timelineDisplayItems, hasMore: timelineHasMore, load: loadTimeline, reset: resetTimeline } = useArchiveTimeline();

const timelineTypeConfig: Record<string, { color: string; icon: any }> = {
  invitation: { color: '#409EFF', icon: Document },
  visa: { color: '#67C23A', icon: Stamp },
  flight: { color: '#E6A23C', icon: Ticket },
  labor: { color: '#909399', icon: Notebook },
  transfer: { color: '#F56C6C', icon: Sort },
  leave: { color: '#9B59B6', icon: Calendar },
  reward: { color: '#00B894', icon: Medal },
};


const detailEmployee = computed(() => {
  if (!detailEmployeeId.value) return null;
  return list.value.find((e) => e.id === detailEmployeeId.value) ?? null;
});

watch(detailEmployeeId, async (id) => {
  if (!id) return;
  const emp = await fetchEmployeeById(id);
  if (emp && !list.value.find((e) => e.id === emp.id)) {
    list.value = [...list.value, { ...emp, isOnLeave: false }];
    if (emp.photo_url) {
      try {
        const url = await getSignedUrl(emp.photo_url);
        photoUrlMap.value = { ...photoUrlMap.value, [emp.id]: url };
      } catch {
        /* ignore */
      }
    }
  }
});

watch(
  [detailEmployeeId, detailTab],
  async ([id, tab]) => {
    if (id && tab === 'timeline') {
      await loadTimeline(id);
    } else if (tab !== 'timeline') {
      resetTimeline();
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

/** 刷新当前详情员工头像到 photoUrlMap（编辑/上传后调用），与表格共用缓存 */
async function loadDetailPhoto() {
  if (!detailEmployee.value?.photo_url || !detailEmployeeId.value) return;
  await loadSinglePhoto(detailEmployeeId.value, detailEmployee.value.photo_url);
}

function openDetail(row: CnEmployeeWithStatus) {
  detailEmployeeId.value = row.id;
  detailVisible.value = true;
  /* 头像已用 photoUrlMap[row.id]，无需再请求；不销毁抽屉内容，再次打开同员工时无需重新拉取 tab 数据 */
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
  passport_photo_url: null,
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
    passport_photo_url: null,
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
    passport_photo_url: row.passport_photo_url ?? null,
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

async function handlePassportUpload(options: { file: File }) {
  try {
    const path = await uploadEmployeeFile('passport', options.file.name, options.file);
    form.value.passport_photo_url = path;
    ElMessage.success('护照附件已上传');
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  }
}

async function previewPassport() {
  if (!form.value.passport_photo_url) return;
  try {
    const url = await getSignedUrl(form.value.passport_photo_url);
    window.open(url, '_blank');
  } catch {
    ElMessage.warning('无法打开护照附件');
  }
}

function clearPassportPhoto() {
  form.value.passport_photo_url = null;
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
  /* 结束时间非必填，支持归期未知场景 */
};

const leaveDurationText = computed(() => {
  const start = leaveForm.value.start_at;
  const end = leaveForm.value.end_at;
  if (!start || !end) return '';
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (b <= a) return '';
  const hours = (b - a) / (1000 * 60 * 60);
  if (hours >= 24) return `约 ${(hours / 24).toFixed(1)} 天`;
  return `约 ${hours.toFixed(1)} 小时`;
});

function openLeave(row: CnEmployeeWithStatus) {
  leaveEmployee.value = row;
  leaveForm.value = { reason: '', start_at: null, end_at: null, leave_hours: null };
  leaveVisible.value = true;
}

watch(
  () => [leaveForm.value.start_at, leaveForm.value.end_at],
  ([start, end]) => {
    if (!start || !end) return;
    const a = new Date(start as string).getTime();
    const b = new Date(end as string).getTime();
    if (b > a) leaveForm.value.leave_hours = (b - a) / (1000 * 60 * 60);
  },
  { deep: true }
);

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
      if (emp.photo_url) {
        try {
          const url = await getSignedUrl(emp.photo_url);
          photoUrlMap.value = { ...photoUrlMap.value, [emp.id]: url };
        } catch {
          /* ignore */
        }
      }
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

watch(
  [filters, detailTab, tableFilters, tableSort],
  debouncedPersistUiState,
  { deep: true }
);

onMounted(async () => {
  restoreUiState();
  await fetchData();
})
</script>

<style scoped>
/* ========== 卡片头部（原有，保留） ========== */
.erp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.detail-tabs {
  margin-top: 8px;
}
.hr-timeline-wrap {
  padding: 8px 0;
}
.hr-timeline-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
}
.hr-timeline-dot-icon {
  font-size: 12px;
}
.hr-timeline-more {
  margin-top: 12px;
  padding-left: 32px;
}
.leave-duration-text {
  margin-right: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.ml-2 {
  margin-left: 8px;
}

/* ========== 入职/编辑弹窗：整体容器 ========== */
.hr-form-dialog {
  --el-dialog-border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(2px);
}
/* 弹窗宽度增大且自适应：大屏最大 1200px，随视口收缩 */
.hr-form-dialog--horizontal :deep(.el-dialog) {
  width: min(1200px, 96vw) !important;
  max-width: 96vw;
}

.hr-form-dialog :deep(.el-dialog__header) {
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  position: relative;
}
.hr-form-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, var(--el-color-primary), #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hr-form-dialog :deep(.el-dialog__body) {
  padding-top: 12px;
  max-height: 70vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--el-color-primary-light-5) transparent;
}
.hr-form-dialog :deep(.el-dialog__body::-webkit-scrollbar) {
  width: 6px;
}
.hr-form-dialog :deep(.el-dialog__body::-webkit-scrollbar-thumb) {
  background: var(--el-color-primary-light-5);
  border-radius: 12px;
  transition: background 0.2s;
}
.hr-form-dialog :deep(.el-dialog__body::-webkit-scrollbar-thumb:hover) {
  background: var(--el-color-primary-light-3);
}

.hr-form-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 1px solid var(--el-border-color-light);
}

/* ========== 横向两栏布局 ========== */
.hr-form-dialog--horizontal .hr-form-dialog__layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.hr-form-dialog--horizontal .hr-form-dialog__col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
/* 右栏略宽，银行卡号/开户行等输入框更长 */
.hr-form-dialog--horizontal .hr-form-dialog__col:first-child {
  flex: 0.92;
}
.hr-form-dialog--horizontal .hr-form-dialog__col + .hr-form-dialog__col {
  border-left: 1px solid var(--el-border-color-lighter);
  padding-left: 20px;
  flex: 1.08;
  min-width: 0;
}
/* 右侧栏略宽，便于银行卡号、开户行等较长内容显示 */
.hr-form-dialog--horizontal :deep(.el-dialog__body) {
  max-height: 75vh;
  padding: 16px 24px 20px;
}

/* ========== 表单手动排版（替代 el-row/el-col） ========== */
.hr-form-dialog .hr-form-row {
  display: flex;
  margin-bottom: 18px;
}
.hr-form-dialog .hr-form-row:last-child {
  margin-bottom: 0;
}
.hr-form-dialog .hr-form-cell {
  flex: 1;
  min-width: 0;
}
/* 单列 item 时限制最大宽度，不占满整行 */
.hr-form-dialog .hr-form-cell--full {
  flex: 0 1 auto;
  max-width: 360px;
}
.hr-form-dialog .hr-form-cell .el-form-item,
.hr-form-dialog .hr-form-cell--full .el-form-item {
  margin-bottom: 0;
}
.hr-form-dialog .hr-form-section .el-form-item:last-child {
  margin-bottom: 0;
}
/* 表单项内容区与 input 占满可用宽度，输入框更宽 */
.hr-form-dialog :deep(.el-form-item__content) {
  flex: 1;
  min-width: 0;
}
.hr-form-dialog :deep(.el-input),
.hr-form-dialog :deep(.el-select),
.hr-form-dialog :deep(.el-date-editor),
.hr-form-dialog :deep(.el-input-number) {
  width: 100%;
}
.hr-form-dialog .hr-form-cell {
  min-width: 200px;
}

/* ========== 表单分组 ========== */
.hr-form-section {
  margin-bottom: 28px;
  padding: 16px 20px;
  background: var(--el-fill-color-blank);
  border-radius: 12px;
  transition: background 0.2s;
}
.hr-form-dialog--horizontal .hr-form-section {
  margin-bottom: 18px;
  padding: 14px 16px;
}
.hr-form-dialog--horizontal .hr-form-section:last-child {
  margin-bottom: 0;
}
.hr-form-section:hover {
  background: var(--el-fill-color-light);
}
.hr-form-section--avatar {
  margin-bottom: 16px;
}

.hr-form-dialog--horizontal .hr-form-section--avatar {
  margin-bottom: 8px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hr-form-dialog--horizontal .hr-form-section--avatar .hr-form-section__title {
  justify-content: center;
}
.hr-form-section__title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  position: relative;
}
.hr-form-dialog--horizontal .hr-form-section__title {
  margin-bottom: 12px;
  padding-bottom: 6px;
  font-size: 13px;
}
.hr-form-section__title::before {
  content: '';
  width: 4px;
  height: 18px;
  background: linear-gradient(to bottom, var(--el-color-primary), var(--el-color-primary-light-5));
  border-radius: 4px;
  margin-right: 8px;
}

/* ========== 头像上传区域（身份照片垂直水平居中） ========== */
.form-avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.hr-form-dialog--horizontal .hr-form-section--avatar .form-avatar-wrap {
  flex-wrap: wrap;
  justify-content: center;
}
.form-avatar-upload :deep(.el-upload) {
  display: block;
}
.form-avatar-box {
  position: relative;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: var(--el-fill-color-light);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.form-avatar-box:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 24px -8px var(--el-color-primary-light-3);
  border-color: var(--el-color-primary);
}
.form-avatar-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.form-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  gap: 4px;
}
.form-avatar-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.form-avatar-box:hover .form-avatar-mask {
  opacity: 1;
}
.form-avatar-clear {
  margin-left: 4px;
}

.form-passport-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.passport-upload-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}


/* ========== 原有时光轴、表格相关样式（保留，未改动） ========== */
.hr-timeline-wrap {
  padding: 8px 0;
}
.hr-timeline-title {
  font-weight: 600;
}
.hr-timeline-meta {
  margin-top: 4px;
}
.hr-timeline-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.hr-timeline-operator {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.dialog-operator {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}
.table-photo {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: block;
  margin: 0 auto;
  cursor: pointer;
}
.table-photo-placeholder {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
.hr-table-op-btn {
  padding: 4px 6px;
}
.hr-table-op-btn .el-icon {
  font-size: 18px;
}
.hr-table-op-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-color-primary);
  transition: opacity 0.2s;
}
.hr-table-op-trigger:hover {
  opacity: 0.8;
}

/* ========== 响应式微调（与弹窗宽度自适应同步） ========== */
@media (max-width: 1240px) {
  .hr-form-dialog--horizontal :deep(.el-dialog) {
    width: min(1200px, 94vw) !important;
  }
}
@media (max-width: 1000px) {
  .hr-form-dialog--horizontal .hr-form-dialog__layout {
    flex-direction: column;
  }
  .hr-form-dialog--horizontal .hr-form-dialog__col + .hr-form-dialog__col {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid var(--el-border-color-lighter);
    padding-top: 18px;
  }
  .hr-form-dialog .hr-form-cell {
    min-width: 0;
  }
}
@media (max-width: 640px) {
  .hr-form-dialog :deep(.el-dialog) {
    width: 90% !important;
    max-width: 90vw !important;
    margin: 20px auto !important;
  }
  .hr-form-dialog .hr-form-cell {
    min-width: 0;
  }
  .hr-form-section {
    padding: 12px;
  }
  .form-avatar-box {
    width: 72px;
    height: 72px;
  }
}
</style>
