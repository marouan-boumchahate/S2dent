'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { requestOtp } from '@/lib/api';
import { useAlert } from '@/components/AlertContext';
import { getFriendlyErrorMessage } from '@/lib/utils';

export default function VerifyPage() {
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);

    try {
      // POST /api/auth/otp/send — email only, backend determines role automatically
      // apiFetch unwraps json.data, so response = { message: "Sign this nonce..." }
      const response = await requestOtp(email.toLowerCase());

      localStorage.setItem('pending_verify_email', email.toLowerCase());

      if (response?.message) {
        localStorage.setItem('pending_verify_nonce', response.message);
      }

      router.push('/verify/otp');
    } catch (error: any) {
      console.error('OTP request error:', error);
      showAlert({
        type: 'error',
        title: 'Request Failed',
        message: getFriendlyErrorMessage(error, 'Verification request failed. Please try again.')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <form onSubmit={handleVerifySubmit} className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">

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
        <p className="text-textMuted mb-8 text-center">Enter your email to receive a verification code</p>

        <div className="space-y-4">
          <div>
            <label className="block text-textMuted mb-2 text-sm uppercase tracking-wide">Your Email</label>
            <input
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@fbu.edu.tr"
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Sending Code...' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );
}