import mysql from 'mysql2/promise';
import { CONFIG } from './config.js';

// 全部请求复用有限连接池；JSON 统一返回文本，由仓储层明确解析。
export const pool = mysql.createPool({
  ...CONFIG.mysql,
  connectionLimit: 5,
  waitForConnections: true,
  queueLimit: 50,
  connectTimeout: 5000,
  jsonStrings: true,
});

/** 检查数据库可用性，健康接口不会返回连接细节。 */
export async function checkDatabase(): Promise<void> {
  await pool.query('SELECT 1');
}
