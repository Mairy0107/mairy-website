# 架构与数据流

## 设计目标

使用程序化资源构造可自由观察的三维微缩模型，由 Spring Boot API 提供启动设置和物件目录。页面 DOM 包含启动脚本、运行时画布与中文交互面板；实体招牌文字仍通过 CanvasTexture 绘制。交互面板的覆盖层空白区域与 tooltip 使用 pointer-events: none，只有面板接收事件。渲染模块以 three.js 的 Scene、Group、Material 为边界，不依赖应用框架。

## 模块职责

| 模块 | 职责 | 对外接口 |
| --- | --- | --- |
| `src/main.ts` | 加载设置、启动、热更新资源清理 | 调用 `createScene(settings)` |
| `scene/settings.ts` | 设置请求、校验、三秒超时与失败回退 | `loadSceneSettings(signal)` |
| `scene/config.ts` | 尺寸、颜色、相机与性能预算 | 只读 `CONFIG` |
| `scene/createScene.ts` | 相机、渲染器、装配、后处理、尺寸与生命周期 | 返回清理函数 |
| `scene/interaction.ts` | 物件材质副本、独立运动父组、平滑绽开与原色恢复 | `createObjectInteraction()` |
| `scene/interactionPanel.ts` | 中文物件列表、三款样式、射线提示、保存状态与取消 | `createInteractionPanel()` |
| `objects/catalog.ts` | 十类物件离线目录与 Group 元数据 | `DEFAULT_OBJECTS` / `nameObject()` |
| `shared/interaction.ts` | 前端交互类型、物件键及运行时校验；Java 侧有对应校验 | 校验函数 |
| `backend` controller | `/api/health`、`/api/settings`、`/api/objects` 的状态码与 JSON | REST 控制器 |
| `backend` service | 设置解析、interaction 校验、目录整理 | `SettingsService` 等 |
| `backend` repository | MyBatis 参数化 SQL | `SceneSettingMapper` 等 |
| `backend` entity / dto | 表行与返回给前端的驼峰结构 | 实体与响应 |
| `backend` config | `.env`、必填变量、64 KB 请求上限 | 启动配置 |
| `scene/controls.ts` | OrbitControls 鼠标、触屏、距离与角度约束 | 返回 controls |
| `scene/lighting.ts` | 环境光、月光、店铺溢光、冷暖轮廓光 | 写入 Scene |
| `scene/weather.ts` | GPU 雨丝、实例化积水涟漪 | `update(time)` |
| `objects/primitives.ts` | 缓存盒体几何、边线、卡通材质，创建管件与分组 | box / rod / ring / group |
| `objects/base.ts` | 方形底座、人行道、转角道路、车位、沟渠与标线 | 返回底座 Group |
| `objects/store.ts` | 店铺建筑、内装、商品、玻璃、自动门造型、空调 | 返回店铺 Group |
| `objects/props.ts` | 贩卖机、自行车、伞架、垃圾桶、灯杆、电线、街牌等 | 返回道具 Group |
| `materials/palette.ts` | 四阶色阶、发光材质、程序化招牌与海报纹理 | 材质与纹理工厂 |
| `materials/wetRoad.ts` | 单相机平面反射、积水噪声、霓虹路面色晕 | `update(time)` / `dispose()` |

## 初始化数据流

```text
main.ts
  ├─ loadSceneSettings() → /api/settings、/api/objects → Service → Mapper → MySQL
  │    └─ 超时 / 失败 / 无效字段 → CONFIG 默认设置
  └─ createScene(settings)
       ├─ CONFIG → Scene / PerspectiveCamera / WebGLRenderer
       ├─ createControls(camera, canvas)
       ├─ createBase(scene)
       ├─ createStore(scene) → 复用 primitives / palette
       ├─ createProps(scene) → 独立道具组
       ├─ createLighting(scene)
       ├─ createWetRoad(scene)
       ├─ createWeather(scene)
       └─ RenderPass → UnrealBloomPass → OutputPass
```

## 每帧数据流

`setAnimationLoop` 提供帧时间，累计可见状态下的动画秒数；每帧先更新 OrbitControls 的阻尼，再将时间写入积水和细雨的 shader uniform，更新涟漪实例矩阵，最后调用 composer 渲染。

雨丝的位置在 GPU 计算，不逐帧更新粒子顶点数组。屋顶覆盖区域的室内雨丝通过空间遮罩隐藏。涟漪用一个 InstancedMesh 绘制。商店货架商品通过实例化并逐实例着色。静态模型和材质初始化后复用，渲染循环不发起业务请求或 SQL。启动时并行请求设置与物件目录，各仓储只执行一条 SQL，不在循环中查询。保存使用现有设置仓储的单条 upsert，不使用 scene_object_prefs。

