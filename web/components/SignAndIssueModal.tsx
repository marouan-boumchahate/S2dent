import { useState } from 'react';
import { IdentitySchema } from '@/lib/api';

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
  schema: IdentitySchema;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function highlightJson(data: any): string {
  const json = JSON.stringify(data, null, 2);
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
      let style = 'color: #fbbf24;';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          style = 'color: #f8fafc; font-weight: 600;';
        } else {
          style = 'color: #34d399;';
        }
      } else if (/true|false/.test(match)) {
        style = 'color: #a78bfa; font-weight: 600;';
      } else if (/null/.test(match)) {
        style = 'color: #64748b;';
      }
      return `<span style="${style}">${match}</span>`;
    });
}

// helper row component calibrated to match dashboard design schemas
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr className="border-b border-borderLine last:border-0">
      <td className="py-3 px-5 text-textMuted text-sm whitespace-nowrap w-1/3">{label}</td>
      <td className={`py-3 pr-5 text-textLight text-sm font-medium break-all ${mono ? 'font-mono text-textMuted' : ''}`}>
        {value || '—'}
      </td>
    </tr>
  );
}

// Component

export default function SignAndIssueModal({
  data,
  schema,
  onConfirm,
  onCancel,
  loading = false,
}: SignAndIssueModalProps) {
  const [view, setView] = useState<'human' | 'actual'>('human');

  // credentialType shows the details based on person
  const isProfessor = data.credentialType === 'Professor';
  const isStudent = data.credentialType === 'Student';
  const roleText = isProfessor ? 'Professor' : 'Student';

  // Construct the full EIP-712 typing schema structure being signed
  const { EIP712Domain: _, ...typesWithoutDomain } = schema.types as any;
  const actualViewData = {
    domain: schema.domain,
    types: typesWithoutDomain,
    message: schema.message,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop design layer layout wrapper */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* modal box customized to match dashboard aesthetics */}
      <div className="relative bg-card border border-borderLine rounded-[24px] p-8 max-w-lg w-full mx-4 shadow-2xl text-textLight">

        {/* header */}
        <h3 className="text-textLight text-2xl font-bold mb-1">Sign & Issue Identity</h3>
        <p className="text-textMuted text-sm mb-6">
          Review the signing data before authorizing on-chain.
        </p>

        {/* stylized theme warning banner */}
        <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-4 mb-6">
          <span className="text-lg mt-0.5">🔒</span>
          <p className="text-orange-400/90 text-sm leading-relaxed">
            <span className="font-bold text-orange-400">Signature required.</span> You are about to authorize the
            issuance of a verifiable identity. Once signed and submitted, this action is permanent
            on the blockchain.
          </p>
        </div>

        {/* toggle controls panel */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-textMuted text-xs font-bold uppercase tracking-widest">
            MESSAGE TO SIGN
          </p>
          <button
            type="button"
            onClick={() => setView(view === 'human' ? 'actual' : 'human')}
            className="text-xs border border-borderLine text-textLight bg-surface hover:border-mint px-4 py-1.5 rounded-full transition-all"
          >
            {view === 'human' ? 'Actual view' : 'Human view'}
          </button>
        </div>

        {/* human view layout */}
        {view === 'human' && (
          <div className="rounded-2xl border border-borderLine bg-surface/30 overflow-hidden">
            <div className="bg-surface border-b border-borderLine px-5 py-3">
              <p className="text-mint text-sm font-bold">Details</p>
            </div>
            <div className="overflow-auto max-h-64">
              <table className="w-full">
                <tbody>
                  <Row label="Identity type" value={data.credentialType} />
                  <Row label={`${isProfessor || isStudent ? roleText : 'Student'} name`} value={data.studentName} />
                  <Row label={`${isProfessor || isStudent ? roleText : 'Student'} wallet`} value={data.studentWallet} mono />
                  <Row label="Authorized by"   value={data.authorizedBy} />
                  {data.authorizerWalletAddress && (
                    <Row label="Academy wallet" value={data.authorizerWalletAddress} mono />
                  )}
                  {isProfessor && data.hireDate && (
                    <Row label="Hire date" value={data.hireDate} />
                  )}
                  {isStudent && data.enrollmentDate && (
                    <Row label="Enrollment date" value={data.enrollmentDate} />
                  )}
                  {isStudent && data.department && (
                    <Row label="Department" value={data.department} />
                  )}
                  {data.nationalIdHash && (
                    <Row label="National ID hash" value={data.nationalIdHash} mono />
                  )}
                  {data.publicKey && (
                    <Row label="Public key" value={data.publicKey} mono />
                  )}
                  <Row label="Identity hash"    value={data.payloadHash} mono />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* actual raw payload terminal code block */}
        {view === 'actual' && (
          <pre
            className="bg-[#0f172a] text-xs rounded-2xl border border-slate-800 p-5 max-h-64 overflow-y-auto font-mono text-slate-300 whitespace-pre-wrap break-all leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightJson(actualViewData) }}
          />
        )}

        {/* actions interaction footer */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-borderLine bg-surface text-textMuted hover:text-textLight transition font-semibold text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-mint text-navy font-bold text-sm hover:opacity-90 transition disabled:opacity-40"
          >
            {loading ? 'Signing…' : 'Issue Identity'}
          </button>
        </div>
      </div>
    </div>
  );
}