import * as THREE from 'three';

export interface StoreDoor {
  /** 启动一次开门动画，重复点击不重新计时。 */
  open: () => void;
  /** 推进左右门扇，完整展示打开状态后通知进入。 */
  update: (delta: number) => boolean;
}

/** 独立驱动门扇局部位移，与立面的入场及绽开动画叠加。 */
export function createStoreDoor(store: THREE.Group, onEntered: () => void, reducedMotion = false): StoreDoor {
  const panels = ['store-door-left', 'store-door-right'].map((name, index) => {
    const object = store.getObjectByName(name)!;
    return { object, closedX: object.position.x, direction: index === 0 ? -1 : 1 };
  });
  const duration = reducedMotion ? 0.15 : 0.85;
  let opening = false;
  let elapsed = 0;
  let opened = false;
  let entered = false;

  /** 只接受第一次开门请求，避免连点触发多次跳转。 */
  function open(): void {
    opening = true;
  }

  /** 使用主循环时间平滑滑开双门，下一帧再进入以展示最终开门画面。 */
  function update(delta: number): boolean {
    if (!opening || entered) return false;
    if (opened) {
      entered = true;
      onEntered();
      return false;
    }
    elapsed = Math.min(elapsed + delta, duration);
    const progress = THREE.MathUtils.smoothstep(elapsed / duration, 0, 1);
    for (const panel of panels) panel.object.position.x = panel.closedX + panel.direction * 1.16 * progress;
    opened = elapsed === duration;
    return true;
  }

  return { open, update };
}
