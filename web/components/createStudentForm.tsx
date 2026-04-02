'use client';

import { useState } from 'react';
import Button from './Button';
import FormField from './FormField';

export default function CreateStudentForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const studentData = {
      full_name: fullName,
      email: email,
      student_id: studentId,
      department: department,
      faculty: faculty,
      phone: phone
    };
    console.log('Student Data:', studentData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full flex-1">
      <h2 className="text-3xl font-bold text-Light mb-8">Add Student</h2>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <FormField label="Full Name" value={fullName} onChange={setFullName} required />
          <FormField label="Email" type="email" value={email} onChange={setEmail} required />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FormField label="Student ID" value={studentId} onChange={setStudentId} required />
          <FormField label="Phone" type="tel" value={phone} onChange={setPhone} required />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FormField label="Faculty" value={faculty} onChange={setFaculty} required />
          <FormField label="Department" value={department} onChange={setDepartment} required />
        </div>
      </div>

      <Button
        title="Submit"
        onClick={() => {}}
        type="submit"
        className="mt-auto w-full bg-mint font-bold"
      />
    </form>
  );
}