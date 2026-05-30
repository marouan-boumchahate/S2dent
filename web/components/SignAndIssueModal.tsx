'use client';

import { useState } from 'react';

// Types

export interface SignAndIssueData {
  credentialHash?: string;
  title: string;
  code: string;
  credentialType: string; // 'Professor', 'Student'
  authorizedBy: string;
  authorizerWalletAddress?: string;
  issuerWalletAddress?: string;
  studentName: string; 
  studentWallet: string; 
  payloadHash: string;
  
  nationalIdHash?: string;
  publicKey?: string;
  hireDate?: string;
  enrollmentDate?: string;
  department?: string;
}

interface SignAndIssueModalProps {
  data: SignAndIssueData;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

// helper

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 px-5 text-gray-500 text-sm whitespace-nowrap w-1/3">{label}</td>
      <td className={`py-3 pr-5 text-gray-900 text-sm font-medium break-all ${mono ? 'font-mono text-gray-600' : ''}`}>
        {value || '—'}
      </td>
    </tr>
  );
}

// Component

export default function SignAndIssueModal({
  data,
  onConfirm,
  onCancel,
  loading = false,
}: SignAndIssueModalProps) {
  const [view, setView] = useState<'human' | 'actual'>('human');

  // credentialType shows the ditals based on person
  const isProfessor = data.credentialType === 'Professor';
  const isStudent = data.credentialType === 'Student';
  const roleText = isProfessor ? 'Professor' : 'Student';

  // as it shows here 
  let actualViewData: Record<string, any> = {};

  if (isProfessor) {
    actualViewData = {
      professorIdHash: data.payloadHash || "0x8f14e45fceea167a5a36dedd4bea2543d7f8f1d6c5e5b7d9f5f4f6f0c6d4a123",
      fullName: data.studentName, // get it from generic generic name prop
      nationalIdHash: data.nationalIdHash || "0x45c48cce2e2d7fbdea1afc51c7c6ad26d6f7b2c4a8e5f1d9b7c3a2e1f4d5c678",
      publicKey: data.publicKey || "0x04a34f8c2d91b7e5c6f8a123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
      walletAddress: data.studentWallet,
      academyWalletAddress: data.authorizerWalletAddress || "0x1234567890abcdef1234567890abcdef12345678",
      academyName: data.authorizedBy,
      hireDate: data.hireDate || "2024-09-01"
    };
  } else if (isStudent) {
    actualViewData = {
      studentIdHash: data.payloadHash || "0x7f6a4c9e2d3b1a8f5e6d7c8b9a0123456789abcdef0123456789abcdef012345",
      fullName: data.studentName, // get it from generic name prop
      nationalIdHash: data.nationalIdHash || "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
      publicKey: data.publicKey || "0x04c8f1a2b3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789cd",
      walletAddress: data.studentWallet,
      academyWalletAddress: data.authorizerWalletAddress || "0x1234567890abcdef1234567890abcdef12345678",
      academyName: data.authorizedBy,
      enrollmentDate: data.enrollmentDate || "2023-09-18",
      department: data.department || "Computer Engineering"
    };
  } else {
    // this should be compateble with both but if the credential section will be test it later
    actualViewData = {
      credentialHash: data.credentialHash || '0xf655c1a399dcc800...',
      title: data.title,
      code: data.code,
      credentialType: data.credentialType,
      authorizerWalletAddress: data.authorizerWalletAddress || '0x414d72aFC5bEaBC9FF...',
      authorizerName: data.authorizedBy,
      issuerWalletAddress: data.issuerWalletAddress || '0xAdm1nIssuer000000...',
      studentWalletAddress: data.studentWallet,
      studentName: data.studentName,
      payloadHash: data.payloadHash,
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* modal */}
      <div className="relative bg-white rounded-[24px] p-8 max-w-lg w-full mx-4 shadow-2xl">

        {/* header */}
        <h3 className="text-gray-900 text-2xl font-bold mb-1">Sign & Issue Identity</h3>
        <p className="text-gray-500 text-sm mb-6">
          Review the signing data before authorizing on-chain.
        </p>

        {/* warning banner message*/}
        <div className="flex items-start gap-3 bg-[#fffbeb] border border-[#fef08a] rounded-xl px-4 py-4 mb-6">
          <span className="text-lg mt-0.5">🔒</span>
          <p className="text-[#854d0e] text-sm leading-relaxed">
            <span className="font-bold text-[#b45309]">Signature required.</span> You are about to authorize the
            issuance of a verifiable identity. Once signed and submitted, this action is permanent
            on the blockchain.
          </p>
        </div>

        {/* toggle */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
            MESSAGE TO SIGN
          </p>
          <button
            onClick={() => setView(view === 'human' ? 'actual' : 'human')}
            className="text-xs border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 px-4 py-1.5 rounded-full transition"
          >
            {view === 'human' ? 'Actual view' : 'Human view'}
          </button>
        </div>

        {/* human view */}
        {view === 'human' && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
            <div className="bg-[#1d4ed8] px-5 py-3">
              <p className="text-white text-sm font-bold">Details</p>
            </div>
            <table className="w-full">
              <tbody>
                <Row label="Credential type" value={data.credentialType} />
                <Row label="Title / code"    value={`${data.title} — ${data.code}`} />
                <Row label="Authorized by"   value={data.authorizedBy} />
                <Row label={`${isProfessor || isStudent ? roleText : 'Student'} name`} value={data.studentName} />
                <Row label={`${isProfessor || isStudent ? roleText : 'Student'} wallet`} value={data.studentWallet} />
                <Row label="Payload hash"    value={data.payloadHash} />
              </tbody>
            </table>
          </div>
        )}

        {/* actual or raw view */}
        {view === 'actual' && (
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-5 max-h-64 overflow-y-auto">
            <div className="text-sm font-mono break-all leading-loose">
              <span className="text-white">{"{ "}</span>
              {Object.entries(actualViewData).map(([key, val]) => (
                <span key={key}>
                  <span className="text-white font-semibold">{key}: </span>
                  <span className={typeof val === 'string' && val.startsWith('0x') ? "text-[#22d3ee]" : "text-[#a7f3d0]"}>
                    {typeof val === 'string' && val.startsWith('0x') ? val : `"${val}"`} 
                  </span>{" "}
                </span>
              ))}
              <span className="text-white">{"}"}</span>
            </div>
          </div>
        )}

        {/* actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition font-semibold text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-[#10b981] text-white font-bold text-sm hover:bg-[#059669] transition disabled:opacity-60"
          >
            {loading ? 'Signing…' : 'Issue Identity'}
          </button>
        </div>
      </div>
    </div>
  );
}