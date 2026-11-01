import * as THREE from 'three';
import { box, group, ring, rod } from './primitives';
import { canvasTexture, glow, toon } from '../materials/palette';

/** 简化管件端点的三维坐标创建。 */
const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** 制作带商品陈列、付款口和取货口的霓虹贩卖机。 */
function createVendingMachine(parent: THREE.Object3D): void {
  const machine = group(parent, [-6.63, 0.18, -0.8], 0.06);
  box(machine, [1.15, 2.45, 0.85], [0, 1.22, 0], '#bb607f', true);
  box(machine, [1.02, 0.24, 0.03], [0, 2.25, 0.445], glow('#ffd3e0', 1.7));
  const label = canvasTexture(512, 96, (ctx) => {
    ctx.fillStyle = '#fbe6ed'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#a24870'; ctx.font = 'bold 49px sans-serif'; ctx.fillText('月のソーダ', 29, 66);
  });
  box(machine, [0.94, 0.18, 0.012], [0, 2.25, 0.467], new THREE.MeshBasicMaterial({ map: label }));
  box(machine, [0.81, 1.3, 0.03], [-0.08, 1.37, 0.442], glow('#d5f3ec', 0.65));
  for (let row = 0; row < 3; row++) {
    box(machine, [0.79, 0.035, 0.16], [-0.08, 0.85 + row * 0.4, 0.47], '#667b8b');
    for (let col = 0; col < 4; col++) {
      const x = -0.36 + col * 0.19;
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.061, 0.22, 10), toon(['#f5be79', '#9dc4a2', '#d494b7', '#a2bedb'][col]));
      bottle.position.set(x, 1.01 + row * 0.4, 0.51); machine.add(bottle);
      box(machine, [0.075, 0.026, 0.018], [x, 0.81 + row * 0.4, 0.56], glow('#b0f0d9', 0.6));
    }
  }
  box(machine, [0.13, 0.32, 0.06], [0.46, 1.2, 0.46], '#354754');
  box(machine, [0.07, 0.06, 0.01], [0.46, 1.26, 0.5], glow('#a4e1cb'));
  box(machine, [0.73, 0.25, 0.07], [-0.02, 0.39, 0.44], '#2a3546', true);
  box(machine, [0.63, 0.035, 0.19], [-0.02, 0.27, 0.47], '#8e718b');
  const light = new THREE.PointLight('#ff8eba', 8, 4, 2); light.position.set(0, 1.45, 0.8); machine.add(light);
}

/** 用管架、轮胎、辐条与车篮构造停放的自行车。 */
function createBicycle(parent: THREE.Object3D): void {
  const bike = group(parent, [-4.8, 0.64, 1.68], -0.13);
  const wheelPositions = [-0.73, 0.73];
  for (const x of wheelPositions) {
    ring(bike, 0.44, 0.043, [x, 0, 0], '#283847');
    ring(bike, 0.39, 0.018, [x, 0, 0], '#acbcc1');
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5;
      rod(bike, v(x, 0, 0), v(x + Math.sin(angle) * 0.39, Math.cos(angle) * 0.39, 0), 0.007, '#c0c9c5', 4);
    }
  }
  const frame = '#e8ba7c';
  for (const [a, b] of [
    [v(-0.73, 0, 0), v(-0.32, 0.62, 0)], [v(-0.32, 0.62, 0), v(0, 0, 0)],
    [v(0, 0, 0), v(-0.73, 0, 0)], [v(-0.32, 0.62, 0), v(0.46, 0.65, 0)],
    [v(0.46, 0.65, 0), v(0, 0, 0)], [v(0.46, 0.65, 0), v(0.73, 0, 0)],
    [v(-0.32, 0.62, 0), v(-0.4, 0.83, 0)], [v(0.46, 0.65, 0), v(0.48, 1, 0)],
  ]) rod(bike, a, b, 0.027, frame);
  box(bike, [0.3, 0.07, 0.2], [-0.4, 0.85, 0], '#3e4e59');
  rod(bike, v(0.48, 1, -0.25), v(0.48, 1, 0.25), 0.025, '#b8c4c2');
  box(bike, [0.4, 0.3, 0.35], [0.77, 0.8, 0], new THREE.MeshBasicMaterial({ color: '#96aaa7', wireframe: true }));
  ring(bike, 0.12, 0.02, [0, 0, 0.06], '#a5b9b6');
  rod(bike, v(0, 0, 0.06), v(0.17, -0.12, 0.06), 0.018, '#a5b9b6');
  box(bike, [0.15, 0.045, 0.13], [0.17, -0.12, 0.06], '#3b4d59');
  rod(bike, v(-0.2, 0.14, 0), v(-0.32, -0.43, 0.24), 0.018, '#718488');
}

