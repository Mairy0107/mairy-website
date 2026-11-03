import { CONFIG } from './config';
import { DEFAULT_OBJECTS } from '../objects/catalog';
import { isInteractionSettings, isSceneObject } from '../../shared/interaction';
import type { InteractionSettings, SceneObject } from '../../shared/interaction';

type Vector3 = readonly [number, number, number];

export interface SceneSettings {
  camera: { position: Vector3; target: Vector3 };
  reveal: { enabled: boolean };
  interaction: InteractionSettings;
  objects: SceneObject[];
  interactionNotice: string;
}

/** 仅接受普通 JSON 对象，防止错误配置影响场景启动。 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 校验相机三维坐标，拒绝缺项、非数字和无限值。 */
function isVector3(value: unknown): value is Vector3 {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

/** 并行读取设置与目录，兼容旧雨水偏好和四模式天气，失败或超时后仍可本地预览。 */
export async function loadSceneSettings(signal: AbortSignal): Promise<SceneSettings> {
  const settings: SceneSettings = {
    camera: { position: CONFIG.camera.position, target: CONFIG.camera.target },
    reveal: { enabled: CONFIG.reveal.enabled },
    interaction: { exploded: false, rainEnabled: true, weatherMode: 'rain', styles: {}, version: 1 },
    objects: DEFAULT_OBJECTS.map((object) => ({ ...object, styleLabels: [...object.styleLabels] })),
    interactionNotice: '',
  };
  const controller = new AbortController();
  /** 热更新卸载时同步取消未完成的启动请求。 */
  const abort = (): void => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  const timeout = window.setTimeout(abort, 3000);
  /** 单个接口失败时返回空值，避免另一接口的数据同时丢失。 */
  async function read(path: string): Promise<unknown> {
    try {
      const response = await fetch(path, { signal: controller.signal });
      return response.ok ? await response.json() : undefined;
    } catch {
      return undefined;
    }
  }
  try {
    const [data, objects] = await Promise.all([read('/api/settings'), read('/api/objects')]);
    if (isObject(data)) {
      if (isObject(data.camera)) {
        if (isVector3(data.camera.position)) settings.camera.position = data.camera.position;
        if (isVector3(data.camera.target)) settings.camera.target = data.camera.target;
      }
      if (isObject(data.reveal) && typeof data.reveal.enabled === 'boolean') settings.reveal.enabled = data.reveal.enabled;
      if (isInteractionSettings(data.interaction)) {
        // 旧数据按雨水开关映射晴雨；四模式字段优先，继续兼容旧客户端。
        const weatherMode = data.interaction.weatherMode ?? (data.interaction.rainEnabled === false ? 'clear' : 'rain');
        settings.interaction = {
          ...data.interaction,
          weatherMode,
          rainEnabled: weatherMode === 'rain' || weatherMode === 'thunderstorm',
          styles: { ...data.interaction.styles },
        };
      } else if (data.interaction !== undefined) {
        settings.interactionNotice = '服务器交互设置无效，已使用本地默认值。';
      }
    } else {
      settings.interactionNotice = '设置加载失败，正在本地预览；保存时将重试连接。';
    }
    if (Array.isArray(objects) && objects.every(isSceneObject) && new Set(objects.map((object) => object.objectKey)).size === objects.length) {
      settings.objects = settings.objects.map((fallback) => objects.find((object) => object.objectKey === fallback.objectKey) ?? fallback);
      if (objects.length !== DEFAULT_OBJECTS.length) settings.interactionNotice ||= '部分物件目录缺失，已补充本地中文样式名。';
    } else {
      settings.interactionNotice ||= '物件目录加载失败，已使用本地中文样式名。';
    }
    settings.objects.sort((a, b) => a.sortOrder - b.sortOrder || a.objectKey.localeCompare(b.objectKey));
    for (const object of settings.objects) settings.interaction.styles[object.objectKey] ??= object.defaultStyle;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
  return settings;
}

/** 保存整体交互快照，超时及失败由面板以固定中文提示处理。 */
export async function saveInteraction(settings: InteractionSettings, signal: AbortSignal): Promise<void> {
  const response = await fetch('/api/settings/interaction', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
    signal,
  });
  if (!response.ok || !isInteractionSettings(await response.json())) throw new Error('交互设置保存失败');
}
