'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginForm() {
  const router = useRouter();

  return (
    <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">
      
      {/* logo png for the login page  */}
      <div className="flex justify-center mb-4">
        <Image
          src="/logo.png"
          alt="S2dent Logo"
          width={120}
          height={120}
          className="object-contain"
        />
      </div>

      <h2 className="text-3xl font-bold text-textLight mb-2 text-center">Welcome Back</h2>
      <p className="text-textMuted mb-8 text-center">Sign in to S2dent</p>

      <div className="space-y-4">
        <button
          onClick={() => router.push('/createStudent')}
          className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition"
        >Sign In With A Wallet</button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-borderLine" />
          <span className="text-textMuted text-sm">New Here?</span>
          <div className="flex-1 h-px bg-borderLine" />
        </div>

        <button
          onClick={() => router.push('/verify')}
          className="w-full p-3 rounded-lg border border-mint text-mint font-bold hover:bg-mint/10 transition"
        >
          Verify Identity
        </button>
      </div>
    </div>
  );
}