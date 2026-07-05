import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift } from 'lucide-react';

export default function FreeTrialPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">免费试喝</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-water/10 rounded-full flex items-center justify-center mx-auto">
            <Gift className="w-10 h-10 text-water" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">免费试喝活动</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              感谢您关注我们的‘武夷屿都山水’矿泉水系列产品！
            </p>
            <p className="text-gray-500 text-sm leading-relaxed mt-2">
              我们定期举办免费试喝活动，让您先品尝，再决定是否购买。
            </p>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-water/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-water text-sm font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 text-sm">关注公众号</h3>
                <p className="text-gray-500 text-xs mt-1">扫描下方二维码关注我们的微信公众号，获取最新活动信息。</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-water/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-water text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 text-sm">免费试喝</h3>
                <p className="text-gray-500 text-xs mt-1">可在销售点免费领取一瓶380ml的‘武夷屿都山水’矿泉水。</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-water/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-water text-sm font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 text-sm">分享好友</h3>
                <p className="text-gray-500 text-xs mt-1">试喝满意后，分享给好友，一起享受高品质‘武夷屿都山水’矿泉水。</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400">
              活动最终解释权归本公司所有
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
