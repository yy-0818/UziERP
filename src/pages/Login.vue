<template>
  <div class="login-page">
    <!-- 增强粒子特效背景 -->
    <div class="tech-bg">
      <!-- 双层动态网格 -->
      <div class="grid-overlay grid-primary"></div>
      <div class="grid-overlay grid-secondary"></div>
      
      <!-- 渐变背景 -->
      <div class="gradient-overlay"></div>
      
      <!-- 增强版粒子特效 -->
      <div class="particles-container">
        <div class="particles-layer particles-1">
          <div v-for="i in 15" :key="i" class="particle particle-sm" :style="getParticleStyle(i, 'sm')"></div>
        </div>
        <div class="particles-layer particles-2">
          <div v-for="i in 10" :key="i" class="particle particle-md" :style="getParticleStyle(i, 'md')"></div>
        </div>
        <div class="particles-layer particles-3">
          <div v-for="i in 8" :key="i" class="particle particle-lg" :style="getParticleStyle(i, 'lg')"></div>
        </div>
        
        <!-- 新增：连线粒子特效 -->
        <div class="particles-layer connections">
          <div v-for="i in 6" :key="i" class="connection-line" :style="getConnectionStyle(i)"></div>
        </div>
      </div>
      
      <!-- 新增：流动光束 -->
      <div class="light-beams">
        <div class="light-beam beam-1"></div>
        <div class="light-beam beam-2"></div>
      </div>
    </div>

    <!-- 主登录区域 -->
    <div class="login-container">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-logo">
          <div class="logo-icon">
            <svg width="40" height="40" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                    stroke="currentColor" 
                    stroke-width="1.5" 
                    fill="none"
                    stroke-linecap="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">Uzi ERP</h1>
            <p class="brand-subtitle">企业资源管理系统</p>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="form-section">
        <div class="form-container">
          <div class="form-header">
            <h2 class="form-title">欢迎登录</h2>
            <p class="form-subtitle">请输入您的企业账户信息</p>
          </div>

          <el-form :model="form" @submit.prevent="onSubmit" class="login-form">
            <div class="form-group">
              <el-input
                v-model="form.email"
                placeholder="请输入企业邮箱"
                size="large"
                class="custom-input"
              >
                <template #prefix>
                  <span class="input-prefix-icon">📧</span>
                </template>
              </el-input>
            </div>

            <div class="form-group">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                class="custom-input"
                show-password
              >
                <template #prefix>
                  <span class="input-prefix-icon">🔒</span>
                </template>
              </el-input>
            </div>

            <el-button
              type="primary"
              :loading="loading"
              @click="onSubmit"
              size="large"
              class="login-btn"
            >
              <span v-if="!loading" class="btn-content">
                <span class="btn-text">登录系统</span>
                <span class="btn-arrow">→</span>
              </span>
              <span v-else class="loading-content">
                验证中<span class="loading-dots">...</span>
              </span>
            </el-button>

            <div class="form-footer">
              <div class="security-notice">
                <i class="security-icon">🛡️</i>
                <span class="security-text">您的数据已通过256位SSL加密保护</span>
              </div>
            </div>
          </el-form>
        </div>
      </div>
    </div>

    <!-- 简化特性展示 -->
    <div class="features-row">
      <div class="feature-item">
        <span class="feature-icon">🔒</span>
        <span class="feature-text">企业级安全</span>
      </div>
      <div class="feature-item">
        <span class="feature-icon">⚡</span>
        <span class="feature-text">高性能处理</span>
      </div>
      <div class="feature-item">
        <span class="feature-icon">🌐</span>
        <span class="feature-text">云端部署</span>
      </div>
    </div>

    <!-- 简化底部状态栏 - 一排显示 -->
    <div class="status-footer">
      <div class="status-content">
        <span class="status-item">
          <span class="status-indicator active"></span>
          系统在线
        </span>
        <span class="status-divider">•</span>
        <span class="status-item">
          {{ currentTime }}
        </span>
        <span class="status-divider">•</span>
        <span class="status-item">
          <a href="#" class="status-link">帮助中心</a>
        </span>
        <span class="status-divider">•</span>
        <span class="status-item">
          <a href="#" class="status-link">技术支持</a>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const form = reactive({
  email: '',
  password: '',
});

const loading = ref(false);
const currentTime = ref('');
const router = useRouter();
const auth = useAuthStore();

// 更新时间
let timeInterval: number;
onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timeInterval);
});

const updateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  currentTime.value = `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 生成粒子样式
const getParticleStyle = (index: number, size: string) => {
  // 设置不同的位置和动画延迟
  const left = (index * 7) % 100; // 水平分布
  const top = (index * 13) % 100; // 垂直分布
  const delay = (index * 0.3) % 5; // 动画延迟
  
  let width = '2px';
  let height = '2px';
  let blur = '1px';
  
  if (size === 'md') {
    width = '3px';
    height = '3px';
    blur = '1.5px';
  } else if (size === 'lg') {
    width = '4px';
    height = '4px';
    blur = '2px';
  }
  
  // 不同的颜色
  const colors = [
    'rgba(99, 102, 241, 0.4)',
    'rgba(168, 85, 247, 0.4)',
    'rgba(59, 130, 246, 0.4)',
    'rgba(34, 197, 94, 0.4)',
    'rgba(245, 158, 11, 0.4)'
  ];
  const color = colors[index % colors.length];
  
  return {
    left: `${left}%`,
    top: `${top}%`,
    width,
    height,
    background: color,
    filter: `blur(${blur})`,
    animationDelay: `${delay}s`
  };
};

// 生成连接线样式
const getConnectionStyle = (index: number) => {
  const startLeft = (index * 15) % 90;
  const startTop = (index * 20) % 80;
  const endLeft = (startLeft + 20 + Math.sin(index) * 15) % 90;
  const endTop = (startTop + 15 + Math.cos(index) * 10) % 80;
  const delay = index * 0.5;
  
  const width = Math.sqrt(
    Math.pow(endLeft - startLeft, 2) + 
    Math.pow(endTop - startTop, 2)
  ) * 1.2;
  
  const angle = Math.atan2(endTop - startTop, endLeft - startLeft) * (180 / Math.PI);
  
  return {
    left: `${startLeft}%`,
    top: `${startTop}%`,
    width: `${width}%`,
    transform: `rotate(${angle}deg)`,
    animationDelay: `${delay}s`
  };
};

const onSubmit = async () => {
  if (!form.email || !form.password) {
    ElMessage.error('请输入邮箱和密码');
    return;
  }
  
  if (!form.email.includes('@')) {
    ElMessage.error('请输入有效的邮箱地址');
    return;
  }
  
  loading.value = true;
  try {
    await auth.login(form.email, form.password);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败，请检查凭据');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* 修复1: 增强el-input样式覆盖，确保背景透明 */
:deep(.el-input.custom-input .el-input__wrapper) {
  background: transparent !important;
  backdrop-filter: none !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  height: 54px !important;
  box-shadow: none !important;
}

:deep(.el-input.custom-input .el-input__wrapper:hover) {
  border-color: rgba(99, 102, 241, 0.4) !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.el-input.custom-input .el-input__wrapper.is-focus) {
  border-color: #6366f1 !important;
  background: rgba(99, 102, 241, 0.05) !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
}

:deep(.el-input.custom-input .el-input__inner) {
  background: transparent !important;
  color: #f1f5f9 !important;
  font-size: 15px !important;
}

:deep(.el-input.custom-input .el-input__inner::placeholder) {
  color: #94a3b8 !important;
}

.input-prefix-icon {
  font-size: 18px;
  color: #94a3b8;
  margin-right: 8px;
}

.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e17 0%, #1a1f2e 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* ================= 增强版背景设计 ================= */
.tech-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  overflow: hidden;
}

/* 双层网格系统 */
.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(circle at center, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 70%);
}

.grid-primary {
  animation: gridPulse 8s ease-in-out infinite;
}

.grid-secondary {
  background-size: 30px 30px;
  opacity: 0.3;
  animation: gridFlow 20s linear infinite;
  background-image: 
    linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px);
}

/* 渐变层 */
.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
  animation: gradientBreath 15s ease-in-out infinite;
}

/* ================= 增强粒子特效 ================= */
.particles-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.particles-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.particle {
  position: absolute;
  border-radius: 50%;
  animation: particleFloat 20s ease-in-out infinite;
  z-index: 1;
}

/* 小粒子 */
.particle-sm {
  animation-duration: 15s;
  animation-timing-function: ease-in-out;
}

/* 中粒子 */
.particle-md {
  animation-duration: 25s;
  animation-timing-function: linear;
}

/* 大粒子 */
.particle-lg {
  animation-duration: 30s;
  animation-timing-function: ease-in-out;
  box-shadow: 0 0 8px currentColor;
}

/* 连接线 */
.connection-line {
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(99, 102, 241, 0.3),
    rgba(168, 85, 247, 0.3),
    rgba(99, 102, 241, 0.3),
    transparent);
  transform-origin: left center;
  animation: connectionPulse 8s ease-in-out infinite;
  z-index: 0;
}

/* 流动光束 */
.light-beams {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.light-beam {
  position: absolute;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(99, 102, 241, 0.1),
    rgba(168, 85, 247, 0.15),
    rgba(99, 102, 241, 0.1),
    transparent);
  width: 100%;
  height: 1px;
  filter: blur(2px);
  animation: beamSweep 15s linear infinite;
}

.beam-1 {
  top: 30%;
  animation-delay: 0s;
}

.beam-2 {
  top: 70%;
  animation-delay: 7.5s;
}

/* ================= 粒子动画定义 ================= */
@keyframes particleFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.6;
  }
  25% {
    transform: translate(15px, -20px) scale(1.2);
    opacity: 0.8;
  }
  50% {
    transform: translate(-20px, 10px) scale(0.9);
    opacity: 0.4;
  }
  75% {
    transform: translate(10px, 15px) scale(1.1);
    opacity: 0.7;
  }
}

@keyframes connectionPulse {
  0%, 100% {
    opacity: 0.1;
    transform: scaleX(0.8);
  }
  50% {
    opacity: 0.4;
    transform: scaleX(1.2);
  }
}

@keyframes beamSweep {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.8;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* 网格和渐变动画 */
@keyframes gridFlow {
  0% {
    transform: translateX(0) translateY(0);
  }
  100% {
    transform: translateX(30px) translateY(30px);
  }
}

@keyframes gridPulse {
  0%, 100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.005);
  }
}

@keyframes gradientBreath {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.01);
  }
}

/* 主容器 */
.login-container {
  display: flex;
  flex: 1;
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 40px 20px 30px;
  gap: 80px;
  align-items: center;
  justify-content: center;
}

/* 左侧品牌区域 */
.brand-section {
  flex: 1;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.brand-logo {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.logo-icon {
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 16px;
  border: 1px solid rgba(99, 102, 241, 0.15);
  box-shadow: 
    0 4px 12px rgba(99, 102, 241, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-title {
  font-size: 44px;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.1;
}

.brand-subtitle {
  color: #94a3b8;
  font-size: 16px;
  margin: 0;
  line-height: 1.5;
}

/* 表单区域 */
.form-section {
  flex: 1;
  max-width: 480px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-container {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 32px 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(99, 102, 241, 0.05);
  display: flex;
  flex-direction: column;
}

.form-header {
  margin-bottom: 20px;
  text-align: left;
}

.form-title {
  font-size: 28px;
  color: #f1f5f9;
  margin: 0 0 6px 0;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.form-subtitle {
  color: #94a3b8;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

/* 表单样式 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  position: relative;
}

/* 表单底部 */
.form-footer {
  margin-top: 24px;
}

.security-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.security-icon {
  font-size: 16px;
}

.security-text {
  color: #94a3b8;
  font-size: 13px;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  height: 54px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}

.login-btn:not(.is-disabled):not(.is-loading):hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.35);
}

.login-btn:not(.is-disabled):not(.is-loading):active {
  transform: translateY(0);
}

.login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.7s ease;
}

.login-btn:hover::before {
  left: 100%;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-text {
  color: white;
  letter-spacing: 0.5px;
}

.btn-arrow {
  opacity: 0.9;
  transition: transform 0.3s ease;
  font-weight: 300;
}

.login-btn:hover .btn-arrow {
  transform: translateX(6px);
}

.loading-content {
  color: white;
}

.loading-dots {
  animation: blink 1.4s infinite;
}

/* 简化特性展示 */
.features-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 50px;
  margin: 20px auto;
  position: relative;
  z-index: 1;
  max-width: 500px;
  width: 100%;
  padding: 0 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  transition: all 0.3s ease;
  color: #cbd5e1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.feature-item:hover {
  transform: translateY(-2px);
  color: #f1f5f9;
  background: rgba(99, 102, 241, 0.1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.feature-icon {
  font-size: 18px;
}

.feature-text {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

/* 简化底部状态栏 - 缩小并一排显示 */
.status-footer {
  padding: 15px 20px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.status-content {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.status-item:hover {
  color: #94a3b8;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  position: relative;
}

.status-indicator.active::after {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border-radius: 50%;
  background: #10b981;
  opacity: 0.4;
  animation: pulse 2s infinite;
}

.status-divider {
  color: #334155;
  opacity: 0.3;
}

.status-link {
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.2s ease;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
}

.status-link:hover {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

/* 其他动画 */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.2;
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    gap: 40px;
    padding: 30px 20px 20px;
  }
  
  .brand-section,
  .form-section {
    max-width: 100%;
    width: 100%;
  }
  
  .brand-logo {
    align-items: center;
    text-align: center;
    gap: 20px;
  }
  
  .logo-icon {
    width: 60px;
    height: 60px;
  }
  
  .brand-title {
    font-size: 36px;
  }
  
  .form-container {
    padding: 24px;
  }
  
  .form-title {
    font-size: 24px;
  }
  
  .features-row {
    flex-direction: column;
    gap: 15px;
    margin: 15px auto;
  }
  
  .feature-item {
    width: 100%;
    justify-content: center;
    max-width: 200px;
  }
  
  .status-content {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  .status-divider {
    display: none;
  }
  
  /* 移动端减少粒子数量 */
  .particles-1 .particle:nth-child(n+8),
  .particles-2 .particle:nth-child(n+6),
  .particles-3 .particle:nth-child(n+4),
  .connections .connection-line:nth-child(n+3) {
    display: none;
  }
  
  .light-beams {
    opacity: 0.3;
  }
}

/* 平板设备 */
@media (min-width: 769px) and (max-width: 1024px) {
  .login-container {
    max-width: 90%;
    gap: 60px;
    padding: 40px 30px 30px;
  }
  
  .features-row {
    gap: 40px;
  }
}

/* 小高度设备 */
@media (max-height: 700px) {
  .login-container {
    padding: 20px 20px 10px;
  }
  
  .form-container {
    padding: 20px 24px;
  }
  
  .features-row {
    margin: 10px auto 15px;
  }
  
  /* 降低粒子强度 */
  .particles-container {
    opacity: 0.7;
  }
  
  .light-beams {
    opacity: 0.4;
  }
}
</style>