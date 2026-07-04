import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Wallet, TrendingUp, TrendingDown, Calendar, RefreshCw } from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import BottomNav from '../../components/BottomNav';

interface Transaction {
  id: string;
  user_id: string;
  recharge_id: string;
  tx_type: string;
  amount: number;
  principal_after: number;
  bonus_after: number;
  description: string;
  created_at: string;
}

interface BalanceInfo {
  total_principal: number;
  total_bonus: number;
  total_balance: number;
  totalRecharged: number;
  totalConsumed: number;
}

const TX_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  recharge_principal: { label: '充值本金', color: 'text-green-600', bg: 'bg-green-50' },
  recharge_bonus: { label: '赠送金', color: 'text-blue-600', bg: 'bg-blue-50' },
  consume_principal: { label: '本金消费', color: 'text-orange-600', bg: 'bg-orange-50' },
  consume_bonus: { label: '赠送金消费', color: 'text-orange-600', bg: 'bg-orange-50' },
  refund_principal: { label: '退款(本金)', color: 'text-purple-600', bg: 'bg-purple-50' },
  refund_bonus: { label: '退款(赠送金)', color: 'text-purple-600', bg: 'bg-purple-50' },
  adjust_add: { label: '余额调整(+）', color: 'text-teal-600', bg: 'bg-teal-50' },
  adjust_sub: { label: '余额调整(-）', color: 'text-red-600', bg: 'bg-red-50' },
  bonus_expire: { label: '赠送金过期', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function BalancePage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const isLoggedIn = !!localStorage.getItem('customer_token');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login?from=/profile/balance', { replace: true });
      return;
    }
    fetchBalance();
  }, [isLoggedIn]);

  const fetchBalance = async () => {
    try {
      const res = await customerApi.getUserBalance();
      setBalance(res.data);
    } catch (err) {
      console.error('获取余额失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = useCallback(async (pageNum: number = 1, reset: boolean = true) => {
    setTxLoading(true);
    try {
      const params: any = { page: pageNum, pageSize: 20 };
      if (filterType) params.tx_type = filterType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await customerApi.getMyBalanceTransactions(params);
      const newData = res.data?.data || [];
      const total = res.data?.pagination?.total || 0;

      if (reset) {
        setTransactions(newData);
      } else {
        setTransactions(prev => [...prev, ...newData]);
      }
      setHasMore(transactions.length + newData.length < total);
      setPage(pageNum);
    } catch (err) {
      console.error('获取流水失败:', err);
    } finally {
      setTxLoading(false);
    }
  }, [filterType, startDate, endDate]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchTransactions(1, true);
    }
  }, [isLoggedIn]);

  const handleLoadMore = () => {
    if (!txLoading && hasMore) {
      fetchTransactions(page + 1, false);
    }
  };

  const handleFilter = () => {
    setShowFilter(false);
    fetchTransactions(1, true);
  };

  const handleResetFilter = () => {
    setFilterType('');
    setStartDate('');
    setEndDate('');
    setShowFilter(false);
    fetchTransactions(1, true);
  };

  const formatAmount = (val: number | undefined | null): string => {
    if (val === undefined || val === null) return '0.00';
    return Number(val).toFixed(2);
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-16 px-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-white rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">账户余额</h1>
        </div>

        {/* 余额汇总卡片 */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : balance ? (
            <>
              <p className="text-white/70 text-sm mb-1">账户总余额</p>
              <p className="text-white text-3xl font-bold mb-3">¥{formatAmount(balance.total_balance)}</p>
              <div className="flex gap-4 text-white/80 text-sm">
                <span>本金 ¥{formatAmount(balance.total_principal)}</span>
                <span>|</span>
                <span>赠送金 ¥{formatAmount(balance.total_bonus)}</span>
              </div>
            </>
          ) : (
            <p className="text-white/80 py-4 text-center">暂无余额数据</p>
          )}
        </div>
      </header>

      <main className="px-4 -mt-8 pb-4">
        {/* 累计统计卡片 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-xs text-gray-400">累计充值</span>
              </div>
              <p className="text-lg font-bold text-gray-800">
                ¥{formatAmount(balance?.totalRecharged)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingDown className="w-4 h-4 text-orange-500 mr-1" />
                <span className="text-xs text-gray-400">累计消费</span>
              </div>
              <p className="text-lg font-bold text-gray-800">
                ¥{formatAmount(balance?.totalConsumed)}
              </p>
            </div>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">余额明细</h2>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              filterType || startDate || endDate
                ? 'bg-water text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            筛选
            {(filterType || startDate || endDate) && (
              <span className="w-4 h-4 rounded-full bg-white/30 text-[10px] flex items-center justify-center">!</span>
            )}
          </button>
        </div>

        {/* 筛选面板 */}
        {showFilter && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-3 space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">变动类型</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-water"
              >
                <option value="">全部类型</option>
                <option value="recharge_principal">充值本金</option>
                <option value="recharge_bonus">赠送金</option>
                <option value="consume_principal">本金消费</option>
                <option value="consume_bonus">赠送金消费</option>
                <option value="refund_principal">退款(本金)</option>
                <option value="refund_bonus">退款(赠送金)</option>
                <option value="adjust_add">余额调整(+)</option>
                <option value="adjust_sub">余额调整(-)</option>
                <option value="bonus_expire">赠送金过期</option>
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-water"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:border-water"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetFilter}
                className="flex-1 h-10 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium"
              >
                重置
              </button>
              <button
                onClick={handleFilter}
                className="flex-1 h-10 rounded-lg bg-water text-white text-sm font-medium"
              >
                应用筛选
              </button>
            </div>
          </div>
        )}

        {/* 交易流水列表 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {txLoading && transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-water/30 border-t-water rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <RefreshCw className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">暂无余额变动记录</p>
              <p className="text-xs mt-1">充值后即可查看明细</p>
            </div>
          ) : (
            <>
              {transactions.map((tx, idx) => {
                const typeInfo = TX_TYPE_MAP[tx.tx_type] || { label: tx.tx_type, color: 'text-gray-600', bg: 'bg-gray-50' };
                const isIncome = ['recharge_principal', 'recharge_bonus', 'refund_principal', 'refund_bonus', 'adjust_add'].includes(tx.tx_type);

                return (
                  <div key={tx.id || idx}
                    className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg ${typeInfo.bg} flex items-center justify-center shrink-0`}>
                        <Wallet className={`w-4 h-4 ${typeInfo.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${typeInfo.bg} ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                          {tx.description || '-'}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}{formatAmount(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        本金:¥{formatAmount(tx.principal_after)}
                      </p>
                      <p className="text-xs text-gray-300">
                        赠送:¥{formatAmount(tx.bonus_after)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* 加载更多 */}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={txLoading}
                  className="w-full py-3 text-sm text-gray-400 hover:text-water hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {txLoading ? '加载中...' : '加载更多'}
                </button>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
