import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Server, Trash2, RefreshCw, Plus, Edit2, X } from 'lucide-react';
import { getDeliveryFeeRules, createDeliveryFeeRule, updateDeliveryFeeRule, deleteDeliveryFeeRule } from '../../api/admin.api';

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

  // 合利宝终端信息
  const [terminalInfo, setTerminalInfo] = useState<any>(null);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalDeleting, setTerminalDeleting] = useState(false);

  // 配送费规则
  const [feeRules, setFeeRules] = useState<any[]>([]);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleForm, setRuleForm] = useState({ building_type: 'stairs', floor_from: 1, floor_to: 1, fee: 0 });

  const isPercentage = configs.commission_type === 'percentage';
  const exampleAmount = 100;
  const commissionExample = isPercentage ? (exampleAmount * parseFloat(configs.commission_rate || '0') / 100) : parseFloat(configs.commission_rate || '0');

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  function getToken(): string {
    return localStorage.getItem('admin_token') || '';
  }

  async function fetchConfigs() {
    try {
      const res = await fetch(`${API_BASE}/admin/configs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        const grouped = data.data || {};
        // 从分组结构中提取 flat key-value
        const configMap: Record<string, string> = {};
        for (const group of Object.values(grouped) as any[]) {
          for (const item of group) {
            configMap[item.key] = String(item.value);
          }
        }
        setConfigs(prev => ({
          commission_type: configMap.commission_type || prev.commission_type,
          commission_rate: configMap.commission_rate || prev.commission_rate,
          site_name: configMap.site_name || prev.site_name,
        }));
      }
    } catch (e) {
      console.error('获取配置失败', e);
    }
  }

  async function fetchTerminalInfo() {
    setTerminalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/helipay/terminal`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        setTerminalInfo(data.data);
      }
    } catch (e) {
      console.error('获取终端信息失败', e);
    } finally {
      setTerminalLoading(false);
    }
  }

  async function deleteTerminal() {
    if (!confirm('确定要删除合利宝终端信息吗？\n\n删除后，下次支付时将自动重新获取终端和通信密钥。')) return;
    setTerminalDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/helipay/terminal`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        alert(data.message || '已删除');
        setTerminalInfo({ exists: false });
      } else {
        alert(data.message || '删除失败');
      }
    } catch (e: any) {
      alert('删除失败: ' + (e.message || '网络错误'));
    } finally {
      setTerminalDeleting(false);
    }
  }

  async function fetchFeeRules() {
    try {
      const res: any = await getDeliveryFeeRules();
      if (res.code === 200) setFeeRules(res.data || []);
    } catch (e) { console.error('获取配送费规则失败', e); }
  }

  async function handleCreateRule() {
    try {
      const res: any = await createDeliveryFeeRule(ruleForm);
      if (res.code === 200) {
        setEditingRule(null);
        setRuleForm({ building_type: 'stairs', floor_from: 1, floor_to: 1, fee: 0 });
        fetchFeeRules();
      } else { alert(res.message || '创建失败'); }
    } catch (e: any) { alert('创建失败: ' + (e.message || '网络错误')); }
  }

  async function handleUpdateRule() {
    if (!editingRule?.id) return;
    try {
      const res: any = await updateDeliveryFeeRule(editingRule.id, ruleForm);
      if (res.code === 200) {
        setEditingRule(null);
        setRuleForm({ building_type: 'stairs', floor_from: 1, floor_to: 1, fee: 0 });
        fetchFeeRules();
      } else { alert(res.message || '更新失败'); }
    } catch (e: any) { alert('更新失败: ' + (e.message || '网络错误')); }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm('确定删除该规则？')) return;
    try {
      const res: any = await deleteDeliveryFeeRule(id);
      if (res.code === 200) fetchFeeRules();
      else alert(res.message || '删除失败');
    } catch (e: any) { alert('删除失败: ' + (e.message || '网络错误')); }
  }

  function startEditRule(rule: any) {
    setEditingRule(rule);
    setRuleForm({
      building_type: rule.building_type || 'stairs',
      floor_from: rule.floor_from ?? 1,
      floor_to: rule.floor_to ?? 1,
      fee: rule.fee ?? 0,
    });
  }

  function cancelEditRule() {
    setEditingRule(null);
    setRuleForm({ building_type: 'stairs', floor_from: 1, floor_to: 1, fee: 0 });
  }

  useEffect(() => {
    fetchConfigs();
    fetchTerminalInfo();
    fetchFeeRules();
  }, []);

  async function handleSave() {
    try {
      const token = getToken();
      const configsToSave = [
        { key: 'commission_type', value: configs.commission_type },
        { key: 'commission_rate', value: configs.commission_rate },
        { key: 'site_name', value: configs.site_name },
      ];

      for (const cfg of configsToSave) {
        const res = await fetch(`${API_BASE}/admin/configs`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(cfg),
        });
        const data = await res.json();
        if (data.code !== 200) {
          alert(`保存 ${cfg.key} 失败: ${data.message || '未知错误'}`);
          return;
        }
      }

      // 保存后从服务端刷新，确保显示的是实际持久化的值
      await fetchConfigs();

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert('保存失败: ' + (e.message || '网络错误'));
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
        <div className="mb-8"><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><SettingsIcon className="w-7 h-7 text-water" /> 系统配置</h1><p className="text-gray-500 mt-1">管理返佣规则、支付参数等系统设置</p></div>

        {/* Commission Config */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-water/5 to-cyan-50/50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">💰 返佣规则配置（全局默认）</h2>
            <p className="text-xs text-gray-400 mt-1">未设置个性化规则的分销商将使用此默认返佣方式。可在分销商管理页面为每位分销商单独配置。</p>
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

        {/* Helipay Terminal Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50/80 to-orange-50/50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Server className="w-4.5 h-4.5 text-orange-500" /> 合利宝终端信息
            </h2>
            <p className="text-xs text-gray-400 mt-1">商户号对应的终端和通信密钥缓存状态</p>
          </div>

          <div className="p-6">
            {terminalLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-water rounded-full animate-spin" />
                加载中...
              </div>
            ) : !terminalInfo || !terminalInfo.exists ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                  <Server className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-1">尚未获取终端信息</p>
                <p className="text-xs text-gray-400">首次支付时将自动获取并缓存</p>
                <button onClick={fetchTerminalInfo} className="mt-3 text-xs text-water hover:underline flex items-center gap-1 mx-auto">
                  <RefreshCw className="w-3 h-3" /> 刷新
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 终端基本信息 */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    { label: '终端号 (SN)', value: terminalInfo.terminal?.snNo },
                    { label: '商户号', value: terminalInfo.terminal?.merchantNo },
                    { label: '商户名称', value: terminalInfo.terminal?.merchantName },
                    { label: '用户名', value: terminalInfo.terminal?.userName },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm font-mono text-gray-700">{value || '-'}</p>
                    </div>
                  ))}
                </div>

                {/* 密钥信息（脱敏） */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 mb-2">通信密钥（脱敏显示）</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">SECRET_KEY</p>
                      <p className="text-sm font-mono text-gray-600">{terminalInfo.keys?.secretKey || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">SIGN_KEY</p>
                      <p className="text-sm font-mono text-gray-600">{terminalInfo.keys?.signKey || '-'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">更新时间：{terminalInfo.keys?.updatedTime || '-'}</p>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={fetchTerminalInfo}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                    <RefreshCw className="w-3 h-3" /> 刷新
                  </button>
                  <button onClick={deleteTerminal} disabled={terminalDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {terminalDeleting ? (
                      <div className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    删除终端缓存
                  </button>
                </div>
              </div>
            )}
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

        {/* Delivery Fee Rules */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50/80 to-emerald-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">🚚 配送费规则配置</h2>
                <p className="text-xs text-gray-400 mt-1">按楼房类型和楼层范围设置配送费，未配置的楼层配送费为 0</p>
              </div>
              {!editingRule && (
                <button onClick={() => startEditRule({})}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-water text-white hover:bg-water-dark transition-colors">
                  <Plus className="w-3.5 h-3.5" />新增规则
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Rules List */}
            {feeRules.length === 0 && !editingRule ? (
              <div className="text-center py-8 text-gray-400 text-sm">暂无配送费规则，点击"新增规则"添加</div>
            ) : (
              <div className="space-y-2 mb-4">
                {['stairs', 'elevator'].map(type => {
                  const typeRules = feeRules.filter((r: any) => r.building_type === type);
                  if (typeRules.length === 0) return null;
                  return (
                    <div key={type} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                        {type === 'stairs' ? '🏢 楼梯房' : '🛗 电梯房'}
                      </div>
                      <div className="divide-y divide-gray-50">
                        {typeRules.map((rule: any) => (
                          <div key={rule.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {rule.floor_from === rule.floor_to ? `${rule.floor_from}层` : `${rule.floor_from}-${rule.floor_to}层`}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-800">{rule.fee > 0 ? `¥${Number(rule.fee).toFixed(2)}` : '免费'}</span>
                              <button onClick={() => startEditRule(rule)} className="text-blue-500 hover:text-blue-700"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteRule(rule.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add / Edit Form */}
            {editingRule && (
              <div className="border border-water/30 rounded-xl p-4 bg-water/5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">{editingRule.id ? '编辑规则' : '新增规则'}</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">楼房类型 *</label>
                    <select value={ruleForm.building_type} onChange={e => setRuleForm({...ruleForm, building_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 ring-water/30">
                      <option value="stairs">楼梯房</option>
                      <option value="elevator">电梯房</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">配送费 (元)</label>
                    <input type="number" value={ruleForm.fee} onChange={e => setRuleForm({...ruleForm, fee: parseFloat(e.target.value) || 0})}
                      min="0" step="0.01" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 ring-water/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">起始楼层</label>
                    <input type="number" value={ruleForm.floor_from} onChange={e => setRuleForm({...ruleForm, floor_from: parseInt(e.target.value) || 1})}
                      min="1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 ring-water/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">结束楼层</label>
                    <input type="number" value={ruleForm.floor_to} onChange={e => setRuleForm({...ruleForm, floor_to: parseInt(e.target.value) || 1})}
                      min="1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 ring-water/30" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={editingRule.id ? handleUpdateRule : handleCreateRule}
                    className="px-4 py-2 bg-water text-white rounded-lg text-sm font-medium hover:bg-water-dark transition-colors">
                    {editingRule.id ? '更新' : '创建'}
                  </button>
                  <button onClick={cancelEditRule}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    取消
                  </button>
                </div>
              </div>
            )}
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
