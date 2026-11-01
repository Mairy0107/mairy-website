import * as THREE from 'three';
import { CONFIG } from './config';

export interface Weather {
  update: (time: number) => void;
}

/** 用 GPU 位移绘制细雨，以实例化圆环表现道路上的落雨涟漪。 */
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
  return {
    /** 仅更新雨丝时间和涟漪实例矩阵，不创建逐帧几何。 */
    update(time: number): void {
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
  };
}
