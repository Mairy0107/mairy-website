import * as THREE from 'three';

export interface RevealTarget {
  object: THREE.Object3D;
  delay: number;
  duration?: number;
  rise?: number;
  scale?: number;
}

export interface Reveal {
  update: (time: number) => boolean;
  dispose: () => void;
}

const DURATION = 5;
const FEATHER = 1.15;

/** 以三次缓出让物体柔和落定，避免过冲破坏微缩场景的轮廓。 */
function easeOut(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

/** 用世界高度渐变和分组错峰显现场景；结束后恢复原材质与静态开销。 */
export function createReveal(scene: THREE.Scene, targets: RevealTarget[], reducedMotion = false): Reveal {
  if (reducedMotion) {
    return {
      /** 减少动态效果时直接展示完整场景。 */
      update: () => false,
      /** 无临时资源需要释放。 */
      dispose: () => {},
    };
  }

  // 在变换前测量完整范围，覆盖底座、最高电线与空中的雨丝。
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);
  const bottom = bounds.isEmpty() ? -1 : bounds.min.y;
  const top = bounds.isEmpty() ? 12 : bounds.max.y;
  const height = { value: bottom };
  const feather = { value: FEATHER };
  const roots = new Set(targets.map((target) => target.object));
  const temporaryMaterials = new Set<THREE.Material>();
  const restore: Array<() => void> = [];
  let finished = false;

  const tracks = targets.map((target) => {
    const root = target.object;
    const position = root.position.clone();
    const scale = root.scale.clone();
    const visible = root.visible;
    const appear = { value: 0 };
    const lights: Array<{ light: THREE.Light; intensity: number; position: THREE.Vector3 }> = [];
    const cache = new Map<THREE.Material, THREE.Material>();

    /** 给颜色及阴影着色器加入相同遮罩，未显现部分不写深度也不投影。 */
    function patch(material: THREE.Material, source = material): THREE.Material {
      const previousCompile = source.onBeforeCompile;
      const previousKey = source.customProgramCacheKey();
      const localPosition = source.userData.revealPosition ?? 'position';
      material.onBeforeCompile = (shader, renderer) => {
        previousCompile.call(material, shader, renderer);
        shader.uniforms.uRevealHeight = height;
        shader.uniforms.uRevealFeather = feather;
        shader.uniforms.uRevealAppear = appear;
        // 标准材质保留实例矩阵；自定义雨丝使用其位移后的局部坐标。
        const standard = shader.vertexShader.includes('#include <project_vertex>');
        const worldPosition = standard ? `
          vec4 revealPosition = vec4(transformed, 1.0);
          #ifdef USE_BATCHING
            revealPosition = batchingMatrix * revealPosition;
          #endif
          #ifdef USE_INSTANCING
            revealPosition = instanceMatrix * revealPosition;
          #endif
        ` : `vec4 revealPosition = vec4(${localPosition}, 1.0);`;
        shader.vertexShader = 'varying float vRevealHeight;\n' + shader.vertexShader.replace(/\}\s*$/, `
          ${worldPosition}
          vRevealHeight = (modelMatrix * revealPosition).y;
        }
        `);
        shader.fragmentShader = `
          uniform float uRevealHeight;
          uniform float uRevealFeather;
          uniform float uRevealAppear;
          varying float vRevealHeight;
        ` + shader.fragmentShader.replace(/void main\s*\(\s*\)\s*\{/, `
          void main() {
            float revealCoverage = uRevealAppear * smoothstep(0.0, uRevealFeather, uRevealHeight - vRevealHeight);
            // 稳定的像素覆盖率保留不透明深度关系，避免透明排序和轮廓提前穿出。
            float revealNoise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
            if (revealCoverage <= revealNoise) discard;
        `);
      };
      material.customProgramCacheKey = () => previousKey + '|height-reveal-v1:' + localPosition;
      temporaryMaterials.add(material);
      return material;
    }

    /** 每组内复用材质副本，避免修改其他组共用的卡通色阶与轮廓材质。 */
    function cloneMaterial(source: THREE.Material): THREE.Material {
      const cached = cache.get(source);
      if (cached) return cached;
      const material = source.clone();
      // 反射相机和天气仍更新原 uniform，副本必须共享这些单元。
      if (source instanceof THREE.ShaderMaterial && material instanceof THREE.ShaderMaterial) material.uniforms = { ...source.uniforms };
      cache.set(source, patch(material, source));
      return material;
    }

    /** 收集组内网格、轮廓与光源，嵌套的独立入场组交给自己的轨道处理。 */
    function visit(object: THREE.Object3D): void {
      if (object !== root && roots.has(object)) return;
      if (object instanceof THREE.Light) lights.push({ light: object, intensity: object.intensity, position: new THREE.Vector3() });
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        const material = object.material;
        object.material = Array.isArray(material) ? material.map(cloneMaterial) : cloneMaterial(material);
        restore.push(() => { object.material = material; });
        if (object instanceof THREE.Mesh && object.castShadow) {
          const depth = object.customDepthMaterial;
          const distance = object.customDistanceMaterial;
          object.customDepthMaterial = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
          object.customDistanceMaterial = patch(new THREE.MeshDistanceMaterial());
          restore.push(() => {
            object.customDepthMaterial = depth;
            object.customDistanceMaterial = distance;
          });
        }
      }
      object.children.forEach(visit);
    }

    visit(root);
    restore.push(() => {
      root.position.copy(position);
      root.scale.copy(scale);
      root.visible = visible;
      lights.forEach(({ light, intensity }) => { light.intensity = intensity; });
    });
    return { target, root, position, scale, visible, appear, lights };
  });
  const endTime = Math.max(DURATION, ...targets.map((target) => target.delay + (target.duration ?? 1.1)));

  /** 恢复原始模型状态，并释放入场专用材质；支持动画途中卸载。 */
  function dispose(): void {
    if (finished) return;
    restore.forEach((reset) => reset());
    temporaryMaterials.forEach((material) => material.dispose());
    temporaryMaterials.clear();
    finished = true;
  }

  /** 使用主循环的可见时间推进动画，返回本帧是否需要刷新阴影。 */
  function update(time: number): boolean {
    if (finished) return false;
    if (time >= endTime) {
      dispose();
      return true;
    }
    const sweep = THREE.MathUtils.smoothstep(time, 0, DURATION);
    height.value = THREE.MathUtils.lerp(bottom, top + FEATHER, sweep);
    for (const track of tracks) {
      const { target, root, position, scale, visible, appear, lights } = track;
      const progress = THREE.MathUtils.clamp((time - target.delay) / (target.duration ?? 1.1), 0, 1);
      const eased = easeOut(progress);
      appear.value = THREE.MathUtils.smoothstep(progress, 0, 1);
      root.visible = visible && progress > 0;
      root.position.copy(position);
      root.position.y -= (target.rise ?? 0.22) * (1 - eased);
      root.scale.copy(scale).multiplyScalar(THREE.MathUtils.lerp(target.scale ?? 0.94, 1, eased));
      root.updateWorldMatrix(true, false);
      // 光源随所在物体显现，避免尚未出现的店铺与路灯提前照亮路面。
      for (const entry of lights) {
        entry.light.getWorldPosition(entry.position);
        entry.light.intensity = entry.intensity * appear.value * THREE.MathUtils.smoothstep(height.value - entry.position.y, 0, FEATHER);
      }
    }
    return true;
  }

  update(0);
  return { update, dispose };
}
