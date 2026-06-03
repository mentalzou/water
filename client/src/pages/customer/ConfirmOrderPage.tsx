import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, MessageSquare, Wallet, CreditCard } from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import BottomNav from '../../components/BottomNav';

interface Product {
  id: string;
  name: string;
  price: number;
  unit?: string;
  image?: string;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

interface Address {
  id: string;
  contact_name: string;
  contact_phone: string;
  province?: string;
  city?: string;
  district?: string;
  detail: string;
  is_default: number;
}

export default function ConfirmOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('明天');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [remark, setRemark] = useState('');
  // const [useCoupon, setUseCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState<'online' | 'balance'>('online');
  const [balanceInfo, setBalanceInfo] = useState<{ principal: number; bonus: number; total: number } | null>(null);

  const orderData = location.state as {
    items: OrderItem[];
    totalAmount: number;
    distributorCode?: string;
  } || JSON.parse(localStorage.getItem('confirm_order_data') || 'null');

  useEffect(() => {
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      navigate('/', { replace: true });
      return;
    }

    // 未登录时跳转登录页
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate(`/login?from=${encodeURIComponent('/order/confirm' + window.location.search)}`, { replace: true });
      return;
    }

    loadAddresses();
    loadBalance();

    const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
    if (user.phone) {
      setContactPhone(user.phone);
    }
  }, []);

  async function loadAddresses() {
    try {
      const res: any = await customerApi.getAddresses();
      if (res.code === 200) {
        const addrList = res.data || [];
        setAddresses(addrList);

        const selectedAddressId = searchParams.get('address_id');
        if (selectedAddressId) {
          const found = addrList.find((a: Address) => a.id === selectedAddressId);
          if (found) {
            setSelectedAddress(found);
            return;
          }
        }

        const defaultAddr = addrList.find((a: Address) => a.is_default === 1);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
        }
      }
    } catch (err) {
      console.error('加载地址失败:', err);
    }
  }

  async function loadBalance() {
    try {
      const res: any = await customerApi.getUserBalance();
      if (res.code === 200 && res.data) {
        setBalanceInfo({
          principal: res.data.total_principal || 0,
          bonus: res.data.total_bonus || 0,
          total: res.data.total_balance || 0,
        });
      }
    } catch (err) {
      console.error('加载余额失败:', err);
    }
  }

  // const totalAmount = orderData?.totalAmount || 0;
  // const couponAmount = useCoupon ? 0 : 0;
  // const finalAmount = totalAmount - couponAmount;
  const finalAmount = orderData?.totalAmount || 0;

  async function handleSubmit() {
    if (!selectedAddress && !contactPhone) {
      alert('请选择收货地址或填写联系电话');
      return;
    }

    if (!deliveryDate || !deliveryTime) {
      alert('请选择配送时间');
      return;
    }

    // 余额支付前确认
    if (payMethod === 'balance') {
      const confirmMsg = balanceInfo && balanceInfo.total < (orderData?.totalAmount || 0)
        ? '账户余额不足，请选择在线支付'
        : `确认使用账户余额支付 ¥${(orderData?.totalAmount || 0).toFixed(2)}？`;
      if (balanceInfo && balanceInfo.total < (orderData?.totalAmount || 0)) {
        alert(confirmMsg);
        return;
      }
      if (!window.confirm(confirmMsg)) return;
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
      const addressText = selectedAddress
          ? `${selectedAddress.province}${selectedAddress.city}${selectedAddress.district}${selectedAddress.detail}`
          : '自提';

      const orderItems = orderData.items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      // 1. 创建订单（传递支付方式）
      const orderRes: any = await customerApi.createOrder({
        customer_phone: user.phone || contactPhone,
        customer_name: selectedAddress?.contact_name || user.name || '',
        address: addressText,
        items: orderItems,
        distributor_code: orderData.distributorCode || undefined,
        pay_method: payMethod,
      });

      if (!orderRes.data?.id) {
        alert(orderRes.message || '下单失败');
        setSubmitting(false);
        return;
      }

      const orderId = orderRes.data.id;

      // 余额支付：order 创建时已自动扣款，直接进结果页
      if (payMethod === 'balance') {
        localStorage.removeItem('confirm_order_data');
        navigate('/order/result/' + orderId, {
          state: { result: orderRes.data },
          replace: true,
        });
        return;
      }

      // 在线支付流程
      console.log('user.open_id:', user.open_id);
      console.log('user.openId:', user.openId);
      let openId = user.open_id || user.openId || '';

      // 无 openId 时尝试自动获取
      if (!openId) {
        try {
          // 开发环境：使用 dev_ 前缀自动生成模拟 openId
          const devOpenId = 'dev_' + (user.phone || 'test') + '_' + Date.now();
          const openIdRes: any = await customerApi.getWechatOpenId(devOpenId, 'oa');
          if (openIdRes.code === 200 && openIdRes.data?.openid) {
            openId = openIdRes.data.openid;
            // 更新本地存储
            const updatedUser = { ...user, open_id: openId };
            localStorage.setItem('customer_user', JSON.stringify(updatedUser));
            console.log('[Payment] 自动获取 openId:', openId);
          }
        } catch (e) {
          console.error('[Payment] 获取 openId 失败:', e);
        }
      }

      if (!openId) {
        alert('在线支付需要微信授权，请确保在微信环境中打开，或联系管理员获取 openId');
        setSubmitting(false);
        return;
      }

      // 2. 调用微信支付接口获取 JSAPI 参数
      const payRes: any = await customerApi.createPayment({
        orderId: orderId,
        openId: openId,
      });

      if (payRes.code !== 200 || !payRes.data?.jsApiParameters) {
        alert(payRes.message || '创建支付订单失败');
        setSubmitting(false);
        return;
      }

      // 清除缓存的订单数据
      localStorage.removeItem('confirm_order_data');

      // 3. 调起微信支付
      invokeWechatPay(payRes.data.jsApiParameters, orderId);

    } catch (err: any) {
      alert(err.message || '下单失败');
    } finally {
      setSubmitting(false);
    }
  }


  function invokeWechatPay(jsApiParameters: string, orderId: string) {
    // 微信支付JSAPI
    const params = JSON.parse(jsApiParameters);

    if (typeof WeixinJSBridge === 'undefined') {
      // 微信环境检测
      if (document.addEventListener) {
        document.addEventListener('WeixinJSBridgeReady', () => {
          onBridgeReady(params, orderId);
        }, false);
      } else if ((document as any).attachEvent) {
        (document as any).attachEvent('WeixinJSBridgeReady', () => {
          onBridgeReady(params, orderId);
        });
        (document as any).attachEvent('onWeixinJSBridgeReady', () => {
          onBridgeReady(params, orderId);
        });
      }
    } else {
      onBridgeReady(params, orderId);
    }
  }

  function onBridgeReady(params: any, orderId: string) {
    WeixinJSBridge.invoke(
        'getBrandWCPayRequest',
        {
          appId: params.appId,
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
        },
        (res: any) => {
          if (res.err_msg === 'get_brand_wcpay_request:ok') {
            // 支付成功
            navigate('/order/result/' + orderId, {
              state: { result: { orderId, status: 'paid' } },
              replace: true,
            });
          } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
            alert('支付已取消');
          } else {
            alert('支付失败：' + res.err_msg);
          }
        }
    );
  }

  if (!orderData || !orderData.items) {
    return null;
  }

  return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">确认订单</h1>
          <div className="w-10" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-36">
          {/* Address Section */}
          <div className="bg-white mt-2 p-4">
            {selectedAddress ? (
                <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => navigate('/profile/address', { state: { from: 'confirm-order' } })}
                >
                  <MapPin className="w-5 h-5 text-water mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800">
                    {selectedAddress.contact_name}
                  </span>
                      <span className="text-gray-600">{selectedAddress.contact_phone}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedAddress.province}
                      {selectedAddress.city}
                      {selectedAddress.district}
                      {selectedAddress.detail}
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
            ) : (
                <div
                    className="flex items-center gap-3 text-red-500 cursor-pointer"
                    onClick={() => navigate('/profile/address', { state: { from: 'confirm-order' } })}
                >
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">未找到您的收货地址</p>
                    <p className="text-xs mt-0.5">（点击新增或绑定已有地址）</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </div>
            )}
          </div>

          {/* Contact Phone */}
          <div className="bg-white mt-2 p-4 flex items-center gap-4">
            <label className="text-sm text-red-500 flex-shrink-0">*送水联系电话</label>
            <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="请输入送水联系电话"
                className="flex-1 text-sm text-gray-800 outline-none"
            />
          </div>

          {/* Order Items */}
          <div className="bg-white mt-2 p-4">
            <div className="space-y-3">
              {orderData.items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {item.product.image ? (
                          <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                          />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <MapPin className="w-6 h-6" />
                          </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-800">{item.product.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">x {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">
                        ¥{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
              ))}
            </div>
          </div>

          {/* Coupon */}
          {/*<div className="bg-white mt-2 p-4 flex items-center justify-between">*/}
          {/*  <div className="flex items-center gap-2">*/}
          {/*    <span className="text-sm text-gray-700">可用优惠券</span>*/}
          {/*    <span className="text-sm text-green-600 font-medium">¥{couponAmount.toFixed(2)}</span>*/}
          {/*  </div>*/}
          {/*  <button*/}
          {/*      onClick={() => setUseCoupon(!useCoupon)}*/}
          {/*      className={`relative w-12 h-6 rounded-full transition-colors ${*/}
          {/*          useCoupon ? 'bg-water' : 'bg-gray-300'*/}
          {/*      }`}*/}
          {/*  >*/}
          {/*    <div*/}
          {/*        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${*/}
          {/*            useCoupon ? 'translate-x-6' : 'translate-x-0.5'*/}
          {/*        }`}*/}
          {/*    />*/}
          {/*  </button>*/}
          {/*</div>*/}

          {/* Delivery Time */}
          <div className="bg-white mt-2 p-4">
            <div className="flex items-center gap-4 mb-3">
              <Clock className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">预约时间</span>
            </div>
            <div className="flex gap-3">
              <button
                  onClick={() => setDeliveryDate('明天')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      deliveryDate === '明天'
                          ? 'bg-water text-white'
                          : 'bg-gray-100 text-gray-700'
                  }`}
              >
                明天
              </button>
              <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="flex-1 py-2 px-4 rounded-lg text-sm bg-gray-100 text-gray-700 outline-none"
              >
                <option value="">请选择时间段</option>
                <option value="08:00-10:00">08:00-10:00</option>
                <option value="10:00-12:00">10:00-12:00</option>
                <option value="14:00-16:00">14:00-16:00</option>
                <option value="16:00-18:00">16:00-18:00</option>
              </select>
            </div>
            {!deliveryTime && (
                <p className="text-xs text-red-500 mt-2">
                  *必选。现在预订，最早明天 08:00 开始配送
                </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white mt-2 mb-4 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">支付方式</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setPayMethod('online')}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  payMethod === 'online'
                    ? 'border-water bg-water/5 text-water'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm font-medium">在线支付</p>
                </div>
              </button>
              <button
                onClick={() => setPayMethod('balance')}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  payMethod === 'balance'
                    ? 'border-water bg-water/5 text-water'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm font-medium">账户余额</p>
                  {balanceInfo ? (
                    <p className="text-xs opacity-60">
                      余额 ¥{balanceInfo.total.toFixed(2)}
                      {balanceInfo.bonus > 0 && <span className="text-orange-500">（含赠¥{balanceInfo.bonus.toFixed(0)}）</span>}
                    </p>
                  ) : (
                    <p className="text-xs opacity-60">暂无余额</p>
                  )}
                </div>
              </button>
            </div>
            {payMethod === 'balance' && balanceInfo && balanceInfo.total < (orderData?.totalAmount || 0) && (
              <p className="text-xs text-red-500 mt-2">
                账户余额不足，请选择在线支付或<a href="/profile/recharge" className="text-water underline">前往充值</a>
              </p>
            )}
          </div>

          {/* Remark */}
          <div className="bg-white mt-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">订单备注</span>
            </div>
            <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="您可以在这里对订单进行额外说明"
                className="w-full h-20 text-sm text-gray-700 outline-none resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-gray-600">实付:</span>
            <span className="text-2xl font-bold text-green-600">¥{finalAmount.toFixed(2)}</span>
            {payMethod === 'balance' && (
              <span className="text-xs text-orange-500 ml-1">（余额抵扣）</span>
            )}
          </div>
          <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-8 py-3 rounded-lg font-semibold text-base active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                payMethod === 'balance' 
                  ? 'bg-water text-white hover:bg-water-dark' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            {submitting ? '处理中...' : payMethod === 'balance' ? '确认支付' : `确认 (${orderData.items.reduce((sum, item) => sum + item.quantity, 0)})`}
          </button>
        </div>

        {/* Bottom Nav */}
        <BottomNav />
      </div>
  );
}
