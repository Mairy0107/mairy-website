// 集中管理场景比例、性能预算和配色。
export const CONFIG = {
  size: 16,
  maxPixelRatio: 1.75,
  shadowSize: 2048,
  reflectionSize: 768,
  rainCount: 2400,
  rippleCount: 34,
  camera: {
    position: [19, 16, 23] as const,
    target: [0, 1.1, 0] as const,
    fov: 36,
    minFramingAspect: 1.15,
  },
  // 远端未配置时沿用当前入场动画。
  reveal: { enabled: true },
  colors: {
    background: '#151a30',
    base: '#41465f',
    asphalt: '#242d43',
    sidewalk: '#7c8292',
    wall: '#d5d4bb',
    trim: '#354c58',
    green: '#69d5b1',
    warm: '#ffe6ad',
    pink: '#ff81b9',
    outline: '#202b40',
  },
} as const;
