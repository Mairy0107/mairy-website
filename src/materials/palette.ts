import * as THREE from 'three';

const shades = new THREE.DataTexture(new Uint8Array([92, 155, 210, 255]), 4, 1, THREE.RedFormat);
shades.minFilter = shades.magFilter = THREE.NearestFilter;
shades.needsUpdate = true;
const materials = new Map<string, THREE.MeshToonMaterial>();

/** 复用四阶明暗材质，统一动画模型的色阶。 */
export function toon(color: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  const key = new THREE.Color(color).getHexString();
  if (!materials.has(key)) materials.set(key, new THREE.MeshToonMaterial({ color, gradientMap: shades }));
  return materials.get(key)!;
}

/** 创建可参与辉光的发光材质。 */
export function glow(color: THREE.ColorRepresentation, intensity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

/** 生成无外部资源的招牌、标线或柔光纹理。 */
export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前环境不支持 Canvas 2D。');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** 绘制模型内的店铺招牌，文字不是页面界面。 */
export function signTexture(): THREE.CanvasTexture {
  return canvasTexture(1536, 256, (ctx) => {
    ctx.fillStyle = '#fff7de'; ctx.fillRect(0, 0, 1536, 256);
    ctx.fillStyle = '#43af91'; ctx.fillRect(0, 0, 1536, 22); ctx.fillRect(0, 228, 1536, 28);
    ctx.fillStyle = '#de786e'; ctx.fillRect(0, 205, 1536, 10);
    ctx.fillStyle = '#25846c'; ctx.beginPath(); ctx.arc(113, 120, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8dc'; ctx.beginPath(); ctx.arc(135, 100, 50, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#246b60'; ctx.font = 'bold 101px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillText('こもれび', 233, 147);
    ctx.font = 'bold 34px sans-serif'; ctx.fillText('KOMOREBI MART', 922, 112);
    ctx.font = '26px "Yu Gothic", sans-serif'; ctx.fillText('24 HOURS · まちのコンビニ', 925, 159);
  });
}
