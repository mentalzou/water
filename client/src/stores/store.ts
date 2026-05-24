import { create } from 'zustand';

interface AppState {
  // Distributor info from URL
  distributorCode: string | null;
  setDistributorCode: (code: string | null) => void;
  
  // Admin auth
  isAdmin: boolean;
  adminToken: string | null;
  setAdminAuth: (token: string) => void;
  clearAdminAuth: () => void;
  
  // Deliveryman
  deliverymanId: string | null;
  deliverymanName: string | null;
  setDeliverymanInfo: (id: string, name: string) => void;
  
  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  distributorCode: null,
  setDistributorCode: (code) => set({ distributorCode: code }),
  
  isAdmin: false,
  adminToken: typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null,
  setAdminAuth: (token) => {
    localStorage.setItem('adminToken', token);
    set({ isAdmin: true, adminToken: token });
  },
  clearAdminAuth: () => {
    localStorage.removeItem('adminToken');
    set({ isAdmin: false, adminToken: null });
  },
  
  deliverymanId: null,
  deliverymanName: null,
  setDeliverymanInfo: (id, name) => set({ deliverymanId: id, deliverymanName: name }),
  
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
