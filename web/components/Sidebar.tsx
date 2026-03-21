'use client'; // feature for interaction with botom and where you select things

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname(); // same is i mentioned up 

  return (
    <aside className="w-64 bg-card border-r border-borderLine h-screen flex flex-col">
      <div className="p-6 border-b border-borderLine">
        <h2 className="text-2xl font-bold text-electric">S2dent System</h2>
        <p className="text-xs text-textMuted mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {/* dashboard home side botton*/}
        <Link
          href="/"
          className={`block p-3 rounded-lg transition ${pathname === '/'
              ? 'bg-electric text-navy font-bold'
              : 'text-textLight hover:bg-surface'
            }`}
        >
          Dashboard Home
        </Link>

        {/* add professor side botton*/}
        <Link
          href="/add-professor"
          className={`block p-3 rounded-lg transition ${pathname === '/add-professor'
              ? 'bg-mint text-navy font-bold shadow-lg shadow-mint/20'
              : 'text-textLight hover:bg-surface'
            }`}
        >
          Add Professor
        </Link>
      </nav>
    </aside>
  );
}