/** 生成雨伞架与折叠雨伞，弯柄通过曲线形成。 */
function createUmbrellaRack(parent: THREE.Object3D): void {
  const rack = group(parent, [-3.14, 0.19, 1.13]);
  box(rack, [0.8, 0.07, 0.5], [0, 0.05, 0], '#45646b', true);
  for (const x of [-0.35, 0.35]) {
    rod(rack, v(x, 0, -0.2), v(x, 0.62, -0.2), 0.023, '#9caeae');
    rod(rack, v(x, 0, 0.2), v(x, 0.62, 0.2), 0.023, '#9caeae');
  }
  for (const z of [-0.2, 0.2]) rod(rack, v(-0.35, 0.6, z), v(0.35, 0.6, z), 0.025, '#9caeae');
  for (let i = 0; i < 3; i++) {
    const x = -0.24 + i * 0.23;
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.62, 8), toon(['#bd9cc7', '#a4c6c2', '#e5bd84'][i]));
    umbrella.position.set(x, 0.44, 0); umbrella.rotation.z = Math.PI; rack.add(umbrella);
    rod(rack, v(x, 0.55, 0), v(x, 0.98, 0), 0.013, '#d6d5c3');
    const curve = new THREE.CatmullRomCurve3([v(x, 0.98, 0), v(x + 0.04, 1.05, 0), v(x + 0.11, 1.02, 0), v(x + 0.11, 0.94, 0)]);
    rack.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.018, 5, false), toon('#d6d5c3')));
  }
}

/** 制作带分类投入口的双垃圾桶。 */
function createBins(parent: THREE.Object3D): void {
  const bins = group(parent, [2.48, 0.19, 0.97]);
  for (let i = 0; i < 2; i++) {
    const x = i * 0.51 - 0.255;
    box(bins, [0.46, 0.82, 0.5], [x, 0.41, 0], '#acbdb7', true);
    box(bins, [0.49, 0.1, 0.54], [x, 0.86, 0], i ? '#698d9b' : '#769e85');
    box(bins, [0.25, 0.13, 0.015], [x, 0.69, 0.26], '#324b59');
    box(bins, [0.2, 0.18, 0.01], [x, 0.4, 0.26], '#e3dec6');
  }
}

