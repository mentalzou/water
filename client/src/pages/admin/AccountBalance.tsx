import { useState, useEffect, useCallback } from 'react';
import { Search, Wallet, X, FileText, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { getBalanceTransactions, getUserRechargeBalance } from '../../api/admin.api';

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

interface UserInfo {
  id: string; phone: string; name: string; status: string;
}

interface BalanceSummary {
  userId: string;
  userName: string;
  userPhone: string;
  total_principal: number;
  total_bonus: number;
  total_balance: number;
  recharge_count: number;
  totalRecharged: number;
  totalConsumed: number;
}

interface BalanceRecord {
  id: string;
  user_id: string;
  recharge_id?: string;
  order_id?: string;
  tx_type: string;
  amount: number;
  principal_after: number;
  bonus_after: number;
  description: string;
  created_at: string;
}

const TX_TYPE_MAP: Record<string, { label: string; cls: string }> = {
  recharge_principal: { label: '充值本金', cls: 'bg-emerald-100 text-emerald-700' },
  recharge_bonus: { label: '充值赠送金', cls: 'bg-teal-100 text-teal-700' },
  consume_principal: { label: '本金消费', cls: 'bg-orange-100 text-orange-700' },
  consume_bonus: { label: '赠送金消费', cls: 'bg-amber-100 text-amber-700' },
  refund: { label: '退款', cls: 'bg-blue-100 text-blue-700' },
  adjust: { label: '管理员调整', cls: 'bg-purple-100 text-purple-700' },
  expire: { label: '过期', cls: 'bg-gray-100 text-gray-600' },
};

const AMOUNT_DIRECTION: Record<string, 'in' | 'out'> = {
  recharge_principal: 'in',
  recharge_bonus: 'in',
  consume_principal: 'out',
  consume_bonus: 'out',
  refund: 'in',
  adjust: 'in',
  expire: 'out',
};

export default function AccountBalance() {
  // User search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Selected user
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Transactions
  const [transactions, setTransactions] = useState<BalanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [filterTxType, setFilterTxType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Search users
  const searchUsers = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ keyword: searchTerm.trim(), page: '1', pageSize: '10' });
      const res = await fetch(`${API_BASE}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        const list = data.pagination?.data || data.data || [];
        setSearchResults(list);
        setShowDropdown(list.length > 0);
      }
    } catch { }
    setSearching(false);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchUsers]);

  // Select user and load data
  function selectUser(user: UserInfo) {
    setSelectedUser(user);
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
    setPage(1);
    setFilterTxType('');
    setFilterStartDate('');
    setFilterEndDate('');
    loadBalanceSummary(user.id);
    loadTransactions(user.id, 1, '', '', '');
  }

  function clearUser() {
    setSelectedUser(null);
    setBalanceSummary(null);
    setTransactions([]);
    setTotal(0);
    setPage(1);
  }

  async function loadBalanceSummary(userId: string) {
    setSummaryLoading(true);
    try {
      const res = await getUserRechargeBalance(userId) as any;
      if (res.code === 200) {
        setBalanceSummary(res.data);
      }
    } catch { }
    setSummaryLoading(false);
  }

  async function loadTransactions(userId: string, pg: number, txType: string, startDate: string, endDate: string) {
    setLoading(true);
    try {
      const params: any = { user_id: userId, page: pg, pageSize };
      if (txType) params.tx_type = txType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await getBalanceTransactions(params) as any;
      if (res.code === 200) {
        setTransactions(res.pagination?.data || res.data || []);
        setTotal(res.pagination?.total || res.total || 0);
      }
    } catch { }
    setLoading(false);
  }

  function handleFilter() {
    if (!selectedUser) return;
    setPage(1);
    loadTransactions(selectedUser.id, 1, filterTxType, filterStartDate, filterEndDate);
  }

  function handleResetFilter() {
    setFilterTxType('');
    setFilterStartDate('');
    setFilterEndDate('');
    if (selectedUser) {
      setPage(1);
      loadTransactions(selectedUser.id, 1, '', '', '');
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-500" /> 账户余额
          </h1>
          <p className="text-gray-500 mt-1 text-sm">查看用户充值账户余额及变动明细</p>
        </div>
      </div>

      {/* User Search */}
      {!selectedUser && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">查询用户账户余额</h2>
            <p className="text-sm text-gray-500 mb-6">输入用户姓名或手机号搜索</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="输入姓名或手机号搜索用户..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                autoFocus
              />
              {showDropdown && (
                <ul className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-auto">
                  {searchResults.map(u => (
                    <li
                      key={u.id}
                      onClick={() => selectUser(u)}
                      className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                          {(u.name || u.phone).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{u.name || '-'}</p>
                          <p className="text-xs text-gray-400">{u.phone}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected User View */}
      {selectedUser && (
        <>
          {/* User Info Bar */}
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold">
                {(selectedUser.name || selectedUser.phone).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-800">{selectedUser.name || '-'}</p>
                <p className="text-sm text-gray-400">{selectedUser.phone}</p>
              </div>
            </div>
            <button onClick={clearUser} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" /> 切换用户
            </button>
          </div>

          {/* Balance Summary Cards */}
          {summaryLoading ? (
            <div className="text-center py-12 text-gray-400">加载余额信息中...</div>
          ) : balanceSummary ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 lg:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-gray-500">账户总余额</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">¥{(balanceSummary.total_balance ?? 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500">本金余额</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">¥{(balanceSummary.total_principal ?? 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">{balanceSummary.recharge_count} 笔充值</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm text-gray-500">赠送金余额</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">¥{(balanceSummary.total_bonus ?? 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-500">累计充值</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">¥{(balanceSummary.totalRecharged ?? 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-500">累计消费</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">¥{(balanceSummary.totalConsumed ?? 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
              </div>
            </div>
          ) : null}

          {/* Transaction Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-800">余额变动明细</h3>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={filterTxType}
                  onChange={e => setFilterTxType(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">全部类型</option>
                  <option value="recharge_principal">充值本金</option>
                  <option value="recharge_bonus">充值赠送金</option>
                  <option value="consume_principal">本金消费</option>
                  <option value="consume_bonus">赠送金消费</option>
                  <option value="refund">退款</option>
                  <option value="adjust">管理员调整</option>
                  <option value="expire">过期</option>
                </select>
                <div className="flex items-center gap-1.5">
                  <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                    className="px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                  <span className="text-sm text-gray-400">至</span>
                  <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                    className="px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                </div>
                <button onClick={handleFilter}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                  <Search className="w-3.5 h-3.5" /> 查询
                </button>
                <button onClick={handleResetFilter}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  重置
                </button>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="overflow-auto">
              {loading ? (
                <div className="text-center py-16 text-gray-400">加载中...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">暂无余额变动记录</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">变动类型</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">变动金额</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">本金余额</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">赠送金余额</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">说明</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((rec) => {
                      const typeInfo = TX_TYPE_MAP[rec.tx_type] || { label: rec.tx_type, cls: 'bg-gray-100 text-gray-700' };
                      const dir = AMOUNT_DIRECTION[rec.tx_type] || 'in';
                      const principalAfter = rec.principal_after ?? 0;
                      const bonusAfter = rec.bonus_after ?? 0;
                      const localTime = rec.created_at ? new Date(rec.created_at) : null;
                      const timeStr = localTime && !isNaN(localTime.getTime())
                        ? `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate()).padStart(2, '0')} ${String(localTime.getHours()).padStart(2, '0')}:${String(localTime.getMinutes()).padStart(2, '0')}:${String(localTime.getSeconds()).padStart(2, '0')}`
                        : '';
                      return (
                        <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${typeInfo.cls}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className={`px-6 py-3.5 text-right font-mono text-sm font-medium ${dir === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {dir === 'in' ? '+' : '-'}¥{(rec.amount ?? 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-sm text-gray-700">¥{principalAfter.toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-right font-mono text-sm text-gray-700">¥{bonusAfter.toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-500 max-w-[220px] truncate" title={rec.description}>{rec.description}</td>
                          <td className="px-6 py-3.5 text-right text-sm text-gray-400 whitespace-nowrap">{timeStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {total > pageSize ? `第 ${page}/${totalPages} 页，` : ''}共 {total} 条
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { const p = page - 1; setPage(p); loadTransactions(selectedUser.id, p, filterTxType, filterStartDate, filterEndDate); }}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >上一页</button>
                  <button
                    onClick={() => { const p = page + 1; setPage(p); loadTransactions(selectedUser.id, p, filterTxType, filterStartDate, filterEndDate); }}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >下一页</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
