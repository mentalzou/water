import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), '../data/water.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

export function initTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'customer',
      password_hash TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','locked')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      permissions TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS distributors (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      level INTEGER DEFAULT 1,
      total_commission REAL DEFAULT 0,
      available_commission REAL DEFAULT 0,
      frozen_commission REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','frozen')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deliverymen (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      area_ids TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','busy')),
      total_orders INTEGER DEFAULT 0,
      completed_orders INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      deliveryman_ids TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      logo TEXT DEFAULT '',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      unit TEXT DEFAULT '瓶',
      image TEXT DEFAULT '',
      stock INTEGER DEFAULT 99999,
      brand_id TEXT DEFAULT '' REFERENCES brands(id),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      customer_phone TEXT NOT NULL,
      customer_name TEXT DEFAULT '',
      address TEXT NOT NULL,
      total_amount REAL NOT NULL,
      distributor_id TEXT REFERENCES distributors(id),
      distributor_commission REAL DEFAULT 0,
      deliveryman_id TEXT REFERENCES deliverymen(id),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','assigned','delivering','completed','cancelled')),
      pay_status TEXT DEFAULT 'unpaid' CHECK(pay_status IN ('unpaid','paid','refunded')),
      transaction_id TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      paid_at TEXT DEFAULT '',
      assigned_at TEXT DEFAULT '',
      delivered_at TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      unit TEXT DEFAULT '瓶',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commissions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      distributor_id TEXT NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
      order_amount REAL NOT NULL,
      commission_rate REAL NOT NULL,
      commission_type TEXT CHECK(commission_type IN ('percentage','fixed')),
      commission_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','settled','cancelled')),
      settled_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      type TEXT DEFAULT 'string' CHECK(type IN ('string','number','boolean','json')),
      description TEXT DEFAULT '',
      group_key TEXT DEFAULT 'general'
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      province TEXT DEFAULT '',
      city TEXT DEFAULT '',
      district TEXT DEFAULT '',
      detail TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 兼容性迁移：为已存在的数据库添加新表和字段
  migrateDatabase(database);

  seedDefaultData(database);
}

