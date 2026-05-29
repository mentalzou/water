import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Gift, TrendingUp, Calendar, Info } from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import BottomNav from '../../components/BottomNav';

interface PointsInfo {
  points: number;
  earnRate: number;
  minOrderAmount: number;
}

interface PointsRecord {
  id: string;
  change_type: string;
  change_amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export default function PointsPage() {
  const navigate = useNavigate();
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
  const [records, setRecords] = useState<PointsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPointsInfo();
    loadPointsRecords();
  }, []);

  async function loadPointsInfo() {
    try {
      const response: any = await customerApi.getMyPoints();
      console.log('API完整响应:', response);

      // 正确提取嵌套的data字段
      const data = response.data;
      console.log('积分数据:', data);

      setPointsInfo(data);
    } catch (error) {
      console.error('加载积分信息失败:', error);
    }
  }

  async function loadPointsRecords() {
    try {
      setLoading(true);
      const data = await customerApi.getMyPointsRecords(page, 20);
      console.log('积分信息响应:', data);
      if (data && data.data) {
        if (page === 1) {
          setRecords(data.data || []);
        } else {
          setRecords(prev => [...prev, ...(data.data || [])]);
        }
        setHasMore(data.data && data.data.length >= 20);
      }
    } catch (error) {
      console.error('加载积分记录失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }

  useEffect(() => {
    if (page > 1) {
      loadPointsRecords();
    }
  }, [page]);

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      earn: '获得',
      spend: '使用',
      refund: '退款',
      adjust: '调整',
      expire: '过期',
    };
    return labels[type] || type;
  }

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      earn: 'text-green-500',
      spend: 'text-red-500',
      refund: 'text-blue-500',
      adjust: 'text-purple-500',
      expire: 'text-gray-500',
    };
    return colors[type] || 'text-gray-500';
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  return (
      <div className="min-h-screen bg-primary-50 pb-20">
        {/* Header */}
        <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-24 px-5">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-white rotate-180" />
            </button>
            <h1 className="text-xl font-bold text-white">我的积分</h1>
          </div>

          {/* 积分卡片 */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/80 text-sm mb-1">当前积分</p>
                <p className="text-white text-4xl font-bold">{pointsInfo?.points || 0}</p>
              </div>
              <Gift className="w-16 h-16 text-white/30" />
            </div>
            <div className="flex gap-4 text-sm text-white/80">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>每消费{pointsInfo?.earnRate || 1}元得1积分</span>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 -mt-12 pb-8">
          {/* 积分说明 */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-water mt-0.5 shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-1">积分规则</p>
                <p>• 订单完成后自动获得积分</p>
                <p>• 消费{pointsInfo?.earnRate || 1}元获得1积分</p>
                {pointsInfo?.minOrderAmount ? (
                    <p>• 订单满{pointsInfo.minOrderAmount}元可获得积分</p>
                ) : (
                    <p>• 无最低消费限制</p>
                )}
              </div>
            </div>
          </div>

          {/* 积分记录 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">积分记录</h2>
            </div>

            {records.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>暂无积分记录</p>
                </div>
            ) : (
                <div>
                  {records.map(record => (
                      <div key={record.id} className="px-4 py-3 border-b border-gray-50 last:border-b-0">
                        <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${getTypeColor(record.change_type)}`}>
                      {record.change_type === 'earn' || record.change_type === 'adjust' || record.change_type === 'refund' ? '+' : '-'}{record.change_amount}
                    </span>
                          <span className="text-xs text-gray-400">{formatDate(record.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{record.description}</p>
                        <p className="text-xs text-gray-400">余额: {record.balance_after}</p>
                      </div>
                  ))}

                  {hasMore && !loading && (
                      <button
                          onClick={loadMore}
                          className="w-full py-3 text-center text-water text-sm hover:bg-gray-50 transition-colors"
                      >
                        加载更多
                      </button>
                  )}

                  {loading && (
                      <div className="py-4 text-center text-gray-400 text-sm">
                        加载中...
                      </div>
                  )}
                </div>
            )}
          </div>
        </main>

        <BottomNav />
      </div>
  );
}
