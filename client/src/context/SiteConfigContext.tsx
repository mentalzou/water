import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SiteConfigContextType {
  siteName: string;
  loading: boolean;
}

const SiteConfigContext = createContext<SiteConfigContextType>({
  siteName: '武夷屿都山水',
  loading: true,
});

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [siteName, setSiteName] = useState('武夷屿都山水');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchSiteName() {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${API_BASE}/config/site-name`);
        const data = await res.json();
        if (!cancelled && data?.code === 200) {
          const name = data.data?.site_name || '武夷屿都山水';
          setSiteName(name);
          document.title = name;
        }
      } catch {
        // 保持默认值
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSiteName();
    return () => { cancelled = true; };
  }, []);

  return (
    <SiteConfigContext.Provider value={{ siteName, loading }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
