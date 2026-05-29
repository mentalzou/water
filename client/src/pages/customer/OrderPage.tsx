import { useState, useEffect, useMemo } from 'react';
import { Droplets, ShoppingCart, CheckCircle2, MapPin, Plus, Minus, Home, User } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customer.api';
import { useAppStore } from '../../stores/store';
import BottomNav from "../../components/BottomNav.tsx";

interface Category {
  id: string;
  name: string;
  code: string;
  icon?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  brand_id?: string;
  brand_name?: string;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  sales_count?: number;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadProducts();
    loadCategories();

    const code = searchParams.get('distributor_code');
    if (code) {
      setDistributorCode(code);
    }
  }, []);

  async function loadCategories() {
    try {
      const res: any = await customerApi.getCategories();
      if (res.code === 200) {
        setCategories(res.data || []);
      }
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  }

  async function loadProducts() {
    try {
      const res: any = await customerApi.getProducts();
      if (res.code === 200) {
        setProducts(res.data || []);
      }
    } catch (err) {
      console.error('加载产品失败:', err);
    }
  }

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter(p => p.category_id === selectedCategory);
  }, [products, selectedCategory]);

  const selectedItems = useMemo((): SelectedItem[] => {
    return products
        .filter(p => itemQuantities[p.id] && itemQuantities[p.id] > 0)
        .map(p => ({
          product: p,
          quantity: itemQuantities[p.id],
        }));
  }, [products, itemQuantities]);

  const totalAmount = useMemo(() => {
    return Math.round(selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100) / 100;
  }, [selectedItems]);

  function updateQty(productId: string, delta: number) {
    setItemQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  }

  async function handleSubmit() {
    if (selectedItems.length === 0) return;

    // 未登录时跳转登录页
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate(`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('customer_user') || '{}');

      const orderItems = selectedItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const orderRes: any = await customerApi.createOrder({
        customer_phone: user.phone,
        customer_name: user.name || '',
        address: '自提',
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
          <h2 className="text-xl font-semibold text-gray-800 mb-2">购买成功</h2>
          <p className="text-gray-500 text-sm mb-8">订单已创建并支付成功</p>
          <button onClick={() => navigate('/orders')} className="w-full max-w-sm bg-gradient-to-r from-water-light to-water text-white py-3.5 rounded-2xl font-medium shadow-lg shadow-water/30 active:scale-[0.98] transition-transform">
            查看订单
          </button>
          <button onClick={() => { setOrderResult(null); setItemQuantities({}); }} className="mt-4 text-water font-medium">
            继续购买
          </button>
        </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('customer_user') || '{}');

  return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header - 地址提示 */}
        <header className="relative pt-12 pb-20 px-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-water-light via-water to-teal-400"/>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,64 C360,120 720,40 1080,80 C1260,96 1380,88 1440,84 L1440,120 L0,120 Z" fill="#F0FDFA"/>
            </svg>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Droplets className="w-7 h-7 text-white"/>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">好水到家</h1>
                <p className="text-white/80 text-xs mt-0.5">源自天然，健康生活</p>
              </div>
            </div>
            <button onClick={() => navigate('/profile')}
                    className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform">
              <User className="w-5 h-5 text-white"/>
            </button>
          </div>
        </header>

        {/* Main Content - 左侧分类 + 右侧产品 */}
        <div className="flex-1 flex overflow-hidden pb-16">
          {/* 左侧分类导航 */}
          <aside className="w-24 bg-gray-100 overflow-y-auto flex-shrink-0">
            <nav className="py-2">
              <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full px-3 py-3 text-left text-sm transition-all ${
                      !selectedCategory
                          ? 'bg-white text-water font-semibold border-l-4 border-water'
                          : 'text-gray-600 hover:bg-white/50'
                  }`}
              >
                全部
              </button>
              {categories.map(cat => (
                  <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full px-3 py-3 text-left text-sm transition-all ${
                          selectedCategory === cat.id
                              ? 'bg-white text-water font-semibold border-l-4 border-water'
                              : 'text-gray-600 hover:bg-white/50'
                      }`}
                  >
                    {cat.name}
                  </button>
              ))}
            </nav>
          </aside>

          {/* 右侧产品列表 */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-3 space-y-3">
              {/* 当前分类标题 */}
              {selectedCategory && (
                  <div className="bg-green-50 px-3 py-2 rounded-lg">
                    <h2 className="text-base font-semibold text-green-700">
                      {categories.find(c => c.id === selectedCategory)?.name}
                    </h2>
                  </div>
              )}

              {/* 产品卡片 */}
              {filteredProducts.map(product => {
                const qty = itemQuantities[product.id] || 0;
                return (
                    <div key={product.id} className="bg-white rounded-lg p-3 flex gap-3">
                      {/* 产品图片 */}
                      <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ShoppingCart className="w-8 h-8"/>
                            </div>
                        )}
                      </div>

                      {/* 产品信息 */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="font-medium text-gray-800 text-sm mb-1">{product.name}</h3>
                          {product.description && (
                              <p className="text-xs text-gray-500 mb-1">{product.description}</p>
                          )}
                          {product.sales_count && (
                              <p className="text-xs text-gray-400">30天销量 {product.sales_count}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xs text-water">¥</span>
                            <span className="text-lg font-bold text-water">{product.price.toFixed(2)}</span>
                          </div>

                          {/* 数量控制 */}
                          {qty > 0 ? (
                              <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateQty(product.id, -1)}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <Minus className="w-4 h-4"/>
                                </button>
                                <span className="w-8 text-center font-semibold text-base">{qty}</span>
                                <button
                                    type="button"
                                    onClick={() => updateQty(product.id, 1)}
                                    className="w-7 h-7 rounded-full bg-water text-white flex items-center justify-center hover:bg-water/90 transition-colors"
                                >
                                  <Plus className="w-4 h-4"/>
                                </button>
                              </div>
                          ) : (
                              <button
                                  type="button"
                                  onClick={() => updateQty(product.id, 1)}
                                  className="px-4 py-1.5 bg-water text-white rounded-full text-sm font-medium hover:bg-water/90 transition-colors"
                              >
                                +
                              </button>
                          )}
                        </div>
                      </div>
                    </div>
                );
              })}

              {filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">该分类暂无商品</p>
                  </div>
              )}
            </div>
          </main>
        </div>

        {/* 底部结算栏 */}
        {selectedItems.length > 0 && (
            <div
                className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-10 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-gray-600"/>
                  {selectedItems.length > 0 && (
                      <span
                          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {selectedItems.length}
                </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">合计</p>
                  <p className="text-lg font-bold text-red-500">¥{totalAmount.toFixed(2)}</p>
                </div>
              </div>
              <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedItems.length === 0}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold text-base hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '处理中...' : '结算'}
              </button>
            </div>
        )}

        {/* 底部导航 */}
        <BottomNav/>
      </div>
  );
}
