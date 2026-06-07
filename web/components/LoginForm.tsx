'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'professor'>('admin');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // 1. Check if a Web3 wallet (like MetaMask) is installed
      if (!window.ethereum) {
        alert('Please install MetaMask to use the S2dent platform.');
        setLoading(false);
        return;
      }

      // 2. Connect to the wallet and get the user's Ethereum address
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      // Ensure we point to your Docker API port (Fallback to 3000 if env is missing)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

      let nonceMessage = '';
      let signature = '';
      let verifyResponse;

      const nonceRes = await fetch(`${apiUrl}/auth/nonce?wallet_address=${walletAddress}`);
      const nonceData = await nonceRes.json();
      if (!nonceData.success) throw new Error(nonceData.message);

      // Trigger MetaMask to sign the nonce
      nonceMessage = nonceData.data.message;
      signature = await signer.signMessage(nonceMessage);

      // Send signature back for verification
      verifyResponse = await fetch(`${apiUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, signature }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Cryptographic verification failed');
      }

      // 4. Store the encrypted session tokens and navigate
      localStorage.setItem('access_token', verifyData.data.access_token);
      localStorage.setItem('refresh_token', verifyData.data.refresh_token);
      localStorage.setItem('userRole', role);

      if (role === 'professor') {
        router.push('/credentials');
      } else {
        router.push('/students');
      }

      router.refresh();

    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Authentication failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div className="relative w-full max-w-md mt-12">
      {/* Switcher — floating above card, centered */}
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-10">
        <button
          disabled={loading}
          onClick={() => setRole(isAdmin ? 'professor' : 'admin')}
          className="relative flex items-center w-56 h-11 bg-card border border-borderLine rounded-full shadow-lg p-1 cursor-pointer disabled:opacity-50"
        >
          {/* Sliding pill */}
          <div className={`absolute top-1 h-9 w-[calc(50%-4px)] bg-mint rounded-full shadow-md transition-all duration-300
            ${isAdmin ? 'left-1' : 'left-[calc(50%+3px)]'}`}
          />

          {/* Admin label */}
          <span className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-sm font-bold transition-colors duration-300
            ${isAdmin ? 'text-navy' : 'text-textMuted'}`}>
            <Image
              src="/setting.png"
              alt="Admin"
              width={20}
              height={20}
              className={`object-contain transition-all duration-300 ${isAdmin ? 'brightness-0' : 'opacity-50'}`}
            />
            Admin
          </span>

          {/* Professor label */}
          <span className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 text-sm font-bold transition-colors duration-300
            ${!isAdmin ? 'text-navy' : 'text-textMuted'}`}>
            <Image
              src="/professor.png"
              alt="Professor"
              width={20}
              height={20}
              className={`object-contain transition-all duration-300 ${!isAdmin ? 'brightness-0' : 'opacity-50'}`}
            />
            Prof
          </span>
        </button>
      </div>

      {/* Card */}
      <div className="w-full bg-card p-8 pt-10 rounded-3xl shadow-xl border border-borderLine">
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
        <p className="text-textMuted mb-8 text-center">
          Signing in as{' '}
          <span className="text-mint font-semibold">
            {isAdmin ? 'Admin' : 'Professor'}
          </span>
        </p>

        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full p-3 rounded-lg bg-mint text-navy font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Connecting Wallet..." : "Sign In With A Wallet"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-borderLine" />
            <span className="text-textMuted text-sm">New Here?</span>
            <div className="flex-1 h-px bg-borderLine" />
          </div>

          <button
            onClick={() => router.push('/verify')}
            disabled={loading}
            className="w-full p-3 rounded-lg border border-mint text-mint font-bold hover:bg-mint/10 transition disabled:opacity-50"
          >
            Verify Identity
          </button>
        </div>
      </div>
    </div>
  );
}