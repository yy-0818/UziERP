<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="520px"
    append-to-body
    destroy-on-close
    @update:model-value="(v: boolean) => $emit('update:visible', v)"
  >
    <!-- 邀请函 -->
    <template v-if="tab === 'invitation'">
      <el-form ref="invFormRef" :model="invForm" label-width="90px">
        <el-form-item label="员工">
          <el-select v-model="invForm.employee_id" filterable placeholder="请选择员工" style="width: 100%">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.employee_no} ${e.name}`" :value="e.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </template>
    <!-- 签证 -->
    <template v-else-if="tab === 'visa'">
      <el-form ref="visaFormRef" :model="visaForm" label-width="100px">
        <el-form-item label="员工">
          <el-select v-model="visaForm.employee_id" filterable placeholder="请选择员工" style="width: 100%">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.employee_no} ${e.name}`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请类型">
          <el-select v-model="visaForm.application_type" filterable allow-create placeholder="请选择或输入" style="width: 100%">
            <el-option label="工作签" value="工作签" />
            <el-option label="商务签" value="商务签" />
            <el-option label="落地签" value="落地签" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计出发">
          <el-date-picker v-model="visaForm.expected_departure_at" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
    </template>
    <!-- 机票：根据 cn_visa_handles 的 visa_times/remaining_times 校验，无有效签证则不可提交 -->
    <template v-else-if="tab === 'flight'">
      <el-alert v-if="flightVisaBlocked" type="warning" :closable="false" style="margin-bottom: 12px">
        该员工当前无有效签证或剩余次数为0，请先办理签证。
      </el-alert>
      <el-form ref="flightFormRef" :model="flightForm" label-width="100px">
        <el-form-item label="员工">
          <el-select v-model="flightForm.employee_id" filterable placeholder="请选择员工" style="width: 100%" @change="onFlightEmployeeChange">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.employee_no} ${e.name}`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="出发城市">
          <el-input v-model="flightForm.depart_city" />
        </el-form-item>
        <el-form-item label="到达城市">
          <el-input v-model="flightForm.arrive_city" />
        </el-form-item>
        <el-form-item label="预计出发">
          <el-date-picker v-model="flightForm.expected_departure_at" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="flightForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
    </template>
    <!-- 劳动许可 -->
    <template v-else-if="tab === 'labor'">
      <el-form ref="laborFormRef" :model="laborForm" label-width="100px">
        <el-form-item label="员工">
          <el-select v-model="laborForm.employee_id" filterable placeholder="请选择员工" style="width: 100%">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.employee_no} ${e.name}`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请日期">
          <el-date-picker v-model="laborForm.application_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="申请内容">
          <el-input v-model="laborForm.application_content" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="申请人">
          <el-input v-model="laborForm.applicant" />
        </el-form-item>
      </el-form>
    </template>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button
        type="primary"
        :loading="loading"
        :disabled="flightVisaBlocked"
        @click="submit"
      >
        提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../../../stores/auth';
import {
  createInvitationApplication,
  createVisaApplication,
  createFlightApplication,
  createLaborPermitApplication,
  fetchValidVisasForEmployee,
} from '../api';
import type { CnEmployee, VisaHandle } from '../types';

const props = defineProps<{
  visible: boolean;
  tab: 'invitation' | 'visa' | 'flight' | 'labor';
  employees: CnEmployee[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'submitted'): void;
}>();

const auth = useAuthStore();

const invFormRef = ref();
const visaFormRef = ref();
const flightFormRef = ref();
const laborFormRef = ref();

const invForm = ref({ employee_id: '' });
const visaForm = ref({
  employee_id: '',
  application_type: '',
  expected_departure_at: null as string | null,
});
const flightForm = ref({
  employee_id: '',
  depart_city: '',
  arrive_city: '',
  expected_departure_at: null as string | null,
  remark: '',
});
const laborForm = ref({
  employee_id: '',
  application_date: new Date().toISOString().slice(0, 10) as string,
  application_content: '',
  applicant: '',
});

const flightValidVisas = ref<VisaHandle[]>([]);
const flightEmployeeId = computed(() => flightForm.value.employee_id);
const flightVisaBlocked = computed(() => props.tab === 'flight' && !!flightForm.value.employee_id && !flightValidVisas.value.length);
const loading = ref(false);

const dialogTitle = computed(() => {
  const t: Record<string, string> = {
    invitation: '新建邀请函申请',
    visa: '新建签证申请',
    flight: '新建机票申请',
    labor: '新建劳动许可申请',
  };
  return t[props.tab] || '新建申请';
});

watch(
  () => props.visible,
  (v) => {
    if (v) {
      invForm.value = { employee_id: '' };
      visaForm.value = { employee_id: '', application_type: '', expected_departure_at: null };
      flightForm.value = { employee_id: '', depart_city: '', arrive_city: '', expected_departure_at: null, remark: '' };
      laborForm.value = {
        employee_id: '',
        application_date: new Date().toISOString().slice(0, 10),
        application_content: '',
        applicant: '',
      };
      flightValidVisas.value = [];
    }
  }
);

async function onFlightEmployeeChange(employeeId: string) {
  if (!employeeId) {
    flightValidVisas.value = [];
    return;
  }
  try {
    const visas = await fetchValidVisasForEmployee(employeeId);
    flightValidVisas.value = visas;
  } catch {
    flightValidVisas.value = [];
  }
}

async function submit() {
  loading.value = true;
  try {
    if (props.tab === 'invitation') {
      if (!invForm.value.employee_id) {
        ElMessage.warning('请选择员工');
        return;
      }
      await createInvitationApplication({
        employee_id: invForm.value.employee_id,
        submitted_by: auth.email || null,
      });
    } else if (props.tab === 'visa') {
      if (!visaForm.value.employee_id) {
        ElMessage.warning('请选择员工');
        return;
      }
      await createVisaApplication({
        employee_id: visaForm.value.employee_id,
        application_type: visaForm.value.application_type || null,
        expected_departure_at: visaForm.value.expected_departure_at,
        submitted_by: auth.email || null,
      });
    } else if (props.tab === 'flight') {
      if (!flightForm.value.employee_id) {
        ElMessage.warning('请选择员工');
        return;
      }
      if (!flightValidVisas.value.length) {
        ElMessage.warning('该员工当前无有效签证或剩余次数为0，请先办理签证');
        return;
      }
      await createFlightApplication({
        employee_id: flightForm.value.employee_id,
        depart_city: flightForm.value.depart_city || null,
        arrive_city: flightForm.value.arrive_city || null,
        expected_departure_at: flightForm.value.expected_departure_at,
        remark: flightForm.value.remark || null,
        submitted_by: auth.email || null,
      });
    } else if (props.tab === 'labor') {
      if (!laborForm.value.employee_id) {
        ElMessage.warning('请选择员工');
        return;
      }
      await createLaborPermitApplication({
        employee_id: laborForm.value.employee_id,
        application_date: laborForm.value.application_date || null,
        application_content: laborForm.value.application_content || null,
        applicant: laborForm.value.applicant || null,
        image_url: null,
      });
    }
    ElMessage.success('申请已提交');
    emit('update:visible', false);
    emit('submitted');
  } catch (e: any) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    loading.value = false;
  }
}

</script>