/** 绘制玻璃公告栏中的多张社区海报。 */
function createNoticeBoard(parent: THREE.Object3D): void {
  const board = group(parent, [-6.75, 0.18, -3.25]);
  for (const x of [-0.48, 0.48]) rod(board, v(x, 0, 0), v(x, 2.23, 0), 0.035, '#536c74');
  box(board, [1.3, 1.22, 0.12], [0, 1.62, 0], '#526a70', true);
  const texture = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#d1c7a5'; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#f6f0d7'; ctx.fillRect(30, 35, 200, 420);
    ctx.fillStyle = '#ad657e'; ctx.fillRect(52, 62, 156, 156);
    ctx.strokeStyle = '#f7d8b6'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(130, 141, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#344f64'; ctx.font = 'bold 31px "Yu Gothic", sans-serif'; ctx.fillText('夏まつり', 63, 276);
    ctx.font = '23px sans-serif'; ctx.fillText('8.24 / 18:00', 56, 325);
    ctx.fillStyle = '#9eb7ae'; ctx.fillRect(260, 45, 220, 200);
    ctx.fillStyle = '#f2ecce'; ctx.font = 'bold 31px "Yu Gothic", sans-serif'; ctx.fillText('町のお知らせ', 265, 100);
    ctx.fillStyle = '#ede2bd'; ctx.fillRect(265, 277, 210, 195);
    ctx.fillStyle = '#736e77'; ctx.font = '26px "Yu Gothic", sans-serif'; ctx.fillText('ねこを探して', 271, 320);
    ctx.beginPath(); ctx.arc(365, 382, 30, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#547b7b'; ctx.fillRect(280, 131 + i * 23, 170, 5); }
  });
  box(board, [1.15, 1.07, 0.01], [0, 1.62, 0.07], new THREE.MeshBasicMaterial({ map: texture, color: '#b6c2ca' }));
  box(board, [1.5, 0.08, 0.4], [0, 2.3, 0], '#547c74', true);
}

/** 制作转角护栏，预留斑马线与小巷入口。 */
function createGuardrails(parent: THREE.Object3D): void {
  for (const [x, z, angle, length] of [[-5.7, 3.45, 0, 3.2], [6, 7.05, 0, 2.5], [7.15, 5.35, Math.PI / 2, 2.5]]) {
    const rail = group(parent, [x, 0, z], angle);
    for (const offset of [-length / 2, 0, length / 2]) {
      rod(rail, v(offset, 0, 0), v(offset, 0.78, 0), 0.055, '#d7dac8');
      box(rail, [0.15, 0.07, 0.17], [offset, 0.04, 0], '#8c9b9d');
      box(rail, [0.08, 0.13, 0.115], [offset, 0.6, 0], '#f0c28c');
    }
    for (const y of [0.37, 0.72]) rod(rail, v(-length / 2, y, 0), v(length / 2, y, 0), 0.035, '#c2d0c7');
  }
}

/** 创建路灯与社区街道指示牌。 */
function createStreetLamp(parent: THREE.Object3D): void {
  const lamp = group(parent, [2.75, 0.18, 2.3]);
  rod(lamp, v(0, 0, 0), v(0, 4.45, 0), 0.07, '#486276');
  rod(lamp, v(0, 4.45, 0), v(-0.65, 4.45, 0), 0.055, '#486276');
  box(lamp, [0.62, 0.12, 0.38], [-0.62, 4.43, 0], '#536e7b', true);
  box(lamp, [0.5, 0.035, 0.28], [-0.62, 4.35, 0], glow('#ffdfaa', 3));
  box(lamp, [0.26, 0.18, 0.26], [0, 0.09, 0], '#5e7584');
  const texture = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = '#55758c'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#cadcd7'; ctx.lineWidth = 7; ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#e5e9dc'; ctx.font = 'bold 45px "Yu Gothic", sans-serif'; ctx.fillText('こもれび通り', 30, 61);
    ctx.font = '23px sans-serif'; ctx.fillText('KOMOREBI ST.   →', 34, 99);
  });
  box(lamp, [1.35, 0.34, 0.06], [0.32, 3.2, 0.09], new THREE.MeshBasicMaterial({ map: texture }));
  const light = new THREE.PointLight('#ffcf8c', 30, 9, 2);
  light.position.set(-0.62, 4.18, 0); parent.add(light); light.position.add(lamp.position);
}

