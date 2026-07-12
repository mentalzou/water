import { getDb } from './db';

/**
 * 从 system_config 表获取站点名称，若未配置则返回默认值
 */
export function getSiteName(): string {
  try {
    const row = getDb().prepare("SELECT value FROM system_config WHERE key = 'site_name'").get() as any;
    return row?.value || '武夷屿都山水';
  } catch {
    return '武夷屿都山水';
  }
}
