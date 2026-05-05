'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function OtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
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

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">

        {/* OTP image centered at top */}
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
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              className="w-12 h-12 text-center text-xl bg-navy border border-borderLine rounded-lg text-textLight focus:border-electric outline-none transition"
            />
          ))}
        </div>

        <button
          onClick={() => router.push('/createStudent')}
          className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition"
        >
          Verify
        </button>
      </div>
    </div>
  );
}