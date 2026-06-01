import { Request, Response } from 'express';
import { success, error, paginated } from '../utils/response';
import { distributorModel } from '../models/distributor.model';
import { commissionModel } from '../models/commission.model';
import { userModel } from '../models/user.model';
import { getDb } from '../utils/db';
import { generateToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';

/** 安全提取 req.body 中的字符串值 */
function str(val: unknown): string {
  return Array.isArray(val) ? val[0] || '' : String(val || '');
}

// ============ Distributor Login ============
export function distributorLogin(req: Request, res: Response): void {
  const phone = str(req.body.phone);
  const password = str(req.body.password);

  if (!phone || !password) {
    error(res, '请提供手机号和密码');
    return;
  }

  const user = userModel.findByPhone(phone);
  if (!user) {
    error(res, '用户不存在', 404);
    return;
  }

  // 检查用户是否是分销商（有对应的分销商记录）
  const distributor = distributorModel.findByUserId(user.id);
  if (!distributor) {
    error(res, '该账号不是分销商，无权登录分销商中心', 403);
    return;
  }

  // 状态校验：停用/冻结不允许登录
  // User: active|inactive|locked; Distributor: active|inactive|frozen
  if (user.status === 'inactive' || user.status === 'locked' || distributor.status === 'inactive' || distributor.status === 'frozen') {
    error(res, '账号已停用或冻结，请联系管理员', 403);
    return;
  }

  // 验证密码
  let valid = false;

  if (user.password_hash && user.password_hash.length > 20) {
    try {
      valid = verifyPassword(password, user.password_hash);
    } catch {
      valid = false;
    }
  } else {
    const db = getDb();
    const configPwd = db.prepare("SELECT value FROM system_config WHERE key='admin_password'").get() as { value: string } | undefined;
    valid = !!configPwd && configPwd.value === password;
  }

  if (!valid) {
    error(res, '密码错误', 401);
    return;
  }

  // 首次登录时自动设置密码哈希
  if (!user.password_hash || user.password_hash.length <= 20) {
    userModel.update(user.id, { password_hash: hashPassword(password) });
  }

  const token = generateToken({ userId: user.id, role: user.role });
  success(res, {
    token,
    userId: user.id,
    name: user.name,
    phone: user.phone,
    distributorId: distributor.id,
    distributorCode: distributor.code,
    role: user.role,
  }, '登录成功');
}

export function getDistributorInfo(req: Request, res: Response): void {
  const code = str(req.params.code);
  const distributor = distributorModel.findByCode(code);
  if (!distributor) {
    // Try by user id
    const dist = distributorModel.findByIdWithUser(code);
    if (!dist) return error(res, '分销商不存在', 404);
    return success(res, dist);
  }
  success(res, distributorModel.findByIdWithUser(distributor.id));
}

export function getShareLink(req: Request, res: Response): void {
  const distId = str(req.params.id);
  const distributor = distributorModel.findById(distId);
  if (!distributor) return error(res, '分销商不存在', 404);

  // 前端地址：优先从请求头取（Vite proxy 会传递原始 Origin），否则用后端 host
  const forwardedHost = req.get('x-forwarded-host');
  const refererHost = req.get('referer');
  const originHeader = req.get('origin');
  
  let frontendOrigin: string;
  if (originHeader) {
    frontendOrigin = originHeader;
  } else if (refererHost) {
    try { frontendOrigin = new URL(refererHost).origin; }
    catch { frontendOrigin = refererHost.match(/^(https?:\/\/[^/]+)/)?.[1] || 'http://localhost:5173'; }
  } else if (forwardedHost) {
    frontendOrigin = `${req.protocol}://${forwardedHost}`;
  } else {
    const host = req.get('host') || 'localhost:5173';
    // 如果是后端端口，替换为前端默认端口
    if (host.includes(':3001')) {
      frontendOrigin = 'http://localhost:5173';
    } else {
      frontendOrigin = `${req.protocol}://${host}`;
    }
  }
  const shareUrl = `${frontendOrigin}/?distributor_code=${distributor.code}`;
  success(res, {
    code: distributor.code,
    url: shareUrl,
    shortUrl: shareUrl,
  });
}

export function getCommissionSummary(req: Request, res: Response): void {
  const id = str(req.params.id);
  const distributor = distributorModel.findById(id);
  if (!distributor) return error(res, '分销商不存在', 404);

  success(res, {
    total_commission: distributor.total_commission,
    available_commission: distributor.available_commission,
    frozen_commission: distributor.frozen_commission,
  });
}

export function getCommissionRecords(req: Request, res: Response): void {
  const distributorId = str(req.params.id);
  const page = parseInt(str(req.query.page)) || 1;
  const pageSize = parseInt(str(req.query.pageSize)) || 20;
  const { data, total } = commissionModel.findByDistributor(distributorId, page, pageSize);
  paginated(res, data, page, pageSize, total);
}
