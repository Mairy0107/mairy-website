import * as THREE from 'three';
import { box, group, rod, ring } from './primitives';
import { canvasTexture, glow, signTexture, toon } from '../materials/palette';
import { CONFIG } from '../scene/config';

/** 生成可透过玻璃观察的货架与实例化商品。 */
function createShelves(parent: THREE.Group): void {
  const colors = ['#ffbd96', '#93c3a3', '#f6df8b', '#c0a9da', '#f6f0df'];
  const goods = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), toon('#ffffff'), 180);
  const matrix = new THREE.Matrix4();
  let index = 0;
  for (const x of [-2.4, 0, 2.4]) {
    box(parent, [1.65, 1.65, 0.46], [x, 1.05, -1.27], '#8b9f9d');
    for (let row = 0; row < 3; row++) {
      const y = 0.54 + row * 0.48;
      box(parent, [1.75, 0.055, 0.62], [x, y, -1.15], '#f2ebd9');
      for (let col = 0; col < 10; col++) {
        for (let depth = 0; depth < 2; depth++) {
          matrix.makeTranslation(x - 0.72 + col * 0.16, y + 0.15, -0.96 - depth * 0.2);
          goods.setMatrixAt(index, matrix);
          goods.setColorAt(index, new THREE.Color(colors[(col + row + depth) % colors.length]));
          index++;
        }
      }
    }
  }
  parent.add(goods);
}

