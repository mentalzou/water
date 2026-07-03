import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { errorHandler } from './middleware/errorHandler';
import config from './config';

import adminRoutes from './routes/admin.routes';
import customerRoutes from './routes/customer.routes';
import distributorRoutes from './routes/distributor.routes';
import deliverymanRoutes from './routes/deliveryman.routes';
import paymentRoutes from './routes/payment.routes';

// Public route controllers (must be imported before protected routers)
import * as deliverymanController from './controllers/deliveryman.controller';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // 允许 localhost、局域网 IP、以及微信 web-view（origin 为 null）
    if (!origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('http://172.')) {
      callback(null, true);
    } else {
      callback(null, true); // 开发阶段全部放行
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(config.upload.baseDir));

// Public routes - no authentication required
app.get('/api/health', (_req, res) => {
  res.json({ code: 200, message: '服务运行正常', data: { time: new Date().toLocaleString() } });
});

// 临时文件上传接口（用于上传资质证书图片）
const qualityUploadDir = path.join(config.upload.baseDir, 'quality');
if (!fs.existsSync(qualityUploadDir)) {
  fs.mkdirSync(qualityUploadDir, { recursive: true });
}
const qualityUpload = multer({ dest: qualityUploadDir, limits: { fileSize: 20 * 1024 * 1024 } });
app.post('/api/upload/quality', qualityUpload.array('files', 10), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ code: 400, message: '未选择文件' });
    return;
  }
  const results = files.map(f => {
    const ext = path.extname(f.originalname) || '.jpg';
    const newPath = path.join(qualityUploadDir, f.originalname);
    fs.renameSync(f.path, newPath);
    return { name: f.originalname, url: `/uploads/quality/${encodeURIComponent(f.originalname)}` };
  });
  res.json({ code: 200, message: `成功上传 ${results.length} 个文件`, data: results });
});

// 临时上传页（浏览器直接拖拽上传）
app.get('/api/upload-quality', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>上传证书图片</title><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px}#drop{border:3px dashed #ccc;border-radius:16px;padding:60px 20px;text-align:center;cursor:pointer;transition:.2s}#drop.dragover{background:#e8f4ff;border-color:#1890ff}.btn{margin-top:16px;padding:12px 40px;background:#1890ff;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}#result{margin-top:20px;white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;font-size:13px}</style></head><body><h2>资质证书图片上传</h2><p>支持 jpg/png 格式，可一次选多张</p><div id="drop" onclick="input.click()"><p style="font-size:40px;margin:0">📁</p><p style="color:#999">点击选择文件 或 拖拽到此处</p><input type="file" id="input" accept="image/*" multiple hidden></div><div style="margin-top:12px;color:#999;font-size:13px" id="filelist"></div><button class="btn" id="uploadBtn" disabled onclick="upload()">开始上传</button><pre id="result"></pre><script>
let selectedFiles=[];
const input=document.getElementById("input"),drop=document.getElementById("drop"),btn=document.getElementById("uploadBtn"),list=document.getElementById("filelist"),result=document.getElementById("result");
input.onchange=()=>{selectedFiles=Array.from(input.files);updateList()};
drop.ondragover=e=>{e.preventDefault();drop.classList.add("dragover")};
drop.ondragleave=()=>drop.classList.remove("dragover");
drop.ondrop=e=>{e.preventDefault();drop.classList.remove("dragover");selectedFiles=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith("image/"));input.files=e.dataTransfer.files;updateList()};
function updateList(){btn.disabled=selectedFiles.length===0;list.textContent=selectedFiles.length?"已选择 "+selectedFiles.length+" 个文件: "+selectedFiles.map(f=>f.name).join(", "):""}
async function upload(){btn.disabled=true;btn.textContent="上传中...";const fd=new FormData();selectedFiles.forEach(f=>fd.append("files",f));try{const r=await fetch("/api/upload/quality",{method:"POST",body:fd});const d=await r.json();result.textContent=JSON.stringify(d,null,2);btn.textContent="上传完成 ✅"}catch(e){result.textContent="上传失败: "+e.message;btn.textContent="重试";btn.disabled=false}}
</script></body></html>`);
});

// Deliveryman & Distributor logins must be BEFORE admin router
app.post('/api/deliverymen/login', deliverymanController.loginDeliveryman);

// Protected API Routes (order matters: admin has authMiddleware that affects subsequent /api/* routes)
app.use('/api/admin', adminRoutes);
app.use('/api', customerRoutes);
app.use('/api', distributorRoutes);
app.use('/api', deliverymanRoutes);
app.use('/api', paymentRoutes);

// Error handling
app.use(errorHandler);

export default app;
