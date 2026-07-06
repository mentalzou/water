import { useState, useEffect, useMemo } from 'react';
import { Droplets, ShoppingCart, CheckCircle2, MapPin, Plus, Minus, Home, User, Trash2, X, Gift, FileText, ClipboardList, CreditCard, HeadphonesIcon } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { customerApi } from '../../api/customer.api';
import { useAppStore } from '../../stores/store';
import BottomNav from "../../components/BottomNav.tsx";
import AdBanner from '../../components/AdBanner';

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
  stock?: number;
  frozen_stock?: number;
  min_order_quantity?: number;
  brand_id?: string;
  brand_name?: string;
  category_id?: string;
  category_name?: string;
  image?: string;
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
  const [showCartDetail, setShowCartDetail] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();

    const code = searchParams.get('distributor_code');
    if (code) {
      setDistributorCode(code);
    }

    // 从登录页返回后恢复购物车
    const pendingData = localStorage.getItem('pending_order_data');
    if (pendingData) {
      try {
        const parsed = JSON.parse(pendingData);
        if (parsed.items && Array.isArray(parsed.items)) {
          const restored: Record<string, number> = {};
          parsed.items.forEach((item: any) => {
            restored[item.productId] = item.quantity || 1;
          });
          setItemQuantities(restored);
        }
      } catch {}
      localStorage.removeItem('pending_order_data');
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
      const product = products.find(p => p.id === productId);
      const maxQty = product ? Math.max(0, (product.stock ?? 99999) - (product.frozen_stock ?? 0)) : 999;
      const minQty = product ? (product.min_order_quantity ?? 1) : 1;
      const current = prev[productId] || 0;
      let next: number;
      if (current === 0 && delta > 0) {
        // 首次添加：默认最低起送量；库存不足时提示
        if (maxQty === 0) {
          alert('该商品库存不足，暂时无法购买');
          return prev;
        }
        if (minQty > maxQty) {
          alert(`该商品最低起送 ${minQty} 件，当前库存仅 ${maxQty} 件，无法满足起送要求`);
          return prev;
        }
        next = Math.min(maxQty, minQty);
      } else if (delta < 0) {
        // 减少：如果结果小于起送量且 >0，则直接移除（变 0）
        const candidate = current + delta;
        next = (candidate > 0 && candidate < minQty) ? 0 : Math.min(maxQty, Math.max(0, candidate));
      } else if (delta > 0 && current >= maxQty) {
        // 增加但已达库存上限
        alert(`该商品库存不足，当前最多可购 ${maxQty} 件`);
        return prev;
      } else {
        next = Math.min(maxQty, Math.max(0, current + delta));
        if (delta > 0 && next === maxQty && current < maxQty) {
          // 本次操作触达库存上限
          alert(`该商品库存不足，当前最多可购 ${maxQty} 件`);
        }
      }
      return { ...prev, [productId]: next };
    });
  }
  function setQty(productId: string, value: number) {
    const product = products.find(p => p.id === productId);
    const maxQty = product ? Math.max(0, (product.stock ?? 99999) - (product.frozen_stock ?? 0)) : 999;
    const rounded = isNaN(value) ? 0 : Math.round(value);
    if (rounded > maxQty) {
      alert(`该商品库存不足，当前最多可购 ${maxQty} 件`);
    }
    const clamped = Math.min(maxQty, Math.max(0, rounded));
    setItemQuantities(prev => ({ ...prev, [productId]: clamped }));
  }
  function removeFromCart(productId: string) {
    setItemQuantities(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function clearCart() {
    if (!confirm('确定清空购物车吗？')) return;
    setItemQuantities({});
    setShowCartDetail(false);
  }

  function handleSubmit() {
    if (selectedItems.length === 0) return;

    // 未登录时跳转登录页
    const token = localStorage.getItem('customer_token');
    if (!token) {
      // 先保存购物车数据，登录回来后恢复
      localStorage.setItem('pending_order_data', JSON.stringify({
        items: selectedItems.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        totalAmount,
        distributorCode: distributorCode || undefined,
      }));
      navigate(`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }

    // 保存订单数据到 localStorage
    localStorage.setItem('confirm_order_data', JSON.stringify({
      items: selectedItems,
      totalAmount,
      distributorCode: distributorCode || undefined,
    }));

    navigate('/order/confirm');
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

  const location = useLocation();
  const orderSuccessData = location.state?.result;

  if (orderSuccessData) {
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
          <button onClick={() => navigate('/', { state: {} })} className="mt-4 text-water font-medium">
            继续购买
          </button>
        </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('customer_user') || '{}');

  return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header - 跑马灯广告栏 */}
        <header className="relative pt-12 pb-20 overflow-hidden">
          {/* 广告跑马灯背景 */}
          <div className="absolute inset-0">
            <AdBanner/>
          </div>

          {/* 波浪过渡 */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,64 C360,120 720,40 1080,80 C1260,96 1380,88 1440,84 L1440,120 L0,120 Z" fill="#F0FDFA"/>
            </svg>
          </div>

          {/* 覆盖层：品牌 + 用户按钮 */}
          {/*<div className="relative z-10 flex items-center justify-between">*/}
          {/*  <div className="flex items-center gap-3">*/}
          {/*    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">*/}
          {/*      <Droplets className="w-7 h-7 text-white"/>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*  <button onClick={() => navigate('/profile')}*/}
          {/*          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform">*/}
          {/*    <User className="w-5 h-5 text-white"/>*/}
          {/*  </button>*/}
          {/*</div>*/}
        </header>

        {/* 快捷菜单栏 */}
        <nav className="bg-white border-b border-gray-100">
          <div className="flex justify-between px-1.5 py-2">
            <button
              onClick={() => navigate('/free-trial')}
              className="flex items-center gap-0.5 px-1.5 rounded-full text-[11px] font-medium text-gray-600 hover:bg-water/5 hover:text-water active:bg-water/10 transition-colors flex-shrink-0"
            >
              <Gift className="w-3 h-3" />
              免费试喝
            </button>
            <button
              onClick={() => navigate('/quality-report')}
              className="flex items-center gap-0.5 px-1.5 rounded-full text-[11px] font-medium text-gray-600 hover:bg-water/5 hover:text-water active:bg-water/10 transition-colors flex-shrink-0"
            >
              <FileText className="w-3 h-3" />
              资质证书
            </button>
            <button
              onClick={() => navigate('/purchase-notice')}
              className="flex items-center gap-0.5 px-1.5 rounded-full text-[11px] font-medium text-gray-600 hover:bg-water/5 hover:text-water active:bg-water/10 transition-colors flex-shrink-0"
            >
              <ClipboardList className="w-3 h-3" />
              购买须知
            </button>
            <button
              onClick={() => navigate('/profile/recharge')}
              className="flex items-center gap-0.5 px-1.5 rounded-full text-[11px] font-medium text-gray-600 hover:bg-water/5 hover:text-water active:bg-water/10 transition-colors flex-shrink-0"
            >
              <CreditCard className="w-3 h-3" />
              我要充值
            </button>
            <button
              onClick={() => navigate('/customer-service')}
              className="flex items-center gap-0.5 px-1.5 rounded-full text-[11px] font-medium text-gray-600 hover:bg-water/5 hover:text-water active:bg-water/10 transition-colors flex-shrink-0"
            >
              <HeadphonesIcon className="w-3 h-3" />
              我的客服
            </button>
          </div>
        </nav>

        {/* Main Content - 左侧分类 + 右侧产品 */}
        <div className="flex-1 flex overflow-hidden pb-16">
          {/* 左侧分类导航 */}
          <aside className="w-24 bg-gray-80 overflow-y-auto flex-shrink-0">
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
                      <div
                          className={`w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden ${product.image ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                          onClick={() => product.image && setPreviewImage(product.image)}
                      >
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover"/>
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
                          {/* 有效库存 */}
                          {/*{product.stock != null && (*/}
                          {/*  <p className="text-xs text-gray-500 mt-0.5">*/}
                          {/*    库存: {Math.max(0, product.stock - (product.frozen_stock ?? 0))} 件*/}
                          {/*  </p>*/}
                          {/*)}*/}
                          {/* 起送量提示 */}
                          {(product.min_order_quantity ?? 1) > 1 && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                              {product.min_order_quantity}件起送
                            </span>
                          )}
                          {product.stock != null && (product.stock - (product.frozen_stock ?? 0)) <= 10 && (
                            <span className="inline-block mt-0.5 ml-1 px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[10px] font-medium">
                              仅剩{product.stock - (product.frozen_stock ?? 0)}件
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xs text-water">¥</span>
                            <span className="text-lg font-bold text-water">{product.price.toFixed(2)}</span>
                          </div>

                          {/* 数量控制 */}
                          {qty > 0 ? (
                              <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => updateQty(product.id, -1)}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                                >
                                  <Minus className="w-4 h-4"/>
                                </button>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="1"
                                    maxLength={3}
                                    value={qty > 0 ? qty : ''}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/\D/g, '');
                                      setQty(product.id, raw === '' ? 0 : parseInt(raw));
                                    }}
                                    className="w-12 h-8 text-center text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-water"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateQty(product.id, 1)}
                                    disabled={qty >= Math.max(0, (product.stock ?? 99999) - (product.frozen_stock ?? 0))}
                                    className="w-7 h-7 rounded-full bg-water text-white flex items-center justify-center hover:bg-water/90 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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

        {/* 图片预览弹窗 */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 active:scale-90 transition-all"
              aria-label="关闭预览"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 提示文字 */}
            <span className="absolute top-5 left-5 text-white/50 text-xs z-10">点击空白处关闭</span>

            {/* 大图 */}
            <img
              src={previewImage}
              alt="产品图片预览"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* 底部结算栏 */}
        {selectedItems.length > 0 && (
            <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-10 shadow-lg">
              {/* 结算栏主体 */}
              {/* 购物车详情 - 展开显示已选商品 */}
              {showCartDetail && (
                  <div className="border-t border-gray-100 bg-gray-50 max-h-64 overflow-y-auto">
                    <div
                        className="px-4 py-2 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0">
                <span className="text-sm font-medium text-gray-700">
                  已选商品 ({selectedItems.length}种)
                </span>
                      <button
                          onClick={clearCart}
                          className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3"/>
                        清空
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {selectedItems.map(item => (
                          <div key={item.product.id} className="px-4 py-3 flex items-center justify-between bg-white">
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                ¥{item.product.price.toFixed(2)}{item.product.unit ? `/${item.product.unit}` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* 数量控制 */}
                              <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => updateQty(item.product.id, -1)}
                                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 shrink-0"
                                >
                                  <Minus className="w-3 h-3"/>
                                </button>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="1"
                                    maxLength={3}
                                    value={item.quantity > 0 ? item.quantity : ''}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/\D/g, '');
                                      setQty(item.product.id, raw === '' ? 0 : parseInt(raw));
                                    }}
                                    className="w-10 h-7 text-center text-xs font-semibold border border-gray-200 rounded-md focus:outline-none focus:border-water"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateQty(item.product.id, 1)}
                                    disabled={item.quantity >= Math.max(0, (item.product.stock ?? 99999) - (item.product.frozen_stock ?? 0))}
                                    className="w-6 h-6 rounded-full bg-water text-white flex items-center justify-center hover:bg-water/90 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Plus className="w-3 h-3"/>
                                </button>
                              </div>

                              {/* 删除按钮 */}
                              <button
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  title="移除商品"
                              >
                                <X className="w-5 h-5"/>
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* 购物车图标 - 可点击展开详情 */}
                  <button
                      onClick={() => setShowCartDetail(!showCartDetail)}
                      className="relative flex-shrink-0"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-gray-600"/>
                    </div>
                    {selectedItems.length > 0 && (
                        <span
                            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                    )}
                  </button>

                  {/* 金额信息 */}
                  <div>
                    <p className="text-xs text-gray-500">合计</p>
                    <p className="text-lg font-bold text-red-500">¥{totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* 结算按钮 */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || selectedItems.length === 0}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold text-base hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '处理中...' : '结算'}
                </button>
              </div>

            </div>
        )}

        {/* 底部导航 */}
        <BottomNav/>
      </div>
  );
}
