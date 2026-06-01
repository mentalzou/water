import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function PurchaseNoticePage() {
  const navigate = useNavigate();

  const notices = [
    {
      icon: '🏪',
      title: '连锁经营，跨区域可送',
      content: '福州、宁德、莆田、厦门、漳州、泉州六城通用',
    },
    {
      icon: '🕐',
      title: '服务时间',
      content: '周一至周日 8:30-17:30',
    },
    {
      icon: '💳',
      title: '会员水费',
      content: '会员水费可消费本店所有产品，每款水均可享受会员价格（充值水费两年内有效期）',
    },
    {
      icon: '💰',
      title: '充值金额',
      content: '充值金额不计息、不兑现',
    },
    {
      icon: '🏢',
      title: '楼层费收费标准',
      content: '电梯房及五层以下楼梯房免配送费；针对5层及以上无电梯客户，一层加收一元。\n（楼层算法从地面开始算起，如您是**小区504，实际需要地面爬楼梯半截到一层，则按6层算，每桶收2元，以此类推）',
    },
    {
      icon: '⚠️',
      title: '重点提醒',
      content: '您在购买本公司产品时请务必通过本公司微信/支付宝等官方认证收款码。如因客户私自转账给私人账户，导致财产流失与本公司无关，公司不承担赔偿责任。',
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">购买须知</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-3">
        {notices.map((item, index) => (
          <div
            key={index}
            className={`bg-white rounded-2xl shadow-sm p-5 ${
              item.highlight ? 'border-2 border-red-200' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm mb-2 ${item.highlight ? 'text-red-600' : 'text-gray-800'}`}>
                  {item.title}
                </h3>
                <p className={`text-sm leading-relaxed whitespace-pre-line ${item.highlight ? 'text-red-500' : 'text-gray-600'}`}>
                  {item.content}
                </p>
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-4 border border-blue-100 mt-2">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 leading-relaxed">
            以上须知请仔细阅读，下单即表示您已同意以上条款。如有疑问，请联系客服咨询。
          </p>
        </div>
      </main>
    </div>
  );
}
