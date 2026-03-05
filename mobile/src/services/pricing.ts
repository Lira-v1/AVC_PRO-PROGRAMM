import { PRICES, SERVICES } from '../constants/prices';
import { CartItem, PricingPolicy, ServiceItem } from '../types';

export const groupByCategory = (): Record<string, ServiceItem[]> =>
  SERVICES.reduce<Record<string, ServiceItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

export const getPrice = (serviceId: string, policy: PricingPolicy): number => PRICES[serviceId]?.[policy] ?? 0;

export const calculateTotal = (items: CartItem[], policy: PricingPolicy): number =>
  items.reduce((sum, item) => sum + getPrice(item.serviceId, policy) * item.quantity, 0);
