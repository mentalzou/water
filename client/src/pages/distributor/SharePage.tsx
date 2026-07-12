import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Copy, Check, Share2, QrCode, Download } from 'lucide-react';
import { distributorApi } from '../../api/distributor.api';
import QRCode from 'qrcode';
import { useSiteConfig } from '../../context/SiteConfigContext';

export default function SharePage() {
  const { siteName } = useSiteConfig();
  const navigate = useNavigate();
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 从 localStorage 获取当前登录用户的分销商ID
    const user = JSON.parse(localStorage.getItem('distributor_user') || '{}');
    const code = user.distributorCode || '';
    const link = code ? `${window.location.origin}/?distributor_code=${code}` : '';
    if (link) {
      setShareLink(link);
      generateQR(link);
    } else {
      distributorApi.getShareLink(user.distributorId || '').then((res: any) => {
        if (res.code === 200 && res.data?.url) {
          setShareLink(res.data.url);
          generateQR(res.data.url);
        }
      });
    }
  }, []);

  function generateQR(url: string) {
    if (!qrCanvasRef.current || !url) return;
    QRCode.toCanvas(qrCanvasRef.current, url, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${siteName} - 天然矿泉水`,
          text: `我正在使用${siteName}购买天然矿泉水，品质好、价格优！快来试试吧`,
          url: shareLink,
        });
      } else {
        await navigator.clipboard.writeText(shareLink);
        alert('链接已复制到剪贴板，请分享给好友！');
      }
    } catch { /* cancelled */ }
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-8 px-5 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">推广分享</h1>
        </div>
        <p className="text-white/70 text-sm">分享链接给朋友，他们下单后您可获得返佣</p>
      </header>

      <main className="px-4 py-6 space-y-6 pb-8">
        {/* QR Code */}
        <div className="bg-white rounded-3xl p-8 shadow-sm flex flex-col items-center">
          <div className="w-52 h-52 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center mb-4 overflow-hidden">
            <canvas ref={qrCanvasRef} className="w-48 h-48" />
          </div>
          <p className="text-sm text-gray-500">扫描二维码进入购买页面</p>
        </div>

        {/* Share Link */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-water" />
            <span className="text-sm font-semibold text-gray-700">专属推广链接</span>
          </div>

          <div className="flex gap-2">
            <input readOnly value={shareLink} onClick={e => (e.target as HTMLInputElement).select()} className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-xs truncate outline-none" />
            <button onClick={handleCopy} className={`px-4 rounded-xl text-sm font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-water text-white'}`}>
              {copied ? <><Check className="inline w-3.5 h-3.5 mr-1" />已复制</> : <><Copy className="inline w-3.5 h-3.5 mr-1" />复制</>}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleCopy} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.97] transition-transform flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center"><Copy className="w-5 h-5 text-blue-500" /></div>
            <span className="text-sm font-medium text-gray-700">复制链接</span>
          </button>
          
          <button onClick={handleNativeShare} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.97] transition-transform flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center"><Share2 className="w-5 h-5 text-green-500" /></div>
            <span className="text-sm font-medium text-gray-700">直接分享</span>
          </button>
        </div>

        {/* Tips */}
        <div className="bg-blue-50/80 rounded-2xl p-4">
          <p className="text-blue-600 text-xs leading-relaxed">
            <strong>推广规则：</strong>当消费者通过您的专属链接成功下单并支付后，系统将自动计算返佣金额到您的账户中。佣金可在佣金明细页查看。
          </p>
        </div>
      </main>
    </div>
  );
}
