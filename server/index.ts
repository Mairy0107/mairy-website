import { createApp } from './app.js';
import { CONFIG } from './config.js';
import { pool } from './db.js';

const server = createApp().listen(CONFIG.port, CONFIG.host, () => {
  console.log(`API listening on http://${CONFIG.host}:${CONFIG.port}`);
});

/** 退出前停止接收请求并关闭共享数据库连接池。 */
function shutdown(): void {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(() => {
    void pool.end().then(() => { clearTimeout(timeout); process.exit(0); });
  });
}

// 启动失败只报告固定信息，避免错误对象带出环境配置。
server.on('error', () => { console.error('API 启动失败，请检查端口配置。'); process.exit(1); });
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
