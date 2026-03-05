import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { calculateTotal } from '../services/pricing';
import { storageService } from '../services/storage';
import { CartItem, Offer, PricingPolicy, RequestContact, RequestOrder, Role } from '../types';

type AppStoreValue = {
  role: Role | null;
  setRole: (role: Role) => void;
  policy: PricingPolicy;
  setPolicy: (policy: PricingPolicy) => void;
  cart: CartItem[];
  addToCart: (serviceId: string) => void;
  updateCartQuantity: (serviceId: string, quantity: number) => void;
  clearCart: () => void;
  requests: RequestOrder[];
  createRequest: (contact: RequestContact) => Promise<void>;
  masterOnline: boolean;
  toggleMasterOnline: () => Promise<void>;
  createOffer: (requestId: string) => Promise<void>;
};

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined);

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [policy, setPolicy] = useState<PricingPolicy>('economy');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [masterOnline, setMasterOnline] = useState(false);

  useEffect(() => {
    const load = async () => {
      setRequests(await storageService.getRequests());
      setMasterOnline(await storageService.getMasterOnline());
    };
    void load();
  }, []);

  const addToCart = (serviceId: string) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.serviceId === serviceId);
      if (existing) {
        return prev.map((x) => (x.serviceId === serviceId ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { serviceId, quantity: 1 }];
    });
  };

  const updateCartQuantity = (serviceId: string, quantity: number) => {
    setCart((prev) => prev.map((x) => (x.serviceId === serviceId ? { ...x, quantity } : x)).filter((x) => x.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const createRequest = async (contact: RequestContact) => {
    const newRequest: RequestOrder = {
      id: Date.now().toString(),
      role: 'client',
      status: 'new',
      pricingPolicy: policy,
      items: cart,
      totalPrice: calculateTotal(cart, policy),
      contact,
      createdAt: new Date().toISOString()
    };

    const next = [newRequest, ...requests];
    setRequests(next);
    await storageService.saveRequests(next);
    setCart([]);
  };

  const toggleMasterOnline = async () => {
    const next = !masterOnline;
    setMasterOnline(next);
    await storageService.saveMasterOnline(next);
  };

  const createOffer = async (requestId: string) => {
    const offers = await storageService.getOffers();
    const newOffer: Offer = {
      id: Date.now().toString(),
      requestId,
      message: 'Готов выполнить заявку. Свяжусь для уточнения деталей.',
      createdAt: new Date().toISOString()
    };

    await storageService.saveOffers([newOffer, ...offers]);

    const nextRequests = requests.map((request) =>
      request.id === requestId ? { ...request, status: 'offered' as const } : request
    );
    setRequests(nextRequests);
    await storageService.saveRequests(nextRequests);
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      policy,
      setPolicy,
      cart,
      addToCart,
      updateCartQuantity,
      clearCart,
      requests,
      createRequest,
      masterOnline,
      toggleMasterOnline,
      createOffer
    }),
    [role, policy, cart, requests, masterOnline]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export const useAppStore = () => {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
};
