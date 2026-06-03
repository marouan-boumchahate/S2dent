'use client';

import { useState, useEffect } from 'react';
import { store, Department } from '@/lib/store';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import PageHeader from '@/components/PageHeader';
import SearchFilter, { useSearchFilter } from '@/components/SearchFilter';

// modal
function AddModal({ onConfirm, onCancel }: {
  onConfirm: (d: Omit<Department, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [totalYears, setTotalYears] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!code || !name || !faculty || !totalYears) return;
    onConfirm({
      code: code.toUpperCase(),
      name,
      faculty,
      totalYears: parseInt(totalYears),
      description,
      status: 'Active',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-gray-900 text-xl font-bold mb-1">Add Department</h3>
        <p className="text-gray-500 text-sm mb-6">New department will be saved off-chain.</p>

        <div className="space-y-4">
          <FormField label="Code" value={code} onChange={setCode} placeholder="e.g. CS, MED" maxLength={20} required />
          <FormField label="Name" value={name} onChange={setName} placeholder="e.g. Computer Science" maxLength={100} required />
          <FormField label="Faculty" value={faculty} onChange={setFaculty} placeholder="e.g. Faculty of Engineering" maxLength={100} required />
          <FormField label="Total years" value={totalYears} onChange={setTotalYears} type="number" placeholder="e.g. 4" required />
          <FormField label="Description" value={description} onChange={setDescription} placeholder="Optional description" isTextarea />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm"
          >
            Cancel
          </button>
          <Button
            title="Add department"
            onClick={handleSubmit}
            variant="primary"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// edit modal
function EditModal({ department, onConfirm, onCancel }: {
  department: Department;
  onConfirm: (description: string) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(department.description);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-gray-900 text-xl font-bold mb-1">Update Department</h3>
        <p className="text-gray-500 text-sm mb-6">Only the description can be updated.</p>

        <FormField label="Description" value={description} onChange={setDescription} isTextarea />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm"
          >
            Cancel
          </button>
          <Button
            title="Save changes"
            onClick={() => onConfirm(description)}
            variant="primary"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// delete modal
function DeleteModal({ department, onConfirm, onCancel }: {
  department: Department;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-gray-900 text-xl font-bold mb-1">Delete Department</h3>
        <p className="text-gray-500 text-sm mb-5">
          Delete "{department.name}" ({department.code})? This action cannot be undone.
        </p>

        <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-yellow-800 text-sm leading-relaxed">
            This action cannot be undone. Professors and students linked to this department will be unaffected but lose their department reference.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm"
          >
            Cancel
          </button>
          <Button
            title={loading ? 'Deleting…' : 'Delete'}
            onClick={handleDelete}
            variant="danger"
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// stat card
function StatCard({ label, value, sub, subColor }: {
  label: string; value: string | number; sub: string; subColor?: string;
}) {
  return (
    <div className="bg-card border border-borderLine rounded-2xl p-5">
      <p className="text-textMuted text-sm mb-1">{label}</p>
      <p className="text-textLight text-3xl font-bold">{value}</p>
      <p className={`text-xs mt-1 font-medium ${subColor ?? 'text-textMuted'}`}>{sub}</p>
    </div>
  );
}

type DepartmentRow = Department & { searchText: string };

// main page
export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  useEffect(() => {
    setDepartments([...store.departments]);
  }, []);

  const refresh = () => setDepartments([...store.departments]);

  // flatten searchable fields into a single searchText key for Allfilter
  const { filtered, handleSearch } = useSearchFilter<DepartmentRow>(
    departments as DepartmentRow[],
    (d) => ({
      ...d,
      searchText: [d.code, d.name, d.faculty, d.description].filter(Boolean).join(' '),
    }),
  );

  // stats
  const total = departments.length;
  const active = departments.filter(d => d.status === 'Active').length;
  const inactive = departments.filter(d => d.status === 'Inactive').length;
  const avgYears = total > 0
    ? (departments.reduce((sum, d) => sum + d.totalYears, 0) / total).toFixed(1)
    : '0';

  const profCount = (dept: Department) =>
    store.professors.filter(p =>
      p.department?.toLowerCase() === dept.name.toLowerCase() ||
      p.department?.toLowerCase() === dept.code.toLowerCase()
    ).length;

  const stuCount = (dept: Department) =>
    store.students.filter(s =>
      s.department?.toLowerCase() === dept.name.toLowerCase() ||
      s.department?.toLowerCase() === dept.code.toLowerCase()
    ).length;

  const handleAdd = (data: Omit<Department, 'id' | 'createdAt'>) => {
    store.addDepartment(data);
    refresh();
    setShowAddModal(false);
  };

  const handleEdit = (description: string) => {
    if (!editTarget) return;
    store.updateDepartment(editTarget.id, { description });
    refresh();
    setEditTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    store.removeDepartment(deleteTarget.id);
    refresh();
    setDeleteTarget(null);
  };

  return (
    <>
      {showAddModal && (
        <AddModal onConfirm={handleAdd} onCancel={() => setShowAddModal(false)} />
      )}
      {editTarget && (
        <EditModal department={editTarget} onConfirm={handleEdit} onCancel={() => setEditTarget(null)} />
      )}
      {deleteTarget && (
        <DeleteModal department={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      <div className="flex flex-col h-full">

        {/* header */}
        <PageHeader title="Departments" onAddNew={() => setShowAddModal(true)} />

        <div className="p-6 space-y-6">

          {/* stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total departments" value={total} sub="registered" />
            <StatCard label="Active" value={active} sub="running" subColor="text-mint" />
            <StatCard label="Inactive" value={inactive} sub="paused" subColor="text-yellow-400" />
            <StatCard label="Avg. study years" value={avgYears} sub="years" />
          </div>

          {/* table */}
          <div className="bg-card border border-borderLine rounded-2xl flex-1 overflow-hidden">
            <div className="px-6 py-4 border-b border-borderLine flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-textMuted text-sm font-bold uppercase tracking-widest">
                All Departments

                {/* for filter */}
                {filtered.length !== departments.length && (
                  <span className="ml-2 text-mint normal-case font-normal">
                    — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>

            {/* SearchFilter */}
            <div className="px-6 py-4 border-b border-borderLine">
              <SearchFilter
                placeholder="Search departments by name, code, faculty…"
                filterKeys={[
                  { label: 'Code', value: 'code' },
                  { label: 'Name', value: 'name' },
                  { label: 'Faculty', value: 'faculty' },
                  { label: 'Status', value: 'status' },
                ]}
                onSearch={handleSearch}
              />
            </div>

            {departments.length === 0 ? (
              <div className="flex items-center justify-center min-h-48 py-12">
                <p className="text-textMuted px-4">No departments yet. Click <span className="text-mint font-bold">+ Add new</span> to create one.</p>
              </div>

            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-48 py-12 gap-2">
                <p className="text-textMuted">No departments match your search.</p>
                <p className="text-textMuted text-sm">Try a different keyword or filter.</p>
              </div>
            ) : (

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-borderLine">
                      {['Code', 'Name', 'Faculty', 'Total Years', 'Professors', 'Students', 'Status', ''].map(h => (
                        <th key={h} className="text-left text-textMuted text-xs font-bold uppercase tracking-wider px-6 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(dept => (
                      <tr key={dept.id} className="border-b border-borderLine hover:bg-surface/50 transition">
                        <td className="px-6 py-4 text-textMuted text-sm font-mono">{dept.code}</td>
                        <td className="px-6 py-4">
                          <p className="text-textLight text-sm font-semibold">{dept.name}</p>

                          {dept.description && (
                            <p className="text-textMuted text-xs mt-0.5 max-w-xs truncate">{dept.description}</p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-textLight text-sm">{dept.faculty}</td>
                        <td className="px-6 py-4 text-textLight text-sm">{dept.totalYears} yrs</td>
                        <td className="px-6 py-4 text-textLight text-sm font-medium">{profCount(dept)}</td>
                        <td className="px-6 py-4 text-textLight text-sm font-medium">{stuCount(dept)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border
                            ${dept.status === 'Active'
                              ? 'bg-mint/10 text-mint border-mint/30'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-400/30'
                            }`}>
                            {dept.status}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditTarget(dept)}
                              className="px-3 py-1 text-xs border border-borderLine text-textMuted hover:text-textLight hover:border-mint rounded-lg transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(dept)}
                              className="px-3 py-1 text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            >
                              Delete
                            </button>
                          </div>
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
    </>
  );
}