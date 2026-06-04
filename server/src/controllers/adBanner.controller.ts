import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import { adBannerModel } from '../models/adBanner.model';
import config from '../config';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

/** 安全提取字符串 */
function str(val: unknown): string {
  return Array.isArray(val) ? val[0] || '' : String(val || '');
}

// ============ 文件上传配置 ============
const uploadDir = path.join(config.upload.baseDir, config.upload.bannerDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allAllowedExts = [...config.upload.imageExts, ...config.upload.videoExts];

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allAllowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`仅支持图片和视频格式：${allAllowedExts.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSize },
});

// ============ 公开接口 ============

/** 前台：获取启用的广告栏列表 */
export function getActiveBanners(_req: Request, res: Response): void {
  const banners = adBannerModel.findActive().map(b => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    type: b.type,
    src: b.src,
    link_url: b.link_url,
    bg_color: b.bg_color,
  }));
  success(res, banners);
}

// ============ 管理后台接口 ============

/** 后台：获取全部广告栏 */
export function listBanners(_req: Request, res: Response): void {
  success(res, adBannerModel.findAll());
}

/** 上传文件 */
export function uploadFile(req: Request, res: Response): void {
  if (!req.file) {
    error(res, '请选择文件');
    return;
  }
  const url = `/uploads/${config.upload.bannerDir}/${req.file.filename}`;
  success(res, { url }, '上传成功');
}

/** 创建广告栏 */
export function createBanner(req: Request, res: Response): void {
  const title = str(req.body.title);
  const type = str(req.body.type) || 'image';

  if (!title) {
    error(res, '请填写广告标题');
    return;
  }

  if (!['image', 'video'].includes(type)) {
    error(res, '类型仅支持 image 或 video');
    return;
  }

  try {
    const banner = adBannerModel.create({
      title,
      subtitle: str(req.body.subtitle),
      type: type as 'image' | 'video',
      src: str(req.body.src),
      link_url: str(req.body.link_url),
      bg_color: str(req.body.bg_color),
      sort_order: parseInt(str(req.body.sort_order)) || 0,
    });
    success(res, banner, '广告栏创建成功');
  } catch (err: any) {
    error(res, err.message || '创建失败');
  }
}

/** 更新广告栏 */
export function updateBanner(req: Request, res: Response): void {
  const id = str(req.params.id);
  const data: Record<string, any> = {};

  if (req.body.title !== undefined) data.title = str(req.body.title);
  if (req.body.subtitle !== undefined) data.subtitle = str(req.body.subtitle);
  if (req.body.type !== undefined) data.type = str(req.body.type);
  if (req.body.src !== undefined) data.src = str(req.body.src);
  if (req.body.link_url !== undefined) data.link_url = str(req.body.link_url);
  if (req.body.bg_color !== undefined) data.bg_color = str(req.body.bg_color);
  if (req.body.sort_order !== undefined) data.sort_order = parseInt(str(req.body.sort_order));
  if (req.body.status !== undefined) data.status = str(req.body.status);

  try {
    const banner = adBannerModel.update(id, data);
    if (!banner) {
      error(res, '广告栏不存在', 404);
      return;
    }
    success(res, banner, '更新成功');
  } catch (err: any) {
    error(res, err.message || '更新失败');
  }
}

/** 删除广告栏 */
export function deleteBanner(req: Request, res: Response): void {
  const id = str(req.params.id);
  const deleted = adBannerModel.delete(id);
  if (!deleted) {
    error(res, '广告栏不存在', 404);
    return;
  }
  success(res, null, '删除成功');
}
