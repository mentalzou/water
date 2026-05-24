import app from './app';
import config from './config';
import { getDb } from './utils/db';

getDb();

const server = app.listen(config.port, () => {
  console.log(`🚀 好水到家 API 服务已启动: http://localhost:${config.port}`);
  console.log(`   环境: ${config.nodeEnv}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

export default server;
