import { defineConfig, loadEnv } from 'vite';

/** 从服务端环境读取代理端口，并保留现有引擎分包策略。 */
export default defineConfig(({ mode }) => {
  // 只读取端口，不将数据库变量暴露给客户端。
  const env = loadEnv(mode, process.cwd(), 'PORT');
  const port = Number(process.env.PORT ?? env.PORT ?? '3001');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 端口无效');
  const proxy = { '/api': { target: `http://127.0.0.1:${port}` } };
  return {
    base: './',
    server: { proxy },
    preview: { proxy },
    build: {
      rollupOptions: {
        output: {
          /** 按 three.js 内部单向依赖边界划分静态包。 */
          manualChunks(id: string): string | undefined {
            if (id.includes('/node_modules/three/examples/')) return 'three-effects';
            if (id.includes('/node_modules/three/build/three.core.js')) return 'three-core';
            if (id.includes('/node_modules/three/')) return 'three-renderer';
            return undefined;
          },
        },
      },
    },
  };
});
