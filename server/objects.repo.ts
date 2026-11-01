import type { RowDataPacket } from 'mysql2/promise';
import { isSceneObject } from '../shared/interaction.js';
import type { SceneObject } from '../shared/interaction.js';
import { pool } from './db.js';

interface ObjectRow extends RowDataPacket {
  object_key: string;
  display_name: string;
  style_labels: string;
  default_style: number;
  sort_order: number;
}

/** 一次读取物件目录并解析三款中文样式名，不在循环中访问数据库。 */
export async function getObjects(): Promise<SceneObject[]> {
  const [rows] = await pool.query<ObjectRow[]>(
    'SELECT object_key, display_name, style_labels, default_style, sort_order FROM scene_objects ORDER BY sort_order, object_key',
  );
  return rows.map((row) => {
    const object: unknown = {
      objectKey: row.object_key,
      displayName: row.display_name,
      styleLabels: JSON.parse(row.style_labels),
      defaultStyle: row.default_style,
      sortOrder: row.sort_order,
    };
    if (!isSceneObject(object)) throw new Error('物件目录格式无效');
    return object;
  });
}
