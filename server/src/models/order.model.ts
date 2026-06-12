import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { Order } from '../types';

const db = getDb();

function generateOrderNo(): string {
  const now = new Date();
  const datePart = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    (now.getDate()).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WD${datePart}${random}`;
}

export const orderModel = {
  create(data: {
    customer_phone: string;
    customer_name: string;
    address: string;
    total_amount: number;
    distributor_id?: string;
    distributor_commission?: number;
    pay_method?: string;
    from_balance?: number;
    from_bonus?: number;
    delivery_date?: string;
    delivery_time?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      unit?: string;
    }>;
  }): Order {
    const id = uuidv4();
    const order_no = generateOrderNo();
    
    // 创建订单主表记录（不含商品信息）
    db.prepare(
      `INSERT INTO orders (id, order_no, customer_phone, customer_name, address, total_amount, distributor_id, distributor_commission, pay_method, from_balance, from_bonus, delivery_date, delivery_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, order_no,
      data.customer_phone, data.customer_name, data.address,
      data.total_amount,
      data.distributor_id || null, data.distributor_commission || 0,
      data.pay_method || 'online',
      data.from_balance || 0,
      data.from_bonus || 0,
      data.delivery_date || '',
      data.delivery_time || ''
    );

    // 创建订单商品明细
    if (data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const subtotal = item.unit_price * item.quantity;
        db.prepare(
          `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal, unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          `${id}-item-${i + 1}`,
          id,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          subtotal,
          item.unit || '瓶'
        );
      }
    }

    return this.findById(id)!;
  },

  findById(id: string): Order | undefined {
    return this.findByIdDetailed(id);
  },

  findByIdDetailed(id: string): (Order & { items?: any[]; product?: any; distributor?: any; deliveryman?: any }) | undefined {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined;
    if (!order) return undefined;

    // 查询订单商品明细
    const items = db.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).all(id) as any[];

    let distributor: any = null;
    if (order.distributor_id) {
      distributor = db.prepare(
        'SELECT d.id, d.code, d.total_commission, u.name as user_name FROM distributors d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?'
      ).get(order.distributor_id) as any | undefined;
    }

    let deliveryman: any = null;
    if (order.deliveryman_id) {
      deliveryman = db.prepare('SELECT id, name, phone FROM deliverymen WHERE id = ?').get(order.deliveryman_id) as any | undefined;
    }

    return { ...order, items, distributor, deliveryman };
  },

  findByOrderNo(orderNo: string): Order | undefined {
    return db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo) as Order | undefined;
  },

  findByPhone(phone: string, page = 1, pageSize = 20): { data: any[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE customer_phone = ?').get(phone) as { count: number }).count;
    const orders = db.prepare(
      'SELECT * FROM orders WHERE customer_phone = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(phone, pageSize, (page - 1) * pageSize) as Order[];
    
    // 为每个订单查询商品明细
    const data = orders.map(order => ({
      ...order,
      items: this.getOrderItems(order.id),
    }));
    
    return { data, total };
  },

  findByDistributorId(distributorId: string, page = 1, pageSize = 20): { data: any[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE distributor_id = ?').get(distributorId) as { count: number }).count;
    const orders = db.prepare(
      'SELECT o.* FROM orders o WHERE o.distributor_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?'
    ).all(distributorId, pageSize, (page - 1) * pageSize) as any[];
    
    // 为每个订单查询商品明细
    const data = orders.map((order: any) => ({
      ...order,
      items: this.getOrderItems(order.id),
    }));
    
    return { data, total };
  },

  /** 获取订单的商品明细 */
  getOrderItems(orderId: string): any[] {
    return db.prepare(
      'SELECT oi.*, p.name as current_product_name, p.unit as current_unit FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?'
    ).all(orderId);
  },

  findAll(
    page = 1,
    pageSize = 20,
    status?: string,
    options?: { keyword?: string; address?: string; distributor_id?: string; deliveryman_id?: string }
  ): { data: (Order & { items?: any[]; product?: any; distributor?: any; deliveryman?: any; distributor_name?: string; deliveryman_name?: string })[]; total: number } {
    let where = ' WHERE 1=1';
    const params: any[] = [];
    if (status) {
      where += ' AND o.status = ?';
      params.push(status);
    }
    if (options?.keyword) {
      where += " AND (o.order_no LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)";
      const kw = `%${options.keyword}%`;
      params.push(kw, kw, kw);
    }
    if (options?.address) {
      where += ' AND o.address LIKE ?';
      params.push(`%${options.address}%`);
    }
    if (options?.distributor_id) {
      where += ' AND o.distributor_id = ?';
      params.push(options.distributor_id);
    }
    if (options?.deliveryman_id) {
      where += ' AND o.deliveryman_id = ?';
      params.push(options.deliveryman_id);
    }
    const countSql = `SELECT COUNT(*) as count FROM orders o${where}`;
    const total = (db.prepare(countSql).get(...params) as { count: number }).count;
    const dataSql = `SELECT o.*, du.name as distributor_name, dm.name as deliveryman_name
      FROM orders o
      LEFT JOIN distributors d ON o.distributor_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      LEFT JOIN deliverymen dm ON o.deliveryman_id = dm.id
      ${where}
      ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, (page - 1) * pageSize);
    const rows = db.prepare(dataSql).all(params) as any[];
    
    // 为每个订单查询商品明细
    const data = rows.map((row: any) => ({
      ...row,
      items: this.getOrderItems(row.id),
    }));
    
    return { data: data as any, total };
  },

  /** 导出报表：不分页，返回所有匹配的订单（含商品明细 + 分销商/派送员名称） */
  findAllNoPaginate(
    status?: string,
    options?: { keyword?: string; address?: string; distributor_id?: string; deliveryman_id?: string }
  ): (Order & { items?: any[]; distributor_name?: string; deliveryman_name?: string })[] {
    let sql = `SELECT o.*,
      d_user.name as distributor_name,
      dm.name as deliveryman_name
      FROM orders o
      LEFT JOIN distributors d ON o.distributor_id = d.id
      LEFT JOIN users d_user ON d.user_id = d_user.id
      LEFT JOIN deliverymen dm ON o.deliveryman_id = dm.id
      WHERE 1=1`;
    const params: any[] = [];
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (options?.keyword) {
      sql += " AND (o.order_no LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)";
      const kw = `%${options.keyword}%`;
      params.push(kw, kw, kw);
    }
    if (options?.address) {
      sql += ' AND o.address LIKE ?';
      params.push(`%${options.address}%`);
    }
    if (options?.distributor_id) {
      sql += ' AND o.distributor_id = ?';
      params.push(options.distributor_id);
    }
    if (options?.deliveryman_id) {
      sql += ' AND o.deliveryman_id = ?';
      params.push(options.deliveryman_id);
    }
    sql += ' ORDER BY o.created_at DESC';
    const rows = db.prepare(sql).all(params) as any[];
    return rows.map((row: any) => ({
      ...row,
      items: this.getOrderItems(row.id),
    }));
  },

  updateStatus(id: string, status: Order['status']): Order | undefined {
    const timeField = {
      paid: 'paid_at',
      assigned: 'assigned_at',
      completed: 'delivered_at',
    };
    const timeCol = timeField[status as keyof typeof timeField];
    if (timeCol) {
      db.prepare(`UPDATE orders SET status = ?, ${timeCol} = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(status, id);
    } else {
      db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    }
    return this.findById(id);
  },

  assignDeliveryman(orderId: string, deliverymanId: string): Order | undefined {
    const info = db.prepare("UPDATE orders SET deliveryman_id = ?, status = 'assigned', assigned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(deliverymanId, orderId);
    console.log(`[派单] 订单 ${orderId} 派单结果: changes=${info.changes}, deliveryman=${deliverymanId}`);
    if (info.changes === 0) {
      console.error(`[派单] 订单 ${orderId} 未找到或条件不匹配！`);
      return undefined;
    }
    db.prepare('UPDATE deliverymen SET total_orders = total_orders + 1 WHERE id = ?').run(deliverymanId);
    const updated = this.findById(orderId);
    console.log(`[派单] 订单 ${orderId} 更新后数据库状态:`, updated?.status, updated?.deliveryman_id);
    return updated;
  },

  markPaid(id: string, transactionId: string): Order | undefined {
    db.prepare("UPDATE orders SET pay_status = 'paid', status = 'paid', transaction_id = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(transactionId, id);
    return this.findById(id);
  },

  /** 支付成功后的"待派送"状态（等待系统匹配派送员） */
  markPendingDelivery(id: string, transactionId: string): Order | undefined {
    db.prepare("UPDATE orders SET pay_status = 'paid', status = 'pending_delivery', transaction_id = ?, paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(transactionId, id);
    return this.findById(id);
  },

  markRefunding(id: string, refundOrderNo: string): Order | undefined {
    db.prepare("UPDATE orders SET status = 'refunding', remark = '退款订单号:' || ? || CASE WHEN remark IS NOT NULL AND remark != '' THEN ';' || remark ELSE '' END, updated_at = datetime('now') WHERE id = ?")
      .run(refundOrderNo, id);
    return this.findById(id);
  },

  markRefunded(id: string): Order | undefined {
    db.prepare("UPDATE orders SET status = 'refunded', pay_status = 'refunded', updated_at = datetime('now') WHERE id = ?")
      .run(id);
    return this.findById(id);
  },
};
