# 交互功能实现任务（本地预览优先）

> 历史任务。交互接口仍是原来的 JSON，实现已迁到 `backend/` 的 Spring Boot。

请在当前仓库实现下列功能。完成后执行 npm run build 与 npm run check:api 确保通过。不要 git push，不要改 .env，不要部署服务器。

## 背景

现有项目是 Vite + TypeScript + Three.js 雨夜便利店微缩场景 + Express/MySQL 设置 API。
已有 scene_settings 键值 JSON（camera / reveal），以及云端新建的：
- 表 scene_objects（object_key, display_name, style_labels JSON 三款中文名, default_style, sort_order）
- 表 scene_object_prefs（viewer_id, object_key, style_index）
- scene_settings.interaction：{ exploded: boolean, styles: Record<object_key, 0|1|2>, version: 1 }

交互物件 key 与中文名（与库一致）：
store 便利店 / vending 自动贩卖机 / bike 自行车 / umbrella 雨伞架 / bins 垃圾桶 / lamp 路灯 / notice 公告栏 / poles 电线杆 / guardrail 护栏 / ac 空调外机

## 必须实现

1. 绽开/爆炸视图：页面上有中文按钮（绽开模型/还原）。点击后各主要物件沿远离场景中心方向平滑分离；再点还原。状态读写后端 interaction.exploded。
2. 悬停显示名称：鼠标移到可交互物件上显示中文 tooltip。射线检测命中已命名 Group。
3. 每物件三款样式：改主色/发光色即可。右侧面板切换。
4. 右侧 UI 面板：半透明暗色，中文。列出物件；选中后三款样式按钮；绽开开关；保存到服务器。pointer-events 不挡画布拖拽。
5. 后端：GET /api/objects 读 scene_objects；GET/PUT /api/prefs 或 /api/settings/interaction。前端启动加载并应用；保持 Express+mysql2；错误不泄露密钥。
6. 代码风格匹配 src/objects、src/scene、中文注释；Group 设置 name 与 userData.objectKey/displayName。底座/天气/路面不做样式切换。
7. 在 src/style.css 增加面板与 tooltip 样式。
8. 原 REQUIREMENTS 禁止 UI 已作废。

## 验收

npm run build 成功；npm run check:api 成功；本地可预览。不要提交密钥；不要 push。

完成后简述改动文件与预览方式。