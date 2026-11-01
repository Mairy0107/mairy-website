# 雨夜 · 街角便利店

一个可以自由旋转观看的日式便利店微缩景观。完整的正方形底座上，暖色橱窗、薄荷绿招牌与粉色贩卖机照亮雨夜街角；细雨、积水倒影和斑马线高光形成安静的动画夜景。页面只展示三维模型，没有按钮、面板、标尺或其他 UI。招牌和海报文字均属于场景内的实体物件。

## 效果说明

- 四阶卡通材质、局部边线与低饱和配色，表现三渲二的模型感。
- 便利店包含货架商品、玻璃橱窗、双扇自动门造型、招牌、屋檐雨棚与门垫。自动门为展示模型，不包含感应开门逻辑。
- 街道形成 L 形转角，配置自行车、雨伞架、垃圾桶、路灯、电线杆、电线、路牌、护栏、停车位、排水沟、海报栏与空调外机。
- 单个平面反射相机覆盖街道路面，噪声控制积水分布；微弱霓虹色晕、GPU 雨丝和实例化涟漪持续变化。
- 默认相机展示完整底座；支持窗口缩放与触屏。切换到后台时暂停渲染。

## 技术栈

Vite 7、TypeScript 5.9、three.js 0.180、OrbitControls、EffectComposer、UnrealBloomPass；后端使用 Node.js、Express 和 mysql2 连接云 MySQL。数据库凭据只在服务端使用。几何与招牌纹理均由代码生成，无外部贴图、远程字体或模型下载，具体依赖版本由 `package-lock.json` 锁定。

## 环境与本地启动

使用 Node.js 22.12+ 或 Node.js 24 LTS，包管理器使用 npm。

使用项目已有的 `.env` 连接云 MySQL，不要覆盖连接信息。新环境可参考 `.env.example` 填写 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`（现有数据库为 `test_01`），通过 `PORT` 设置 API 端口，默认 3001。`.env` 已被 Git 忽略，禁止提交真实密码。数据库需已有 `scene_settings(setting_key, setting_value, updated_at)` 表；程序不会建表或覆盖种子数据。

```powershell
npm install
npm run dev
```

打开终端输出的本地地址，通常是 `http://localhost:5173`。如果端口被占用，Vite 会自动选择可用端口。运行时需要支持 WebGL 2 的现代浏览器和硬件加速。

`npm run dev` 同时启动前后端；也可以分别执行 `npm run dev:web` 和 `npm run dev:api`。API 监听 `127.0.0.1:PORT`，Vite 将 `/api` 代理到该地址。修改端口后需重启前后端。

## 场景设置 API

| 接口 | 行为 |
| --- | --- |
| `GET /api/health` | 检查 API 和数据库，成功返回 200，数据库不可用返回 503 |
| `GET /api/settings` | 一次查询返回所有设置组成的对象 |
| `GET /api/settings/:key` | 返回该键的 JSON 值，不存在返回 404 |
| `PUT /api/settings/:key` | 使用 `Content-Type: application/json` 新增或覆盖该键，返回保存值 |

PUT 请求体直接使用 JSON 值，不需包装为 `setting_value`，支持对象、数组、字符串、数字、布尔值和 null，最大 64 KB。相机示例：`{"position":[19,16,23],"target":[0,1.1,0]}`。`reveal` 使用 `{"enabled":false}` 可关闭入场动画；仍遵循系统的减少动态效果设置。

页面启动时通过 `/api/settings` 读取相机与可选入场开关；请求失败、超过三秒或字段无效时，使用 `src/scene/config.ts` 的默认值。相机坐标必须为三个有限数字。修改数据库设置后刷新页面生效，无需重写前端，不增加 UI/HUD。

API 尚未提供身份验证，仅监听本机回环地址；通过反向代理开放写接口时，应在代理层添加访问控制。错误响应不会包含数据库连接信息。

## 构建与预览

```powershell
npm run build
npm run preview
```

`build` 先执行前端 TypeScript 严格类型检查，再生成 `dist/`；`npm run check:api` 单独检查后端类型。`preview` 通常在 `http://localhost:4173` 提供构建产物，也会代理 `/api`，需同时运行 `npm start`。`npm start` 使用 tsx 直接运行 API，需要安装开发依赖。部署时发布静态 `dist/`、启动 API，并将同源 `/api` 转发到 `127.0.0.1:PORT`。仅发布静态页面时使用本地默认设置。

API 启动后可在终端冒烟检查（端口与 `.env` 一致）：

```powershell
curl.exe http://127.0.0.1:3001/api/health
curl.exe http://127.0.0.1:3001/api/settings
```

## 操作

| 操作 | 效果 |
| --- | --- |
| 鼠标左键拖拽 | 围绕模型旋转 |
| 鼠标滚轮 | 拉近或拉远 |
| 鼠标右键或中键拖拽 | 平移观察目标 |
| 触屏单指拖拽 | 旋转 |
| 触屏双指捏合或拖拽 | 缩放或平移 |

镜头限制俯仰角度，避免翻入底座下方。页面没有操作提示覆盖层。

## 目录结构

```text
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts             # 相对资源路径与引擎分包
├── .env.example               # 不含真实凭据的配置模板
├── server/
│   ├── config.ts              # 服务端环境配置
│   ├── db.ts                  # MySQL 连接池与健康检查
│   ├── settings.repo.ts       # 参数化查询与原子写入
│   ├── app.ts                 # API 路由与错误处理
│   ├── index.ts               # 启动与退出清理
│   └── tsconfig.json          # 后端类型检查
├── src/
│   ├── main.ts                 # 启动与热更新清理
│   ├── style.css               # 全屏画布
│   ├── scene/
│   │   ├── config.ts           # 全局配置与配色
│   │   ├── settings.ts         # 远端设置加载、校验与默认回退
│   │   ├── createScene.ts      # 场景装配与生命周期
│   │   ├── controls.ts         # 相机控制
│   │   ├── lighting.ts         # 灯光与阴影
│   │   └── weather.ts          # 雨丝与涟漪
│   ├── objects/
│   │   ├── primitives.ts       # 几何与轮廓复用
│   │   ├── base.ts             # 方形底座与道路
│   │   ├── store.ts            # 店铺与空调
│   │   └── props.ts            # 模块化街景道具
│   └── materials/
│       ├── palette.ts          # 卡通材质与程序纹理
│       └── wetRoad.ts          # 平面积水倒影
└── docs/
    ├── ARCHITECTURE.md
    └── SCENE_SPEC.md
```

## 性能与扩展建议

像素比上限、反射分辨率、阴影分辨率与雨丝数量集中在 `src/scene/config.ts`。只有月光计算阴影，静态阴影首帧生成后复用；反射仍随镜头与天气更新。商品、涟漪使用实例化；盒体几何和卡通材质按参数缓存。

后续可以在保留无 UI 展示的前提下，加入自动门感应、雨棚滴水、可选环境音或更精细的货架道具。若增加动态投影物体，应重新开启阴影更新或在变化后设置 `renderer.shadowMap.needsUpdate = true`。若面向低功耗设备，优先降低反射分辨率、像素比与雨丝数量。

布局与模块职责详见 [架构文档](docs/ARCHITECTURE.md) 和 [场景规格](docs/SCENE_SPEC.md)。
