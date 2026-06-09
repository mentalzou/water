export interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  avatar?: string;
  password_hash?: string;
  points: number;
  status: 'active' | 'inactive' | 'locked';
  referrer_distributor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string; // JSON array of permission strings
  created_at: string;
}

export interface Distributor {
  id: string;
  user_id: string;
  code: string;
  level: number;
  total_commission: number;
  available_commission: number;
  frozen_commission: number;
  status: 'active' | 'inactive' | 'frozen';
  created_at: string;
  user?: User;
}

export interface Deliveryman {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  area_ids: string[];
  province: string;
  city: string;
  districts: string[];
  status: 'active' | 'inactive' | 'busy';
  total_orders: number;
  completed_orders: number;
  rating: number;
  created_at: string;
}

export interface Area {
  id: string;
  name: string;
  description: string;
  deliveryman_ids: string[];
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  status?: string;
  sort_order?: number;
  created_at?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  image?: string;
  stock?: number;
  brand_id?: string;
  brand_name?: string;
  category_id?: string;
  category_name?: string;
  status?: string;
  sort_order?: number;
  created_at?: string;
}


export interface Order {
  id: string;
  order_no: string;
  customer_phone: string;
  customer_name: string;
  address: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  distributor_id?: string;
  distributor_commission?: number;
  deliveryman_id?: string;
  status: 'pending' | 'paid' | 'pending_delivery' | 'refunding' | 'refunded' | 'assigned' | 'delivering' | 'completed' | 'cancelled';
  pay_status: 'unpaid' | 'paid' | 'refunded';
  pay_method: 'online' | 'balance' | 'mixed';
  from_balance: number;
  from_bonus: number;
  transaction_id?: string;
  remark?: string;
  delivery_date?: string;
  delivery_time?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  assigned_at?: string;
  delivered_at?: string;
  product?: Product;
  distributor?: Distributor;
  deliveryman?: Deliveryman;
}

export interface CommissionRecord {
  id: string;
  order_id: string;
  distributor_id: string;
  order_amount: number;
  commission_rate: number;
  commission_type: 'percentage' | 'fixed';
  commission_amount: number;
  status: 'pending' | 'settled' | 'cancelled';
  settled_at?: string;
  created_at: string;
}

export interface WithdrawRequest {
  id: string;
  distributor_id: string;
  amount: number;
  bank_name: string;
  bank_account: string;
  account_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  remark: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
  distributor_code?: string;
  distributor_name?: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  group: string;
}

export interface PointsRecord {
  id: string;
  user_id: string;
  order_id?: string;
  change_type: 'earn' | 'spend' | 'refund' | 'adjust' | 'expire';
  change_amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export interface RechargePackage {
  id: string;
  name: string;
  amount: number;
  discount_rate: number;
  bonus_amount: number;
  description?: string;
  status: 'active' | 'inactive';
  sort_order?: number;
  created_at?: string;
}

export interface UserRecharge {
  id: string;
  user_id: string;
  package_id: string;
  amount: number;
  discount_rate: number;
  bonus_amount: number;
  paid_amount: number;
  remaining_balance: number;
  bonus_balance: number;
  status: 'active' | 'expired' | 'refunded';
  transaction_id?: string;
  remark?: string;
  created_at?: string;
  paid_at?: string;
  package?: RechargePackage;
}

export interface BalanceTransaction {
  id: string;
  user_id: string;
  recharge_id?: string;
  order_id?: string;
  tx_type: 'recharge_principal' | 'recharge_bonus' | 'consume_bonus' | 'consume_principal' | 'refund' | 'adjust' | 'expire';
  amount: number;
  principal_after: number;
  bonus_after: number;
  description: string;
  operator_ip?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type JwtPayload = {
  userId: string;
  role: User['role'];
};

export interface AdBanner {
  id: string;
  title: string;
  subtitle: string;
  type: 'image' | 'video';
  src: string;
  link_url: string;
  bg_color: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
