'use client';
import SidebarItems from './sidebarItems';
import { usePathname, useRouter } from 'next/navigation';

const Sidebar_ITEMS = [
  { href: '/createStudent', label: 'Students', activeColor: 'bg-mint text-navy shadow-lg shadow-mint/20' },
  { href: '/createProfessor', label: 'Professors', activeColor: 'bg-mint text-navy shadow-lg shadow-mint/20' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-64 bg-card border-r border-borderLine h-screen flex flex-col">
      <div className="p-6 border-b border-borderLine">
        <h2 className="text-2xl font-bold text-textLight">S2dent</h2>
        <p className="text-xs text-textMuted mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {Sidebar_ITEMS.map((item) => (
          <SidebarItems
            key={item.href}
            href={item.href}
            label={item.label}
            activeColor={item.activeColor}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      <div className="p-4 border-t border-borderLine">
        <button
          onClick={() => router.push('/createLogin')}
          className="w-full p-3 rounded-lg text-red-500 hover:bg-red-50 transition text-left"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}