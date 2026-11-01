import * as THREE from 'three';
import { box, group } from './primitives';
import { toon } from '../materials/palette';
import { CONFIG } from '../scene/config';

/** 搭建完整正方形底座、L 形街道、人行道和道路标识。 */
export function createBase(scene: THREE.Scene): THREE.Group {
  const root = group(scene, [0, 0, 0]);
  box(root, [16, 0.65, 16], [0, -0.48, 0], CONFIG.colors.base, true);
  box(root, [15.92, 0.13, 15.92], [0, -0.1, 0], CONFIG.colors.asphalt);
  box(root, [11.1, 0.22, 10.5], [-2.35, 0.05, -2.6], CONFIG.colors.sidewalk);
  // 路缘砖保持连贯，让前街和右侧小巷形成明确转角。
  for (let i = 0; i < 22; i++) box(root, [0.48, 0.26, 0.22], [-7.62 + i * 0.5, 0.07, 2.62], '#adb3bb');
  for (let i = 0; i < 21; i++) box(root, [0.22, 0.26, 0.47], [3.24, 0.07, -7.55 + i * 0.5], '#adb3bb');
  for (let i = 0; i < 13; i++) box(root, [10.8, 0.008, 0.012], [-2.32, 0.166, -7.5 + i * 0.8], '#686f83');
  for (let i = 0; i < 14; i++) box(root, [0.012, 0.008, 10.1], [-7.6 + i * 0.8, 0.166, -2.55], '#686f83');
  const paint = new THREE.MeshStandardMaterial({ color: '#ccd8ce', roughness: 0.22, metalness: 0.18 });
  for (let i = 0; i < 6; i++) box(root, [0.63, 0.012, 3.25], [-2.05 + i * 1.09, 0.023, 5.6], paint);
  // 车位位于右侧道路，不遮挡斑马线。
  for (const z of [-5.8, -2.1]) {
    box(root, [2.8, 0.013, 0.07], [5.45, 0.024, z], paint);
    box(root, [0.07, 0.013, 3.7], [6.85, 0.024, z + 1.85], paint);
    box(root, [0.6, 0.09, 0.16], [6.3, 0.07, z + 0.5], '#b5b8b3');
  }
  box(root, [2.8, 0.013, 0.07], [5.45, 0.024, 1.6], paint);
  for (let i = 0; i < 6; i++) box(root, [0.08, 0.012, 0.8], [4.08, 0.024, -6.7 + i * 1.5], '#e6c784');
  box(root, [10.5, 0.018, 0.27], [-2.2, 0.023, 2.94], '#121d2a');
  for (let i = 0; i < 70; i++) box(root, [0.045, 0.019, 0.25], [-7.3 + i * 0.15, 0.033, 2.94], '#707f8a');
  box(root, [0.27, 0.018, 9.6], [3.58, 0.023, -2.3], '#121d2a');
  for (let i = 0; i < 60; i++) box(root, [0.25, 0.019, 0.045], [3.58, 0.034, -7 + i * 0.16], '#707f8a');
  const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.025, 32), toon('#455267'));
  manhole.position.set(5.4, 0.025, 3.6); root.add(manhole);
  for (let i = -2; i <= 2; i++) box(root, [0.52, 0.007, 0.025], [5.4, 0.042, 3.6 + i * 0.11], '#75818c');
  return root;
}
