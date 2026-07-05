import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Upload, TrendingUp, RefreshCw, FileText } from 'lucide-react';
import { getCommissions, getCommissionStats, exportCommissions, exportPayoutRecord, importPayoutRecord } from '../../api/admin.api';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待结算', color: 'bg-yellow-100 text-yellow-700' },
  settled: { label: '已结算', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

/** 格式化日期为 YYYY-MM-DD */
function fmtDate(d: string): string {
  if (!d) return '-';
  return d.slice(0, 10);
}

/** 格式化日期时间 */
function fmtDateTime(d: string): string {
  if (!d) return '-';
  return d.slice(0, 10) + ' ' + d.slice(11, 19);
}

export default function AdminCommissionManage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Filters
  const [orderNo, setOrderNo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [payoutStartDate, setPayoutStartDate] = useState('');
  const [payoutEndDate, setPayoutEndDate] = useState('');

  // Stats
  const [stats, setStats] = useState({ total_order_amount: 0, total_count: 0, total_commission: 0 });

  // Import modal
  const [importModal, setImportModal] = useState(false);
  const [importBatchNo, setImportBatchNo] = useState('');
  const [importPayoutDate, setImportPayoutDate] = useState('');
  const [importing, setImporting] = useState(false);

  // Payout export
  const [payoutExporting, setPayoutExporting] = useState(false);

  const buildParams = useCallback(() => {
    const p: Record<string, any> = {};
    if (orderNo) p.order_no = orderNo;
    if (startDate) p.start_date = startDate;
    if (endDate) p.end_date = endDate;
    if (statusFilter) p.status = statusFilter;
    if (payoutStartDate) p.payout_start_date = payoutStartDate;
    if (payoutEndDate) p.payout_end_date = payoutEndDate;
    return p;
  }, [orderNo, startDate, endDate, statusFilter, payoutStartDate, payoutEndDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = buildParams();
      const [listRes, statsRes]: any[] = await Promise.all([
        getCommissions({ ...p, page, pageSize }),
        getCommissionStats(p),
      ]);
      if (listRes.code === 200) {
        setRecords(listRes.data || []);
        setTotal(listRes.pagination?.total || 0);
      }
      if (statsRes.code === 200) {
        setStats(statsRes.data);
      }
    } catch (e: any) {
      console.error('加载佣金数据失败:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, buildParams]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = () => { setPage(1); loadData(); };

  const handleReset = () => {
    setOrderNo(''); setStartDate(''); setEndDate('');
    setStatusFilter(''); setPayoutStartDate(''); setPayoutEndDate('');
    setPage(1);
  };

  // 导出佣金明细
  const handleExportDetail = async () => {
    try {
      const p = buildParams();
      const res: any = await exportCommissions(p);
      const blob = res instanceof Blob ? res : new Blob([res]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dn1 = new Date(); a.download = `commission_detail_${dn1.getFullYear()}-${String(dn1.getMonth()+1).padStart(2,'0')}-${String(dn1.getDate()).padStart(2,'0')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('导出失败：' + (e.message || '未知错误'));
    }
  };

  // 导出打款记录
  const handleExportPayout = async () => {
    setPayoutExporting(true);
    try {
      const p = buildParams();
      const res: any = await exportPayoutRecord(p);
      const blob = res instanceof Blob ? res : new Blob([res]);
      // 检查是否报错（后端返回 JSON 错误）
      if (blob.type === 'application/json') {
        const text = await blob.text();
        const json = JSON.parse(text);
        alert(json.message || '导出失败');
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dn2 = new Date(); a.download = `payout_record_${dn2.getFullYear()}-${String(dn2.getMonth()+1).padStart(2,'0')}-${String(dn2.getDate()).padStart(2,'0')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('导出打款记录失败：' + (e.message || '未知错误'));
    } finally {
      setPayoutExporting(false);
    }
  };

  // 导入打款记录
  const handleImport = async () => {
    if (!importBatchNo || !importPayoutDate) {
      alert('请填写打款编号和打款日期');
      return;
    }
    setImporting(true);
    try {
      const res: any = await importPayoutRecord({ batch_no: importBatchNo, payout_date: importPayoutDate });
      if (res.code === 200) {
        alert(res.message || `结算完成，共 ${res.data?.settled || 0} 笔佣金已结算`);
        setImportModal(false);
        setImportBatchNo('');
        setImportPayoutDate('');
        loadData();
      } else {
        alert(res.message || '导入失败');
      }
    } catch (e: any) {
      alert('导入失败：' + (e.message || '未知错误'));
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">佣金管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理分销商返佣明细与结算</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">订单金额合计</p>
              <p className="text-xl font-bold text-gray-800">¥{stats.total_order_amount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">交易笔数</p>
              <p className="text-xl font-bold text-gray-800">{stats.total_count}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">返佣金额合计</p>
              <p className="text-xl font-bold text-green-600">¥{stats.total_commission.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">订单号</label>
            <input
              type="text" value={orderNo} onChange={e => setOrderNo(e.target.value)}
              placeholder="搜索订单号" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">交易时间（开始）</label>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">交易时间（结束）</label>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">返佣状态</label>
            <select
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">全部</option>
              <option value="pending">待结算</option>
              <option value="settled">已结算</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">打款日期（开始）</label>
            <input
              type="date" value={payoutStartDate} onChange={e => setPayoutStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">打款日期（结束）</label>
            <input
              type="date" value={payoutEndDate} onChange={e => setPayoutEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
        </div>

        {/* 操作按钮栏 */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* 左侧：查询相关 */}
          <div className="flex items-center gap-2">
            <button
                onClick={handleSearch}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium shadow-sm"
            >
              <Search className="w-4 h-4"/> 查询
            </button>
            <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4"/> 重置
            </button>
            <button
                onClick={handleExportDetail}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4"/> 生成打款明细
            </button>
            <button
                onClick={handleExportPayout}
                disabled={payoutExporting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4"/> {payoutExporting ? '生成中...' : '打款明细'}
            </button>
            <button
                onClick={() => setImportModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium shadow-sm"
            >
              <Upload className="w-4 h-4"/> 导入打款记录
            </button>
          </div>

          {/* 右侧：导出/导入操作 */}
          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">

          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-3 border-cyan-200 border-t-cyan-500 rounded-full animate-spin"/>
            </div>
        ) : records.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
              <p className="text-gray-400">暂无佣金记录</p>
            </div>
        ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">订单号</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">订单金额</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">返佣比例</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">返佣金额</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">交易时间</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">返佣所属分销商</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">返佣状态</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">打款日期</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">打款批次</th>
                  </tr>
                  </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r: any) => {
                    const st = statusMap[r.status] || statusMap.pending;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{r.order_no || '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">¥{Number(r.order_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{(r.commission_rate * 100).toFixed(0)}%</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">¥{Number(r.commission_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{fmtDateTime(r.created_at)}</td>
                        <td className="px-4 py-3 text-gray-700">
                          <span>{r.distributor_name || '-'}</span>
                          {r.distributor_phone && <span className="text-gray-400 ml-2 text-xs">{r.distributor_phone}</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(r.payout_date)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{r.payout_batch_no || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">共 {total} 条记录</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600">{page} / {totalPages || 1}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">导入打款记录</h2>
              <button onClick={() => !importing && setImportModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-lg">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">打款编号 <span className="text-red-500">*</span></label>
                <input
                  type="text" value={importBatchNo} onChange={e => setImportBatchNo(e.target.value)}
                  placeholder="如导出的打款编号" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <p className="text-xs text-gray-400 mt-1">请输入从"导出打款记录"CSV文件中的打款编号</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">打款日期 <span className="text-red-500">*</span></label>
                <input
                  type="date" value={importPayoutDate} onChange={e => setImportPayoutDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                导入后，所有"待结算"的佣金记录将被标记为"已结算"，同时分销商可用佣金将转入冻结佣金。
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setImportModal(false)}
                disabled={importing}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-sm font-medium hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50"
              >
                {importing ? '处理中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
