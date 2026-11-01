import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config';

/** 配置无界面的旋转、缩放、平移及俯仰约束。 */
export function createControls(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): OrbitControls {
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...CONFIG.camera.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 12;
  controls.maxDistance = 52;
  controls.minPolarAngle = 0.16;
  controls.maxPolarAngle = Math.PI * 0.475;
  controls.panSpeed = 0.65;
  controls.zoomSpeed = 0.8;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.update();
  return controls;
}
