import { deliverymanModel } from '../models/deliveryman.model';
import type { Order, Deliveryman } from '../types';

/**
 * 根据订单收货地址中的"区"匹配派送员（随机派单）
 *
 * 匹配优先级：
 *   1. 同区（district）活跃派送员 → 随机选一个
 *   2. 同市（city）活跃派送员 → 随机选一个
 *   3. 同省（province）活跃派送员 → 随机选一个
 *   4. 全局 fallback → 任意活跃派送员
 */
export function matchDeliverymanForOrder(order: Order): Deliveryman | null {
  // 从订单 address 字段中提取省/市/区
  const addr = order.address || '';
  const { province, city, district } = parseAddress(addr);

  console.log(`[Matching] 订单 ${order.order_no} 地址解析: province=${province}, city=${city}, district=${district}`);

  // 第一优先：同区匹配（随机选一个）
  if (district) {
    const districtDms = deliverymanModel.findActiveByDistrict(district);
    if (districtDms.length > 0) {
      const picked = districtDms[Math.floor(Math.random() * districtDms.length)];
      const pickedDistricts = (picked.districts || []).join('、');
      console.log(`[Matching] 同区匹配成功: ${picked.name} (负责区域: ${pickedDistricts}), 该区共 ${districtDms.length} 人`);
      return picked;
    }
  }

  // 第二优先：同市匹配
  if (city) {
    const cityDms = findActiveByCity(city);
    if (cityDms.length > 0) {
      const picked = cityDms[Math.floor(Math.random() * cityDms.length)];
      console.log(`[Matching] 同市匹配成功: ${picked.name} (${picked.city}), 该市共 ${cityDms.length} 人`);
      return picked;
    }
  }

  // 第三优先：同省匹配
  if (province) {
    const provinceDms = findActiveByProvince(province);
    if (provinceDms.length > 0) {
      const picked = provinceDms[Math.floor(Math.random() * provinceDms.length)];
      console.log(`[Matching] 同省匹配成功: ${picked.name} (${picked.province}), 该省共 ${provinceDms.length} 人`);
      return picked;
    }
  }

  // 第四优先：全局随机
  console.warn(`[Matching] 未找到匹配派送员，使用全局 fallback`);
  return getAnyActiveDeliveryman();
}

/** 从地址字符串中解析省/市/区 */
function parseAddress(address: string): { province: string; city: string; district: string } {
  let province = '';
  let city = '';
  let district = '';

  // 尝试匹配 "省" / "市" / "区" / "县"
  const provinceMatch = address.match(/([\u4e00-\u9fa5]{2,}(?:省|自治区|特别行政区))/);
  if (provinceMatch) {
    province = provinceMatch[1];
  }

  const cityMatch = address.match(/([\u4e00-\u9fa5]{2,}(?:市|自治州|地区|盟))/);
  if (cityMatch) {
    city = cityMatch[1];
  }

  const districtMatch = address.match(/([\u4e00-\u9fa5]{2,}(?:区|县|县级市|旗|自治旗))/);
  if (districtMatch) {
    district = districtMatch[1];
  }

  return { province, city, district };
}

/** 按市查找活跃派送员 */
function findActiveByCity(city: string): Deliveryman[] {
  try {
    const all = (deliverymanModel.findAll(1, 200)).data;
    return all.filter(d => d.status === 'active' && d.city === city);
  } catch {
    return [];
  }
}

/** 按省查找活跃派送员 */
function findActiveByProvince(province: string): Deliveryman[] {
  try {
    const all = (deliverymanModel.findAll(1, 200)).data;
    return all.filter(d => d.status === 'active' && d.province === province);
  } catch {
    return [];
  }
}

function getAnyActiveDeliveryman(): Deliveryman | null {
  try {
    const all = (deliverymanModel.findAll(1, 200)).data;
    const activeList = all.filter(d => d.status === 'active');
    if (activeList.length === 0) return null;
    return activeList[Math.floor(Math.random() * activeList.length)];
  } catch {
    return null;
  }
}
