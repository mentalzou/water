import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react';

export default function QualityReportPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">质检报告</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-4">
        {/* 质检信息卡片 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 bg-water/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-water" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">产品质量检验报告</h2>
              <p className="text-xs text-gray-400 mt-0.5">符合国家饮用水标准</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 品名 */}
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500 text-sm">品名</span>
              <span className="text-gray-800 font-medium text-sm">山泉水</span>
            </div>

            <div className="border-t border-gray-50"></div>

            {/* 报告日期 */}
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500 text-sm">报告日期</span>
              <span className="text-gray-800 font-medium text-sm">2025年12月15日</span>
            </div>

            <div className="border-t border-gray-50"></div>

            {/* 生产日期 */}
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500 text-sm">生产日期</span>
              <span className="text-gray-800 font-medium text-sm">2025年12月10日</span>
            </div>

            <div className="border-t border-gray-50"></div>

            {/* 质检报告链接 */}
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500 text-sm">质检报告</span>
              <a
                href="#"
                className="flex items-center gap-1 text-water text-sm font-medium hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  alert('质检报告链接待配置');
                }}
              >
                查看报告
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* 检测项目 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">检测结果摘要</h3>
          <div className="space-y-2">
            {[
              { name: '色度', value: '≤5度', standard: '≤15度', pass: true },
              { name: '浑浊度', value: '≤0.5 NTU', standard: '≤1 NTU', pass: true },
              { name: 'pH值', value: '7.2', standard: '6.5-8.5', pass: true },
              { name: '总硬度', value: '85 mg/L', standard: '≤450 mg/L', pass: true },
              { name: '菌落总数', value: '未检出', standard: '≤100 CFU/mL', pass: true },
              { name: '大肠菌群', value: '未检出', standard: '不得检出', pass: true },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="text-gray-700 text-xs">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-600">{item.value}</span>
                  <span className="text-gray-400">{item.standard}</span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${item.pass ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                    {item.pass ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center pt-2">以上检测结果均符合国家标准</p>
        </div>
      </main>
    </div>
  );
}
