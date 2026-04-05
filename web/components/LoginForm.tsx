'use client';

import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();

  return (
    <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">
      <h2 className="text-3xl font-bold text-textLight mb-2">Welcome Back</h2>
      <p className="text-textMuted mb-8">Sign in to S2dent</p>

      <div className="space-y-4">
        <button
          onClick={() => router.push('/createStudent')}
          className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition"
        >
          Sign In With A Wallet
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-borderLine" />
          <span className="text-textMuted text-sm">New student?</span>
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