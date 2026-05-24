import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const CustomerOrderPage = lazy(() => import('./pages/customer/OrderPage'))
const CustomerOrderList = lazy(() => import('./pages/customer/OrderList'))
const CustomerLogin = lazy(() => import('./pages/customer/Login'))
const CustomerProfile = lazy(() => import('./pages/customer/ProfilePage'))
const CustomerOrdersPage = lazy(() => import('./pages/customer/OrdersPage'))
const CustomerPasswordPage = lazy(() => import('./pages/customer/PasswordPage'))
const CustomerAddressPage = lazy(() => import('./pages/customer/AddressPage'))
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
const AdminOrderManage = lazy(() => import('./pages/admin/OrderManage'))
const AdminProductManage = lazy(() => import('./pages/admin/ProductManage'))
const AdminBrandManage = lazy(() => import('./pages/admin/BrandManage'))
const AdminConfigPage = lazy(() => import('./pages/admin/ConfigPage'))

const DistributorLogin = lazy(() => import('./pages/distributor/Login'))
const DistributorLayout = lazy(() => import('./components/DistributorLayout'))
const DeliverymanLogin = lazy(() => import('./pages/deliveryman/Login'))
const DeliverymanLayout = lazy(() => import('./components/DeliverymanLayout'))

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-water-light/30 border-t-water rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* 消费者端 */}
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/" element={<CustomerOrderPage />} />
        <Route path="/order/result/:id" element={<CustomerOrderPage />} />
        <Route path="/orders" element={<CustomerOrderList />} />
        <Route path="/profile" element={<CustomerProfile />} />
        <Route path="/profile/orders" element={<CustomerOrdersPage />} />
        <Route path="/profile/password" element={<CustomerPasswordPage />} />
        <Route path="/profile/address" element={<CustomerAddressPage />} />

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
          <Route path="brands" element={<AdminBrandManage />} />
          <Route path="orders" element={<AdminOrderManage />} />
          <Route path="products" element={<AdminProductManage />} />
          <Route path="config" element={<AdminConfigPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
