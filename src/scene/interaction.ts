import * as THREE from 'three';
import { isObjectKey } from '../../shared/interaction';
import type { ObjectKey, StyleIndex } from '../../shared/interaction';
import type { SceneSettings } from './settings';

type ColorMaterial = THREE.MeshToonMaterial | THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;

export interface ObjectInteraction {
  objects: Map<ObjectKey, THREE.Group>;
  pickTargets: THREE.Mesh[];
  setStyle: (key: ObjectKey, style: StyleIndex) => void;
  setExploded: (exploded: boolean) => void;
  /** 设置雨水偏好，并与绽开状态共同决定雨效可见性。 */
  setRainEnabled: (enabled: boolean) => void;
  update: (delta: number) => boolean;
  dispose: () => void;
}

// 户外道具大半径环状分解：拉开可读间隙，减少互相遮挡。
const EXPLODE: Record<ObjectKey, { offset: readonly [number, number, number]; delay: number }> = {
  store: { offset: [0, 2.4, -3.5], delay: 0 },
  vending: { offset: [-13.5, 2.6, -3.0], delay: 0.05 },
  bike: { offset: [-12.0, 1.2, 7.5], delay: 0.1 },
  umbrella: { offset: [-7.5, 1.8, 11.0], delay: 0.14 },
  bins: { offset: [11.5, 1.4, 8.5], delay: 0.16 },
  lamp: { offset: [9.5, 6.0, 11.5], delay: 0.08 },
  notice: { offset: [-14.5, 3.0, -8.5], delay: 0.12 },
  poles: { offset: [13.5, 7.0, -12.0], delay: 0.04 },
  guardrail: { offset: [1.5, 1.2, 13.5], delay: 0.18 },
  ac: { offset: [8.0, 11.0, -5.0], delay: 0.02 },
};

// 店内/立面部件大幅外翻上抬，货架三列左右拉开并前移，露出室内。
const STORE_PARTS: Record<string, { offset: readonly [number, number, number]; delay: number }> = {
  'store-floor': { offset: [0, -2.4, 0.6], delay: 0.02 },
  'store-wall-back': { offset: [0, 2.0, -9.5], delay: 0.05 },
  'store-wall-left': { offset: [-9.5, 1.6, 0.4], delay: 0.08 },
  'store-wall-right': { offset: [9.5, 1.6, 0.4], delay: 0.1 },
  'store-roof': { offset: [0, 11.0, -1.5], delay: 0.03 },
  'store-shelf-left': { offset: [-4.8, 2.2, 7.5], delay: 0.14 },
  'store-shelf-center': { offset: [0, 2.8, 8.8], delay: 0.16 },
  'store-shelf-right': { offset: [4.8, 2.2, 7.5], delay: 0.18 },
  'store-counter': { offset: [6.5, 1.4, 8.0], delay: 0.2 },
  'store-glass': { offset: [0, 1.2, 12.0], delay: 0.12 },
  'store-signage': { offset: [0, 6.5, 9.0], delay: 0.06 },
  'store-awning': { offset: [0, 3.2, 12.5], delay: 0.09 },
  'store-mat': { offset: [0, 0.4, 9.5], delay: 0.22 },
};

// 非目录附加部件（盆栽等）同样参与分解图。
const EXTRA_PARTS: Record<string, { offset: readonly [number, number, number]; delay: number }> = {
  planters: { offset: [-10.5, 1.0, 2.5], delay: 0.15 },
};

// 第一款保留原色，其余配色与库内中文样式名称相对应。
const STYLES: Record<ObjectKey, readonly [{ color: string; glow: string }, { color: string; glow: string }]> = {
  store: [{ color: '#326c70', glow: '#80eee1' }, { color: '#dba0b8', glow: '#ff9dcc' }],
  vending: [{ color: '#75bfc7', glow: '#94eeec' }, { color: '#e6b65e', glow: '#ffda90' }],
  bike: [{ color: '#86c2a4', glow: '#b3f4cf' }, { color: '#466780', glow: '#9ecfff' }],
  umbrella: [{ color: '#8c93cb', glow: '#b3baff' }, { color: '#c96c66', glow: '#ffada3' }],
  bins: [{ color: '#b68c6c', glow: '#e1b994' }, { color: '#466b88', glow: '#9cd5ff' }],
  lamp: [{ color: '#b7cbdc', glow: '#d2edff' }, { color: '#977db6', glow: '#d4a2ff' }],
  notice: [{ color: '#b88aa4', glow: '#f2c7e0' }, { color: '#cbb078', glow: '#ffe1a4' }],
  poles: [{ color: '#a18467', glow: '#e5bc91' }, { color: '#3e6d61', glow: '#8aceb5' }],
  guardrail: [{ color: '#628d98', glow: '#a9dae4' }, { color: '#b77651', glow: '#efaf82' }],
  ac: [{ color: '#dfd2b6', glow: '#fff0cc' }, { color: '#3e7373', glow: '#91d6d6' }],
};

