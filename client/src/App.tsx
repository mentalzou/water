import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const CustomerOrderPage = lazy(() => import('./pages/customer/OrderPage'))
const CustomerConfirmOrderPage = lazy(() => import('./pages/customer/ConfirmOrderPage'))
const CustomerOrderResultPage = lazy(() => import('./pages/customer/OrderResultPage'))
const CustomerOrderList = lazy(() => import('./pages/customer/OrderList'))
const CustomerLogin = lazy(() => import('./pages/customer/Login'))
const CustomerProfile = lazy(() => import('./pages/customer/ProfilePage'))
const CustomerOrdersPage = lazy(() => import('./pages/customer/OrdersPage'))
const CustomerPasswordPage = lazy(() => import('./pages/customer/PasswordPage'))
const CustomerAddressPage = lazy(() => import('./pages/customer/AddressPage'))
const CustomerPointsPage = lazy(() => import('./pages/customer/PointsPage'))
const CustomerRechargePage = lazy(() => import('./pages/customer/RechargePage'))
const CustomerFreeTrialPage = lazy(() => import('./pages/customer/FreeTrialPage'))
const CustomerQualityReportPage = lazy(() => import('./pages/customer/QualityReportPage'))
const CustomerPurchaseNoticePage = lazy(() => import('./pages/customer/PurchaseNoticePage'))
const CustomerServicePage = lazy(() => import('./pages/customer/CustomerServicePage'))
const DistributorDashboard = lazy(() => import('./pages/distributor/Dashboard'))
const DistributorRecharge = lazy(() => import('./pages/distributor/RechargePage'))
const DistributorShare = lazy(() => import('./pages/distributor/SharePage'))
const DistributorCommission = lazy(() => import('./pages/distributor/CommissionPage'))
const DistributorOrderList = lazy(() => import('./pages/distributor/OrderList'))
const DeliverymanTaskList = lazy(() => import('./pages/deliveryman/TaskList'))
const DeliverymanTaskDetail = lazy(() => import('./pages/deliveryman/TaskDetail'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminLayout = lazy(() => import('./components/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminUserManage = lazy(() => import('./pages/admin/UserManage'))
const AdminRoleManage = lazy(() => import('./pages/admin/RoleManage'))
const AdminDistributorManage = lazy(() => import('./pages/admin/DistributorManage'))
const AdminDeliverymanManage = lazy(() => import('./pages/admin/DeliverymanManage'))
const AdminAreaManage = lazy(() => import('./pages/admin/AreaManage'))
const AdminCategoryManage = lazy(() => import('./pages/admin/CategoryManage'))
const AdminOrderManage = lazy(() => import('./pages/admin/OrderManage'))
const AdminProductManage = lazy(() => import('./pages/admin/ProductManage'))
const AdminBrandManage = lazy(() => import('./pages/admin/BrandManage'))
const AdminConfigPage = lazy(() => import('./pages/admin/ConfigPage'))
const AdminRechargeManage = lazy(() => import('./pages/admin/RechargeManage'))
const AdminAdBannerManage = lazy(() => import('./pages/admin/AdBannerManage'))

const DistributorLogin = lazy(() => import('./pages/distributor/Login'))
const DistributorLayout = lazy(() => import('./components/DistributorLayout'))
const DeliverymanLogin = lazy(() => import('./pages/deliveryman/Login'))
const DeliverymanLayout = lazy(() => import('./components/DeliverymanLayout'))
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerApi } from './api/customer.api';

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-water-light/30 border-t-water rounded-full animate-spin" />
        </div>
    )
}

function App() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <AppContent />
        </Suspense>
    );
}

