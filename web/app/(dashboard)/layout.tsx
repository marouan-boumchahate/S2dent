'use client';

import Sidebar from "@/components/Sidebar";
import { NotificationProvider } from "@/components/NotificationContext";
import { LogoProvider } from "@/lib/logoContext";
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const role = localStorage.getItem('userRole');
    const professorAllowed = ['/enrolled-students', '/academic-credentials', '/createCredential', '/profile'];
    const isProfessor = role === 'professor';
    const isPathAllowed = !isProfessor || professorAllowed.some(p => pathname.startsWith(p));

    if (!isPathAllowed) {
      router.replace('/profile');
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (authorized === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-navy animate-pulse">
        <svg className="animate-spin h-10 w-10 text-mint" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <LogoProvider>
      <NotificationProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8 bg-navy">
            {children}
          </main>
        </div>
      </NotificationProvider>
    </LogoProvider>
  );
}