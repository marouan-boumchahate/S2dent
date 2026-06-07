'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from './Button';
import FormField from './FormField';
import AddressForm, { AddressData } from './AddressForm';
import { createUser, createAddress, fetchDepartments, fetchProfessors, apiFetch, ApiDepartment, ApiProfessor } from '@/lib/api';
import { useAlert } from '@/components/AlertContext';
import { getFriendlyErrorMessage } from '@/lib/utils';

export default function CreateStudentForm({
  onClose,
  onStepChange,
}: {
  onClose: () => void;
  onStepChange: (step: number) => void;
}) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // ── Step 1 change handlers & validations ──────────────────────────────────
  const handleFirstNameChange = (val: string) => {
    setFirstName(val.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 100));
  };

  const handleMiddleNameChange = (val: string) => {
    setMiddleName(val.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 100));
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 100));
  };

  const handleDateOfBirthChange = (val: string) => {
    setDateOfBirth(val);
    if (val) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.dateOfBirth;
        return copy;
      });
    }
  };

  const handleGenderChange = (val: string) => {
    setGender(val);
    if (val) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.gender;
        return copy;
      });
    }
  };

  const handleNationalityChange = (val: string) => {
    setNationality(val.replace(/[^a-zA-ZÀ-ÿ\s-]/g, '').slice(0, 100));
  };

  const handleNationalIdChange = (val: string) => {
    setNationalId(val.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 100));
  };

  const handleEmailChange = (val: string) => {
    setEmail(val.trim().toLowerCase());
  };

  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    } else {
      cleaned = cleaned.replace(/\+/g, '');
    }
    if (cleaned.length > 16) {
      cleaned = cleaned.slice(0, 16);
    }
    setPhone(cleaned);
  };

  const handlePhotoUrlChange = (val: string) => {
    setPhotoUrl(val.trim().slice(0, 500));
  };

  // ── Step 3 change handlers ────────────────────────────────────────────────
  const handleDepartmentIdChange = (val: string) => {
    setDepartmentId(val);
    if (val) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.departmentId;
        return copy;
      });
    }
  };

  const handleEnrollmentStatusChange = (val: string) => {
    setEnrollmentStatus(val);
  };

  const handleEnrollmentDateChange = (val: string) => {
    setEnrollmentDate(val);
  };

  const handleActualGraduationDateChange = (val: string) => {
    setActualGraduationDate(val);
  };

  const handleAdvisorIdChange = (val: string) => {
    setAdvisorId(val);
    if (val) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.advisorId;
        return copy;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!nationality.trim()) newErrors.nationality = 'Nationality is required.';
    if (!nationalId.trim()) newErrors.nationalId = 'National ID is required.';

    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    } else {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      if (birthDate >= today) {
        newErrors.dateOfBirth = 'Date of birth must be in the past.';
      } else {
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 1) {
          newErrors.dateOfBirth = 'Student must be at least 1 year old.';
        }
      }
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (phone) {
      if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
        newErrors.phone = 'Phone must be a valid international phone number (e.g. +905551234567, starting with 1-9 after optional + and having 8 to 15 digits total).';
      }
    }

    if (photoUrl) {
      if (photoUrl.length > 500) {
        newErrors.photoUrl = 'Photo URL cannot exceed 500 characters.';
      } else {
        try {
          new URL(photoUrl);
        } catch (_) {
          newErrors.photoUrl = 'Please enter a valid URL.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!departmentId) newErrors.departmentId = 'Department is required.';
    if (!advisorId) newErrors.advisorId = 'Advisor is required.';

    const validStatuses = ['active', 'inactive', 'graduated'];
    if (enrollmentStatus && !validStatuses.includes(enrollmentStatus)) {
      newErrors.enrollmentStatus = 'Invalid enrollment status selection.';
    }

    if (enrollmentDate) {
      const parsedDate = new Date(enrollmentDate);
      if (isNaN(parsedDate.getTime())) {
        newErrors.enrollmentDate = 'Please enter a valid enrollment date.';
      }
    }

    if (actualGraduationDate) {
      const parsedDate = new Date(actualGraduationDate);
      if (isNaN(parsedDate.getTime())) {
        newErrors.actualGraduationDate = 'Please enter a valid actual graduation date.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Step 1 submit ─────────────────────────────────────────────────────────
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      goTo(2);
    }
  };

  // ── Step 3 submit: 3 sequential API calls per the Off-Chain Creation Workflow
  //   1. POST /api/users        → returns user_id
  //   2. POST /api/addresses    → links address to user_id (city + country required)
  //   3. POST /api/students     → links student to user_id + department_id + advisor_id
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
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

      showAlert({
        type: 'success',
        title: 'Registration Successful',
        message: `${firstName} ${lastName} has been successfully registered as a student.`,
        onConfirm: () => {
          onClose();
          router.push('/students');
        }
      });
    } catch (error: any) {
      console.error('Student creation failed:', error);
      showAlert({
        type: 'error',
        title: 'Registration Failed',
        message: getFriendlyErrorMessage(error, 'Failed to register student. Please try again.')
      });
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
                onChange={(e) => handleDepartmentIdChange(e.target.value)}
                className={`w-full bg-surface border ${
                  errors.departmentId ? 'border-red-500 focus:border-red-500' : 'border-borderLine focus:border-mint'
                } rounded-lg px-4 py-2.5 text-textLight focus:outline-none`}
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className="text-red-400 text-xs mt-1">{errors.departmentId}</p>}
            </div>

            <FormField
              label="Enrollment Status"
              value={enrollmentStatus}
              onChange={handleEnrollmentStatusChange}
              options={['', 'active', 'inactive', 'graduated']}
              error={errors.enrollmentStatus}
            />
          </div>

          {/* Enrollment Date + Actual Graduation Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Enrollment Date"
              isDate
              value={enrollmentDate}
              onChange={handleEnrollmentDateChange}
              error={errors.enrollmentDate}
            />
            <FormField
              label="Actual Graduation Date"
              isDate
              value={actualGraduationDate}
              onChange={handleActualGraduationDateChange}
              error={errors.actualGraduationDate}
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
              onChange={(e) => handleAdvisorIdChange(e.target.value)}
              className={`w-full bg-surface border ${
                errors.advisorId ? 'border-red-500 focus:border-red-500' : 'border-borderLine focus:border-mint'
              } rounded-lg px-4 py-2.5 text-textLight focus:outline-none`}
            >
              <option value="">Select advisor…</option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.advisorId && <p className="text-red-400 text-xs mt-1">{errors.advisorId}</p>}
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
          <FormField label="First Name" value={firstName} onChange={handleFirstNameChange} required maxLength={100} error={errors.firstName} />
          <FormField label="Middle Name" value={middleName} onChange={handleMiddleNameChange} maxLength={100} error={errors.middleName} />
          <FormField label="Last Name" value={lastName} onChange={handleLastNameChange} required maxLength={100} error={errors.lastName} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Date of Birth" isDate value={dateOfBirth} onChange={handleDateOfBirthChange} required error={errors.dateOfBirth} />
          <FormField label="Gender" value={gender} onChange={handleGenderChange} required options={['', 'male', 'female']} error={errors.gender} />
          <FormField label="Nationality" value={nationality} onChange={handleNationalityChange} required maxLength={100} error={errors.nationality} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="National ID" value={nationalId} onChange={handleNationalIdChange} required maxLength={100} error={errors.nationalId} />
          <FormField label="Email" type="email" value={email} onChange={handleEmailChange} required error={errors.email} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="Phone (e.g. +905551234567)" type="tel" value={phone} onChange={handlePhoneChange} error={errors.phone} />
          <FormField label="Photo URL" type="url" value={photoUrl} onChange={handlePhotoUrlChange} error={errors.photoUrl} />
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