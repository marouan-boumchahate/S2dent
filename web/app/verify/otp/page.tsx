'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { requestIdentityIssuance } from '@/lib/api';

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

    const email = localStorage.getItem('pending_verify_email') || '';
    const nonceMessage = localStorage.getItem('pending_verify_nonce') || '';

    try {
      // Ask the wallet to sign the nonce message returned by POST /api/auth/otp/send
      // window.ethereum is the standard EIP-1193 provider injected by MetaMask / any web3 wallet
      const accounts: string[] = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      const signature: string = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [nonceMessage, accounts[0]],
      });

      // POST /api/identity/students/request-issuance
      // Body: { email, otp, signature }
      // Success response: { success: true, data: { wallet_address: "0x..." } }
      // This does NOT return tokens — it submits a blockchain identity issuance request.
      await requestIdentityIssuance({ email, otp: code, signature });

      // Clean up cached values
      localStorage.removeItem('pending_verify_email');
      localStorage.removeItem('pending_verify_nonce');

      // Redirect to a confirmation/pending page — the identity issuance is processed asynchronously
      router.push('/verify/pending');
    } catch (error) {
      console.error('Identity issuance request error:', error);
      alert('Verification failed. Please check your code and try again.');
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

        <h2 className="text-2xl font-bold text-textLight mb-2 text-center">A code has been sent to your email</h2>
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
          {loading ? 'Submitting Request...' : 'Verify'}
        </button>
      </form>
    </div>
  );
}