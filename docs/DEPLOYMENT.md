# 部署与资源校验

## ECS 前端发布

本地按现有流程生成 `dist/`（`npm run build`），将完整目录上传至服务器临时目录，再执行仓库中的 `scripts/deploy-frontend.sh`。脚本不负责构建，不读取 `.env`。

ECS 需安装 Bash、Python 3、rsync、flock（util-linux）、sha256sum（coreutils）和 Docker Compose 插件，且已有 `/opt/website/docker-compose.yml`，其中前端服务名为 `web`（容器可命名为 `site-web`）。执行用户需要写入 `/opt/website` 和操作 Docker 的权限。

```bash
# 在 ECS 执行；传入目录必须包含 index.html 和 assets/。
sudo bash /opt/website/app/scripts/deploy-frontend.sh /tmp/website-release/dist
```

发布过程先检查 HTML 中的 hashed JS/CSS、modulepreload 分包引用是否存在，拒绝旧的 `index-*.js/css` 入口混入构建目录。通过后用 `rsync --delete` 同步目录内容，保留 `/opt/website/frontend` 本身，并校验其设备号与 inode 没有变化；随后执行：

```bash
docker compose -f /opt/website/docker-compose.yml restart web
```

最后分别在宿主机 `/opt/website/frontend` 与容器 `/usr/share/nginx/html` 计算 `index.html` 和全部 `assets/*.js`、`assets/*.css` 的文件名及 SHA-256。输出双方清单，任何文件名、内容或数量不一致都会非零退出。容器 HTML 与资源清单相同，才视为 HTML/JS/CSS 版本对齐。并发发布会由锁拒绝。

脚本会覆盖和删除发布目录中不属于本次构建的内容。请仅传入已完成的构建目录；发布期间不要继续修改该目录。同步不是原子切换，短暂窗口内的请求可能遇到资源缺失。失败时不会自动回滚；修复原因后重新执行，或对保留的上一版完整 `dist` 执行同一脚本。

## Windows 上传示例

在仓库根目录的 PowerShell 执行下列命令，替换登录地址与密钥路径。通过 SSH 密钥或 agent 认证，无需在脚本中保存密码。以下示例使用可直接写发布目录及操作 Docker 的账号；普通账号可将最后的 `bash` 改为 `sudo bash`。

```powershell
$server = 'deploy@ecs.example.com'
$key = "$env:USERPROFILE/.ssh/ecs_ed25519"
$dist = (Resolve-Path -LiteralPath './dist').Path
$release = '/tmp/website-release-' + [guid]::NewGuid().ToString('N')

ssh -i $key $server "mkdir -p '$release'"
if ($LASTEXITCODE -ne 0) { throw '创建上传目录失败' }
scp -i $key -r $dist "${server}:$release/dist"
if ($LASTEXITCODE -ne 0) { throw '上传 dist 失败' }
scp -i $key ./scripts/deploy-frontend.sh "${server}:$release/deploy-frontend.sh"
if ($LASTEXITCODE -ne 0) { throw '上传部署脚本失败' }
ssh -i $key $server "bash '$release/deploy-frontend.sh' '$release/dist'"
if ($LASTEXITCODE -ne 0) { throw "部署校验失败，上传目录保留在 $release" }
```

使用 Git 检出本仓库的脚本，保持 LF 换行。成功后可自行清理本次临时目录；不要删除或重建 `/opt/website/frontend`。本仓库用上述 PowerShell 用法替代单独的 `.ps1` 辅助脚本。

## 后端 runtime 镜像

`Dockerfile.runtime` 沿用现有后端镜像的 Java 17 JRE、非 root 用户、3001 端口与 JVM 参数，按 ECS 现网约定复制构建上下文根目录下的 `konbini-api.jar`。先打包，再将 jar 从 `target/` 复制到 `backend/`，避免 ECS 再运行 Maven。在仓库根目录执行：

```powershell
mvn -f backend/pom.xml -DskipTests package
Copy-Item -LiteralPath ./backend/target/konbini-api.jar -Destination ./backend/konbini-api.jar -Force
docker build -f backend/Dockerfile.runtime -t mairy-konbini-api:latest backend
```

`Dockerfile.runtime.dockerignore` 使用简单白名单，只允许上下文根目录的 `konbini-api.jar` 进入构建上下文。每次重新打包后都要重新复制 jar，以免使用旧版本。更新 ECS 上 Compose 使用的镜像后，按现有镜像发布流程重建 API 容器（镜像标签须与 Compose 保持一致）：

```bash
docker compose -f /opt/website/docker-compose.yml up -d --no-deps --force-recreate api
```

这里假定后端服务键为 `api`，请按实际 Compose 配置替换；`site-api` 是容器名示例，构建的镜像标签为 `mairy-konbini-api:latest`。只执行 `restart` 不会让已有 API 容器使用新镜像。

## 雨水与湿路面

现有雨水按钮继续更新 `rainEnabled`。交互层使用 `rainEnabled && !exploded` 同时控制天气可见性与 `road.setWetness()`：关雨或绽开时立即隐藏雨丝、涟漪，路面在约一秒内明显变干；开雨并还原模型后恢复原湿路效果。启动首帧直接应用保存状态，避免关雨状态下先闪现湿路面。

干路面反射混合从原来的 `0.12～0.52` 降到 `0.025～0.05`，积水明暗差显著收敛，雨纹扰动降至零，地面 wash 色晕透明度由 `0.22` 降到 `0.025`。湿度使用与帧率无关的阻尼过渡，几何和反射相机继续复用。
