import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createBase } from '../objects/base';
import { createStore } from '../objects/store';
import { createProps } from '../objects/props';
import { createWetRoad } from '../materials/wetRoad';
import { createControls } from './controls';
import { createLighting } from './lighting';
import { createWeather } from './weather';
import { createReveal } from './reveal';
import { CONFIG } from './config';
import type { SceneSettings } from './settings';

/** 使用启动设置装配场景，管理渲染、窗口变化、暂停与资源生命周期。 */
export function createScene(settings: SceneSettings): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.colors.background);
  scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.014);
  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 120);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '可拖拽旋转、滚轮缩放的雨夜便利店三维微缩景观');
  document.body.append(renderer.domElement);
  const controls = createControls(camera, renderer.domElement);
  // 复用原控制器，仅应用经过校验的远端观察目标。
  controls.target.set(...settings.camera.target);
  camera.position.set(...settings.camera.position);
  controls.update();
  const base = createBase(scene);
  const store = createStore(scene);
  const props = createProps(scene);
  createLighting(scene);
  // 路面与天气独立入场，反射相机仍渲染同一场景。
  const roadRoot = new THREE.Group();
  const weatherRoot = new THREE.Group();
  scene.add(roadRoot, weatherRoot);
  const road = createWetRoad(roadRoot);
  const weather = createWeather(weatherRoot);
  const signage = store.getObjectByName('store-signage')!;
  const awning = store.getObjectByName('store-awning')!;
  const reveal = createReveal(scene, [
    { object: base, delay: 0, rise: 0, scale: 1, duration: 1 },
    { object: roadRoot, delay: 0.12, rise: 0, scale: 1, duration: 1 },
    { object: store, delay: 0.5, duration: 1.5, rise: 0.28, scale: 0.97 },
    { object: signage, delay: 1.65, duration: 0.95, rise: 0.16 },
    { object: awning, delay: 1.85, duration: 0.95, rise: 0.14 },
    ...props.children.map((object, index) => ({ object, delay: 2.15 + index * 0.17, rise: 0.24, scale: 0.9 })),
    { object: weatherRoot, delay: 2.1, duration: 2.7, rise: 0, scale: 1 },
  ], !settings.reveal.enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // 后处理目标也开启多重采样，保证几何边缘在辉光处理后仍然平滑。
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.26, 0.45, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /** 调整投影和渲染目标，窄屏维持模型的横向完整度。 */
  function resize(): void {
    const width = window.innerWidth;
    const height = Math.max(window.innerHeight, 1);
    camera.aspect = width / height;
    // 给接近正方形及竖屏的视口预留横向边距，防止底座左右角被裁切。
    const framing = Math.min(1, camera.aspect / CONFIG.camera.minFramingAspect);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(CONFIG.camera.fov) / 2) / framing));
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
    renderer.setSize(width, height);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
  }

  let time = 0;
  let lastFrame = 0;
  let active = !document.hidden;
  /** 更新可见页面内的动态效果，限制后台恢复后的时间跳跃。 */
  function render(now: number): void {
    if (!active) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
    lastFrame = now;
    time += delta;
    controls.update();
    road.update(time);
    weather.update(time);
    // 入场期间持续更新变换与遮罩阴影，结束时补绘最终静态阴影。
    if (reveal.update(time)) renderer.shadowMap.needsUpdate = true;
    composer.render();
    // 入场结束后沿用静态阴影；天气与涟漪不投影。
    renderer.shadowMap.autoUpdate = false;
  }

  /** 页面不可见时停止渲染，重新出现时平滑继续。 */
  function visibility(): void {
    active = !document.hidden;
    lastFrame = 0;
    renderer.setAnimationLoop(active ? render : null);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility);
  resize();
  renderer.setAnimationLoop(active ? render : null);

  /** 清理画布、事件、渲染目标以及去重后的几何、材质和纹理。 */
  return function dispose(): void {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibility);
    controls.dispose();
    // 先恢复原材质，再统一收集资源，避免遗漏入场途中被替换的材质。
    reveal.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    scene.traverse((object) => {
      if (object instanceof THREE.DirectionalLight || object instanceof THREE.PointLight || object instanceof THREE.SpotLight) object.shadow.dispose();
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    road.dispose();
    composer.passes.forEach((pass) => pass.dispose());
    composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
