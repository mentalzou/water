import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Droplets, MapPin, Phone, ShoppingCart, CheckCircle2, Plus, Minus, User } from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import { useAppStore } from '../../stores/store';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
}

interface SelectedItem {
  product: Product;
  quantity: number;
}

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { distributorCode, setDistributorCode } = useAppStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [distributorInfo, setDistributorInfo] = useState<any>(null);

  useEffect(() => {
    // 检查登录状态，未登录跳转登录页
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate(`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }

    // 从登录信息预填手机号和姓名
    const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
    if (user.phone) setPhone(user.phone);
    if (user.name) setCustomerName(user.name);

    // Get distributor code from URL
    const code = searchParams.get('distributor_code');
    if (code) {
      setDistributorCode(code);
      fetchDistributorInfo(code);
    }

    // Load products
    customerApi.getProducts().then((res: any) => {
      if (res.code === 200 && res.data?.length > 0) {
        setProducts(res.data);
      }
    });
  }, []);

  async function fetchDistributorInfo(code: string) {
    try {
      const res = await import('../../api/distributor.api').then(m => m.distributorApi.getInfo(code));
      if ((res as any).code === 200) {
        setDistributorInfo((res as any).data);
      }
    } catch { /* ignore */ }
  }

  /** 选中的商品列表（带数量） */
  const selectedItems = useMemo(() => {
    return products.filter(p => selectedIds.has(p.id)).map(p => ({
      product: p,
      quantity: itemQuantities[p.id] || 1,
    }));
  }, [products, selectedIds, itemQuantities]);

  /** 合计金额 */
  const totalAmount = useMemo(() => {
    return Math.round(selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100) / 100;
  }, [selectedItems]);

  /** 切换选中 */
  function toggleSelect(productId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    // 选中时默认数量为1
    setItemQuantities(prev => ({ ...prev, [productId]: prev[productId] || 1 }));
  }

  /** 调整单个商品数量 */
  function updateQty(productId: string, delta: number) {
    setItemQuantities(prev => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0 || !phone || !address) return;

    setSubmitting(true);
    try {
      // 构建商品列表（一次创建含多商品的订单）
      const orderItems = selectedItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const orderRes: any = await customerApi.createOrder({
        customer_phone: phone,
        customer_name: customerName,
        address,
        items: orderItems,
        distributor_code: distributorCode || undefined,
      });

      if (orderRes.data?.id) {
        const payRes: any = await customerApi.payForOrder(orderRes.data.id);
        setOrderResult(payRes.data || orderRes.data);
      } else {
        alert(orderRes.message || '下单失败');
      }
    } catch (err: any) {
      alert(err.message || '下单失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (orderResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">下单成功</h2>
        <p className="text-gray-500 text-sm mb-2">订单号：{orderResult.order_no}</p>
        <p className="text-gray-500 mb-8">我们将尽快安排配送</p>

        {distributorInfo && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 mb-6 w-full max-w-sm text-center">
            <span className="text-blue-600 text-sm">感谢通过 {distributorInfo.user_name} 的推荐购买</span>
          </div>
        )}

        <button
          onClick={() => navigate('/orders', { state: { phone } })}
          className="w-full max-w-sm bg-gradient-to-r from-water-light to-water text-white py-3.5 rounded-2xl font-medium text-base shadow-lg shadow-water/30 active:scale-[0.98] transition-transform"
        >
          查看我的订单
        </button>
        
        <button
          onClick={() => { setOrderResult(null); }}
          className="mt-4 text-water font-medium"
        >
          继续购买
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white pb-24">
      {/* Header */}
      <header className="relative pt-12 pb-20 px-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-water-light via-water to-teal-400" />
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,64 C360,120 720,40 1080,80 C1260,96 1380,88 1440,84 L1440,120 L0,120 Z" fill="#F0FDFA"/>
          </svg>
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Droplets className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">好水到家</h1>
              <p className="text-white/80 text-xs mt-0.5">源自天然，健康生活</p>
            </div>
          </div>
          <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform">
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* Distributor referral banner — 已登录用户不展示（订单自动关联分销商） */}

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="px-4 space-y-4 -mt-2">
        {/* Product Selection - Multi-select */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-water" /> 选择商品
            {selectedIds.size > 0 && (
              <span className="ml-auto text-xs font-normal text-water bg-water/10 px-2 py-0.5 rounded-full">
                已选 {selectedIds.size} 件
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {products.map((product) => {
              const isSelected = selectedIds.has(product.id);
              return (
                <label key={product.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-water/10 border-2 border-water' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}>
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-water border-water' : 'border-gray-300'}`}>
                    {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(product.id)} className="hidden" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{product.description}</p>
                  </div>
                  <span className="text-water font-bold">¥{product.price.toFixed(2)}</span>
                  <span className="text-gray-400 text-xs">/{product.unit}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-water" /> 联系方式
          </h3>
          
          <div className="space-y-3">
            <div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="请输入手机号（必填）"
                maxLength={11}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-water/30 transition-all border-none placeholder:text-gray-400"
              />
            </div>
            
            <div>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="您的姓名（选填）"
                maxLength={20}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-water/30 transition-all border-none placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-water" /> 收货地址
          </h3>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="请输入详细收货地址（必填）"
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-water/30 transition-all resize-none border-none placeholder:text-gray-400"
          />
        </div>

        {/* Selected Items & Total */}
        {selectedIds.size > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">已选商品</h3>
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-400">¥{item.product.price.toFixed(2)}/{item.product.unit}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors"><Minus className="w-3 h-3"/></button>
                    <span className="w-8 text-center font-bold text-base">{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-water/10 flex items-center justify-center text-water active:bg-water/20 transition-colors"><Plus className="w-3 h-3"/></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 mt-4 pt-3 flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400">合计（{selectedIds.size} 种商品）</p>
                <p className="text-2xl font-bold gradient-text">¥{totalAmount.toFixed(2)}</p>
              </div>
              <p className="text-xs text-gray-400 text-right">
                {selectedItems.map(i => `${i.product.name}×${i.quantity}`).join('、')}
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !phone || !address || selectedIds.size === 0}
          className="w-full bg-gradient-to-r from-water-light to-water text-white py-4 rounded-2xl font-semibold text-base shadow-lg shadow-water/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            `立即购买 ¥${totalAmount.toFixed(2)}`
          )}
        </button>
      </form>
    </div>
  );
}
