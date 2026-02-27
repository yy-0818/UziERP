/**
 * 全局时间工具 - 统一本机时间处理，避免 UTC 时差问题
 *
 * 规范：
 * - 写入数据库用 getLocalIsoString() 或 getLocalDateString()
 * - 页面显示用 formatDateTime() / formatDate() / formatTime()
 * - 时间比较用 getLocalNow()
 * - 禁止直接使用 new Date().toISOString()（UTC 时间，有时差）
 */

const pad = (n: number) => String(n).padStart(2, '0');

function localParts(d = new Date()) {
  return {
    y: d.getFullYear(),
    M: pad(d.getMonth() + 1),
    d: pad(d.getDate()),
    h: pad(d.getHours()),
    m: pad(d.getMinutes()),
    s: pad(d.getSeconds()),
  };
}

/** 获取本机当前时间 ISO 格式（YYYY-MM-DDTHH:mm:ss），用于写入数据库 */
export function getLocalIsoString(date?: Date): string {
  const p = localParts(date);
  return `${p.y}-${p.M}-${p.d}T${p.h}:${p.m}:${p.s}`;
}

/** 获取本机当前日期（YYYY-MM-DD），用于写入数据库日期字段 */
export function getLocalDateString(date?: Date): string {
  const p = localParts(date);
  return `${p.y}-${p.M}-${p.d}`;
}

/** 获取本机当前时间的可比较字符串（同 getLocalIsoString），用于时间比较 */
export function getLocalNow(): string {
  return getLocalIsoString();
}

/**
 * 格式化日期时间显示（本地时间）
 * @param v ISO 日期字符串
 * @param fmt 格式: 'datetime' | 'date' | 'time' | 'short'
 */
export function formatDateTime(v: string | null | undefined, fmt: 'datetime' | 'date' | 'time' | 'short' = 'datetime'): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    const p = localParts(d);
    switch (fmt) {
      case 'date': return `${p.y}-${p.M}-${p.d}`;
      case 'time': return `${p.h}:${p.m}`;
      case 'short': return `${p.M}/${p.d} ${p.h}:${p.m}`;
      default: return `${p.y}-${p.M}-${p.d} ${p.h}:${p.m}`;
    }
  } catch {
    return String(v);
  }
}

/** 格式化日期显示（YYYY-MM-DD） */
export function formatDate(v: string | null | undefined): string {
  return formatDateTime(v, 'date');
}

/** 格式化简短日期时间（MM/DD HH:mm） */
export function formatShortDateTime(v: string | null | undefined): string {
  return formatDateTime(v, 'short');
}

/** 判断给定时间是否已过期 */
export function isExpired(v: string | null | undefined): boolean {
  if (!v) return false;
  try {
    return new Date(v).getTime() < Date.now();
  } catch {
    return false;
  }
}

/** 获取当前显示时间（YYYY-MM-DD HH:mm），用于页面展示 */
export function getDisplayTime(): string {
  const p = localParts();
  return `${p.y}-${p.M}-${p.d} ${p.h}:${p.m}`;
}
