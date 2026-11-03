import * as THREE from 'three';
import type { ObjectKey, StyleIndex } from '../../shared/interaction';
import { isObjectKey } from '../../shared/interaction';
import { saveInteraction } from './settings';
import type { SceneSettings } from './settings';
import type { ObjectInteraction } from './interaction';
import type { StoreDoor } from './storeDoor';

export interface InteractionPanel {
  update: () => void;
  dispose: () => void;
}

/** 创建优先展示绽开与雨水开关的场景面板及名称提示，空白区域透传画布事件。 */
export function createInteractionPanel(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  model: ObjectInteraction,
  settings: SceneSettings,
  beforeChange: () => void,
  door: StoreDoor,
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
    <!-- 统一面板品牌名称。 -->
    <h1>Mairy</h1>
    <!-- 优先展示场景开关，避免操作说明挤占首屏入口。 -->
    <button type="button" class="explode-toggle" aria-pressed="false">绽开模型</button>
    <button type="button" class="rain-toggle" aria-pressed="true">雨水：开</button>
    <p class="interaction-hint">拖拽旋转 · 滚轮缩放<br>绽开后悬停查看名称，点选物件切换样式</p>
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
  const rain = panel.querySelector<HTMLButtonElement>('.rain-toggle')!;
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

  /** 同步雨水偏好文案与可访问状态，绽开不改变用户偏好。 */
  function syncRain(): void {
    rain.textContent = settings.interaction.rainEnabled ? '雨水：开' : '雨水：关';
    rain.setAttribute('aria-pressed', String(settings.interaction.rainEnabled));
  }

  /** 切换实际雨效，并复用整体设置的待保存提示。 */
  function toggleRain(): void {
    beforeChange();
    model.setRainEnabled(!settings.interaction.rainEnabled);
    syncRain();
    changed();
  }

  /** 保存含雨水偏好的整体快照，超时或错误保留本地调整以便重试。 */
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
  // 记录同一次单指点按，避免拖拽、多指缩放或取消后误进门。
  let clickPointer: number | undefined;
  let pressedDoor = false;
  let clientX = 0;
  let clientY = 0;

  /** 确认命中网格及其祖先均可见，过滤入场尚未出现的物件。 */
  function visible(object: THREE.Object3D): boolean {
    for (let current: THREE.Object3D | null = object; current; current = current.parent) if (!current.visible) return false;
    return true;
  }

  /** 沿首个可见命中网格向上识别门扇、店内部件及完整物件，保留遮挡关系。 */
  function pick(): THREE.Group | undefined {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(candidates, false).find((entry) => entry.object instanceof THREE.Mesh && visible(entry.object));
    let objectHit: THREE.Group | undefined;
    for (let object = hit?.object; object; object = object.parent ?? undefined) {
      if (object instanceof THREE.Group && object.userData.storeDoor) return object;
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

  /** 门扇始终提示点击进门，其余物件继续仅在绽开模式显示名称。 */
  function update(): void {
    if (!pointerInside || dragging || !overCanvas(clientX, clientY)) {
      tooltip.hidden = true;
      return;
    }
    const object = pick();
    tooltip.hidden = !object || (!settings.interaction.exploded && !object.userData.storeDoor);
    if (!object || tooltip.hidden) return;
    tooltip.textContent = object.userData.storeDoor ? '点击进门' : object.userData.displayName;
    tooltip.style.left = Math.max(8, Math.min(clientX + 14, window.innerWidth - tooltip.offsetWidth - 8)) + 'px';
    tooltip.style.top = Math.max(8, Math.min(clientY + 14, window.innerHeight - tooltip.offsetHeight - 8)) + 'px';
  }

  /** 记录指针位置，移动超过点击阈值后取消点按，拖拽与触屏期间隐藏提示。 */
  function move(event: PointerEvent): void {
    clientX = event.clientX;
    clientY = event.clientY;
    pointerInside = event.pointerType !== 'touch';
    dragging = event.buttons !== 0;
    if (clickPointer === event.pointerId && down.distanceTo(new THREE.Vector2(clientX, clientY)) > 4) clickPointer = undefined;
  }

  /** 保存主指针按下位置与门扇命中状态，第二个触点使本次点按失效。 */
  function pointerDown(event: PointerEvent): void {
    down.set(event.clientX, event.clientY);
    clientX = event.clientX;
    clientY = event.clientY;
    clickPointer = event.isPrimary && event.button === 0 ? event.pointerId : undefined;
    pressedDoor = !!pick()?.userData.storeDoor;
    dragging = true;
    tooltip.hidden = true;
  }

  /** 门扇单击或轻触后先结束入场再开门，其余模型保留原有样式选择。 */
  function pointerUp(event: PointerEvent): void {
    const clicked = clickPointer === event.pointerId;
    clickPointer = undefined;
    dragging = false;
    clientX = event.clientX;
    clientY = event.clientY;
    pointerInside = event.pointerType !== 'touch' && overCanvas(clientX, clientY);
    if (!clicked || !overCanvas(clientX, clientY) || event.button !== 0 || down.distanceTo(new THREE.Vector2(clientX, clientY)) > 4) return;
    const object = pick();
    if (!object) return;
    if (object.userData.storeDoor) {
      if (!pressedDoor) return;
      beforeChange();
      door.open();
      tooltip.hidden = true;
      return;
    }
    if (typeof object.userData.explodePart === 'string') return; // 附加部件仅展示名称，不切换样式目录
    const key = typeof object.userData.storePart === 'string' ? 'store' : object.userData.objectKey;
    if (isObjectKey(key)) select(key);
  }

  /** 离开画布、取消触点或窗口失焦时取消点按并移除提示，不干扰相机控制。 */
  function leave(): void {
    clickPointer = undefined;
    pointerInside = false;
    tooltip.hidden = true;
  }

  explode.addEventListener('click', toggleExploded, events);
  rain.addEventListener('click', toggleRain, events);
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
  syncRain();
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
