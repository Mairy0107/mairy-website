import type { RowDataPacket } from 'mysql2/promise';
import { pool } from './db.js';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface SettingRow extends RowDataPacket {
  setting_key: string;
  setting_value: string;
}

/** 一次查询读取全部设置，避免按键循环访问数据库。 */
export async function getAll(): Promise<Record<string, JsonValue>> {
  const [rows] = await pool.query<SettingRow[]>('SELECT setting_key, setting_value FROM scene_settings');
  return Object.fromEntries(rows.map((row) => [row.setting_key, JSON.parse(row.setting_value) as JsonValue]));
}

/** 使用参数化查询读取单个设置，区分不存在与 JSON null。 */
export async function getByKey(key: string): Promise<JsonValue | undefined> {
  const [rows] = await pool.execute<SettingRow[]>(
    'SELECT setting_key, setting_value FROM scene_settings WHERE setting_key = ?', [key],
  );
  return rows.length ? JSON.parse(rows[0].setting_value) as JsonValue : undefined;
}

/** 原子新增或覆盖设置，同时刷新更新时间。 */
export async function setByKey(key: string, value: JsonValue): Promise<void> {
  await pool.execute(
    `INSERT INTO scene_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), JSON.stringify(value)],
  );
}
