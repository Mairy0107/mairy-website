// 前后端共用物件键与交互校验，避免保存未知物件或无效样式。
export const OBJECT_KEYS = ['store', 'vending', 'bike', 'umbrella', 'bins', 'lamp', 'notice', 'poles', 'guardrail', 'ac'] as const;

export type ObjectKey = typeof OBJECT_KEYS[number];
export type StyleIndex = 0 | 1 | 2;

export interface InteractionSettings {
  exploded: boolean;
  /** 雨水偏好；关闭后隐藏雨丝与涟漪。 */
  rainEnabled: boolean;
  styles: Partial<Record<ObjectKey, StyleIndex>>;
  version: 1;
}

// 旧接口与旧库允许缺少雨水字段，加载时统一补为开启。
type InteractionSettingsPayload = Omit<InteractionSettings, 'rainEnabled'> & { rainEnabled?: boolean };

export interface SceneObject {
  objectKey: ObjectKey;
  displayName: string;
  styleLabels: [string, string, string];
  defaultStyle: StyleIndex;
  sortOrder: number;
}

/** 判断是否为项目约定的可交互物件键。 */
export function isObjectKey(value: unknown): value is ObjectKey {
  return typeof value === 'string' && (OBJECT_KEYS as readonly string[]).includes(value);
}

/** 判断样式是否属于三款可选索引。 */
export function isStyleIndex(value: unknown): value is StyleIndex {
  return value === 0 || value === 1 || value === 2;
}

/** 校验交互设置，兼容旧数据缺少雨水字段与缺省样式。 */
export function isInteractionSettings(value: unknown): value is InteractionSettingsPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || typeof data.exploded !== 'boolean') return false;
  if (data.rainEnabled !== undefined && typeof data.rainEnabled !== 'boolean') return false;
  if (typeof data.styles !== 'object' || data.styles === null || Array.isArray(data.styles)) return false;
  return Object.entries(data.styles).every(([key, style]) => isObjectKey(key) && isStyleIndex(style));
}

/** 校验物件目录，防止错误 JSON 或样式数量进入面板。 */
export function isSceneObject(value: unknown): value is SceneObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return isObjectKey(data.objectKey) && typeof data.displayName === 'string' && data.displayName.trim().length > 0
    && Array.isArray(data.styleLabels) && data.styleLabels.length === 3
    && data.styleLabels.every((label) => typeof label === 'string' && label.trim().length > 0)
    && isStyleIndex(data.defaultStyle) && typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder);
}
