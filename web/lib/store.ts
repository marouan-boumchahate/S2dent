// temporary until the API is ready

export type Student = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  department: string;
  enrollmentStatus: string;
  enrollmentDate: string;
  actualGraduationDate: string;
  nationality: string;
  nationalId: string;
  phone: string;
  photoUrl: string;
  currentLevel: string;
  dateOfBirth: string;
  gender: string;
  notes: string;
  createdAt: string;
};

export type Professor = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  rank: string;
  nationality: string;
  nationalId: string;
  phone: string;
  photoUrl: string;
  hireDate: string;
  dateOfBirth: string;
  gender: string;
  notes: string;
  specialization: string;
  employmentType: string;
  officeLocation: string;
  officeHours: string;
  bio: string;
  createdAt: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  faculty: string;
  totalYears: number;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
};


export type Credential = {
  id: string;
  title: string;
  issuedTo: string; // student id
  type: 'Enrollment' | 'Attendance' | 'Degree' | 'Certificate' | 'Achievement' | 'Transcript';
  code: string;
  date: string;
  status: 'Verified' | 'Pending' | 'Failed' | 'Revoked';
  createdAt: string;
};
export const store = {
  students: [] as Student[],
  professors: [] as Professor[],
  departments: [] as Department[],
  credentials: [] as Credential[],

  addStudent(s: Omit<Student, 'id' | 'createdAt'>) {
    const newStudent: Student = {
      ...s,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.students.unshift(newStudent);
    return newStudent;
  },

  removeStudent(id: string) {
    this.students = this.students.filter(s => s.id !== id);
  },

  addProfessor(p: Omit<Professor, 'id' | 'createdAt'>) {
    const newProfessor: Professor = {
      ...p,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.professors.unshift(newProfessor);
    return newProfessor;
  },

  removeProfessor(id: string) {
    this.professors = this.professors.filter(p => p.id !== id);
  },

  addDepartment(d: Omit<Department, 'id' | 'createdAt'>) {
    const newDepartment: Department = {
      ...d,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.departments.unshift(newDepartment);
    return newDepartment;
  },

  updateDepartment(id: string, updates: Partial<Omit<Department, 'id' | 'createdAt'>>) {
    const idx = this.departments.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.departments[idx] = { ...this.departments[idx], ...updates };
    }
    return this.departments[idx];
  },

  removeDepartment(id: string) {
    this.departments = this.departments.filter(d => d.id !== id);
  },

  addCredential(c: Omit<Credential, 'id' | 'createdAt'>) {
    const newCredential: Credential = {
      ...c,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.credentials.unshift(newCredential);
    return newCredential;
  },

  removeCredential(id: string) {
    this.credentials = this.credentials.filter(c => c.id !== id);
  },
};