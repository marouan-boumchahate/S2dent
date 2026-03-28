'use client';
import SidebarItems from './sidebarItems';
import { usePathname } from 'next/navigation';

const Sidebar_ITEMS = [
  { href: '/', label: 'Students', activeColor: 'bg-mint text-navy shadow-lg shadow-mint/20' },
  { href: '/createProfessor', label: 'Professors',  activeColor: 'bg-mint text-navy shadow-lg shadow-mint/20' },
];

export default function Sidebar() {
  const pathname = usePathname();

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
    </aside>
  );
}