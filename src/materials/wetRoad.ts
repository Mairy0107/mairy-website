import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { CONFIG } from '../scene/config';
import { canvasTexture } from './palette';

/** 创建平面倒影，并按雨水状态平滑调整积水、雨纹与地面色晕。 */
export function createWetRoad(scene: THREE.Object3D): { setWetness: (wet: boolean) => void; update: (time: number) => void; dispose: () => void } {
  const shader = {
    uniforms: {
      color: { value: new THREE.Color('#344254') },
      tDiffuse: { value: null },
      textureMatrix: { value: new THREE.Matrix4() },
      uTime: { value: 0 },
      uWetness: { value: 1 },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vReflection;
      varying vec2 vWorld;
      void main() {
        vReflection = textureMatrix * vec4(position, 1.0);
        vWorld = (modelMatrix * vec4(position, 1.0)).xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec3 color;
      uniform float uTime;
      uniform float uWetness;
      varying vec4 vReflection;
      varying vec2 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                   mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
      }
      void main() {
        float pools = smoothstep(0.35, 0.7, noise(vWorld * 0.9));
        vec4 uv = vReflection;
        uv.xy += vec2(sin(vWorld.y * 53. + uTime * 2.), cos(vWorld.x * 47. - uTime)) * 0.00045 * uWetness * uv.w;
        vec3 reflection = texture2DProj(tDiffuse, uv).rgb;
        float grain = noise(vWorld * 150.) * 0.012;
        // 干路面保留微弱倒影，积水明暗差随湿度收敛。
        float reflectionMix = mix(0.025 + pools * 0.025, 0.12 + pools * 0.40, uWetness);
        gl_FragColor = vec4(mix(color * (0.27 + grain), reflection, reflectionMix), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
  // 共用一个反射相机，同时覆盖 L 形路面，避免双反射递归和重复渲染。
  const shape = new THREE.Shape();
  shape.moveTo(-7.88, -7.88); shape.lineTo(7.88, -7.88);
  shape.lineTo(7.88, 7.88); shape.lineTo(3.4, 7.88);
  shape.lineTo(3.4, -2.8); shape.lineTo(-7.88, -2.8); shape.closePath();
  const reflector = new Reflector(new THREE.ShapeGeometry(shape), {
    color: '#344254',
    textureWidth: CONFIG.reflectionSize,
    textureHeight: CONFIG.reflectionSize,
    clipBias: 0.003,
    shader,
    multisample: 0,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = 0.009;
  scene.add(reflector);
  const material = reflector.material as THREE.ShaderMaterial;

  const washTexture = canvasTexture(64, 256, (ctx) => {
    // 归一化到椭圆，保证色晕四周都自然衰减到透明。
    ctx.scale(32, 128);
    const gradient = ctx.createRadialGradient(1, 1, 0, 1, 1, 1);
    gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2, 2);
  });
  const washes: Array<{ mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; material: THREE.MeshBasicMaterial }> = [];
  for (const [x, z, width, length, color] of [
    [-1.7, 4.05, 5, 2.3, '#6ce0c4'], [-6.58, 3.68, 1.2, 1.5, '#e581b9'], [2.17, 4.5, 1.1, 2.4, '#f7cb8f'],
  ] as const) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshBasicMaterial({ map: washTexture, color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.017, z); scene.add(mesh);
    washes.push({ mesh, material: mesh.material });
  }
  let targetWetness = 1;
  let lastTime: number | undefined;
  return {
    /** 设置目标湿度；首帧直接应用保存状态，后续切换平滑过渡。 */
    setWetness(wet: boolean): void { targetWetness = wet ? 1 : 0; },
    /** 用可见时间推进湿度，统一调整倒影、积水、雨纹和地面色晕。 */
    update(time: number): void {
      const delta = lastTime === undefined ? 0 : Math.max(0, Math.min(time - lastTime, 0.05));
      let wetness = lastTime === undefined ? targetWetness : THREE.MathUtils.damp(material.uniforms.uWetness.value, targetWetness, 5, delta);
      if (Math.abs(wetness - targetWetness) < 0.001) wetness = targetWetness;
      material.uniforms.uTime.value = time;
      material.uniforms.uWetness.value = wetness;
      lastTime = time;
      // 入场动画会克隆材质，同时更新当前材质与原材质以避免恢复时跳变。
      for (const { mesh, material } of washes) mesh.material.opacity = material.opacity = THREE.MathUtils.lerp(0.025, 0.22, wetness);
    },
    /** 显式释放反射目标，其余材质与几何由场景统一回收。 */
    dispose(): void { reflector.dispose(); },
  };
}