/** 数据库迁移：增量更新已有数据库的表结构 */
function migrateDatabase(db: Database.Database): void {
  // 创建 brands 表（如果不存在）
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='brands'").get() as any;
  if (!tables) {
    db.exec(`
      CREATE TABLE brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo TEXT DEFAULT '',
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  // 为 products 表添加 brand_id 字段（如果不存在）
  try {
    const cols = db.prepare('PRAGMA table_info(products)').all() as any[];
    const hasBrandId = cols.some((c: any) => c.name === 'brand_id');
    if (!hasBrandId) {
      db.exec("ALTER TABLE products ADD COLUMN brand_id TEXT DEFAULT '' REFERENCES brands(id)");
    }
  } catch { /* ignore */ }

  // 创建 order_items 表（如果不存在）
  const hasOrderItems = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_items'").get();
  if (!hasOrderItems) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        unit TEXT DEFAULT '瓶',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // 迁移现有订单数据到 order_items 表
    migrateOrdersToItems(db);
  }

  // 迁移 orders 表：将 product_id, quantity, unit_price 设为可空（支持多商品订单）
  migrateOrdersTableSchema(db);

  // 创建 addresses 表（如果不存在）
  const hasAddresses = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='addresses'").get();
  if (!hasAddresses) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_name TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        province TEXT DEFAULT '',
        city TEXT DEFAULT '',
        district TEXT DEFAULT '',
        detail TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
}

/**
 * 迁移 orders 表结构：
 * 由于 SQLite 不支持直接 ALTER COLUMN 或 DROP COLUMN，
 * 需要重建表来支持多商品模式
 */
function migrateOrdersTableSchema(db: Database.Database): void {
  // 检查是否已经迁移过
  const migrated = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders_new_schema_v2'").get();
  if (migrated) return; // 已迁移

  try {
    // 获取当前表结构
    const orderCols = db.prepare('PRAGMA table_info(orders)').all() as any[];
    const hasOldFields = orderCols.some((c: any) => ['product_id', 'quantity', 'unit_price'].includes(c.name));

    if (hasOldFields) {
      console.log('[Migration] Migrating orders table to support multi-item orders...');
      
      // 1. 先迁移现有数据到 order_items
      migrateOrdersToItems(db);
      
      // 2. 创建新的 orders 表（不含旧的商品字段）
      db.exec(`
        CREATE TABLE orders_new_schema_v2 (
          id TEXT PRIMARY KEY,
          order_no TEXT NOT NULL UNIQUE,
          customer_phone TEXT NOT NULL,
          customer_name TEXT DEFAULT '',
          address TEXT NOT NULL,
          total_amount REAL NOT NULL,
          distributor_id TEXT,
          distributor_commission REAL DEFAULT 0,
          deliveryman_id TEXT,
          status TEXT DEFAULT 'pending',
          pay_status TEXT DEFAULT 'unpaid',
          transaction_id TEXT DEFAULT '',
          remark TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          paid_at TEXT DEFAULT '',
          assigned_at TEXT DEFAULT '',
          delivered_at TEXT DEFAULT ''
        );
      `);

      // 3. 复制数据到新表（忽略旧字段）
      db.exec(`
        INSERT INTO orders_new_schema_v2 
          (id, order_no, customer_phone, customer_name, address, total_amount, distributor_id, 
           distributor_commission, deliveryman_id, status, pay_status, transaction_id, remark,
           created_at, updated_at, paid_at, assigned_at, delivered_at)
        SELECT 
          id, order_no, customer_phone, customer_name, address, total_amount, distributor_id, 
          distributor_commission, deliveryman_id, status, pay_status, transaction_id, remark,
          created_at, updated_at, paid_at, assigned_at, delivered_at
        FROM orders;
      `);

      // 4. 删除旧表
      db.exec('DROP TABLE orders;');
      
      // 5. 重命名新表
      db.exec('ALTER TABLE orders_new_schema_v2 RENAME TO orders;');
      
      console.log('[Migration] Orders table migration completed successfully!');
    }
  } catch (e) {
    console.error('[Migration] Failed to migrate orders table:', e);
  }
}

/** 将旧订单数据迁移到 order_items 表 */
function migrateOrdersToItems(db: Database.Database): void {
  try {
    const oldOrders = db.prepare(`
      SELECT id, product_id, quantity, unit_price 
      FROM orders 
      WHERE product_id IS NOT NULL AND product_id != ''
    `).all() as any[];
    
    if (oldOrders.length > 0) {
      const insertItem = db.prepare(
        'INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, subtotal, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      
      for (const order of oldOrders) {
        // 获取产品名称
        const product = db.prepare('SELECT name, unit FROM products WHERE id = ?').get(order.product_id) as any;
        const itemName = product?.name || order.product_id;
        const itemUnit = product?.unit || '瓶';
        const subtotal = (order.unit_price || 0) * (order.quantity || 1);
        
        insertItem.run(
          `${order.id}-item-1`,
          order.id,
          order.product_id,
          itemName,
          order.quantity || 1,
          order.unit_price || 0,
          subtotal,
          itemUnit
        );
      }
      
      console.log(`[Migration] Migrated ${oldOrders.length} orders to order_items`);
    }
  } catch (e) {
    console.error('[Migration] Failed to migrate orders:', e);
  }
}

function seedDefaultData(database: Database.Database): void {
  const productCount = database.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (productCount.count === 0) {
    // 先插入品牌
    const brandCount = database.prepare('SELECT COUNT(*) as count FROM brands').get() as { count: number };
    if (brandCount.count === 0) {
      const insertBrand = database.prepare(
        'INSERT INTO brands (id, name, description, sort_order) VALUES (?, ?, ?, ?)'
      );
      insertBrand.run('brand-001', '怡宝', '国民饮用水品牌', 1);
      insertBrand.run('brand-002', '农夫山泉', '天然好水，健康之选', 2);
      insertBrand.run('brand-003', '百岁山', '高端矿泉水品牌', 3);
    }
    const insertProduct = database.prepare(
      'INSERT INTO products (id, name, description, price, unit, brand_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertProduct.run('prod-001', '纯天然矿泉水', '源自深层地下岩层，富含多种矿物质，口感甘甜清冽', 3.00, '瓶', 'brand-001', 1);
    insertProduct.run('prod-002', '山泉水大桶装', '高山源头活水，适合家庭日常饮用，一桶20升', 25.00, '桶', 'brand-002', 2);
    insertProduct.run('prod-003', '高端冰川水', '来自万年冰川融水，极致纯净，送礼首选', 8.00, '瓶', 'brand-003', 3);
  }

  const configCount = database.prepare('SELECT COUNT(*) as count FROM system_config').get() as { count: number };
  if (configCount.count === 0) {
    const insertConfig = database.prepare(
      'INSERT OR IGNORE INTO system_config (key, value, type, description, group_key) VALUES (?, ?, ?, ?, ?)'
    );
    insertConfig.run('commission_type', 'percentage', 'string', '返佣类型：percentage=百分比, fixed=固定金额', 'commission');
    insertConfig.run('commission_rate', '5', 'number', '返佣数值：百分比时为5表示5%，固定金额时为具体元数', 'commission');
    insertConfig.run('site_name', '好水到家', 'string', '站点名称', 'general');
    insertConfig.run('wx_mch_id', '', 'string', '微信支付商户号', 'payment');
    insertConfig.run('wx_api_key', '', 'string', '微信支付APIv3密钥', 'payment');
    insertConfig.run('wx_app_id', '', 'string', '微信应用AppID', 'payment');
    insertConfig.run('admin_password', 'admin123456', 'string', '管理员初始密码', 'auth');
  }

  const adminCount = database.prepare("SELECT COUNT(*) as count FROM users WHERE role='admin'").get() as { count: number };
  if (adminCount.count === 0) {
    database.prepare("INSERT INTO users (id, phone, name, role, status) VALUES ('admin-001', '13800000000', '系统管理员', 'admin', 'active')");
  }

  const roleCount = database.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  if (roleCount.count === 0) {
    const insertRole = database.prepare(
      "INSERT INTO roles (id, name, code, description, permissions) VALUES (?, ?, ?, ?, ?)"
    );
    insertRole.run('role-001', '系统管理员', 'admin', '拥有系统所有权限', '["*"]');
    insertRole.run('role-002', '分销商', 'distributor', '分销商角色，可查看订单和佣金', '["order:view","commission:view","share:generate"]');
    insertRole.run('role-003', '派送员', 'deliveryman', '派送员角色，可查看和配送订单', '["order:view","order:deliver","task:view"]');
    insertRole.run('role-004', '消费者', 'customer', '普通消费者，可下单购买产品', '["product:view","order:create","order:view_own"]');
  }
}

export default getDb;