/** 生成电线杆、变压器、绝缘子与垂落电线。 */
function createUtilityPoles(parent: THREE.Object3D): void {
  const poles = [v(6.8, 0, -6.5), v(-7.15, 0, 3.55)];
  for (const p of poles) {
    rod(parent, p, p.clone().add(v(0, 7.5, 0)), 0.105, '#8c929a');
    for (const y of [0.45, 0.8]) box(parent, [0.24, 0.1, 0.24], [p.x, y, p.z], '#d2ba80');
    box(parent, [1.6, 0.1, 0.12], [p.x, 6.8, p.z], '#5d6c7d');
    box(parent, [1.6, 0.1, 0.12], [p.x, 7.35, p.z], '#5d6c7d');
    for (const x of [-0.64, 0, 0.64]) {
      rod(parent, v(p.x + x, 6.8, p.z), v(p.x + x, 7.05, p.z), 0.055, '#b7bebd');
      rod(parent, v(p.x + x, 7.35, p.z), v(p.x + x, 7.58, p.z), 0.055, '#b7bebd');
    }
    box(parent, [0.45, 0.83, 0.45], [p.x + 0.31, 5.95, p.z], '#738695', true);
    for (let i = 0; i < 5; i++) box(parent, [0.15, 0.025, 0.09], [p.x - 0.15, 4.5 + i * 0.3, p.z], '#68798a');
  }
  for (const offset of [-0.64, 0, 0.64]) {
    const a = poles[0].clone().add(v(offset, 7.58, 0));
    const b = poles[1].clone().add(v(offset, 7.58, 0));
    const mid = a.clone().lerp(b, 0.5); mid.y -= 1.15;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.017, 5, false), toon('#26374a')));
  }
  const cable = new THREE.CatmullRomCurve3([v(6.8, 6.1, -6.5), v(4.6, 4.7, -4.9), v(2.1, 3.4, -4.2)]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 24, 0.013, 5, false), toon('#26374a')));
}

/** 添加小巷入口的邻墙、侧门和盆栽，压紧构图并强化纵深。 */
function createAlley(parent: THREE.Object3D): void {
  const wall = group(parent, [0, 0.18, 0]);
  box(wall, [0.24, 1.7, 6.6], [7.64, 0.85, -4.1], '#697a8b', true);
  box(wall, [0.35, 0.12, 6.7], [7.64, 1.76, -4.1], '#92a3a8');
  for (let i = 0; i < 5; i++) box(wall, [0.265, 0.014, 6.5], [7.64, 0.23 + i * 0.3, -4.1], '#526778');
  box(wall, [1.6, 1.8, 0.17], [5.7, 0.9, -7.65], '#6a7f8c', true);
  box(wall, [0.75, 1.38, 0.03], [5.7, 0.71, -7.55], '#3f5b6d');
  box(wall, [0.5, 0.06, 0.16], [5.7, 1.64, -7.45], glow('#9dd3d1', 1.5));
  for (const [x, z] of [[-6.7, -5.5], [2.6, -4.9], [-5.9, 0.6]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.38, 8), toon('#b28b7c'));
    pot.position.set(x, 0.37, z); parent.add(pot);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 0.4;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 0), toon(i % 2 ? '#779c8e' : '#547f78'));
      leaf.position.set(x + Math.sin(angle) * 0.14, 0.69 + (i % 2) * 0.13, z + Math.cos(angle) * 0.14);
      leaf.scale.set(0.8, 1.6, 0.8); parent.add(leaf);
    }
  }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.57, 12), toon('#d88b76'));
  cone.position.set(4.2, 0.32, -6.7); parent.add(cone);
  box(parent, [0.4, 0.06, 0.4], [4.2, 0.04, -6.7], '#6b7182');
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.106, 0.1, 12), toon('#e4d6b5'));
  band.position.set(4.2, 0.35, -6.7); parent.add(band);
}

/** 汇集所有可独立调整摆放的街景道具。 */
export function createProps(scene: THREE.Scene): THREE.Group {
  const root = group(scene, [0, 0, 0]);
  // 按完整道具分组，保持原有局部坐标并错开每组的入场时间。
  for (const create of [createVendingMachine, createBicycle, createUmbrellaRack, createBins, createNoticeBoard, createGuardrails, createStreetLamp, createUtilityPoles, createAlley]) {
    create(group(root, [0, 0, 0]));
  }
  return root;
}
