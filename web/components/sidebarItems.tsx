import Link from 'next/link';

interface SidebarItemProps {
  href: string;
  label: string;
  activeColor: string;
  isActive: boolean;
}

export default function SidebarItems({ href, label, activeColor, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`block p-3 rounded-lg transition font-bold ${
        isActive ? activeColor : 'text-textLight hover:bg-surface'
      }`}
    >
      {label}
    </Link>
  );
}