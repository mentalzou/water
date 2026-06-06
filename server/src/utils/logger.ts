/**
 * 日志工具 - 覆盖全局 console 方法，为所有日志添加服务器系统时间前缀
 *
 * 用法：在 index.ts 最顶部导入一次即可：
 *   import './utils/logger';
 *
 * 之后所有 console.log / error / warn / info 输出都会自动带时间戳。
 */

const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);
const originalInfo = console.info.bind(console);

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${ms}`
  );
}

console.log = (...args: any[]) => {
  originalLog(`[${formatTimestamp()}]`, ...args);
};

console.error = (...args: any[]) => {
  originalError(`[${formatTimestamp()}]`, ...args);
};

console.warn = (...args: any[]) => {
  originalWarn(`[${formatTimestamp()}]`, ...args);
};

console.info = (...args: any[]) => {
  originalInfo(`[${formatTimestamp()}]`, ...args);
};
