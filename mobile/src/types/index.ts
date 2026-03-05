export type Role = 'client' | 'master';
export type PricingPolicy = 'economy' | 'comfort' | 'business';

export type ServiceCategory =
  | 'Розетки'
  | 'Кабель'
  | 'Щит'
  | 'Освещение'
  | 'Другое';

export interface ServiceItem {
  id: string;
  category: ServiceCategory;
  title: string;
  unit: string;
}

export interface ServicePricing {
  economy: number;
  comfort: number;
  business: number;
}

export interface CartItem {
  serviceId: string;
  quantity: number;
}

export interface RequestContact {
  name: string;
  phone: string;
  address: string;
  comment: string;
  preferredTime?: string;
}

export interface RequestOrder {
  id: string;
  role: 'client';
  status: 'new' | 'offered';
  pricingPolicy: PricingPolicy;
  items: CartItem[];
  totalPrice: number;
  contact: RequestContact;
  createdAt: string;
}

export interface Offer {
  id: string;
  requestId: string;
  message: string;
  createdAt: string;
}
