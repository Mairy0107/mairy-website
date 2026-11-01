import { config } from 'dotenv';

// 从项目根目录读取服务端环境变量，禁止把连接信息输出到日志。
config({ path: new URL('../.env', import.meta.url), quiet: true });

/** 读取必需的数据库配置，报错只包含变量名。 */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') throw new Error(`缺少环境变量 ${name}`);
  return value;
}

/** 校验 TCP 端口，避免无效配置静默回退。 */
function port(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error(`${name} 端口无效`);
  return parsed;
}

export const CONFIG = {
  port: port(process.env.PORT ?? '3001', 'PORT'),
  mysql: {
    host: required('MYSQL_HOST'),
    port: port(process.env.MYSQL_PORT ?? '3306', 'MYSQL_PORT'),
    user: required('MYSQL_USER'),
    password: required('MYSQL_PASSWORD'),
    database: required('MYSQL_DATABASE'),
  },
};
