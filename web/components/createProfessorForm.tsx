'use client';

import { useState } from 'react';
import Button from './Button';
import FormField from './FormField';
import AddressForm from './AddressForm';

import { store } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function CreateProfessorForm({ onClose, onStepChange }: { onClose: () => void, onStepChange: (step: number) => void }) {
  const [step, setStep] = useState(1);

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

  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [rank, setRank] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [officeLocation, setOfficeLocation] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [bio, setBio] = useState('');

  const router = useRouter();

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    onStepChange(2);
  };

const handleStep3Submit = (e: React.FormEvent) => {
  e.preventDefault();
  store.addProfessor({
    firstName, middleName, lastName, dateOfBirth, gender, nationality,
    nationalId, email, phone, photoUrl, notes,
    department, title, rank, specialization, hireDate,
    employmentType, officeLocation, officeHours, bio,
  });
  onClose();
  router.push('/professors');
};

  if (step === 2) {
    return (
      <AddressForm
        onNext={() => { setStep(3); onStepChange(3); }}
        onBack={() => { setStep(1); onStepChange(1); }}
      />
    );
  }
  // here the step 3 and agian the step 2 in the address form
  if (step === 3) {
    return (
      <form onSubmit={handleStep3Submit} className="flex flex-col h-full flex-1">
        <h2 className="text-3xl font-bold text-textLight mb-8">Professor Information</h2>

        <div className="space-y-6">

          {/* department, title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Department"
              value={department}
              onChange={setDepartment}
              required
              options={['', 'Nursing', 'Pharmacy', 'Economics', 'Marketing', 'Mathematics', 'Physics', 'Biology', 'History', 'Computer Engineering', 'Mechanical Engineering', 'Civil Engineering']}
            />
            <FormField
              label="Title (e.g. Dr.)"
              value={title}
              onChange={setTitle}
              required
              maxLength={100}
            />
          </div>

          {/* rank, employment type */}
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

          {/* specialization, hire date */}
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

          {/* office location, office hours */}
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

          {/* bio */}
          <FormField
            label="Bio"
            value={bio}
            onChange={setBio}
            isTextarea
            placeholder="Short biography..."
          />

        </div>

        <div className="mt-8 pb-4 flex gap-4">
          <button
            type="button"
            onClick={() => { setStep(2); onStepChange(2); }}
            className="w-full p-3 rounded-lg border border-borderLine text-textMuted hover:bg-surface transition font-bold"
          >
            ← Back
          </button>
          <Button
            title="Submit"
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