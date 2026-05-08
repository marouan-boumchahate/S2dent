'use client';
import SidebarItems from './sidebarItems';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';

const SIDEBAR_GROUPS = [
  {
    label: 'Students',
    href: '/students',
    items: [
      { href: '/createStudent', label: 'Create Student' },
      { href: '/updateStudent', label: 'Update Student' },
      { href: '/revokeStudent', label: 'Revoke Student' },
    ],
  },
  {
    label: 'Professors',
    href: '/professors',
    items: [
      { href: '/createProfessor', label: 'Create Professor' },
      { href: '/updateProfessor', label: 'Update Professor' },
      { href: '/revokeProfessor', label: 'Revoke Professor' },
    ],
  },
  {
    label: 'Certificates',
    href: '/certificates',
    items: [
      { href: '/issueCertificate', label: 'Issue Certificate' },
      { href: '/revokeCertificate', label: 'Revoke Certificate' },
    ],
  },
  {
    label: 'Credentials',
    href: '/credentials',
    items: [],
  },
  {
    label: 'Departments',
    href: '/departments',
    items: [
      { href: '/createDepartment', label: 'Create Department' },
      { href: '/updateDepartment', label: 'Update Department' },
      { href: '/deleteDepartment', label: 'Delete Department' },
    ],
  },
  {
    label: 'Settings',
    href: '/settings',
    items: [],
  },
];

const activeColor = 'bg-mint text-navy shadow-lg shadow-mint/20';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Students', 'Professors']);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

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
            <p className="text-xs text-textMuted mt-0.5">Admin Page</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.label}>
              {/* group header - clickable link + toggle arrow */}
              <div className="flex items-center justify-between rounded-lg hover:bg-surface transition">
                <button
                  onClick={() => router.push(group.href)}
                  className={`flex-1 text-left p-3 font-bold transition rounded-lg
                    ${pathname === group.href ? activeColor : 'text-textLight'}
                  `}
                >
                  {group.label}
                </button>
                {group.items.length > 0 && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="px-3 py-3 text-textMuted text-xs hover:text-textLight"
                  >
                    {openGroups.includes(group.label) ? '▼' : '▶'}
                  </button>
                )}
              </div>

              {/* sub-items */}
              {openGroups.includes(group.label) && group.items.length > 0 && (
                <div className="ml-3 mt-1 space-y-1 border-l border-borderLine pl-3">
                  {group.items.map((item) => (
                    <SidebarItems
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      activeColor={activeColor}
                      isActive={pathname === item.href}
                    />
                  ))}
                </div>
              )}
            </div>
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
    </>
  );
}