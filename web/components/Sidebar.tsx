'use client';
import SidebarItems from './sidebarItems';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

const Sidebar_ITEMS = [
  { href: '/createStudent', label: 'Students', activeColor: 'bg-mint text-navy shadow-lg shadow-mint/20' },
  { href: '/createProfessor', label: 'Professors', activeColor: 'bg-mint text-navy shadow-lg shadow-mint/20' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-64 bg-card border-r border-borderLine h-screen flex flex-col">
      
      {/* topleft corner of homepage */}
      <div className="p-6 border-b border-borderLine flex flex-col items-center text-center gap-3">
        <div className="w-32 h-32 flex items-center justify-center -mb-7">
          <Image
            src="/logo.png"
            alt="University Logo"
            width={128}
            height={128}
            className="object-contain"
          />
        </div>
        <div>
          <h2 className="text-lg font-bold text-textLight">S2dent</h2> 
          {/* here the title : there should be the name of the professor or the admin  */}
          <p className="text-xs text-textMuted mt-0.5">Admin Page</p> 
          {/* and here the subtitle : and here hould be somting like the admin of the fenebrbahce university or any name for university ,EX as marouan said for later*/}
        </div>
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