import * as THREE from 'three';
import { CONFIG } from './config';

/** 建立冷色月光与暖色店铺溢光，仅主光源计算阴影。 */
export function createLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight('#b8c9ed', '#56617d', 2.1));
  const moon = new THREE.DirectionalLight('#b7cafa', 2.9);
  moon.position.set(-4, 12, 7);
  moon.castShadow = true;
  moon.shadow.mapSize.set(CONFIG.shadowSize, CONFIG.shadowSize);
  moon.shadow.camera.left = moon.shadow.camera.bottom = -12;
  moon.shadow.camera.right = moon.shadow.camera.top = 12;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 36;
  moon.shadow.normalBias = 0.025;
  moon.shadow.bias = -0.00015;
  moon.shadow.radius = 3;
  scene.add(moon);
  const entrance = new THREE.PointLight('#b0f5d6', 20, 8, 2);
  entrance.position.set(-1.6, 2.8, 1.15); scene.add(entrance);
  const rim = new THREE.DirectionalLight('#cb9cc5', 0.75);
  rim.position.set(6, 6, -6); scene.add(rim);
}
