# 雨夜 · 街角便利店

一个可以自由旋转观看的日式便利店微缩景观。完整的正方形底座上，暖色橱窗、薄荷绿招牌与粉色贩卖机照亮雨夜街角；细雨、积水倒影和斑马线高光形成安静的动画夜景。右侧中文半透明面板可选择十类物件、切换三款配色、绽开或还原模型，并保存到服务器。鼠标悬停显示物件名称；招牌和海报仍属于场景内的实体物件。

## 效果说明

- 四阶卡通材质、局部边线与低饱和配色，表现三渲二的模型感。
- 便利店包含货架商品、玻璃橱窗、双扇自动门造型、招牌、屋檐雨棚与门垫。自动门为展示模型，不包含感应开门逻辑。
- 街道形成 L 形转角，配置自行车、雨伞架、垃圾桶、路灯、电线杆、电线、路牌、护栏、停车位、排水沟、海报栏与空调外机。
- 单个平面反射相机覆盖街道路面，噪声控制积水分布；微弱霓虹色晕、GPU 雨丝和实例化涟漪持续变化。
- 默认相机展示完整底座；支持窗口缩放与触屏。切换到后台时暂停渲染。

## 技术栈

Vite 7、TypeScript 5.9、three.js 0.180、OrbitControls、EffectComposer、UnrealBloomPass。后端是 Spring Boot 3.5 与 Java 17，使用 MyBatis 连接云 MySQL。数据库凭据只在服务端使用。几何与招牌纹理均由代码生成，无外部贴图、远程字体或模型下载，前端依赖版本由 `package-lock.json` 锁定。

## 用 IntelliJ IDEA 运行后端

需要 JDK 17 或更高（工程字节码目标是 17）。用 IDEA 打开仓库根目录，把 `backend` 识别为 Maven 模块，等待依赖下载完成。

主类是 `com.mairy.konbini.KonbiniApplication`。运行配置的工作目录设为仓库根目录，这样会读到根目录的 `.env`。工作目录如果是 `backend`，也会改读上一级 `.env`。已经在系统或 IDEA 环境变量里设置的值优先于文件，程序不会把密码写进日志。

复制 `.env.example` 为 `.env` 后填写现有云 MySQL，不要覆盖已有连接信息，也不要提交 `.env`：

| 变量 | 作用 |
| --- | --- |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | 连接 `test_01`。密码只放在环境变量或 `.env` |
| `MYSQL_SSL_MODE` | 默认 `DISABLED`，与原先客户端一致。实例要求加密时改为 `REQUIRED` |
| `PORT` | API 端口，默认 `3001` |
| `LISTEN_HOST` | 本机用 `127.0.0.1`。容器里给 nginx 访问时用 `0.0.0.0` |

数据库需已有 `scene_settings(setting_key, setting_value, updated_at)` 和 `scene_objects(object_key, display_name, style_labels, default_style, sort_order)`。程序不会建表，也不会覆盖种子数据。交互保存仍写入全局 `scene_settings.interaction`。`scene_object_prefs` 按访客保留，当前接口不读写它。

表和列的中文注释在 `db/migration/V1__comment_scene_tables.sql`。脚本按现有列类型写回注释，不删除行、不重建表。在业务库中执行一次即可，重复执行也只是再次写入同一句注释：

```bash
mysql --default-character-set=utf8mb4 -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p "$MYSQL_DATABASE" < db/migration/V1__comment_scene_tables.sql
```

IDEA 的 Maven 面板对 `backend` 执行 `package`，或在 `backend` 目录运行 `mvn package`。产物是 `backend/target/konbini-api.jar`。2C2G 云主机把堆限制在 256m：

```powershell
java -Xms64m -Xmx256m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -jar backend/target/konbini-api.jar
```

若连接池和页面构建会同时占用内存，把 `-Xmx256m` 改为 `-Xmx512m`。两种都使用 Serial GC，避免 G1 在小堆上的额外占用。

## 本地前端

前端使用 Node.js 22.12+ 或 Node.js 24 LTS，包管理器使用 npm。先启动上面的 API，再在仓库根目录执行：

```powershell
npm install
npm run dev
```

打开终端输出的本地地址，通常是 `http://localhost:5173`。如果端口被占用，Vite 会自动选择可用端口。运行时需要支持 WebGL 2 的现代浏览器和硬件加速。

`npm run dev` 只启动页面。Vite 把 `/api` 代理到 `http://127.0.0.1:PORT`（默认 3001），代理目标来自根目录 `.env` 的 `PORT`，不会把 MySQL 变量打进浏览器包。修改端口后需同时重启 API 和 Vite。

## 场景设置 API

| 接口 | 行为 |
| --- | --- |
| `GET /api/health` | 检查 API 和数据库，成功返回 200，数据库不可用返回 503 |
| `GET /api/objects` | 按排序返回物件目录，字段为 objectKey、displayName、styleLabels（三个中文名）、defaultStyle、sortOrder |
| `GET /api/settings/interaction` | 读取全局绽开状态和物件样式 |
| `PUT /api/settings/interaction` | 校验并保存整体交互状态，无效版本、物件键或样式索引返回 400 |
| `GET /api/settings` | 一次查询返回所有设置组成的对象 |
| `GET /api/settings/:key` | 返回该键的 JSON 值，不存在返回 404 |
| `PUT /api/settings/:key` | 使用 `Content-Type: application/json` 新增或覆盖该键，返回保存值 |

