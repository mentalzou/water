import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, DollarSign, Building2, User, CreditCard, Clock, CheckCircle, XCircle, Ban } from 'lucide-react';
import { distributorApi } from '../../api/distributor.api';

function getDistributorUser(): any {
  try { return JSON.parse(localStorage.getItem('distributor_user') || '{}'); }
  catch { return {}; }
}

const statusMap: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: '待审核', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  approved: { label: '已审核', icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
  rejected: { label: '已拒绝', icon: XCircle, color: 'text-red-600 bg-red-50' },
  paid: { label: '已打款', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
};

export default function WithdrawPage() {
  const navigate = useNavigate();
  const user = getDistributorUser();
  const distributorId = user.distributorId || '';

  const [summary, setSummary] = useState<{ available_commission: number; frozen_commission: number } | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 提现表单
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    if (!distributorId) { setLoading(false); return; }
    loadData();
  }, [distributorId]);

  async function loadData() {
    try {
      const [sumRes, recRes]: any[] = await Promise.all([
        distributorApi.getCommissionSummary(distributorId),
        distributorApi.getWithdrawRecords(distributorId),
      ]);
      if (sumRes?.code === 200) setSummary(sumRes.data);
      if (recRes?.code === 200) setRecords(recRes.data?.data || recRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { alert('请输入有效的提现金额'); return; }
    if (!summary || amt > summary.available_commission) { alert('可提现余额不足'); return; }

    setSubmitting(true);
    try {
      const res: any = await distributorApi.requestWithdraw(distributorId, {
        amount: amt,
        bank_name: bankName,
        bank_account: bankAccount,
        account_name: accountName,
      });
      if (res.code === 200) {
        alert('提现申请已提交，请等待审核');
        setShowForm(false);
        setAmount('');
        setBankName('');
        setBankAccount('');
        setAccountName('');
        loadData();
      } else {
        alert(res.message || '提现申请失败');
      }
    } catch (err: any) {
      alert(err.message || '提现申请失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-8 px-5 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">佣金提现</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 pb-8">
        {/* Balance */}
        {summary && (
          <div className="bg-white rounded-2xl p-6 shadow-sm grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">可提现</p>
              <p className="text-2xl font-bold text-green-600">¥{summary.available_commission.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">冻结中</p>
              <p className="text-2xl font-bold text-gray-400">¥{summary.frozen_commission.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Withdraw Button */}
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!summary || summary.available_commission <= 0}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-semibold shadow-lg shadow-green-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wallet className="inline w-5 h-5 mr-2" />
          申请提现
        </button>

        {/* Withdraw Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">提现信息</h3>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">提现金额 (¥)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder={`最大可提 ${summary?.available_commission.toFixed(2) || 0}`}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 ring-green-300" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">开户银行</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                  placeholder="如：中国工商银行" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 ring-green-300" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">银行卡号</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                  placeholder="请输入银行卡号" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 ring-green-300" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">持卡人姓名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                  placeholder="请输入持卡人姓名" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 ring-green-300" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-600">取消</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {submitting ? '提交中...' : '确认提现'}
              </button>
            </div>
          </div>
        )}

        {/* Withdraw Records */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">提现记录</h3>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-water/30 border-t-water rounded-full animate-spin" /></div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <Ban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">暂无提现记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const s = statusMap[r.status] || statusMap.pending;
                const Icon = s.icon;
                return (
                  <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">¥{r.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleString('zh-CN')}</p>
                      {r.remark && <p className="text-xs text-red-400 mt-1">{r.remark}</p>}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${s.color}`}>
                      <Icon className="w-3 h-3" />{s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
