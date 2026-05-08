'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">
        
        {/* email png */}
        <div className="flex justify-center mb-4">
          <Image
            src="/email_light.png"
            alt="Email"
            width={100}
            height={100}
            className="object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold text-textLight mb-2 text-center">Verify your identity</h2>
        <p className="text-textMuted mb-8 text-center">Enter your email</p>

        <div className="space-y-4">
          <div>
            <label className="block text-textMuted mb-2 text-sm uppercase tracking-wide">Your Email</label>
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