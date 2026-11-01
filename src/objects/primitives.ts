import * as THREE from 'three';
import { toon } from '../materials/palette';
import { CONFIG } from '../scene/config';

const boxes = new Map<string, THREE.BoxGeometry>();
const edges = new Map<THREE.BufferGeometry, THREE.EdgesGeometry>();
const ink = new THREE.LineBasicMaterial({ color: CONFIG.colors.outline, transparent: true, opacity: 0.42 });

/** 创建并复用盒体几何，按需添加克制的动画轮廓。 */
export function box(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material | string, outline = false): THREE.Mesh {
  const key = size.join(',');
  if (!boxes.has(key)) boxes.set(key, new THREE.BoxGeometry(...size));
  const geometry = boxes.get(key)!;
  const mesh = new THREE.Mesh(geometry, typeof material === 'string' ? toon(material) : material);
  mesh.position.set(...position);
  // 路面薄片与底座不参与投影，减少静态阴影绘制量。
  mesh.castShadow = size[1] > 0.08 && Math.max(...size) < 15;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (outline) {
    if (!edges.has(geometry)) edges.set(geometry, new THREE.EdgesGeometry(geometry));
    mesh.add(new THREE.LineSegments(edges.get(geometry), ink));
  }
  return mesh;
}

/** 连接两个空间点，可用于车架、扶手、电杆等细部。 */
export function rod(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material | string, segments = 8): THREE.Mesh {
  const direction = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), typeof material === 'string' ? toon(material) : material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** 放置圆环零件，用于车轮、护栏底圈和雨滴涟漪。 */
export function ring(parent: THREE.Object3D, radius: number, tube: number, position: [number, number, number], material: THREE.Material | string): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 32), typeof material === 'string' ? toon(material) : material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

/** 创建以局部坐标搭建的道具组。 */
export function group(parent: THREE.Object3D, position: [number, number, number], rotation = 0): THREE.Group {
  const object = new THREE.Group();
  object.position.set(...position);
  object.rotation.y = rotation;
  parent.add(object);
  return object;
}
