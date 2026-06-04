'use client';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useLogo } from '@/lib/logoContext';
import SidebarItems from './sidebarItems'; // Clean child component link integration
import { clearTokens } from '@/lib/api'; // Security patch to wipe active JWT sessions on logout

const ADMIN_GROUPS = [
  { label: 'Students', href: '/students', icon: '/student_1.png' },
  { label: 'Professors', href: '/professors', icon: '/professor.png' },
  { label: 'Credentials', href: '/credentials', icon: '/verified.png' },
  { label: 'Departments', href: '/departments', icon: '/corporation.png' },
  { label: 'Issue identity', href: '/issueidentities', icon: '/certificate.png' },
  { label: 'Settings', href: '/settings', icon: '/setting_1.png' },
];

const PROFESSOR_GROUPS = [
  { label: 'Students', href: '/students', icon: '/student_1.png' },
  { label: 'Credentials', href: '/credentials', icon: '/verified.png' },
  { label: 'Settings', href: '/settings', icon: '/setting.png' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<'admin' | 'professor'>('admin');
  const { logoUrl } = useLogo();

  useEffect(() => {
    const stored = localStorage.getItem('userRole') as 'admin' | 'professor' | null;
    if (stored) setRole(stored);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('userRole');
    clearTokens(); // Erases access_token and refresh_token from local storage contexts safely
    router.push('/createLogin');
  };

  const groups = role === 'professor' ? PROFESSOR_GROUPS : ADMIN_GROUPS;
  const roleLabel = role === 'professor' ? 'Professor Page' : 'Admin Page';

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-borderLine rounded-lg text-textLight"
      >
        ☰
      </button>

      {/* Backdrop overlay drawer shadow */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-card border-r border-borderLine h-screen flex flex-col
        transform transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>

        {/* Logo Container Section */}
        <div className="p-6 border-b border-borderLine flex flex-col items-center text-center gap-2">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden self-end text-textMuted hover:text-textLight"
          >
            ✕
          </button>
          <div className="w-32 h-32 flex items-center justify-center overflow-hidden rounded-full">
            <Image src={logoUrl} alt="University Logo" width={128} height={128} className="w-full h-full object-contain" unoptimized />
          </div>
          <div>
            <h2 className="text-lg font-bold text-textLight">S2dent</h2>
            <p className="text-xs text-textMuted mt-0.5">{roleLabel}</p>
          </div>
        </div>

        {/* Clean Navigation Row Processing */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {groups.map((group) => (
            <SidebarItems
              key={group.label}
              href={group.href}
              label={group.label}
              icon={group.icon}
              isActive={pathname === group.href}
              onClick={() => setIsSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Sign Out Action Panel */}
        <div className="p-4 border-t border-borderLine">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition font-semibold text-base"
          >
            <Image
              src="/logout.png"
              alt="Sign Out"
              width={25}
              height={25}
              className="object-contain opacity-40"
              style={{ filter: 'invert(27%) sepia(90%) saturate(600%) hue-rotate(330deg) brightness(90%)' }}
            />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}