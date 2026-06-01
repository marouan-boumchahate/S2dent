'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

const LogoContext = createContext<{
  logoUrl: string;
  setLogoUrl: (url: string) => void;
}>({ logoUrl: '/logo.png', setLogoUrl: () => {} });

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState('/logo.png');
  return (
    <LogoContext.Provider value={{ logoUrl, setLogoUrl }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);