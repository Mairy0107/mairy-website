import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { checkDatabase } from './db.js';
import { getAll, getByKey, setByKey } from './settings.repo.js';
import { getObjects } from './objects.repo.js';
import { isInteractionSettings } from '../shared/interaction.js';

/** 创建物件与设置 API，所有错误响应均隐藏数据库及环境细节。 */
export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  // 允许任意 JSON 值，包括字符串、数字、布尔值和 null。
  app.use(express.json({ strict: false, limit: '64kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  /** 同时检查进程与数据库连通性。 */
  app.get('/api/health', async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  /** 以键值对象形式返回所有设置。 */
  app.get('/api/settings', async (_req, res) => {
    res.json(await getAll());
  });

  /** 返回数据库中的物件名称、三款样式与默认排序。 */
  app.get('/api/objects', async (_req, res) => {
    res.json(await getObjects());
  });

  /** 返回单个设置，缺失的键使用 404。 */
  app.get('/api/settings/:key', async (req, res) => {
    const value = await getByKey(req.params.key);
    if (value === undefined) {
      res.status(404).json({ error: '设置不存在' });
      return;
    }
    res.json(value);
  });

  /** 保存请求中的 JSON 值，响应返回已保存的值。 */
  app.put('/api/settings/:key', async (req, res) => {
    if (!req.is('application/json')) {
      res.status(415).json({ error: '请使用 application/json' });
      return;
    }
    if (req.body === undefined) {
      res.status(400).json({ error: '请求体必须是 JSON 值' });
      return;
    }
    // 交互设置只接受约定版本、布尔开关和合法物件的三款样式索引。
    if (req.params.key === 'interaction' && !isInteractionSettings(req.body)) {
      res.status(400).json({ error: '交互设置格式无效，请使用 version: 1、exploded 布尔值及 0/1/2 样式' });
      return;
    }
    await setByKey(req.params.key, req.body);
    res.json(req.body);
  });

  app.use('/api', (_req, res) => { res.status(404).json({ error: '接口不存在' }); });
  /** 将解析失败及数据库异常转换为不含敏感信息的响应。 */
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error?.status === 413 ? 413 : error?.status === 400 ? 400 : 500;
    const message = status === 413 ? '请求体过大' : status === 400 ? '请求格式无效' : '服务暂时不可用';
    res.status(status).json({ error: message });
  };
  app.use(handleError);
  return app;
}
