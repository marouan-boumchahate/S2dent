'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from './Button';
import FormField from './FormField';
import AddressForm, { AddressData } from './AddressForm';
import { createUser, createAddress, fetchDepartments, apiFetch, ApiDepartment } from '@/lib/api';

export default function CreateProfessorForm({
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

  // ── Step 2: Address ───────────────────────────────────────────────────────
  const [address, setAddress] = useState<Partial<AddressData>>({});

  // ── Step 3: Professor Info ────────────────────────────────────────────────
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [title, setTitle] = useState('');
  const [rank, setRank] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [officeLocation, setOfficeLocation] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [bio, setBio] = useState('');

  // Fetch real departments from GET /api/departments (requires academy role ✓)
  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
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
  //   2. POST /api/addresses    → links address to user_id  (city + country required)
  //   3. POST /api/professors   → links professor to user_id + department_id
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
        date_of_birth: dateOfBirth,          // ISO date string e.g. "2000-01-15"
        gender,                               // "male" | "female"
        nationality,
        national_id: nationalId,
        email,
        phone: phone || undefined,
        photo_url: photoUrl || undefined,
      });

      // 2️⃣ POST /api/addresses  (city & country required per API spec)
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


      // 3️⃣ POST /api/professors
      //    Required: user_id, department_id, title, rank
      //    Optional: specialization, hire_date, employment_type, office_location, office_hours, bio
      await apiFetch('/professors', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          department_id: departmentId,
          title,
          rank,
          specialization: specialization || undefined,
          hire_date: hireDate || undefined,
          employment_type: employmentType,
          office_location: officeLocation || undefined,
          office_hours: officeHours || undefined,
          bio: bio || undefined,
        }),
      });


      onClose();
      console.log('Professor created successfully');
      router.push('/professors');
      console.log('Router pushed to /professors');
    } catch (error: any) {
      console.error('Professor creation failed:', error);
      alert(error?.message || 'Failed to register professor. Please try again.');
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

  // ── Step 3: Professor Info ────────────────────────────────────────────────
  if (step === 3) {
    return (
      <form onSubmit={handleStep3Submit} className="flex flex-col h-full flex-1">
        <h2 className="text-3xl font-bold text-textLight mb-8">Professor Information</h2>

        <div className="space-y-6">
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
              label="Title (e.g. Dr.)"
              value={title}
              onChange={setTitle}
              required
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Rank"
              value={rank}
              onChange={setRank}
              required
              options={['', 'Assist. Prof', 'Assoc. Prof', 'Prof', 'Lecturer', 'Instructor']}
            />
            <FormField
              label="Employment Type"
              value={employmentType}
              onChange={setEmploymentType}
              options={['full_time', 'part_time', 'adjunct', 'visiting', 'contract']}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Specialization"
              value={specialization}
              onChange={setSpecialization}
              maxLength={255}
              placeholder="e.g. Artificial Intelligence"
            />
            <FormField
              label="Hire Date"
              isDate
              value={hireDate}
              onChange={setHireDate}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Office Location"
              value={officeLocation}
              onChange={setOfficeLocation}
              maxLength={255}
              placeholder="e.g. Building A, Room 204"
            />
            <FormField
              label="Office Hours"
              value={officeHours}
              onChange={setOfficeHours}
              placeholder="e.g. Mon/Wed 14:00-16:00"
            />
          </div>

          <FormField
            label="Bio"
            value={bio}
            onChange={setBio}
            isTextarea
            placeholder="Short biography…"
          />
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