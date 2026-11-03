// 前后端共用物件键与交互校验，避免保存未知物件或无效样式。
export const OBJECT_KEYS = ['store', 'vending', 'bike', 'umbrella', 'bins', 'lamp', 'notice', 'poles', 'guardrail', 'ac'] as const;

export type ObjectKey = typeof OBJECT_KEYS[number];
export type StyleIndex = 0 | 1 | 2;

// 四种天气共用同一设置字段，兼容原有雨水布尔偏好。
export const WEATHER_MODES = ['clear', 'rain', 'thunderstorm', 'windy'] as const;
export type WeatherMode = typeof WEATHER_MODES[number];

export interface InteractionSettings {
  exploded: boolean;
  /** 当前天气模式；旧客户端仍可通过雨水偏好选择晴或雨。 */
  weatherMode: WeatherMode;
  /** 保留旧客户端所需的降雨状态。 */
  rainEnabled: boolean;
  styles: Partial<Record<ObjectKey, StyleIndex>>;
  version: 1;
}

// 旧接口与旧库允许缺少天气字段，加载时根据雨水偏好补齐。
type InteractionSettingsPayload = Omit<InteractionSettings, 'rainEnabled' | 'weatherMode'> & { rainEnabled?: boolean; weatherMode?: WeatherMode };

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

/** 判断天气值是否属于四种受支持的模式。 */
export function isWeatherMode(value: unknown): value is WeatherMode {
  return typeof value === 'string' && (WEATHER_MODES as readonly string[]).includes(value);
}

/** 校验交互设置，兼容旧数据缺少天气、雨水字段与缺省样式。 */
export function isInteractionSettings(value: unknown): value is InteractionSettingsPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || typeof data.exploded !== 'boolean') return false;
  if (data.rainEnabled !== undefined && typeof data.rainEnabled !== 'boolean') return false;
  if (data.weatherMode !== undefined && !isWeatherMode(data.weatherMode)) return false;
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
