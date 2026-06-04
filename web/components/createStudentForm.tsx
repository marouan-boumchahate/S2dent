'use client';

import { useState } from 'react';
import Button from './Button';
import FormField from './FormField';
import AddressForm, { AddressData } from './AddressForm';

import { store } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { createStudent } from '@/lib/api';

export default function CreateStudentForm({ onClose, onStepChange }: { onClose: () => void, onStepChange: (step: number) => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

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
  const [notes, setNotes] = useState('');

  const [address, setAddress] = useState<Partial<AddressData>>({});
  
  const [department, setDepartment] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [actualGraduationDate, setActualGraduationDate] = useState('');
  const [adviserId, setAdviserId] = useState('');

  const router = useRouter();

  const professorOptions = ['', ...store.professors.map(p =>
    [p.title, p.firstName, p.lastName].filter(Boolean).join(' ')
  )];

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    onStepChange(2);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // JavaScript guard clause to block double-clicks
    setLoading(true);

    try {
      // Send parameters as snake_case matching the backend schema
      await createStudent({
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        gender,
        nationality,
        national_id: nationalId,
        email,
        phone,
        photo_url: photoUrl || null,
        notes,
        department,
        current_level: currentLevel,
        enrollment_status: enrollmentStatus || 'active',
        enrollment_date: enrollmentDate || null,
        actual_graduation_date: actualGraduationDate || null,
        adviser_id: adviserId || null,
        ...address, // Spreads address fields directly into the outgoing body request
      });

// Maintain local fallback synchronization
      store.addStudent({
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        gender,
        nationality,
        nationalId,
        email,
        phone,
        photoUrl,
        notes,
        department,
        currentLevel,
        enrollmentStatus,
        enrollmentDate,
        actualGraduationDate,
        adviserId,
      });

      onClose();
      router.push('/students');
      router.refresh();
    } catch (error) {
      console.error('Error submitting student form:', error);
      alert('Failed to register student records. Please verify database container connection.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <AddressForm
        initialData={address}
        onNext={(data) => { setAddress(data); setStep(3); onStepChange(3); }}
        onBack={() => { setStep(1); onStepChange(1); }}
      />
    );
  }

  // here the step 3 and agian the step 2 in the address form
  if (step === 3) {
    return (
      <form onSubmit={handleStep3Submit} className="flex flex-col h-full flex-1">
        <h2 className="text-3xl font-bold text-textLight mb-8">Student Information</h2>

        <div className="space-y-6">

          {/* department, current level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Department"
              value={department}
              onChange={setDepartment}
              required
              options={['', 'Computer Science', 'Engineering', 'Mathematics', 'Physics', 'Business', 'Medicine', 'Computer Engineering']}
            />
            <FormField
              label="Current Level (e.g. Year 2)"
              value={currentLevel}
              onChange={setCurrentLevel}
              required
              maxLength={20}
            />
          </div>

          {/* enrollment status, enrollment date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Enrollment Status"
              value={enrollmentStatus}
              onChange={setEnrollmentStatus}
              options={['', 'active', 'inactive', 'graduated']}
            />
            <FormField
              label="Enrollment Date"
              isDate
              value={enrollmentDate}
              onChange={setEnrollmentDate}
            />
          </div>

          {/* actual graduation date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Actual Graduation Date"
              isDate
              value={actualGraduationDate}
              onChange={setActualGraduationDate}
            />
            <FormField
              label="Adviser"
              value={adviserId}
              onChange={setAdviserId}
              options={professorOptions}
            />
          </div>

          {/* notes */}
          <FormField
            label="Notes"
            value={notes}
            onChange={setNotes}
            isTextarea
            placeholder="Any additional notes..."
          />
        </div>

        <div className="mt-8 pb-4 flex gap-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => { setStep(2); onStepChange(2); }}
            className="w-full p-3 rounded-lg border border-borderLine text-textMuted hover:bg-surface transition font-bold disabled:opacity-50"
          >
            ← Back
          </button>
          <Button
            title={loading ? "Submitting..." : "Submit"}
            onClick={() => { }}
            type="submit"
            className="w-full bg-mint font-bold"
          />
        </div>
      </form>
    );
  }

  // this should be step 1 !!! the step 2 in the address form
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

        <FormField label="Notes" value={notes} onChange={setNotes} isTextarea placeholder="Any additional notes..." />
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