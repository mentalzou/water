export interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  avatar?: string;
  password_hash?: string;
  status: 'active' | 'inactive' | 'locked';
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
  description: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  image?: string;
  stock: number;
  brand_id?: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
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
  status: 'pending' | 'paid' | 'assigned' | 'delivering' | 'completed' | 'cancelled';
  pay_status: 'unpaid' | 'paid' | 'refunded';
  transaction_id?: string;
  remark?: string;
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

export interface SystemConfig {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  group: string;
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
