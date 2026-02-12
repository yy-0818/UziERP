/** 获取本机当前时间的 ISO 格式字符串（YYYY-MM-DDTHH:mm:ss），用于存入数据库，避免服务器时区差异 */
export function getLocalIsoString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
