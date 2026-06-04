import Link from 'next/link';
import Image from 'next/image';

interface SidebarItemProps {
  href: string;
  label: string;
  icon: string;   // Integrated to support your sidebar navigation assets
  isActive: boolean;
  onClick?: () => void; // Safely triggers mobile sidebar dismiss actions on link selection
}

export default function SidebarItems({ href, label, icon, isActive, onClick }: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-base font-bold transition-all duration-200 ${
        isActive
          ? 'bg-mint text-navy shadow-lg shadow-mint/20'
          : 'text-textLight hover:bg-surface'
      }`}
    >
      <Image
        src={icon}
        alt={label}
        width={26}
        height={26}
        className={`object-contain transition-all duration-200 ${
          isActive ? 'brightness-0' : 'opacity-70'
        }`}
      />
      {label}
    </Link>
  );
}