function AppContent() {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        // 从小程序 web-view URL 参数获取 wx_code，换取 openId
        // 公众号 OAuth 回调: URL 参数为 code
        const wxCode = searchParams.get('wx_code');
        const oaCode = searchParams.get('code');
        const code = wxCode || oaCode;
        
        if (code) {
            const codeType = wxCode ? 'miniprogram' : 'oa';
            console.log('微信 code 检测到:', code, '类型:', codeType);
            
            customerApi.getWechatOpenId(code, codeType)
                .then((res: any) => {
                    if (res.code === 200 && (res.data?.openid || res.data?.open_id)) {
                        const openId = res.data.openid || res.data.open_id;
                        console.log('获取到微信 openId:', openId);
                        // 更新 localStorage 中的用户信息
                        const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
                        user.open_id = openId;
                        user.openId = openId;
                        localStorage.setItem('customer_user', JSON.stringify(user));
                    }
                })
                .catch((err) => {
                    console.error('获取微信 openId 失败:', err);
                });
        }
        
        // 公众号环境下，如果没有 code 也没有 openId，则发起 OAuth 重定向
        const ua = navigator.userAgent.toLowerCase();
        const isWechat = ua.includes('micromessenger');
        if (isWechat && !code) {
            const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
            if (!user.open_id && !user.openId) {
                // 需要公众号 OAuth 授权，但需要配置好 redirect_uri
                // 此处预留逻辑，实际需要在管理后台配置 wx_app_id 后生效
                console.log('微信环境，未检测到 openId，需 OAuth 授权');
            }
        }
    }, [searchParams]);

    return (
        <Routes>

            {/* 消费者端 */}
            <Route path="/login" element={<CustomerLogin />} />
            <Route path="/" element={<CustomerOrderPage />} />
            <Route path="/order/confirm" element={<CustomerConfirmOrderPage />} />
            <Route path="/order/result/:id" element={<CustomerOrderResultPage />} />
            <Route path="/orders" element={<CustomerOrderList />} />
            <Route path="/profile" element={<CustomerProfile />} />
            <Route path="/profile/orders" element={<CustomerOrdersPage />} />
            <Route path="/profile/points" element={<CustomerPointsPage />} />
            <Route path="/profile/recharge" element={<CustomerRechargePage />} />
            <Route path="/profile/password" element={<CustomerPasswordPage />} />
            <Route path="/profile/address" element={<CustomerAddressPage />} />
            <Route path="/free-trial" element={<CustomerFreeTrialPage />} />
            <Route path="/quality-report" element={<CustomerQualityReportPage />} />
            <Route path="/purchase-notice" element={<CustomerPurchaseNoticePage />} />
            <Route path="/customer-service" element={<CustomerServicePage />} />

            {/* 分销商端 */}
            <Route path="/distributor/login" element={<DistributorLogin />} />
            <Route path="/distributor" element={<DistributorLayout />}>
                <Route index element={<DistributorDashboard />} />
                <Route path="recharge" element={<DistributorRecharge />} />
                <Route path="share" element={<DistributorShare />} />
                <Route path="commission" element={<DistributorCommission />} />
                <Route path="orders" element={<DistributorOrderList />} />
            </Route>

            {/* 派送员端 */}
            <Route path="/deliveryman/login" element={<DeliverymanLogin />} />
            <Route path="/deliveryman" element={<DeliverymanLayout />}>
                <Route index element={<DeliverymanTaskList />} />
                <Route path="task/:id" element={<DeliverymanTaskDetail />} />
            </Route>

            {/* 管理后台 */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUserManage />} />
                <Route path="roles" element={<AdminRoleManage />} />
                <Route path="distributors" element={<AdminDistributorManage />} />
                <Route path="deliverymen" element={<AdminDeliverymanManage />} />
                <Route path="areas" element={<AdminAreaManage />} />
                <Route path="categories" element={<AdminCategoryManage />} />
                <Route path="brands" element={<AdminBrandManage />} />
                <Route path="products" element={<AdminProductManage />} />
                <Route path="orders" element={<AdminOrderManage />} />
                <Route path="config" element={<AdminConfigPage />} />
                <Route path="recharge-packages" element={<AdminRechargeManage />} />
                <Route path="ad-banners" element={<AdminAdBannerManage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
