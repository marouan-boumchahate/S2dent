'use client';

import { useState } from 'react';

// tiles for professor
const PROFESSOR_TITLES = [
  'Asst. Prof.',
  'Assoc. Prof.',
  'Prof.',
  'Lect.',
  'Res.',
  'Other'
];

export default function AddTeacherForm() {
  // variables for form 
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState(PROFESSOR_TITLES[0]); // the value is the one that i geet it from profesor titles
  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // my data
    const teacherData = {
      full_name: fullName,
      email: email,
      title: title,
      department: department,
      faculty: faculty,
      phone: phone
    };
    console.log('Teacher Data to be sent:', teacherData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full flex-1">
      <h2 className="text-3xl font-bold text-electric mb-8">Add Teacher</h2>

      <div className="space-y-6">
        {/* name and email */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-textMuted mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-textMuted mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition"
              required
            />
          </div>
        </div>

        {/* title and phone  */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-textMuted mb-2">Title</label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition cursor-pointer"
              required
            >
              {PROFESSOR_TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-textMuted mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition"
              required
            />
          </div>
        </div>

        {/* faculty and dep */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-textMuted mb-2">Faculty</label>
            <input
              type="text"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-textMuted mb-2">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition"
              required
            />
          </div>
        </div>
      </div>

      {/* submit button */}
      <button
        type="submit"
        className="mt-auto w-full bg-mint text-white p-4 rounded-lg font-bold text-lg hover:bg-mint/80 transition shadow-lg shadow-mint/20"
      >
        Submit
      </button>
    </form>
  );
}