/** 搭建便利店主体、发光招牌、自动门、雨棚与屋顶设备。 */
export function createStore(scene: THREE.Scene): THREE.Group {
  const root = group(scene, [-1.65, 0.17, -2.05]);
  box(root, [7.7, 0.2, 4.6], [0, 0.05, -0.25], '#b5b6aa', true);
  box(root, [7.6, 3.3, 0.18], [0, 1.77, -2.45], CONFIG.colors.wall, true);
  box(root, [0.18, 3.3, 4.4], [-3.71, 1.77, -0.3], CONFIG.colors.wall, true);
  box(root, [0.18, 3.3, 4.4], [3.71, 1.77, -0.3], CONFIG.colors.wall, true);
  box(root, [7.4, 0.07, 4.2], [0, 0.19, -0.3], '#e6d6ac');
  box(root, [7.7, 0.28, 4.7], [0, 3.5, -0.2], '#5f7b7b', true);
  box(root, [7.3, 0.13, 4.3], [0, 3.7, -0.2], '#8e9e9a');
  for (const x of [-3.7, 3.7]) box(root, [0.14, 0.25, 4.65], [x, 3.82, -0.2], '#a9b8ac');
  box(root, [7.5, 0.25, 0.13], [0, 3.82, -2.5], '#a9b8ac');
  createShelves(root);
  box(root, [1.4, 0.95, 0.7], [2.5, 0.7, 0.85], '#d9c8ac');
  box(root, [1.5, 0.08, 0.8], [2.5, 1.2, 0.85], '#445963');
  box(root, [0.33, 0.28, 0.12], [2.5, 1.39, 0.9], '#344556');
  box(root, [0.25, 0.17, 0.015], [2.5, 1.4, 0.97], glow('#a7ded0', 0.6));
  const interior = new THREE.PointLight('#ffdfa2', 26, 7, 2);
  interior.position.set(0, 2.4, 0.4); root.add(interior);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#b3e8df', transparent: true, opacity: 0.18, roughness: 0.12, metalness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, width] of [[-2.54, 2.12], [2.54, 2.12], [-0.58, 1.12], [0.58, 1.12]]) {
    box(root, [width, 2.38, 0.025], [x, 1.51, 1.96], glass);
    box(root, [width, 0.07, 0.09], [x, 0.34, 1.99], CONFIG.colors.trim);
    box(root, [width, 0.065, 0.075], [x, 2.69, 1.99], CONFIG.colors.trim);
    box(root, [width, 0.13, 0.03], [x, 1.08, 1.995], '#6cb99f');
  }
  for (const x of [-3.65, -1.34, 0, 1.34, 3.65]) box(root, [0.065, 2.48, 0.11], [x, 1.51, 2.01], CONFIG.colors.trim);
  for (const x of [-0.12, 0.12]) box(root, [0.035, 0.38, 0.08], [x, 1.4, 2.075], '#d4e4dc');
  box(root, [2.65, 0.17, 0.18], [0, 2.83, 2.02], CONFIG.colors.trim);
  box(root, [0.19, 0.07, 0.05], [0, 2.8, 2.13], glow('#7ce5cc', 0.5));
  const label = canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#edf2dd'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#408675'; ctx.font = 'bold 26px "Yu Gothic", sans-serif'; ctx.fillText('自動ドア  ⇆', 22, 43);
  });
  box(root, [0.72, 0.18, 0.012], [0, 1.9, 2.04], new THREE.MeshBasicMaterial({ map: label }));
  // 招牌与雨棚独立分组，便于按建筑层次依次入场。
  const signage = group(root, [0, 0, 0]);
  signage.name = 'store-signage';
  box(signage, [7.8, 0.69, 0.32], [0, 3.03, 2.03], '#49695f', true);
  const sign = new THREE.MeshBasicMaterial({ map: signTexture(), color: '#ffffff' });
  box(signage, [7.58, 0.6, 0.018], [0, 3.03, 2.2], sign);
  const awning = group(root, [0, 0, 0]);
  awning.name = 'store-awning';
  box(awning, [8.05, 0.14, 1.04], [0, 2.65, 2.37], '#77ac9b', true);
  box(awning, [8.05, 0.14, 0.12], [0, 2.57, 2.89], '#e2cbab');
  box(awning, [7.6, 0.035, 0.045], [0, 2.55, 2.82], glow('#ffedc1', 2.7));
  box(root, [1.98, 0.026, 0.85], [0, 0.185, 2.42], '#3f6263');
  for (let i = 0; i < 9; i++) box(root, [1.82, 0.004, 0.025], [0, 0.201, 2.09 + i * 0.08], '#72918b');
  // 细玻璃高光帮助远景辨识橱窗，控制透明层数。
  const shine = new THREE.MeshBasicMaterial({ color: '#e3fff1', transparent: true, opacity: 0.14, depthWrite: false });
  for (const x of [-2.9, 2.2]) {
    const streak = box(root, [0.07, 1.65, 0.008], [x, 1.58, 2.033], shine);
    streak.rotation.z = -0.32;
  }
  createAirConditioner(root, [-2.45, 4.05, -0.9]);
  createAirConditioner(root, [3.94, 0.83, -1.25], Math.PI / 2);
  rod(root, new THREE.Vector3(3.87, 0.35, -1.5), new THREE.Vector3(3.87, 2.65, -1.5), 0.04, '#b9b8a6');
  for (const z of [-1.6, -1.2]) rod(root, new THREE.Vector3(-2.45, 3.76, z), new THREE.Vector3(-2.45, 4, z), 0.05, '#566a70');
  return root;
}

/** 生成带风扇格栅和管线的空调外机。 */
function createAirConditioner(parent: THREE.Object3D, position: [number, number, number], rotation = 0): void {
  const ac = group(parent, position, rotation);
  box(ac, [1.4, 0.85, 0.65], [0, 0, 0], '#c0c8bb', true);
  const fan = ring(ac, 0.28, 0.025, [-0.23, 0, 0.337], '#4a636c');
  fan.add(new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), toon('#617984')));
  for (let i = -3; i <= 3; i++) box(ac, [0.59, 0.016, 0.02], [-0.23, i * 0.07, 0.36], '#afbab2');
  for (let i = 0; i < 5; i++) box(ac, [0.27, 0.022, 0.02], [0.45, -0.2 + i * 0.09, 0.337], '#637d7e');
}
