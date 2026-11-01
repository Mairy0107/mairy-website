#!/usr/bin/env bash
# ECS 用法：sudo bash scripts/deploy-frontend.sh /tmp/website-release/dist
# 依赖 bash、python3、rsync、flock、Docker Compose；只同步目录内容，保留 nginx 绑定的目录 inode。
set -euo pipefail
export LC_ALL=C

frontend=/opt/website/frontend
compose=/opt/website/docker-compose.yml

if [[ $# -ne 1 ]]; then
  echo "用法：sudo bash $0 <已上传的 dist 目录>" >&2
  exit 2
fi
for command in python3 rsync flock docker sha256sum realpath stat diff; do
  command -v "$command" >/dev/null || { echo "缺少命令：$command" >&2; exit 1; }
done
[[ -f "$compose" ]] || { echo "Compose 文件不存在：$compose" >&2; exit 1; }
source_dir=$(realpath -e -- "$1")
[[ -d "$source_dir" ]] || { echo "构建目录不存在：$source_dir" >&2; exit 1; }
[[ ! -L "$frontend" ]] || { echo "拒绝同步到符号链接：$frontend" >&2; exit 1; }
mkdir -p -- "$frontend"
target_dir=$(realpath -e -- "$frontend")
# 拒绝源和目标相同或互相包含，避免 --delete 误删上传内容。
if [[ "$source_dir" == "$target_dir" || "$source_dir/" == "$target_dir/"* || "$target_dir/" == "$source_dir/"* ]]; then
  echo "构建目录与发布目录不能相同或互相包含" >&2
  exit 1
fi

# 串行部署，避免另一进程在同步与容器校验之间替换文件。
exec 9>/opt/website/.deploy-frontend.lock
flock -n 9 || { echo "已有前端部署正在进行" >&2; exit 1; }

# 部署前校验本地资源引用；容器随后按同一份 HTML 和资源清单校验。
python3 - "$source_dir" <<'PY'
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class AssetParser(HTMLParser):
    """收集 HTML 中脚本、样式和预加载资源的引用。"""

    def __init__(self):
        """初始化待校验资源列表。"""
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        """按 Vite 产物的 script/link 属性提取 JS 与 CSS。"""
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('src'):
            self.references.append(attrs['src'])
        if tag == 'link' and attrs.get('href'):
            rel = attrs.get('rel', '').lower().split()
            if set(rel) & {'stylesheet', 'modulepreload', 'preload'}:
                path = urlsplit(attrs['href']).path
                if set(rel) & {'stylesheet', 'modulepreload'} or path.endswith(('.js', '.css')):
                    self.references.append(attrs['href'])


def validate(root):
    """拒绝缺失资源、未哈希引用、旧入口及符号链接，失败时保留线上目录。"""
    if any(path.is_symlink() for path in root.rglob('*')):
        raise ValueError('构建目录不能包含符号链接')
    parser = AssetParser()
    parser.feed((root / 'index.html').read_text(encoding='utf-8'))
    references = set()
    for reference in parser.references:
        url = urlsplit(reference)
        path = unquote(url.path)
        if path.startswith('./'):
            path = path[2:]
        elif path.startswith('/'):
            path = path[1:]
        if url.scheme or url.netloc or not re.fullmatch(r'assets/[\w.-]+-[\w-]+\.(js|css)', path):
            raise ValueError(f'必须引用本次构建的 hashed JS/CSS：{reference}')
        if not (root / path).is_file():
            raise ValueError(f'HTML 引用的资源不存在：{reference}')
        references.add(path)
    if not any(re.fullmatch(r'assets/index-[\w-]+\.js', path) for path in references):
        raise ValueError('index.html 缺少 hashed index JS 入口')
    entries = {path.relative_to(root).as_posix() for pattern in ('index-*.js', 'index-*.css')
               for path in (root / 'assets').glob(pattern)}
    if entries - references:
        raise ValueError(f'构建目录混入未被 HTML 引用的旧入口：{sorted(entries - references)}')
    print(f'HTML 资源校验通过：{len(references)} 个 JS/CSS 引用')


try:
    validate(Path(sys.argv[1]))
except (OSError, ValueError) as error:
    sys.exit(f'部署前校验失败：{error}')
PY

inode=$(stat -c '%d:%i' -- "$frontend")
# 尾斜线明确同步内容；禁止 rm -rf frontend 或用 mv 替换挂载目录。
rsync -a --delete --no-owner --no-group --chmod=D755,F644 -- "$source_dir/" "$frontend/"
[[ "$inode" == "$(stat -c '%d:%i' -- "$frontend")" ]] || { echo "发布目录 inode 发生变化" >&2; exit 1; }

verification=$(mktemp -d)
trap 'rm -rf -- "$verification"' EXIT
# 同时比较 HTML、所有 JS/CSS（包括 index-*.js），覆盖入口及分包版本。
(
  cd -- "$frontend"
  sha256sum index.html
  for asset in assets/*.js assets/*.css; do
    [[ -f "$asset" ]] || continue
    sha256sum -- "$asset"
  done
) >"$verification/host.sha256"

docker compose -f "$compose" restart web
# restart 后短暂等待容器可执行命令，nginx 镜像只需提供 sh 和 sha256sum。
ready=false
for attempt in {1..10}; do
  if docker compose -f "$compose" exec -T web sh -c '
    set -eu
    export LC_ALL=C
    cd /usr/share/nginx/html
    sha256sum index.html
    for asset in assets/*.js assets/*.css; do
      [ -f "$asset" ] || continue
      sha256sum "$asset"
    done
  ' >"$verification/container.sha256" 2>"$verification/container.err"; then
    ready=true
    break
  fi
  sleep 1
done

echo '宿主机文件名及 SHA-256：'
cat "$verification/host.sha256"
echo '容器文件名及 SHA-256：'
cat "$verification/container.sha256"
if [[ "$ready" != true ]]; then
  cat "$verification/container.err" >&2
  echo '无法读取 web 容器资源，部署校验失败' >&2
  exit 1
fi
if ! diff -u "$verification/host.sha256" "$verification/container.sha256"; then
  echo '宿主机与容器的 HTML / JS / CSS 文件名或 SHA-256 不一致，部署校验失败' >&2
  exit 1
fi
echo "部署校验通过，frontend inode 保持为 $inode"
