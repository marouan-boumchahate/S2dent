const rand = (n = 6) => Math.random().toString(36).slice(2, 2 + n);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const num = (max) => Math.floor(Math.random() * max) + 1;

export const WALLETS = {
  admin: {
    address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  academy: {
    address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  student: {
    address: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  },
  professor: {
    address: '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
    privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  },
};

const FIRST_NAMES = ['Marouan', 'Alice', 'Selim', 'Yusuf', 'Aisha', 'Lina', 'Omar', 'Zeynep', 'Mehmet', 'Fatima'];
const LAST_NAMES  = ['Boumchahate', 'Aydin', 'Karaca', 'Demir', 'Yilmaz', 'Kaya', 'Sahin', 'Ozturk', 'Celik'];
const NATIONALITIES = ['Moroccan', 'Turkish', 'French', 'Tunisian', 'Spanish'];
const GENDERS = ['male', 'female'];
const SEMESTERS = ['fall', 'spring', 'summer'];
const DEGREE_LEVELS = ['bachelor', 'master', 'phd'];
const HONORS = ['with_honors', 'great_honors', 'highest_honors'];
const COURSE_NAMES = ['Introduction to Programming', 'Data Structures', 'Applied Cryptography', 'Distributed Systems', 'Database Systems'];
const DEGREE_TITLES = ['Bachelor of Science', 'Master of Science', 'Doctor of Philosophy'];
const MAJORS = ['Computer Science', 'Software Engineering', 'Information Systems', 'Data Science'];
const FACULTIES = ['Engineering Faculty', 'School of Computing', 'Faculty of Science'];
const ATTENDANCE_COURSES = ['Blockchain Fundamentals', 'Advanced Software Engineering', 'Secure Systems', 'Cloud Computing'];

const academicYear = () => {
  const start = 2023 + num(2);
  return `${start}-${start + 1}`;
};

const enrollmentProfile = () => ({
  title: `Enrollment Certificate ${rand(4)}`,
  credential_type: 'enrollment',
  description: 'Enrollment confirmation issued by the academy.',
  payload: {
    course_name: pick(COURSE_NAMES),
    course_code: `CRS-${rand(5).toUpperCase()}`,
    academic_year: academicYear(),
    semester: pick(SEMESTERS),
    enrollment_date: '2024-09-15',
  },
});

const degreeProfile = () => {
  const classSize = 60 + num(40);
  const classRank = num(classSize);

  return {
    title: `Degree Credential ${rand(4)}`,
    credential_type: 'degree',
    description: 'Degree credential issued by the academy.',
    payload: {
      degree_title: pick(DEGREE_TITLES),
      degree_level: pick(DEGREE_LEVELS),
      major: pick(MAJORS),
      program_code: `PRG-${rand(5).toUpperCase()}`,
      faculty: pick(FACULTIES),
      department: 'Computer Science and Engineering',
      graduation_date: '2024-06-30',
      gpa: Number((3.2 + Math.random() * 0.8).toFixed(2)),
      gpa_scale: 4,
      class_rank: classRank,
      class_size: classSize,
      honors: pick(HONORS),
      total_credits_earned: 120 + num(20),
      required_credits: 120,
    },
  };
};

const attendanceCredentialProfile = () => ({
  title: `Attendance Record ${rand(4)}`,
  credential_type: 'attendance',
  description: 'Attendance record issued by the professor.',
  payload: {
    course_code: `CRS-${rand(5).toUpperCase()}`,
    course_name: pick(ATTENDANCE_COURSES),
    academic_year: academicYear(),
    semester: pick(SEMESTERS),
    total_sessions: 24 + num(12),
    attended_sessions: 20 + num(4),
    excused_absences: num(3),
    period_from: '2024-01-10',
    period_to: '2024-05-20',
  },
});

export const academyProfile = () => ({
  name: `Innovation Institute ${rand(4)}`,
  short_name: `II${rand(3)}`.toUpperCase(),
  type: 'college',
  description: 'A modern academy fostering innovation in tech and sciences.',
  website: `https://www.${rand()}.edu`,
  logo_url: `https://www.${rand()}.edu/logo.png`,
  email: `contact_${rand()}@example.org`,
  phone: '+14167894567',
  legal_name: `Innovation Institute Trust ${rand(4)}`,
  registration_number: `REG-${rand(8)}`,
  tax_id: `TAX-${rand(8)}`,
  billing_email: `finance_${rand()}@example.org`,
});

export const userProfile = () => ({
  first_name: pick(FIRST_NAMES),
  last_name: pick(LAST_NAMES),
  date_of_birth: '1998-07-15',
  nationality: pick(NATIONALITIES),
  gender: pick(GENDERS),
  national_id: `TR${Date.now()}${rand(4)}`,
  email: `user_${rand(8)}@example.com`,
  phone: '+905551234567',
  photo_url: `https://example.com/photos/${rand()}.jpg`,
});

export const addressProfile = () => ({
  address_line1: `${num(999)} Example Avenue`,
  address_line2: `Apt ${num(99)}`,
  street: 'Example Avenue',
  district: 'Kadıköy',
  state: 'Istanbul',
  postal_code: '34160',
  city: 'Istanbul',
  country: 'Türkiye',
  latitude: 41.0179,
  longitude: 28.8905,
});

export const departmentProfile = () => ({
  code: `CSE${num(999)}`,
  name: 'Computer Science and Engineering',
  faculty: 'Engineering Faculty',
  total_years: 4,
  description: 'Software engineering, algorithms, and systems design.',
  is_active: true,
});

export const studentProfile = () => ({
  enrollment_date: '2023-09-01',
});

export const professorProfile = () => ({
  title: 'Dr.',
  rank: 'Assist. Prof',
  specialization: 'Distributed Systems',
  hire_date: '2022-09-01',
  employment_type: 'full_time',
  office_location: `Building A, Room ${num(999)}`,
  office_hours: 'Mon/Wed 14:00-16:00',
  bio: 'Researcher in blockchain and decentralized systems.',
});

export const credentialProfile = (type = pick(['enrollment', 'degree'])) => {
  if (type === 'degree') {
    return degreeProfile();
  }

  return enrollmentProfile();
};

export { attendanceCredentialProfile };
