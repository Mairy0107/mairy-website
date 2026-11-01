import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { CONFIG } from '../scene/config';
import { canvasTexture } from './palette';

/** 创建真实平面倒影，并用噪声分布控制积水与细微雨纹。 */
export function createWetRoad(scene: THREE.Object3D): { update: (time: number) => void; dispose: () => void } {
  const shader = {
    uniforms: {
      color: { value: new THREE.Color('#344254') },
      tDiffuse: { value: null },
      textureMatrix: { value: new THREE.Matrix4() },
      uTime: { value: 0 },
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
        uv.xy += vec2(sin(vWorld.y * 53. + uTime * 2.), cos(vWorld.x * 47. - uTime)) * 0.00045 * uv.w;
        vec3 reflection = texture2DProj(tDiffuse, uv).rgb;
        float grain = noise(vWorld * 150.) * 0.012;
        gl_FragColor = vec4(mix(color * (0.27 + grain), reflection, 0.12 + pools * 0.40), 1.0);
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
  for (const [x, z, width, length, color] of [
    [-1.7, 4.05, 5, 2.3, '#6ce0c4'], [-6.58, 3.68, 1.2, 1.5, '#e581b9'], [2.17, 4.5, 1.1, 2.4, '#f7cb8f'],
  ] as const) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), new THREE.MeshBasicMaterial({ map: washTexture, color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.017, z); scene.add(mesh);
  }
  return {
    // 每帧只更新 uniform；积水几何保持不变。
    update(time: number): void { material.uniforms.uTime.value = time; },
    // 反射目标不在普通材质贴图属性中，需要显式释放。
    dispose(): void { reflector.dispose(); },
  };
}
