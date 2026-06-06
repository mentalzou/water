import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

function SettingsIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState({
    commission_type: 'percentage',
    commission_rate: '5',
    site_name: '武夷屿都山水',
  });
  const [saved, setSaved] = useState(false);

  const isPercentage = configs.commission_type === 'percentage';
  const exampleAmount = 100;
  const commissionExample = isPercentage ? (exampleAmount * parseFloat(configs.commission_rate || '0') / 100) : parseFloat(configs.commission_rate || '0');

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-3xl mx-auto">
        <div className="mb-8"><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><SettingsIcon className="w-7 h-7 text-water" /> 系统配置</h1><p className="text-gray-500 mt-1">管理返佣规则、支付参数等系统设置</p></div>

        {/* Commission Config */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-water/5 to-cyan-50/50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">💰 返佣规则配置</h2>
            <p className="text-xs text-gray-400 mt-1">设置分销商推广返佣的计算方式</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2.5">返佣类型</label>
              <div className="flex gap-3">
                {(['percentage', 'fixed'] as const).map(type => (
                  <button key={type} onClick={() => setConfigs({...configs, commission_type: type})}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all flex flex-col items-center gap-1.5 ${configs.commission_type === type ? 'border-water bg-water/5 text-water' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <span className="text-lg">{type === 'percentage' ? '%' : '¥'}</span>
                    <span>{type === 'percentage' ? '按百分比' : '固定金额'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rate input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{isPercentage ? '返佣比例 (%)' : '返佣金额 (元)'}</label>
              <input
                type="number"
                value={configs.commission_rate}
                onChange={e => setConfigs({...configs, commission_rate: e.target.value})}
                min="0"
                step={isPercentage ? 0.1 : 0.01}
                className="w-full max-w-xs px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-water/30 text-lg font-semibold"
                placeholder={isPercentage ? '如：5 表示5%' : '如：2.50'}
              />
            </div>

            {/* Preview */}
            <div className="bg-primary-50/80 rounded-xl p-4 border border-water/10">
              <p className="text-xs text-gray-500 mb-2 font-medium">📊 效果预览</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">假设订单金额为</p>
                  <p className="text-lg font-bold text-gray-800">¥{exampleAmount}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">分销商可得</p>
                  <p className="text-xl font-bold text-green-600">+¥{commissionExample.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">计算公式</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {isPercentage ? `¥${exampleAmount} × ${parseFloat(configs.commission_rate||'0')}% = ¥${commissionExample.toFixed(2)}` : `固定 ¥${commissionExample.toFixed(2)}/单`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Config */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800 flex items-center gap-2">🔐 微信支付配置</h2></div>
          <div className="p-6 space-y-4">
            {[
              { label: 'AppID', key: 'wx_app_id', placeholder: '微信开放平台 AppID', mask: true },
              { label: '商户号 (MchId)', key: 'wx_mch_id', placeholder: '微信支付商户号', mask: true },
              { label: 'API v3 密钥', key: 'wx_api_key', placeholder: '微信支付API v3密钥', mask: true },
            ].map(({ label, key, placeholder, mask }) => (
              <div key={key}><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label><input type={mask?'password':'text'} placeholder={placeholder} className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"/></div>
            ))}
          </div>
        </div>

        {/* Site Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800 flex items-center gap-2">🌐 站点信息</h2></div>
          <div className="p-6 space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">站点名称</label>
              <input value={configs.site_name} onChange={e=>setConfigs({...configs,site_name:e.target.value})} className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"/></div>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saved}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base shadow-lg transition-all ${saved ? 'bg-green-500 text-white shadow-green-200/50' : 'bg-water text-white hover:bg-water-dark shadow-water/30 active:scale-[0.98]'}`}>
          {saved ? (<><CheckCircle2 className="w-5 h-5" />保存成功！</>) : (<><Save className="w-5 h-5" />保存配置</>)}
        </button>
      </div>
  );
}
