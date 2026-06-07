'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import SearchFilter, { useSearchFilter } from '@/components/SearchFilter';
import { fetchStudents, ApiStudent } from '@/lib/api';

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [role, setRole] = useState<string>('admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('userRole');
    if (stored) setRole(stored);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStudents()
      .then((data) => {
        setStudents(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch students:", err);
        setError(err.message || 'Failed to connect to the backend API');
      })
      .finally(() => setLoading(false));
  }, []);

  // searchFilter hook
  const { filtered, handleSearch } = useSearchFilter<ApiStudent>(
    students,
    (s) => s // ApiStudent already has a flat 'name' property, no transform needed
  );

  const total = students.length;
  const departments = new Set(students.map((s) => s.department).filter(Boolean)).size;

  const verifiedOnChain = students.filter(s => s.last_transaction_status === 'verified').length;
  const pending = students.filter(s => s.last_transaction_status === 'pending').length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Students" onAddNew={role === 'ACADEMY' || role === 'admin' ? () => router.push('/createStudent') : undefined} />

      <div className="p-6 space-y-6">

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={total} sub={loading ? "..." : "+0 this week"} subColor="text-purple-500" />
          <StatCard label="Verified on-chain" value={verifiedOnChain} sub={total ? `${Math.round((verifiedOnChain / total) * 100)}%` : '0%'} subColor="text-mint" />
          <StatCard label="Pending" value={pending} sub="awaiting wallet" subColor="text-yellow-500" />
          <StatCard label="Departments" value={departments} sub="active" subColor="text-mint" />
        </div>

        {/* table */}
        <div className="bg-card rounded-2xl border border-borderLine overflow-hidden flex-1">
          <div className="px-6 py-4 border-b border-borderLine flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-textMuted text-sm font-bold uppercase tracking-wider">
              All Students
              {/* for filter */}
              {filtered.length !== students.length && (
                <span className="ml-2 text-mint normal-case font-normal">
                  — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
          </div>

          {/* SearchFilter */}
          <div className="px-6 py-4 border-b border-borderLine">
            <SearchFilter
              placeholder="Search students by name, email, department…"
              filterKeys={[
                { label: 'Name', value: 'name' },
                { label: 'Email', value: 'email' },
                { label: 'Department', value: 'department' },
                { label: 'Advisor', value: 'advisor_name' },
                { label: 'Status', value: 'last_transaction_status' },
              ]}
              onSearch={handleSearch}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-48 py-12">
              <p className="text-textMuted px-4 animate-pulse">Loading live student data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-48 py-12 gap-2">
              <p className="text-red-500 font-medium px-4">Error: {error}</p>
              <p className="text-textMuted text-sm">Please ensure the Docker API container is running.</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex items-center justify-center min-h-48 py-12">
              <p className="text-textMuted px-4">
                {role === 'admin'
                  ? <>No students yet. Click <span className="text-mint font-bold">+ Add New</span> to create one.</>
                  : 'No students found in your academy.'}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-48 py-12 gap-2">
              <p className="text-textMuted">No students match your search.</p>
              <p className="text-textMuted text-sm">Try a different keyword or filter.</p>
            </div>
          ) : (

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-borderLine">
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Name</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Email</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Department</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Advisor</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} className={`border-b border-borderLine hover:bg-surface transition ${i % 2 === 0 ? '' : 'bg-surface/30'}`}>
                      <td className="px-6 py-4 text-textLight font-medium">{s.name}</td>
                      <td className="px-6 py-4 text-textMuted text-sm">{s.email}</td>
                      <td className="px-6 py-4 text-textMuted text-sm">{s.department || '—'}</td>
                      <td className="px-6 py-4 text-textMuted text-sm">{s.advisor_name || '—'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={s.last_transaction_status ?? 'pending'} />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/students/${s.id}`)}
                          className="text-sm border border-borderLine text-textMuted hover:text-textLight hover:border-mint px-3 py-1 rounded-lg transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, subColor = 'text-textMuted' }: {
  label: string; value: number; sub: string; subColor?: string;
}) {
  return (
    <div className="bg-card border border-borderLine rounded-2xl p-5">
      <p className="text-textMuted text-sm mb-1">{label}</p>
      <p className="text-textLight text-3xl font-bold">{value}</p>
      <p className={`text-sm mt-1 ${subColor}`}>{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'failed' | 'verified' }) {
  const map = {
    verified: 'bg-green-100 text-green-600 border border-green-200',
    pending: 'bg-yellow-100 text-yellow-600 border border-yellow-200',
    failed: 'bg-red-100 text-red-500 border border-red-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}