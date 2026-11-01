import { CONFIG } from './config';

type Vector3 = readonly [number, number, number];

export interface SceneSettings {
  camera: { position: Vector3; target: Vector3 };
  reveal: { enabled: boolean };
}

/** 仅接受普通 JSON 对象，防止错误配置影响场景启动。 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 校验相机三维坐标，拒绝缺项、非数字和无限值。 */
function isVector3(value: unknown): value is Vector3 {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

/** 启动时读取远端设置，失败或三秒超时后使用本地默认值。 */
export async function loadSceneSettings(signal: AbortSignal): Promise<SceneSettings> {
  const settings: SceneSettings = {
    camera: { position: CONFIG.camera.position, target: CONFIG.camera.target },
    reveal: { enabled: CONFIG.reveal.enabled },
  };
  const controller = new AbortController();
  /** 热更新卸载时同步取消未完成的设置请求。 */
  const abort = (): void => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  const timeout = window.setTimeout(abort, 3000);
  try {
    const response = await fetch('/api/settings', { signal: controller.signal });
    if (!response.ok) return settings;
    const data: unknown = await response.json();
    if (!isObject(data)) return settings;
    if (isObject(data.camera)) {
      if (isVector3(data.camera.position)) settings.camera.position = data.camera.position;
      if (isVector3(data.camera.target)) settings.camera.target = data.camera.target;
    }
    if (isObject(data.reveal) && typeof data.reveal.enabled === 'boolean') settings.reveal.enabled = data.reveal.enabled;
  } catch {
    // 网络异常、无效 JSON 或请求取消均不阻止场景使用默认配置。
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
  return settings;
}
