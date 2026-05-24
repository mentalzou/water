import crypto from 'crypto';

const ITERATIONS = 260000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2_sha256$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, hashed: string): boolean {
  try {
    const parts = hashed.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];
    const hash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString('hex');
    return hash === originalHash;
  } catch {
    // 兼容旧种子数据：明文密码比较
    const adminPwd = getDb().prepare("SELECT value FROM system_config WHERE key='admin_password'").get() as { value: string } | undefined;
    if (adminPwd && adminPwd.value === password) return true;
    return false;
  }
}

function getDb() {
  // lazy import to avoid circular dependency
  const mod = require('../utils/db');
  return mod.getDb();
}
