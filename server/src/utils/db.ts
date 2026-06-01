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
       points INTEGER DEFAULT 0,
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
      category_id TEXT DEFAULT '' REFERENCES product_categories(id),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
      );

    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '',
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
      category_id TEXT DEFAULT '' REFERENCES product_categories(id),
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
      pay_method TEXT DEFAULT 'online' CHECK(pay_method IN ('online','balance','mixed')),
      from_balance REAL DEFAULT 0,
      from_bonus REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS points_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id),
      change_type TEXT NOT NULL CHECK(change_type IN ('earn', 'spend', 'refund', 'adjust', 'expire')),
      change_amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
      );

    CREATE TABLE IF NOT EXISTS recharge_packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      discount_rate REAL NOT NULL,
      bonus_amount REAL DEFAULT 0,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
      );

    CREATE TABLE IF NOT EXISTS user_recharges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      package_id TEXT NOT NULL REFERENCES recharge_packages(id),
      amount REAL NOT NULL,
      discount_rate REAL NOT NULL,
      bonus_amount REAL DEFAULT 0,
      paid_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      bonus_balance REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','expired','refunded')),
      transaction_id TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      paid_at TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS balance_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recharge_id TEXT REFERENCES user_recharges(id),
      order_id TEXT REFERENCES orders(id),
      tx_type TEXT NOT NULL CHECK(tx_type IN ('recharge_principal','recharge_bonus','consume_bonus','consume_principal','refund','adjust','expire')),
      amount REAL NOT NULL,
      principal_after REAL DEFAULT 0,
      bonus_after REAL DEFAULT 0,
      description TEXT DEFAULT '',
      operator_ip TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ad_banners (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      subtitle TEXT DEFAULT '',
      type TEXT DEFAULT 'image' CHECK(type IN ('image','video')),
      src TEXT DEFAULT '',
      link_url TEXT DEFAULT '',
      bg_color TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
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
        category_id TEXT DEFAULT '' REFERENCES product_categories(id),
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } else {
    // 为已存在的 brands 表添加 category_id 字段
    try {
      const brandCols = db.prepare('PRAGMA table_info(brands)').all() as any[];
      const hasCategoryId = brandCols.some((c: any) => c.name === 'category_id');
      if (!hasCategoryId) {
        console.log('[Migration] Adding category_id column to brands table...');
        db.exec("ALTER TABLE brands ADD COLUMN category_id TEXT DEFAULT '' REFERENCES product_categories(id)");
        console.log('[Migration] category_id column added to brands table successfully');
      }
    } catch (e: any) {
      console.error('[Migration] Failed to add category_id to brands table:', e.message);
    }
  }

  // 创建 product_categories 表（如果不存在）
  const hasCategories = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='product_categories'").get();
  if (!hasCategories) {
    db.exec(`      CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  // 为 products 表添加 brand_id 字段（如果不存在）
  // 为 products 表添加 category_id 字段（如果不存在）
  try {
    const cols = db.prepare('PRAGMA table_info(products)').all() as any[];

    const hasCategoryId = cols.some((c: any) => c.name === 'category_id');
    if (!hasCategoryId) {
      db.exec("ALTER TABLE products ADD COLUMN category_id TEXT DEFAULT '' REFERENCES product_categories(id)");
    }

    const hasBrandId = cols.some((c: any) => c.name === 'brand_id');
    if (!hasBrandId) {
      db.exec("ALTER TABLE products ADD COLUMN brand_id TEXT DEFAULT '' REFERENCES brands(id)");
    }
  } catch (e: any) {
    console.error('[Migration] Failed to add columns to products table:', e.message);
  }

  // 创建 recharge_packages 表（如果不存在）
  const hasRechargePackages = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recharge_packages'").get();
  if (!hasRechargePackages) {
    db.exec(`      CREATE TABLE IF NOT EXISTS recharge_packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      discount_rate REAL NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  // 创建 user_recharges 表（如果不存在）
  const hasUserRecharges = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_recharges'").get();
  if (!hasUserRecharges) {
    db.exec(`      CREATE TABLE IF NOT EXISTS user_recharges (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          package_id TEXT NOT NULL REFERENCES recharge_packages(id),
          amount REAL NOT NULL,
          discount_rate REAL NOT NULL,
          paid_amount REAL NOT NULL,
          remaining_balance REAL NOT NULL,
          status TEXT DEFAULT 'active' CHECK(status IN ('active','expired','refunded')),
          transaction_id TEXT DEFAULT '',
          remark TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now')),
          paid_at TEXT DEFAULT ''
          )
    `);
  }

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
    db.exec(`      CREATE TABLE IF NOT EXISTS addresses (
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
  // 为 users 表添加 points 字段（如果不存在）
  try {
    const userCols = db.prepare('PRAGMA table_info(users)').all() as any[];
    const hasPoints = userCols.some((c: any) => c.name === 'points');
    if (!hasPoints) {
      db.exec("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0");
    }
  } catch { /* ignore */ }

  // 创建 points_records 表（如果不存在）
  const hasPointsRecords = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='points_records'").get();
  if (!hasPointsRecords) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS points_records (
                                                  id TEXT PRIMARY KEY,
                                                  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id TEXT REFERENCES orders(id),
        change_type TEXT NOT NULL CHECK(change_type IN ('earn', 'spend', 'refund', 'adjust', 'expire')),
        change_amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
        )
    `);
  }

  // 迁移 recharge_packages：添加 bonus_amount 字段
  try {
    const rpCols = db.prepare('PRAGMA table_info(recharge_packages)').all() as any[];
    const hasBonusAmount = rpCols.some((c: any) => c.name === 'bonus_amount');
    if (!hasBonusAmount) {
      console.log('[Migration] Adding bonus_amount column to recharge_packages...');
      db.exec("ALTER TABLE recharge_packages ADD COLUMN bonus_amount REAL DEFAULT 0");
      console.log('[Migration] bonus_amount column added to recharge_packages');
    }
  } catch (e: any) {
    console.error('[Migration] Failed to add bonus_amount to recharge_packages:', e.message);
  }

  // 迁移 user_recharges：添加 bonus_amount 和 bonus_balance 字段
  try {
    const urCols = db.prepare('PRAGMA table_info(user_recharges)').all() as any[];
    const hasBonusAmount = urCols.some((c: any) => c.name === 'bonus_amount');
    const hasBonusBalance = urCols.some((c: any) => c.name === 'bonus_balance');
    if (!hasBonusAmount) {
      console.log('[Migration] Adding bonus_amount column to user_recharges...');
      db.exec("ALTER TABLE user_recharges ADD COLUMN bonus_amount REAL DEFAULT 0");
      console.log('[Migration] bonus_amount column added to user_recharges');
    }
    if (!hasBonusBalance) {
      console.log('[Migration] Adding bonus_balance column to user_recharges...');
      db.exec("ALTER TABLE user_recharges ADD COLUMN bonus_balance REAL DEFAULT 0");
      console.log('[Migration] bonus_balance column added to user_recharges');
    }
  } catch (e: any) {
    console.error('[Migration] Failed to add columns to user_recharges:', e.message);
  }

  const hasAdBanners = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ad_banners'").get();
  if (!hasAdBanners) {
    console.log('[Migration] Creating ad_banners table...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS ad_banners (
        id TEXT PRIMARY KEY,
        title TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        type TEXT DEFAULT 'image' CHECK(type IN ('image','video')),
        src TEXT DEFAULT '',
        link_url TEXT DEFAULT '',
        bg_color TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('[Migration] ad_banners table created');
  }

  // 添加 open_id 字段到 users 表
  try {
    const userCols = db.prepare('PRAGMA table_info(users)').all() as any[];
    const hasOpenId = userCols.some((c: any) => c.name === 'open_id');
    if (!hasOpenId) {
      console.log('[Migration] Adding open_id column to users...');
      db.exec('ALTER TABLE users ADD COLUMN open_id TEXT DEFAULT \'\'');
      console.log('[Migration] open_id column added to users');
    }
  } catch (e: any) {
    console.error('[Migration] Failed to add open_id to users:', e.message);
  }

  // 创建 balance_transactions 流水表
  const hasBalanceTx = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='balance_transactions'").get();
  if (!hasBalanceTx) {
    console.log('[Migration] Creating balance_transactions table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS balance_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recharge_id TEXT REFERENCES user_recharges(id),
        order_id TEXT REFERENCES orders(id),
        tx_type TEXT NOT NULL CHECK(tx_type IN ('recharge_principal','recharge_bonus','consume_bonus','consume_principal','refund','adjust','expire')),
        amount REAL NOT NULL,
        principal_after REAL DEFAULT 0,
        bonus_after REAL DEFAULT 0,
        description TEXT DEFAULT '',
        operator_ip TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('[Migration] balance_transactions table created');
  }

  // 为 orders 表添加 pay_method 字段
  try {
    const orderCols = db.prepare('PRAGMA table_info(orders)').all() as any[];
    const hasPayMethod = orderCols.some((c: any) => c.name === 'pay_method');
    if (!hasPayMethod) {
      console.log('[Migration] Adding pay_method column to orders...');
      db.exec("ALTER TABLE orders ADD COLUMN pay_method TEXT DEFAULT 'online' CHECK(pay_method IN ('online','balance','mixed'))");
      console.log('[Migration] pay_method column added to orders');
    }
    // 添加 from_balance / from_bonus 字段（余额抵扣记录）
    const hasFromBalance = orderCols.some((c: any) => c.name === 'from_balance');
    if (!hasFromBalance) {
      db.exec("ALTER TABLE orders ADD COLUMN from_balance REAL DEFAULT 0");
      console.log('[Migration] from_balance column added to orders');
    }
    const hasFromBonus = orderCols.some((c: any) => c.name === 'from_bonus');
    if (!hasFromBonus) {
      db.exec("ALTER TABLE orders ADD COLUMN from_bonus REAL DEFAULT 0");
      console.log('[Migration] from_bonus column added to orders');
    }
  } catch (e: any) {
    console.error('[Migration] Failed to add pay_method/from_balance/from_bonus to orders:', e.message);
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
  const categoryCount = database.prepare('SELECT COUNT(*) as count FROM product_categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const insertCategory = database.prepare(
        'INSERT INTO product_categories (id, name, code, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertCategory.run('cat-001', '桶装水', 'barrel_water', '大桶装饮用水，适合家庭和办公室使用', '💧', 1);
    insertCategory.run('cat-002', '瓶装水', 'bottle_water', '便携式瓶装水，随时随地补充水分', '🥤', 2);
    insertCategory.run('cat-003', '饮水器', 'water_dispenser', '智能饮水设备，提供冷热饮水', '🚰', 3);
    insertCategory.run('cat-004', '超值购', 'value_buy', '特价优惠组合，性价比之选', '🎁', 4);
    insertCategory.run('cat-005', '定制水', 'custom_water', '企业定制专属用水，彰显品牌', '✨', 5);
  }

  const productCount = database.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (productCount.count === 0) {
    // 先插入品牌（带分类关联）
    const brandCount = database.prepare('SELECT COUNT(*) as count FROM brands').get() as { count: number };
    if (brandCount.count === 0) {
      const insertBrand = database.prepare(
        'INSERT INTO brands (id, name, description, category_id, sort_order) VALUES (?, ?, ?, ?, ?)'
      );
      insertBrand.run('brand-001', '怡宝', '国民饮用水品牌', 'cat-002', 1);
      insertBrand.run('brand-002', '农夫山泉', '天然好水，健康之选', 'cat-001', 2);
      insertBrand.run('brand-003', '百岁山', '高端矿泉水品牌', 'cat-002', 3);
      insertBrand.run('brand-004', '娃哈哈', '知名饮料品牌', 'cat-001', 4);
      insertBrand.run('brand-005', '康师傅', '优质饮用水品牌', 'cat-001', 5);
    }
    const insertProduct = database.prepare(
      'INSERT INTO products (id, name, description, price, unit, brand_id, category_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertProduct.run('prod-001', '纯天然矿泉水', '源自深层地下岩层，富含多种矿物质，口感甘甜清冽', 3.00, '瓶', 'brand-001', 'cat-002', 1);
    insertProduct.run('prod-002', '山泉水大桶装', '高山源头活水，适合家庭日常饮用，一桶20升', 25.00, '桶', 'brand-002', 'cat-001', 2);
    insertProduct.run('prod-003', '高端冰川水', '来自万年冰川融水，极致纯净，送礼首选', 8.00, '瓶', 'brand-003', 'cat-002', 3);
    insertProduct.run('prod-004', '纯净水桶装', '多重过滤，安全放心', 18.00, '桶', 'brand-004', 'cat-001', 4);
    insertProduct.run('prod-005', '天然矿泉水', '天然矿化，健康好水', 30.00, '桶', 'brand-005', 'cat-001', 5);
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
    insertConfig.run('wx_app_secret', '', 'string', '微信应用AppSecret', 'payment');
    insertConfig.run('admin_password', 'admin123456', 'string', '管理员初始密码', 'auth');
    insertConfig.run('points_earn_rate', '1', 'number', '积分获取比例：1表示消费1元获得1积分', 'points');
    insertConfig.run('points_min_order_amount', '0', 'number', '积分获取最低订单金额：0表示无限制', 'points');
  }

  // 初始化充值套餐数据
  const packageCount = database.prepare('SELECT COUNT(*) as count FROM recharge_packages').get() as { count: number };
  if (packageCount.count === 0) {
    const insertPackage = database.prepare(
        'INSERT INTO recharge_packages (id, name, amount, discount_rate, bonus_amount, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertPackage.run('pkg-001', '充值200元套餐', 200, 0, 10, '充值200元送10元，到账210元', 1);
    insertPackage.run('pkg-002', '充值500元套餐', 500, 0, 30, '充值500元送30元，到账530元', 2);
    insertPackage.run('pkg-003', '充值1000元套餐', 1000, 0, 80, '充值1000元送80元，到账1080元', 3);
    insertPackage.run('pkg-004', '充值2000元套餐', 2000, 0, 200, '充值2000元送200元，到账2200元', 4);
    insertPackage.run('pkg-005', '充值5000元套餐', 5000, 0, 500, '充值5000元送500元，到账5500元', 5);
  }

  const adminCount = database.prepare("SELECT COUNT(*) as count FROM users WHERE role='admin'").get() as { count: number };
  if (adminCount.count === 0) {
    database.prepare("INSERT INTO users (id, phone, name, role, status) VALUES ('admin-001', '13800000000', '系统管理员', 'admin', 'active')").run();
    const insertUser = database.prepare(
        'INSERT INTO users (id, phone, name, role, password_hash, avatar, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertUser.run('admin-001', '13800000000', '系统管理员', 'admin', 'pbkdf2_sha256$260000$94276ea53064985dc60f91157603838a$ca87f115c59d2e42f98c3c7c79a08179e12c10101ac4f24fea130b20b0a13396',
        '', 'active', '2026-05-10 03:19:28', '2026-05-10 03:19:35');
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
