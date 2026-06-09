'use client';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useLogo } from '@/lib/logoContext';
import SidebarItems from './sidebarItems'; // Clean child component link integration
import { clearTokens, fetchAcademyMe, fetchAcademySummary, fetchProfessorMe } from '@/lib/api'; // Security patch to wipe active JWT sessions on logout

const ADMIN_GROUPS = [
  { label: 'Enrolled Students', href: '/enrolled-students', icon: '/student_1.png' },
  { label: 'Faculty Members', href: '/faculty-members', icon: '/professor.png' },
  { label: 'Academic Credentials', href: '/academic-credentials', icon: '/verified.png' },
  { label: 'Academic Departments', href: '/academic-departments', icon: '/corporation.png' },
  { label: 'Identity Provisioning', href: '/identity-provisioning', icon: '/certificate.png' },
  { label: 'Profile', href: '/profile', icon: '/setting_1.png' },
];

const PROFESSOR_GROUPS = [
  { label: 'Enrolled Students', href: '/enrolled-students', icon: '/student_1.png' },
  { label: 'Academic Credentials', href: '/academic-credentials', icon: '/verified.png' },
  { label: 'Profile', href: '/profile', icon: '/setting.png' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<'admin' | 'professor' | null>(null);
  const { logoUrl, setLogoUrl } = useLogo();
  const [imgSrc, setImgSrc] = useState(logoUrl || '/logo.png');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFetchingLogo, setIsFetchingLogo] = useState(true);
  const [academyName, setAcademyName] = useState('S2dent');

  useEffect(() => {
    setImgSrc(logoUrl || '/logo.png');
  }, [logoUrl]);

  useEffect(() => {
    const stored = localStorage.getItem('userRole') as 'admin' | 'professor' | null;
    setRole(stored || 'admin');

    setIsFetchingLogo(true);
    if (stored === 'admin') {
      fetchAcademyMe()
        .then((academy) => {
          if (academy.name) {
            setAcademyName(academy.name);
          }
          if (academy.logo_url) {
            setLogoUrl(academy.logo_url);
          } else {
            setLogoUrl('/logo.png');
          }
        })
        .catch(() => {
          clearTokens();
          router.push('/login');
        })
        .finally(() => {
          setIsFetchingLogo(false);
        });
    } else if (stored === 'professor') {
      Promise.all([fetchProfessorMe(), fetchAcademySummary()])
        .then(([_, academy]) => {
          if (academy.name) {
            setAcademyName(academy.name);
          }
          if (academy.logo_url) {
            setLogoUrl(academy.logo_url);
          } else {
            setLogoUrl('/logo.png');
          }
        })
        .catch(() => {
          clearTokens();
          router.push('/login');
        })
        .finally(() => {
          setIsFetchingLogo(false);
        });
    } else {
      setIsFetchingLogo(false);
    }
  }, [setLogoUrl, router]);

  useEffect(() => {
    setImageLoaded(false);
  }, [imgSrc]);

  // Timeout handler: if the logo takes too long to load (e.g. broken/offline URL), fall back to default
  useEffect(() => {
    if (imgSrc && imgSrc !== '/logo.png' && !imageLoaded) {
      const timer = setTimeout(() => {
        setImgSrc('/logo.png');
        setImageLoaded(true); // Force spinner to stop when falling back
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [imgSrc, imageLoaded]);

  const handleSignOut = () => {
    localStorage.removeItem('userRole');
    clearTokens(); // Erases access_token and refresh_token from local storage contexts safely
    router.push('/login');
  };

  const groups = role === null ? [] : (role === 'professor' ? PROFESSOR_GROUPS : ADMIN_GROUPS);
  const roleLabel = role === null ? 'Loading...' : (role === 'professor' ? 'Professor' : 'Admin');

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
          <div className="w-24 h-24 flex items-center justify-center overflow-hidden rounded-full relative bg-card/50">
            {(isFetchingLogo || !imageLoaded) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-mint" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            {!isFetchingLogo && (
              <Image
                key={imgSrc}
                src={imgSrc || '/logo.png'}
                alt="University Logo"
                width={96}
                height={96}
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  if (imgSrc !== '/logo.png') {
                    setImgSrc('/logo.png');
                  } else {
                    setImageLoaded(true);
                  }
                }}
                unoptimized
              />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-textLight">{academyName}</h2>
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