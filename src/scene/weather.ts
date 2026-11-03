import * as THREE from 'three';
import { CONFIG } from './config';
import type { WeatherMode } from '../../shared/interaction';

export interface Weather {
  update: (time: number) => void;
  /** 在原有雨效中切换晴、雨、雷雨和风。 */
  setMode: (mode: WeatherMode) => void;
  /** 绽开分解图时暂停全部天气效果，还原后恢复。 */
  setVisible: (visible: boolean) => void;
}

/** 复用 GPU 细雨和实例化涟漪，补充无阴影闪电与 GPU 飘叶。 */
export function createWeather(scene: THREE.Object3D): Weather {
  const positions = new Float32Array(CONFIG.rainCount * 6);
  const seeds = new Float32Array(CONFIG.rainCount * 2);
  const heights = new Float32Array(CONFIG.rainCount * 2);
  for (let i = 0; i < CONFIG.rainCount; i++) {
    const x = Math.random() * 15.2 - 7.6;
    const y = Math.random() * 11;
    const z = Math.random() * 15.2 - 7.6;
    const seed = Math.random();
    positions.set([x, y, z, x + 0.025, y + 0.12 + seed * 0.13, z - 0.008], i * 6);
    seeds[i * 2] = seeds[i * 2 + 1] = seed;
    heights[i * 2] = heights[i * 2 + 1] = y;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSeed;
      attribute float aHeight;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float travel = uTime * (4.8 + aSeed * 2.0);
        // 两端共享循环高度，防止跨边界时拉出贯穿场景的长线。
        p.y = mod(aHeight - travel, 11.0) + position.y - aHeight;
        p.x -= (11.0 - p.y) * 0.027;
        // 屋顶覆盖范围内的低处雨丝隐藏，避免穿过店内货架。
        float roof = step(-5.65, p.x) * step(p.x, 2.4) * step(-4.8, p.z) * step(p.z, 0.95);
        vAlpha = (0.10 + aSeed * 0.17) * smoothstep(0.05, 0.4, p.y) * (1.0 - roof * (1.0 - step(4.05, p.y)));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() { gl_FragColor = vec4(0.64, 0.79, 0.9, vAlpha); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  // 告知入场模块使用 GPU 下落后的坐标，保证雨丝与高度遮罩同步。
  material.userData.revealPosition = 'p';
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  scene.add(rain);

  const rippleGeometry = new THREE.RingGeometry(0.93, 1, 28);
  rippleGeometry.rotateX(-Math.PI / 2);
  const rippleMaterial = new THREE.MeshBasicMaterial({ color: '#8eb7c6', transparent: true, opacity: 0.19, depthWrite: false });
  const ripples = new THREE.InstancedMesh(rippleGeometry, rippleMaterial, CONFIG.rippleCount);
  ripples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const drops = Array.from({ length: CONFIG.rippleCount }, (_, index) => ({
    x: index < 23 ? Math.random() * 14.7 - 7.35 : 3.85 + Math.random() * 3.4,
    z: index < 23 ? 3.2 + Math.random() * 4.1 : Math.random() * 10 - 6.9,
    phase: Math.random(),
  }));
  const transform = new THREE.Object3D();
  const rippleColor = new THREE.Color('#8eb7c6');
  const fadedColor = new THREE.Color();
  scene.add(ripples);

  // 飘叶只占一次绘制调用，顶点位移与翻转全部在 GPU 上完成。
  const leaf = new THREE.Shape();
  leaf.moveTo(-0.14, 0); leaf.lineTo(0, 0.065);
  leaf.lineTo(0.14, 0); leaf.lineTo(0, -0.065); leaf.closePath();
  const leafMaterial = new THREE.MeshBasicMaterial({ color: '#ccbc76', side: THREE.DoubleSide });
  const windTime = { value: 0 };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const windSpeed = { value: reducedMotion ? 0.45 : 3.2 };
  /** 共享时间 uniform，让入场材质副本与原材质保持同一风向和节奏。 */
  leafMaterial.onBeforeCompile = (shader): void => {
    shader.uniforms.uWindTime = windTime;
    shader.uniforms.uWindSpeed = windSpeed;
    shader.vertexShader = 'uniform float uWindTime;\nuniform float uWindSpeed;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        float seed = instanceMatrix[3].z * 2.7 + instanceMatrix[3].y;
        float phase = uWindTime * uWindSpeed + seed;
        float angle = phase * 1.8;
        transformed.xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * transformed.xy;
        transformed.z += transformed.y * sin(phase * 0.7);
        transformed.x += mod(instanceMatrix[3].x + uWindTime * uWindSpeed + 8.0, 16.0) - 8.0 - instanceMatrix[3].x;
        transformed.y += sin(phase) * 0.25;
      #endif
    `);
  };
  /** 固定风效程序缓存键，入场副本沿用同一顶点逻辑。 */
  leafMaterial.customProgramCacheKey = () => 'weather-wind-v1';
  const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(leaf), leafMaterial, 72);
  const leafTransform = new THREE.Object3D();
  for (let index = 0; index < leaves.count; index++) {
    // 只在店前道路上吹动，避免叶片穿入屋顶与货架。
    leafTransform.position.set(Math.random() * 16 - 8, 0.45 + Math.random() * 2, 3.4 + Math.random() * 3.8);
    leafTransform.updateMatrix();
    leaves.setMatrixAt(index, leafTransform.matrix);
  }
  leaves.frustumCulled = false;
  /** 飘叶仅作装饰，不拦截门扇与物件的射线点击。 */
  leaves.raycast = (): void => {};
  scene.add(leaves);

  // 闪电沿用场景光照，不新增阴影贴图、后处理或逐帧几何。
  const lightning = new THREE.DirectionalLight('#c6ddff', 0);
  lightning.position.set(-3, 10, 4);
  scene.add(lightning);
  let mode: WeatherMode = 'rain';
  let enabled = true;
  let lastTime: number | undefined;
  let stormTime = 0;
  let nextFlash = 6 + Math.random() * 5;
  let flashAge = 1;

  /** 切换或隐藏时同步子效果，立即清除残留闪光。 */
  function syncVisibility(): void {
    const wet = mode === 'rain' || mode === 'thunderstorm';
    rain.visible = ripples.visible = enabled && wet;
    leaves.visible = enabled && mode === 'windy';
    lightning.visible = enabled && mode === 'thunderstorm' && !reducedMotion;
    lightning.intensity = 0;
    stormTime = 0;
    nextFlash = 6 + Math.random() * 5;
    flashAge = 1;
  }
  syncVisibility();
  return {
    /** 仅更新 uniform、涟漪矩阵及低频闪光，不创建逐帧几何。 */
    update(time: number): void {
      const delta = lastTime === undefined ? 0 : THREE.MathUtils.clamp(time - lastTime, 0, 0.05);
      lastTime = time;
      if (!enabled || !scene.visible) return;
      if (leaves.visible) windTime.value = time;
      if (lightning.visible) {
        stormTime += delta;
        flashAge += delta;
        if (stormTime >= nextFlash) {
          flashAge = 0;
          nextFlash = stormTime + 6 + Math.random() * 5;
        }
        // 单次柔和衰减，每次间隔至少六秒，避免连续频闪。
        lightning.intensity = flashAge < 0.6 ? 2.8 * Math.exp(-flashAge * 10) : 0;
      }
      if (!rain.visible) return;
      material.uniforms.uTime.value = time;
      drops.forEach((drop, index) => {
        const age = (time * 0.57 + drop.phase) % 1;
        const size = 0.04 + age * 0.29;
        transform.position.set(drop.x, 0.039, drop.z);
        transform.scale.set(size, 1, size);
        transform.updateMatrix();
        ripples.setMatrixAt(index, transform.matrix);
        ripples.setColorAt(index, fadedColor.copy(rippleColor).multiplyScalar((1 - age) * 0.85));
      });
      ripples.instanceMatrix.needsUpdate = true;
      if (ripples.instanceColor) ripples.instanceColor.needsUpdate = true;
    },
    /** 选择天气时重置闪电计时，重复设置不打断已有动画。 */
    setMode(nextMode: WeatherMode): void {
      if (mode === nextMode) return;
      mode = nextMode;
      syncVisibility();
    },
    /** 绽开时暂停天气，还原后继续显示所选模式。 */
    setVisible(visible: boolean): void {
      if (enabled === visible) return;
      enabled = visible;
      syncVisibility();
    },
  };
}
