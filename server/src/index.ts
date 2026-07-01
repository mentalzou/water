 import './utils/logger';  // 必须最先导入，为所有后续 console 调用添加时间戳
import 'dotenv/config';
import app from './app';
import config from './config';
import { getDb } from './utils/db';

getDb();

const server = app.listen(config.port, () => {
  console.log(`🚀 武夷屿都山水 API 服务已启动: http://localhost:${config.port}`);
  console.log(`   环境: ${config.nodeEnv}`);
});

// 定时任务：每 10 分钟自动关闭超过 24 小时未支付的订单
const AUTO_CLOSE_INTERVAL_MINUTES = 10;
const AUTO_CLOSE_HOURS = 24;

setInterval(() => {
  try {
    const { autoCloseExpiredOrders } = require('./services/order.service');
    autoCloseExpiredOrders(AUTO_CLOSE_HOURS);
  } catch (err: any) {
    console.error('[定时任务] 自动关闭订单异常:', err.message);
  }
}, AUTO_CLOSE_INTERVAL_MINUTES * 60 * 1000);

console.log(`[定时任务] 已启动，每 ${AUTO_CLOSE_INTERVAL_MINUTES} 分钟检查并关闭超过 ${AUTO_CLOSE_HOURS} 小时未支付的订单`);

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

export default server;
