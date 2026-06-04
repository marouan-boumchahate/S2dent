'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { verifyOtp, setTokens } from '@/lib/api';

export default function OtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6 || loading) return;
    setLoading(true);

    // Retrieve the pending verification target email cached from step one
    const email = localStorage.getItem('pending_verify_email') || '';

    try {
      const response = await verifyOtp({ email, code });

      // Save access and refresh keys directly to local browser memory allocations
      if (response?.access_token && response?.refresh_token) {
        setTokens(response.access_token, response.refresh_token);
      }

      localStorage.removeItem('pending_verify_email');
      router.push('/students');
      router.refresh();
    } catch (error) {
      console.error('OTP Verification error:', error);
      alert('Invalid code or session expired. Please verify container synchronization logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <form onSubmit={handleVerifySubmit} className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">

        {/* OTP image */}
        <div className="flex justify-center mb-4">
          <Image
            src="/otp_light.png"
            alt="OTP"
            width={100}
            height={100}
            className="object-contain"
          />
        </div>

        <h2 className="text-2xl font-bold text-textLight mb-2 text-center">A code have been sent to your email</h2>
        <p className="text-textMuted mb-8 text-center">Enter the 6-digit code</p>

        <div className="flex gap-3 justify-center mb-8">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength={1}
              disabled={loading}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              className="w-12 h-12 text-center text-xl bg-navy border border-borderLine rounded-lg text-textLight focus:border-electric outline-none transition disabled:opacity-50"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || otp.join('').length < 6}
          className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Validating Token...' : 'Verify'}
        </button>
      </form>
    </div>
  );
}