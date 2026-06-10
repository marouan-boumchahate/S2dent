'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import { CheckCircle } from 'lucide-react';
import { useAlert } from '@/components/AlertContext';
import { getFriendlyErrorMessage } from '@/lib/utils';

export default function OtpPage() {
  const { showAlert } = useAlert();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (value: string, index: number) => {
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^[a-zA-Z0-9]+$/.test(pastedData)) return;

    const newOtp = [...otp];
    const chars = pastedData.slice(0, 6).split('');
    chars.forEach((char, idx) => {
      newOtp[idx] = char;
    });
    setOtp(newOtp);

    const nextFocusIndex = Math.min(chars.length, 5);
    document.getElementById(`otp-${nextFocusIndex}`)?.focus();
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    console.log('Submitting OTP:', code);
    if (code.length < 6 || loading) return;
    setLoading(true);

    const email = localStorage.getItem('pending_verify_email') || '';
    const nonceMessage = localStorage.getItem('pending_verify_nonce') || '';

    try {
      if (!window.ethereum) {
        showAlert({
          type: 'error',
          title: 'MetaMask Required',
          message: 'Please install MetaMask to complete verification.'
        });
        return;
      }

      if (!nonceMessage) {
        showAlert({
          type: 'error',
          title: 'Session Expired',
          message: 'Session expired. Please restart the verification process.',
          onConfirm: () => {
            router.push('/verify');
          }
        });
        return;
      }

      const accounts: string[] = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      const signature: string = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [nonceMessage, accounts[0]],
      });

      const body = JSON.stringify({ email, otp: code, signature });

      // Professor-only: submit the issuance request
      await apiFetch('/identity/professors/request-issuance', { method: 'POST', body });

      localStorage.removeItem('pending_verify_email');
      localStorage.removeItem('pending_verify_nonce');

      setSuccess(true);
    } catch (error: any) {
      console.error('Identity issuance request error:', error);
      showAlert({
        type: 'error',
        title: 'Verification Failed',
        message: getFriendlyErrorMessage(error, 'Please check your code and try again.')
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine text-center">
          <CheckCircle className="mx-auto mb-4 text-mint" size={64} />
          <h2 className="text-2xl font-bold text-textLight mb-3">You're all set!</h2>
          <p className="text-textMuted mb-2">
            Your identity request has been submitted. Your academy has been notified and will issue your on-chain identity shortly.
          </p>
          <p className="text-textMuted text-sm mb-6">
            Once issued, you'll be able to log in with your wallet.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition"
          >
            Okay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <form onSubmit={handleVerifySubmit} className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-borderLine">

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
        <p className="text-textMuted mb-8 text-center">Enter the 6-character code</p>

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
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              className="w-12 h-12 text-center text-xl font-bold bg-navy border border-borderLine rounded-lg text-textLight focus:border-electric outline-none transition disabled:opacity-50"
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