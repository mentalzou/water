import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, User, Phone, Calendar } from 'lucide-react';
import { distributorApi } from '../../api/distributor.api';

function getDistributorUser(): any {
  try { return JSON.parse(localStorage.getItem('distributor_user') || '{}'); }
  catch { return {}; }
}

export default function DownlinesPage() {
  const navigate = useNavigate();
  const user = getDistributorUser();
  const distributorId = user.distributorId || '';

  const [downlines, setDownlines] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!distributorId) { setLoading(false); return; }
    loadDownlines();
  }, [distributorId, page]);

  async function loadDownlines() {
    setLoading(true);
    try {
      const res: any = await distributorApi.getDownlines(distributorId, page, pageSize);
      if (res.code === 200) {
        const list = res.data?.data || res.data || [];
        setDownlines(Array.isArray(list) ? list : []);
        setTotal(res.pagination?.total || list.length || 0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-8 px-5 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">我的客户</h1>
        </div>
        <p className="text-white/70 text-sm">通过您的推广链接注册的客户</p>
      </header>

      <main className="px-4 py-6 space-y-4 pb-8">
        {/* Stats */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">下线客户</p>
              <p className="text-2xl font-bold text-gray-800">{total}</p>
            </div>
          </div>
        </div>

        {/* Downline List */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-water/30 border-t-water rounded-full animate-spin" /></div>
        ) : downlines.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">暂无下线客户</p>
            <p className="text-gray-300 text-xs mt-1">分享推广链接，客户通过链接注册后自动成为您的下线</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {downlines.map((dl) => (
                <div key={dl.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {dl.name || dl.phone}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="w-3 h-3" />{dl.phone}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {dl.created_at ? new Date(dl.created_at).toLocaleDateString('zh-CN') : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm disabled:opacity-40"
                >上一页</button>
                <span className="text-sm text-gray-500">{page} / {Math.ceil(total / pageSize)}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm disabled:opacity-40"
                >下一页</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
