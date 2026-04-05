'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">
        <h2 className="text-2xl font-bold text-textLight mb-2">Verify your student identity</h2>
        <p className="text-textMuted mb-8">Enter your student email</p>

        <div className="space-y-4">
          <div>
            <label className="block text-textMuted mb-2 text-sm uppercase tracking-wide">Student Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@fbu.edu.tr"
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition"
            />
          </div>

          <button
            onClick={() => router.push('/verify/otp')}
            className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition"
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}