## 后端配置与设置更新

`GET /api/health` 用 `SELECT 1` 检查连接，异常返回 503；设置接口提供全部读取、按键读取和 PUT 任意 JSON 值。不存在的键返回 404，无效 JSON 返回 400，非 JSON 写入返回 415，超出 64 KB 返回 413。写入采用单条参数化 upsert，并刷新 `updated_at`。应用启动不会改表或覆盖种子数据；中文注释由单独的 SQL 脚本按现有列类型写回。

`camera.position`、`camera.target` 覆盖默认相机坐标，`reveal.enabled` 控制是否执行入场动画。前端逐字段校验，默认值保留在 `scene/config.ts`，热更新时取消未完成请求并释放场景。物件样式与绽开按钮立即更新本地预览；点击保存后写入全局 interaction 设置，刷新页面恢复。interaction 格式固定为 version: 1、exploded 布尔值、styles 中合法物件键对应 0/1/2。

`.env` 仅供 Spring Boot 读取，Vite 只用 `PORT` 配置开发和预览代理，不向前端注入 MySQL 变量。本机 API 监听 `127.0.0.1`；容器把 `LISTEN_HOST` 设为 `0.0.0.0` 后，由同源反向代理转发 `/api`。开放写入前应在代理层设置访问控制。连接池最多 5 个连接。小内存主机使用 `-Xmx256m`，同一台机器还要跑构建或其他进程时使用 `-Xmx512m`。

## 路面反射

L 形 ShapeGeometry 恰好覆盖前街与右侧道路，由一个 Reflector 捕获倒影。自定义 shader 使用世界坐标噪声混合暗色沥青与倒影，并用低幅正弦扰动表现雨纹；道路标线、格栅、井盖与涟漪略高于反射面，避免深度冲突。

反射缓冲固定为 768 × 768，不随高分辨率窗口无限放大；反射只有一份，不创建互相捕获的反射平面。路面附加柔和的透明色晕，帮助呈现薄荷绿招牌、粉色贩卖机和暖色路灯的湿路高光。

## 色彩与光照

主体使用 MeshToonMaterial，四阶灰度梯度纹理统一动画明暗。重要建筑和机器添加低透明轮廓线。玻璃使用低不透明度 MeshPhysicalMaterial，使内部货架可见。店铺招牌使用自身发亮的基础材质；灯带使用 emissive 材质。冷色半球光和月光保证模型侧面可读，店内与街角灯光形成暖色焦点。ACES 色调映射与 sRGB 输出统一最终色彩；低强度 bloom 仅轻微扩散高亮区域。

## 性能与生命周期

- renderer 抗锯齿与后处理目标 4 倍多重采样；像素比不超过 1.75。
- 只有月光启用 2048 × 2048 阴影；静态场景阴影生成一次后停止自动更新。
- 窗口 resize 同步相机投影、renderer 和 composer；竖屏扩大垂直视角以保留水平构图。
- `visibilitychange` 暂停隐藏页面的动画循环，恢复时重置帧间隔，避免雨丝跳跃。
- 清理函数移除监听器，停止动画，释放 controls、去重后的几何 / 材质 / 纹理、反射目标、后处理和 renderer，并移除画布。
- Vite HMR 使用同一清理函数，避免开发时叠加渲染循环。

## 验证边界

`npm run build` 包含 TypeScript 严格类型检查与 Vite 生产构建。不自动启动浏览器；交互通过产品面板提供，不添加调试面板或额外测试界面。实际 GPU 的画面表现与交互需要在支持 WebGL 2 的运行环境中确认。

## 交互生命周期

十类主要物件各有命名 Group，userData 保存 objectKey/displayName；空调从店铺中拆成同层组，路灯点光源归属灯体。每个物件外包运动父组，以完整包围盒中心远离底座中心的方向施加位移，入场动画继续操作原始组，互不覆盖。

交互材质按物件复制，保留纹理、玻璃、商品实例和公共材质；两款变色方案从原始色值计算，第一款可精确恢复。用户在入场途中调整时先结束临时入场材质，随后切换样式。物件运动期间刷新阴影，稳定后恢复静态阴影。

射线先命中物件内 Mesh，再向上查找已命名 Group，过滤不可见祖先；拖拽及指针移入面板时隐藏 tooltip。名称提示在渲染更新世界矩阵后计算，随镜头和绽开位置更新。

保存以点击时快照发起请求，五秒超时；保存期间的新修改仍保留且提示尚未保存。HMR 卸载取消保存、移除全部事件与 DOM，先释放入场材质、再恢复物件原材质并释放副本，最后执行已有场景资源清理。