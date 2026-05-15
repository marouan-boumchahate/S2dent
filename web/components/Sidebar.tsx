'use client';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const ADMIN_GROUPS = [
  { label: 'Students', href: '/students' },
  { label: 'Professors', href: '/professors' },
  { label: 'Certificates', href: '/certificates' },
  { label: 'Credentials', href: '/credentials' },
  { label: 'Departments', href: '/departments' },
  { label: 'Settings', href: '/settings' },
];

const PROFESSOR_GROUPS = [
  { label: 'Credentials', href: '/credentials' },
  { label: 'Certificates', href: '/certificates' },
  { label: 'Settings', href: '/settings' },
];

const activeColor = 'bg-mint text-navy shadow-lg shadow-mint/20';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<'admin' | 'professor'>('admin');

  useEffect(() => {
    const stored = localStorage.getItem('userRole') as 'admin' | 'professor' | null;
    if (stored) setRole(stored);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('userRole');
    router.push('/createLogin');
  };

  const groups = role === 'professor' ? PROFESSOR_GROUPS : ADMIN_GROUPS;
  const roleLabel = role === 'professor' ? 'Professor Page' : 'Admin Page';

  return (
    <>
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-borderLine rounded-lg text-textLight"
      >
        ☰
      </button>

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

        <div className="p-6 border-b border-borderLine flex flex-col items-center text-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden self-end text-textMuted hover:text-textLight"
          >
            ✕
          </button>
          <div className="w-32 h-32 flex items-center justify-center -mb-7">
            <Image src="/logo.png" alt="University Logo" width={128} height={128} className="object-contain" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-textLight">S2dent</h2>
            <p className="text-xs text-textMuted mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-between rounded-lg hover:bg-surface transition">
                <button
                  onClick={() => router.push(group.href)}
                  className={`flex-1 text-left p-3 font-bold transition rounded-lg
                    ${pathname === group.href ? activeColor : 'text-textLight'}
                  `}
                >
                  {group.label}
                </button>
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-borderLine">
          <button
            onClick={handleSignOut}
            className="w-full p-3 rounded-lg text-red-500 hover:bg-red-500/10 transition text-left font-semibold"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}