/** 隔离物件材质及绽开父组，并统一协调天气、路面湿度与绽开状态。 */
export function createObjectInteraction(scene: THREE.Scene, settings: SceneSettings, weather?: { setVisible: (visible: boolean) => void }, road?: { setWetness: (wet: boolean) => void }): ObjectInteraction {
  const objects = new Map<ObjectKey, THREE.Group>();
  scene.traverse((object) => {
    // 仅登记物件根组（name 与 key 一致），忽略便利店内部带 storePart 的子组。
    if (object instanceof THREE.Group && isObjectKey(object.name) && object.userData.objectKey === object.name) {
      objects.set(object.name, object);
    }
  });
  const restore: Array<() => void> = [];
  const owned = new Set<THREE.Material>();
  scene.updateMatrixWorld(true);
  const tracks = settings.objects.map((definition) => {
    const root = objects.get(definition.objectKey)!;
    root.userData.displayName = definition.displayName;
    // 使用预设分解坐标，保证环状布局清晰、间距可读。
    const preset = EXPLODE[definition.objectKey];
    const offset = new THREE.Vector3(...preset.offset);
    const motion = new THREE.Group();
    motion.name = 'interaction-motion-' + definition.objectKey;
    root.parent!.add(motion);
    motion.add(root);
    const materials: Array<{ material: ColorMaterial; color: THREE.Color; emissive?: THREE.Color }> = [];
    const lights: Array<{ light: THREE.Light; color: THREE.Color }> = [];
    const cache = new Map<THREE.Material, THREE.Material>();
    /** 为物件内可换色材质创建副本，纹理文字、玻璃和商品保留原貌。 */
    function isolate(source: THREE.Material): THREE.Material {
      if (!(source instanceof THREE.MeshToonMaterial || source instanceof THREE.MeshStandardMaterial || source instanceof THREE.MeshBasicMaterial)
        || source.map || source.transparent) return source;
      const existing = cache.get(source);
      if (existing) return existing;
      const material = source.clone();
      cache.set(source, material);
      owned.add(material);
      materials.push({
        material,
        color: material.color.clone(),
        emissive: 'emissive' in material ? material.emissive.clone() : undefined,
      });
      return material;
    }
    root.traverse((object) => {
      if (object instanceof THREE.Light) lights.push({ light: object, color: object.color.clone() });
      if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
      const source = object.material;
      object.material = Array.isArray(source) ? source.map(isolate) : isolate(source);
      restore.push(() => { object.material = source; });
    });
    return { key: definition.objectKey, motion, offset, delay: preset.delay, materials, lights };
  });

  // 店铺部件相对店体分解；附加部件（盆栽）相对场景分解。
  type MotionTrack = { key: string; motion: THREE.Group; offset: THREE.Vector3; delay: number; materials: Array<{ material: ColorMaterial; color: THREE.Color; emissive?: THREE.Color }>; lights: Array<{ light: THREE.Light; color: THREE.Color }> };
  const partTracks: MotionTrack[] = [];
  function wrapPart(part: THREE.Object3D, partId: string, preset: { offset: readonly [number, number, number]; delay: number }): void {
    if (!(part instanceof THREE.Group) || !part.parent) return;
    const motion = new THREE.Group();
    motion.name = 'interaction-motion-' + partId;
    part.parent.add(motion);
    motion.add(part);
    partTracks.push({
      key: partId,
      motion,
      offset: new THREE.Vector3(...preset.offset),
      delay: preset.delay,
      materials: [],
      lights: [],
    });
  }
  const storeRoot = objects.get('store');
  if (storeRoot) {
    storeRoot.updateMatrixWorld(true);
    for (const [partId, preset] of Object.entries(STORE_PARTS)) {
      wrapPart(storeRoot.getObjectByName(partId)!, partId, preset);
    }
  }
  for (const [partId, preset] of Object.entries(EXTRA_PARTS)) {
    const part = scene.getObjectByName(partId);
    if (part) wrapPart(part, partId, preset);
  }
  const allTracks = [...tracks, ...partTracks];

  let progress = settings.interaction.exploded ? 1 : 0;
  let target = progress;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** 从原始色值计算样式，多次切换仍可精确恢复第一款。 */
  function setStyle(key: ObjectKey, style: StyleIndex): void {
    const track = tracks.find((entry) => entry.key === key)!;
    const palette = STYLES[key][style === 2 ? 1 : 0];
    const color = new THREE.Color(palette.color);
    for (const entry of track.materials) {
      entry.material.color.copy(entry.color);
      if (style !== 0) {
        const brightness = Math.max(entry.color.r, entry.color.g, entry.color.b);
        entry.material.color.copy(color).multiplyScalar(0.35 + brightness * 0.65);
      }
      if (entry.emissive && 'emissive' in entry.material) {
        entry.material.emissive.copy(entry.emissive);
        if (style !== 0 && entry.emissive.getHex() !== 0) entry.material.emissive.set(palette.glow);
      }
    }
    for (const entry of track.lights) entry.light.color.copy(style === 0 ? entry.color : new THREE.Color(palette.glow));
    settings.interaction.styles[key] = style;
  }

  /** 根据雨水偏好与绽开状态同步雨丝、涟漪及路面湿度。 */
  function syncWeather(): void {
    const wet = settings.interaction.rainEnabled && !settings.interaction.exploded;
    weather?.setVisible(wet);
    road?.setWetness(wet);
  }

  /** 更新雨水偏好，绽开期间仍隐藏雨效。 */
  function setRainEnabled(enabled: boolean): void {
    settings.interaction.rainEnabled = enabled;
    syncWeather();
  }

  /** 切换绽开目标；还原后按用户雨水偏好恢复雨效。 */
  function setExploded(exploded: boolean): void {
    settings.interaction.exploded = exploded;
    target = exploded ? 1 : 0;
    syncWeather();
  }
  // 启动时同步已保存的雨水偏好与绽开状态。
  syncWeather();

  /** 分阶段推进分解图：先整体拉开，再按 delay 错峰到位，形成技术爆炸图间隙。 */
  function update(delta: number): boolean {
    const previous = progress;
    progress = reducedMotion ? target : THREE.MathUtils.damp(progress, target, 3.6, delta);
    if (Math.abs(progress - target) < 0.0005) progress = target;
    let moved = previous !== progress;
    for (const track of allTracks) {
      const local = reducedMotion
        ? progress
        : THREE.MathUtils.clamp((progress - track.delay) / Math.max(0.001, 1 - track.delay), 0, 1);
      const eased = THREE.MathUtils.smoothstep(local, 0, 1);
      const next = track.offset.clone().multiplyScalar(eased);
      if (!track.motion.position.equals(next)) {
        track.motion.position.copy(next);
        moved = true;
      }
    }
    return moved;
  }

  for (const object of settings.objects) setStyle(object.objectKey, settings.interaction.styles[object.objectKey] ?? object.defaultStyle);
  update(0);
  // 缓存实体网格供射线使用，让底座和小巷墙也能遮挡背后的物件。
  const pickTargets: THREE.Mesh[] = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    // InstancedMesh 商品也参与拾取，便于悬停显示货架名称。
    if (object instanceof THREE.InstancedMesh) { pickTargets.push(object); return; }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    // 门扇玻璃本体也可点击，固定橱窗不扩展为进门区域。
    if (object.parent?.userData.storeDoor || materials.some((material) => !material.transparent)) pickTargets.push(object);
  });
  return {
    objects, pickTargets, setStyle, setExploded, setRainEnabled, update,
    /** 恢复原材质后释放交互副本，原资源仍由场景统一清理。 */
    dispose(): void {
      restore.forEach((reset) => reset());
      owned.forEach((material) => material.dispose());
    },
  };
}
