import path from 'path';

export default {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'water-management-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // 文件上传配置
  upload: {
    /** 上传文件根目录 */
    baseDir: process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'),
    /** 广告栏图片/视频子目录 */
    bannerDir: 'banners',
    /** 产品图片子目录 */
    productDir: 'products',
    /** 最大文件大小 */
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '52428800', 10), // 50MB
    /** 允许的图片格式 */
    imageExts: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    /** 允许的视频格式 */
    videoExts: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'],
  },
};
