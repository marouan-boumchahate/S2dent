const rand = (n = 6) => Math.random().toString(36).slice(2, 2 + n);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const num = (max) => Math.floor(Math.random() * max) + 1;

export const WALLETS = {
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