PUT 请求体直接使用 JSON 值，不需包装为 `setting_value`，除 interaction 使用专用格式外，其他设置支持对象、数组、字符串、数字、布尔值和 null，最大 64 KB。相机示例：`{"position":[19,16,23],"target":[0,1.1,0]}`。`reveal` 使用 `{"enabled":false}` 可关闭入场动画；仍遵循系统的减少动态效果设置。

页面启动时并行读取 `/api/settings` 与 `/api/objects`，应用相机、入场、绽开状态和物件样式。请求失败、超过三秒或字段无效时回退到本地默认值，面板显示中文提示；相机坐标必须为三个有限数字。交互请求体示例：`{"exploded":true,"styles":{"store":1,"lamp":2},"version":1}`；未指定的物件样式沿用目录默认值。按钮操作立即更新本地预览，点击“保存到服务器”后持久化，刷新页面恢复；保存超时或失败可重试。

API 尚未提供身份验证。本机默认只监听 `127.0.0.1`；容器通过 `LISTEN_HOST=0.0.0.0` 给同机 nginx 访问。通过反向代理开放写接口时，应在代理层添加访问控制。错误响应不会包含数据库连接信息。

## 构建与预览

```powershell
npm run build
npm run preview
```

`build` 先执行前端 TypeScript 严格类型检查，再生成 `dist/`。`preview` 通常在 `http://localhost:4173` 提供构建产物，也会代理 `/api`，需同时运行 Spring Boot。部署时发布静态 `dist/`、用上面的 `java -jar` 启动 API，并把同源 `/api` 原样转发到 API 端口。仅发布静态页面时使用本地默认设置。

替换原来的 `site-api` 容器时，在仓库根目录构建镜像。容器监听 3001，默认堆 256m，`LISTEN_HOST` 为 `0.0.0.0`。nginx 保持 `/api` 前缀，转发到同一端口：

```nginx
location /api/ {
    proxy_pass http://site-api:3001;
}
```

```bash
docker build -t site-api backend
docker run --rm -p 3001:3001 \
  -e MYSQL_HOST=... -e MYSQL_PORT=3306 -e MYSQL_USER=... \
  -e MYSQL_PASSWORD=... -e MYSQL_DATABASE=test_01 \
  site-api
```

需要 512m 堆时覆盖整个 `JAVA_OPTS`，并保留退出保护：`-e JAVA_OPTS=-Xms64m -Xmx512m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError`。镜像构建会跳过测试；发布前在本机执行 `mvn -f backend/pom.xml package`。

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
| 悬停物件 | 显示中文名称 |
| 点击物件 / 右侧物件按钮 | 选中物件并显示三款中文样式按钮 |
| 绽开模型 / 还原 | 平滑分离十类主要物件或精确恢复位置 |
| 保存到服务器 | 保存当前绽开状态及全部物件样式，底座、路面与天气保持原样 |
| 触屏单指拖拽 | 旋转 |
| 触屏双指捏合或拖拽 | 缩放或平移 |

镜头限制俯仰角度，避免翻入底座下方。面板以外的覆盖层和名称提示不拦截鼠标，画布仍可自由拖拽；窄屏面板限制高度并允许滚动。减少动态效果模式直接切换绽开状态。公告栏样式仅调整边框配色，海报图案沿用原有纹理。

## 目录结构

```text
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts             # 相对资源路径与引擎分包
├── .env.example               # 不含真实凭据的配置模板
├── db/migration/              # 只补充中文注释的 SQL，不删除数据
├── backend/                   # Spring Boot API，分层为 controller / service / repository / entity / dto / config
│   ├── pom.xml
│   ├── Dockerfile             # 替换 site-api，监听 3001
│   └── src/main/java/com/mairy/konbini/
├── shared/interaction.ts      # 前后端共用的物件键与交互校验
├── src/
│   ├── main.ts                # 启动与热更新清理
│   ├── style.css              # 全屏画布与交互面板
│   ├── scene/                 # 场景、交互面板、设置加载
│   ├── objects/               # 底座、店铺、道具与目录
│   └── materials/             # 卡通材质与积水倒影
└── docs/
    ├── ARCHITECTURE.md
    └── SCENE_SPEC.md
```

## 性能与扩展建议

像素比上限、反射分辨率、阴影分辨率与雨丝数量集中在 `src/scene/config.ts`。只有月光计算阴影，静态阴影首帧生成后复用；反射仍随镜头与天气更新。商品、涟漪使用实例化；盒体几何和卡通材质按参数缓存。

后续可以加入自动门感应、雨棚滴水、可选环境音或更精细的货架道具。若增加动态投影物体，应重新开启阴影更新或在变化后设置 `renderer.shadowMap.needsUpdate = true`。若面向低功耗设备，优先降低反射分辨率、像素比与雨丝数量。

布局与模块职责详见 [架构文档](docs/ARCHITECTURE.md) 和 [场景规格](docs/SCENE_SPEC.md)。
