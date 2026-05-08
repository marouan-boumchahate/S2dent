// temprary until i get the API

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

export const store = {
  students: [] as Student[],
  professors: [] as Professor[],

  addStudent(s: Omit<Student, 'id' | 'createdAt'>) {
    const newStudent: Student = {
      ...s,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.students.unshift(newStudent);
    return newStudent;
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
};