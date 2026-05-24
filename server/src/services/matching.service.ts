import { areaModel } from '../models/area.model';
import { deliverymanModel } from '../models/deliveryman.model';
import type { Order, Deliveryman } from '../types';

export function matchDeliverymanForOrder(order: Order): Deliveryman | null {
  const area = areaModel.matchByAddress(order.address);
  if (!area) {
    console.warn(`[Matching] No matching area for address: ${order.address}`);
    return getAnyActiveDeliveryman();
  }
  
  const deliverymen = deliverymanModel.findActiveByAreaId(area.id);
  if (deliverymen.length === 0) {
    console.warn(`[Matching] No active deliveryman for area: ${area.name}`);
    return getAnyActiveDeliveryman();
  }

  // Pick the one with least current load (simple round-robin alternative)
  return deliverymen.sort((a, b) => a.total_orders - b.total_orders)[0];
}

function getAnyActiveDeliveryman(): Deliveryman | null {
  try {
    const all = (deliverymanModel.findAll(1, 100)).data;
    return all.find(d => d.status === 'active') || null;
  } catch {
    return null;
  }
}
