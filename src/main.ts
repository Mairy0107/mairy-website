import './style.css';
import { createScene } from './scene/createScene';
import { loadSceneSettings } from './scene/settings';

const controller = new AbortController();
let dispose: (() => void) | undefined;

/** 设置加载结束后启动场景，热更新已卸载时不再创建画布。 */
async function boot(): Promise<void> {
  const settings = await loadSceneSettings(controller.signal);
  if (!controller.signal.aborted) dispose = createScene(settings);
}

void boot();
if (import.meta.hot) {
  /** 热更新时同时清理请求和已经创建的 GPU 资源。 */
  import.meta.hot.dispose(() => {
    controller.abort();
    dispose?.();
  });
}
