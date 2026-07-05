import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { customerApi } from '../../api/customer.api';

export default function OrderResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      setStatus('error');
      return;
    }
    loadOrder(id);
  }, [id]);

  async function loadOrder(orderId: string) {
    try {
      const res: any = await customerApi.getOrderById(orderId);
      if (res.code === 200 && res.data) {
        setOrder(res.data);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <Loader className="w-10 h-10 text-water animate-spin" />
          <p className="mt-4 text-gray-500">加载订单状态...</p>
        </div>
    );
  }

  if (status === 'error') {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
          <XCircle className="w-16 h-16 text-red-400" />
          <p className="mt-4 text-gray-700 font-medium">订单加载失败</p>
          <button
              onClick={() => navigate('/', { replace: true })}
              className="mt-6 px-6 py-2 bg-water text-white rounded-full"
          >
            返回首页
          </button>
        </div>
    );
  }

  const isPaid = order?.pay_status === 'paid' || order?.status === 'paid';

  return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {isPaid ? (
              <>
                <CheckCircle className="w-20 h-20 text-green-500" />
                <h1 className="mt-4 text-xl font-bold text-gray-800">支付成功</h1>
              </>
          ) : (
              <>
                <CheckCircle className="w-20 h-20 text-water" />
                <h1 className="mt-4 text-xl font-bold text-gray-800">下单成功</h1>
                <p className="mt-2 text-sm text-gray-500">订单待支付</p>
              </>
          )}

          <div className="mt-8 w-full bg-white rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">订单编号</span>
              <span className="text-gray-800 font-medium">{order?.order_no || id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">支付金额</span>
              <span className="text-water font-bold text-lg">¥{Number(order?.total_amount || 0).toFixed(2)}</span>
            </div>
            {order?.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">含配送费</span>
                <span className="text-gray-500">¥{Number(order.delivery_fee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">订单状态</span>
              <span className={isPaid ? 'text-green-500' : 'text-orange-500'}>
              {isPaid ? '已支付' : '待支付'}
            </span>
            </div>
          </div>

          <div className="mt-8 flex gap-4 w-full">
            <button
                onClick={() => navigate('/orders', { replace: true })}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-full text-sm"
            >
              查看订单
            </button>
            <button
                onClick={() => navigate('/', { replace: true })}
                className="flex-1 py-3 bg-water text-white rounded-full text-sm"
            >
              继续购物
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
  );
}