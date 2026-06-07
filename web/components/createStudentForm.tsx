'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from './Button';
import FormField from './FormField';
import AddressForm, { AddressData } from './AddressForm';
import { createUser, createAddress, fetchDepartments, fetchProfessors, apiFetch, ApiDepartment, ApiProfessor } from '@/lib/api';

export default function CreateStudentForm({
  onClose,
  onStepChange,
}: {
  onClose: () => void;
  onStepChange: (step: number) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ── Step 1: Personnel ─────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  // NOTE: `notes` removed — POST /api/users does not accept it

  // ── Step 2: Address ───────────────────────────────────────────────────────
  const [address, setAddress] = useState<Partial<AddressData>>({});

  // ── Step 3: Student Info ──────────────────────────────────────────────────
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [professors, setProfessors] = useState<ApiProfessor[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [actualGraduationDate, setActualGraduationDate] = useState('');
  const [advisorId, setAdvisorId] = useState('');
  // NOTE: `current_level` removed — API auto-sets it to 1 on creation
  // NOTE: `notes` removed — POST /api/students does not accept it

  // Fetch departments + professors for dropdowns
  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
    fetchProfessors().then(setProfessors).catch(() => setProfessors([]));
  }, []);

  const goTo = (s: number) => {
    setStep(s);
    onStepChange(s);
  };

  // ── Step 1 submit ─────────────────────────────────────────────────────────
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    goTo(2);
  };

  // ── Step 3 submit: 3 sequential API calls per the Off-Chain Creation Workflow
  //   1. POST /api/users        → returns user_id
  //   2. POST /api/addresses    → links address to user_id (city + country required)
  //   3. POST /api/students     → links student to user_id + department_id + advisor_id
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      // 1️⃣ POST /api/users
      const user = await createUser({
        first_name: firstName,
        middle_name: middleName || undefined,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        gender,
        nationality,
        national_id: nationalId,
        email,
        phone: phone || undefined,
        photo_url: photoUrl || undefined,
      });

      // 2️⃣ POST /api/addresses (city & country required per API spec)
      await createAddress({
        user_id: user.id,
        city: (address as AddressData).city,
        country: (address as AddressData).country,
        address_line1: (address as AddressData).address_line1 || undefined,
        address_line2: (address as AddressData).address_line2 || undefined,
        street: (address as AddressData).street || undefined,
        district: (address as AddressData).district || undefined,
        state: (address as AddressData).state || undefined,
        postal_code: (address as AddressData).postal_code || undefined,
      });

      // 3️⃣ POST /api/students
      //    Required: user_id, department_id, advisor_id
      //    Optional: enrollment_status, enrollment_date, actual_graduation_date
      await apiFetch('/students', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          department_id: departmentId,
          advisor_id: advisorId,
          enrollment_status: enrollmentStatus || undefined,
          enrollment_date: enrollmentDate || undefined,
          actual_graduation_date: actualGraduationDate || undefined,
        }),
      });

      onClose();
      router.push('/students');
    } catch (error: any) {
      console.error('Student creation failed:', error);
      alert(error?.message || 'Failed to register student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Address form ──────────────────────────────────────────────────
  if (step === 2) {
    return (
      <AddressForm
        initialData={address}
        onNext={(data) => { setAddress(data); goTo(3); }}
        onBack={() => goTo(1)}
      />
    );
  }

  // ── Step 3: Student Info ──────────────────────────────────────────────────
  if (step === 3) {
    return (
      <form onSubmit={handleStep3Submit} className="flex flex-col h-full flex-1">
        <h2 className="text-3xl font-bold text-textLight mb-8">Student Information</h2>

        <div className="space-y-6">

          {/* Department + Enrollment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Department dropdown — populated from GET /api/departments */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-textMuted">
                Department <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-surface border border-borderLine rounded-lg px-4 py-2.5 text-textLight focus:outline-none focus:border-mint"
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <FormField
              label="Enrollment Status"
              value={enrollmentStatus}
              onChange={setEnrollmentStatus}
              options={['', 'active', 'inactive', 'graduated']}
            />
          </div>

          {/* Enrollment Date + Actual Graduation Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Enrollment Date"
              isDate
              value={enrollmentDate}
              onChange={setEnrollmentDate}
            />
            <FormField
              label="Actual Graduation Date"
              isDate
              value={actualGraduationDate}
              onChange={setActualGraduationDate}
            />
          </div>

          {/* Advisor dropdown — populated from GET /api/professors */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-textMuted">
              Advisor <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              className="w-full bg-surface border border-borderLine rounded-lg px-4 py-2.5 text-textLight focus:outline-none focus:border-mint"
            >
              <option value="">Select advisor…</option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="mt-8 pb-4 flex gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => goTo(2)}
            className="w-full p-3 rounded-lg border border-borderLine text-textMuted hover:bg-surface transition font-bold disabled:opacity-50"
          >
            ← Back
          </button>
          <Button
            title={loading ? 'Submitting…' : 'Submit'}
            onClick={() => { }}
            type="submit"
            className="w-full bg-mint font-bold"
          />
        </div>
      </form>
    );
  }

  // ── Step 1: Personnel ─────────────────────────────────────────────────────
  // Notes field REMOVED — POST /api/users does not accept it
  return (
    <form onSubmit={handleStep1Submit} className="flex flex-col h-full flex-1">
      <h2 className="text-3xl font-bold text-textLight mb-8">Personnel Information</h2>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="First Name" value={firstName} onChange={setFirstName} required maxLength={100} />
          <FormField label="Middle Name" value={middleName} onChange={setMiddleName} maxLength={100} />
          <FormField label="Last Name" value={lastName} onChange={setLastName} required maxLength={100} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Date of Birth" isDate value={dateOfBirth} onChange={setDateOfBirth} required />
          <FormField label="Gender" value={gender} onChange={setGender} required options={['', 'male', 'female']} />
          <FormField label="Nationality" value={nationality} onChange={setNationality} required maxLength={100} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="National ID" value={nationalId} onChange={setNationalId} required maxLength={100} />
          <FormField label="Email" type="email" value={email} onChange={(v) => setEmail(v.toLowerCase())} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="Phone (e.g. +905551234567)" type="tel" value={phone} onChange={setPhone} />
          <FormField label="Photo URL" type="url" value={photoUrl} onChange={setPhotoUrl} />
        </div>
      </div>

      <div className="mt-8 pb-4 flex gap-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full p-3 rounded-lg border border-borderLine text-textMuted hover:bg-surface transition font-bold"
        >
          Cancel
        </button>
        <Button title="Next →" onClick={() => { }} type="submit" className="w-full bg-mint font-bold" />
      </div>
    </form>
  );
}