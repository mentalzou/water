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
{/* 提现与下线功能暂屏蔽 */}
{/* const DistributorWithdraw = lazy(() => import('./pages/distributor/WithdrawPage'))
const DistributorDownlines = lazy(() => import('./pages/distributor/DownlinesPage')) */}
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
import { useWechatOAuth } from './hooks/useWechatOAuth';

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
    // 微信 OAuth 授权：自动检测微信环境，获取 code → 换取 openId
    // 若无 openId 且无 code，自动跳转微信授权页
    useWechatOAuth();

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
{/* 提现与下线功能暂屏蔽 */}
                {/* <Route path="withdraw" element={<DistributorWithdraw />} />
                <Route path="downlines" element={<DistributorDownlines />} /> */}
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
