import * as THREE from 'three';
import type { ObjectKey, StyleIndex } from '../../shared/interaction';
import { isObjectKey } from '../../shared/interaction';
import { saveInteraction } from './settings';
import type { SceneSettings } from './settings';
import type { ObjectInteraction } from './interaction';

export interface InteractionPanel {
  update: () => void;
  dispose: () => void;
}

/** 创建中文面板及射线名称提示，空白覆盖层不拦截画布事件。 */
export function createInteractionPanel(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  model: ObjectInteraction,
  settings: SceneSettings,
  beforeChange: () => void,
): InteractionPanel {
  const controller = new AbortController();
  const events = { signal: controller.signal };
  const overlay = document.createElement('div');
  overlay.className = 'interaction-overlay';
  const panel = document.createElement('aside');
  panel.className = 'interaction-panel';
  panel.setAttribute('aria-label', '场景交互设置');
  panel.tabIndex = 0;
  panel.innerHTML = `
    <h1>雨夜 · 街角便利店</h1>
    <p class="interaction-hint">拖拽旋转 · 滚轮缩放<br>绽开后悬停查看名称，点选物件切换样式</p>
    <button type="button" class="explode-toggle" aria-pressed="false">绽开模型</button>
    <h2>选择物件</h2>
    <div class="object-list" role="group" aria-label="可交互物件"></div>
    <h2 class="style-heading" id="interaction-style-heading">物件样式</h2>
    <div class="style-list" role="group" aria-labelledby="interaction-style-heading"></div>
    <button type="button" class="save-interaction">保存到服务器</button>
    <p class="interaction-status" role="status" aria-live="polite"></p>
  `;
  overlay.append(panel);
  const tooltip = document.createElement('div');
  tooltip.className = 'object-tooltip';
  tooltip.hidden = true;
  tooltip.setAttribute('role', 'tooltip');
  overlay.append(tooltip);
  document.body.append(overlay);
  const list = panel.querySelector<HTMLDivElement>('.object-list')!;
  const styles = panel.querySelector<HTMLDivElement>('.style-list')!;
  const heading = panel.querySelector<HTMLHeadingElement>('.style-heading')!;
  const explode = panel.querySelector<HTMLButtonElement>('.explode-toggle')!;
  const save = panel.querySelector<HTMLButtonElement>('.save-interaction')!;
  const status = panel.querySelector<HTMLParagraphElement>('.interaction-status')!;
  const objectButtons = new Map<ObjectKey, HTMLButtonElement>();
  const styleButtons: HTMLButtonElement[] = [];
  let selected: ObjectKey = settings.objects[0].objectKey;
  let revision = 0;
  let saving: AbortController | undefined;
  let saveTimeout: number | undefined;
  status.textContent = settings.interactionNotice || '已加载服务器设置，可切换样式并保存。';
  for (const object of settings.objects) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = object.displayName;
    button.addEventListener('click', () => select(object.objectKey), events);
    objectButtons.set(object.objectKey, button);
    list.append(button);
  }
  for (const index of [0, 1, 2] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => changeStyle(index), events);
    styleButtons.push(button);
    styles.append(button);
  }

  /** 同步选中物件、中文样式名以及可访问的按钮选中状态。 */
  function select(key: ObjectKey): void {
    selected = key;
    const definition = settings.objects.find((object) => object.objectKey === key)!;
    heading.textContent = definition.displayName + ' · 物件样式';
    objectButtons.forEach((button, objectKey) => button.setAttribute('aria-pressed', String(objectKey === key)));
    styleButtons.forEach((button, index) => {
      button.textContent = definition.styleLabels[index];
      button.setAttribute('aria-pressed', String(settings.interaction.styles[key] === index));
    });
  }

  /** 标记待保存修改，保存进行中仍允许继续调整本地预览。 */
  function changed(): void {
    revision++;
    status.textContent = saving ? '正在保存先前设置；当前新修改尚未保存。' : '本地预览已更新，点击“保存到服务器”保留设置。';
  }

  /** 结束临时入场材质后切换样式，避免动画结束时颜色被还原。 */
  function changeStyle(style: StyleIndex): void {
    if (settings.interaction.styles[selected] === style) return;
    beforeChange();
    model.setStyle(selected, style);
    select(selected);
    changed();
  }

  /** 更新绽开按钮的中文文案及布尔状态。 */
  function syncExploded(): void {
    explode.textContent = settings.interaction.exploded ? '还原' : '绽开模型';
    explode.setAttribute('aria-pressed', String(settings.interaction.exploded));
  }

  /** 切换模型分离状态，实际位移由主渲染循环平滑推进。 */
  function toggleExploded(): void {
    beforeChange();
    model.setExploded(!settings.interaction.exploded);
    syncExploded();
    if (!settings.interaction.exploded) tooltip.hidden = true;
    changed();
  }

  /** 保存点击时的整体快照，超时或错误保留本地调整以便重试。 */
  async function persist(): Promise<void> {
    if (saving) return;
    saving = new AbortController();
    const request = saving;
    saveTimeout = window.setTimeout(() => request.abort(), 5000);
    const savedRevision = revision;
    const snapshot = { ...settings.interaction, styles: { ...settings.interaction.styles } };
    save.disabled = true;
    save.textContent = '正在保存…';
    status.textContent = '正在保存到服务器…';
    try {
      await saveInteraction(snapshot, request.signal);
      if (!controller.signal.aborted) status.textContent = savedRevision === revision
        ? '已保存到服务器，刷新页面后仍会生效。' : '先前设置已保存，当前新修改尚未保存。';
    } catch {
      if (!controller.signal.aborted) status.textContent = '保存失败或超时，本地调整已保留，请确认 API 可用后重试。';
    } finally {
      window.clearTimeout(saveTimeout);
      saving = undefined;
      save.disabled = false;
      save.textContent = '保存到服务器';
    }
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const down = new THREE.Vector2();
  const candidates = model.pickTargets;
  let pointerInside = false;
  let dragging = false;
  let clientX = 0;
  let clientY = 0;

  /** 确认命中网格及其祖先均可见，过滤入场尚未出现的物件。 */
  function visible(object: THREE.Object3D): boolean {
    for (let current: THREE.Object3D | null = object; current; current = current.parent) if (!current.visible) return false;
    return true;
  }

  /** 对子网格射线检测：优先命中店内部件，再回退到完整物件 Group。 */
  function pick(): THREE.Group | undefined {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(candidates, false).find((entry) => entry.object instanceof THREE.Mesh && visible(entry.object));
    let objectHit: THREE.Group | undefined;
    for (let object = hit?.object; object; object = object.parent ?? undefined) {
      if (object instanceof THREE.Group && (typeof object.userData.storePart === 'string' || typeof object.userData.explodePart === 'string')) return object;
      if (object instanceof THREE.Group && isObjectKey(object.userData.objectKey)) objectHit ??= object;
    }
    return objectHit;
  }

  /** 判断指针是否落在画布可操作区域，排除右侧面板占据的位置。 */
  function overCanvas(x: number, y: number): boolean {
    const rect = canvas.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      && !(x >= panelRect.left && x <= panelRect.right && y >= panelRect.top && y <= panelRect.bottom);
  }

  /** 仅在绽开模式下显示悬停名称；未绽开时绝不出现文字提示。 */
  function update(): void {
    if (!settings.interaction.exploded || !pointerInside || dragging || !overCanvas(clientX, clientY)) {
      tooltip.hidden = true;
      return;
    }
    const object = pick();
    tooltip.hidden = !object;
    if (!object) return;
    tooltip.textContent = object.userData.displayName;
    tooltip.style.left = Math.max(8, Math.min(clientX + 14, window.innerWidth - tooltip.offsetWidth - 8)) + 'px';
    tooltip.style.top = Math.max(8, Math.min(clientY + 14, window.innerHeight - tooltip.offsetHeight - 8)) + 'px';
  }

  /** 记录鼠标位置，拖拽与触屏期间隐藏悬停名称。 */
  function move(event: PointerEvent): void {
    clientX = event.clientX;
    clientY = event.clientY;
    pointerInside = event.pointerType !== 'touch';
    dragging = event.buttons !== 0;
  }

  /** 保存按下位置，供抬起时区分点选与相机拖拽。 */
  function pointerDown(event: PointerEvent): void {
    down.set(event.clientX, event.clientY);
    dragging = true;
    tooltip.hidden = true;
  }

  /** 短距离左键点选模型，在右侧展示其三款样式。 */
  function pointerUp(event: PointerEvent): void {
    dragging = false;
    clientX = event.clientX;
    clientY = event.clientY;
    pointerInside = event.pointerType !== 'touch' && overCanvas(clientX, clientY);
    if (!overCanvas(clientX, clientY) || event.button !== 0 || down.distanceTo(new THREE.Vector2(clientX, clientY)) > 4) return;
    const object = pick();
    if (!object) return;
    if (typeof object.userData.explodePart === 'string') return; // 附加部件仅展示名称，不切换样式目录
    const key = typeof object.userData.storePart === 'string' ? 'store' : object.userData.objectKey;
    if (isObjectKey(key)) select(key);
  }

  /** 离开画布或取消触点时移除提示，不干扰 OrbitControls。 */
  function leave(): void {
    pointerInside = false;
    tooltip.hidden = true;
  }

  explode.addEventListener('click', toggleExploded, events);
  save.addEventListener('click', () => { void persist(); }, events);
  canvas.addEventListener('pointermove', move, events);
  canvas.addEventListener('pointerdown', pointerDown, events);
  canvas.addEventListener('pointerup', pointerUp, events);
  canvas.addEventListener('pointerleave', leave, events);
  canvas.addEventListener('pointercancel', leave, events);
  window.addEventListener('blur', leave, events);
  panel.addEventListener('pointerenter', leave, events);
  select(selected);
  syncExploded();
  return {
    update,
    /** 卸载所有面板事件、未完成保存请求与提示节点。 */
    dispose(): void {
      controller.abort();
      saving?.abort();
      window.clearTimeout(saveTimeout);
      overlay.remove();
    },
  };
}
