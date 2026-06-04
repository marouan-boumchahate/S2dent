// lib/api.ts
// ضع هذا الملف في مجلد web/src/lib/

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ---- Token helpers ----
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

export function setTokens(access: string, refresh: string) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

// ---- Departments ----
export interface ApiDepartment {
    id: string;
    code: string;
    name: string;
    faculty: string;
    total_years: number;
    description: string;
    status: string;
}

export async function fetchDepartments(): Promise<ApiDepartment[]> {
    const data = await apiFetch<{ departments: ApiDepartment[] }>('/departments');
    return data.departments;
}

export async function createDepartment(payload: Omit<ApiDepartment, 'id'>): Promise<ApiDepartment> {
    const data = await apiFetch<{ department: ApiDepartment }>('/departments', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return data.department;
}

export async function updateDepartment(id: string, payload: Partial<ApiDepartment>): Promise<ApiDepartment> {
    const data = await apiFetch<{ department: ApiDepartment }>(`/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return data.department;
}

export async function deleteDepartment(id: string): Promise<void> {
    await apiFetch(`/departments/${id}`, { method: 'DELETE' });
}

// ---- Core fetch wrapper ----
async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getAccessToken();

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const json = await res.json();

    if (!res.ok) {
        throw new Error(json.message || `API error ${res.status}`);
    }

    return json.data as T;
}

// ---- Students ----
export interface ApiStudent {
    id: string;
    wallet_address: string;
    name: string;
    serial_number: string;
    department: string;
    advisor_name: string;
    last_transaction_status: 'verified' | 'pending' | 'failed';
    issued_at: string;
    is_revoked: boolean;
    email: string;
}

export interface ApiStudentDetail {
    id: string;
    user_id: string;
    academy_id: string;
    department_id: string;
    advisor_id: string;
    advisor_name: string;
    student_number: string;
    current_level: number;
    enrollment_status: string;
    cgpa: number | null;
    enrollment_date: string;
    expected_graduation_date: string;
    actual_graduation_date: string | null;
}

export async function fetchStudents(): Promise<ApiStudent[]> {
    const data = await apiFetch<{ students: ApiStudent[] }>('/students');
    return data.students;
}

export async function fetchStudentById(id: string): Promise<ApiStudentDetail> {
    const data = await apiFetch<{ student: ApiStudentDetail }>(`/students/${id}`);
    return data.student;
}

export async function updateStudent(
    id: string,
    payload: { cgpa?: number; advisor_id?: string },
): Promise<ApiStudentDetail> {
    const data = await apiFetch<{ student: ApiStudentDetail }>(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return data.student;
}

// ---- Professors ----
export interface ApiProfessor {
    id: string;
    wallet_address: string;
    name: string;
    department: string;
    last_transaction_status: 'verified' | 'pending' | 'failed';
    issued_at: string;
    is_revoked: boolean;
    email: string;
}

export interface ApiProfessorDetail {
    id: string;
    user_id: string;
    academy_id: string;
    department_id: string;
    serial_number: string;
    title: string;
    rank: string;
    specialization: string;
    hire_date: string;
    employment_type: string;
    office_location: string;
    office_hours: string;
    bio: string;
    is_active: boolean;
}

export async function fetchProfessors(): Promise<ApiProfessor[]> {
    const data = await apiFetch<{ professors: ApiProfessor[] }>('/professors');
    return data.professors;
}

export async function fetchProfessorById(id: string): Promise<ApiProfessorDetail> {
    const data = await apiFetch<{ professor: ApiProfessorDetail }>(`/professors/${id}`);
    return data.professor;
}

export async function updateProfessor(
    id: string,
    payload: {
        rank?: string;
        employment_type?: string;
        office_location?: string;
        office_hours?: string;
    },
): Promise<ApiProfessorDetail> {
    const data = await apiFetch<{ professor: ApiProfessorDetail }>(`/professors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return data.professor;
}

// ---- On-chain identity ----
export interface OnChainStudent {
    identity: {
        wallet_address: string;
        full_name: string;
        department: string;
        academy_name: string;
        enrollment_date: string;
    };
    status: {
        issued_at: string;
        issuer: string;
        is_revoked: boolean;
        revoked_at: string | null;
        revoker: string | null;
    };
}

export async function fetchStudentOnChain(walletAddress: string): Promise<OnChainStudent> {
    const data = await apiFetch<OnChainStudent>(`/identity/students/${walletAddress}`);
    return data;
}

// ---- Revoke ----
export async function revokeStudentIdentity(
    studentAddress: string,
    revocationReason: string,
): Promise<void> {
    await apiFetch('/identity/students/revoke', {
        method: 'DELETE',
        body: JSON.stringify({
            student_address: studentAddress,
            revocation_reason: revocationReason,
        }),
    });
}

export async function revokeProfessorIdentity(
    professorAddress: string,
    revocationReason: string,
): Promise<void> {
    await apiFetch('/identity/professors/revoke', {
        method: 'DELETE',
        body: JSON.stringify({
            professor_address: professorAddress,
            revocation_reason: revocationReason,
        }),
    });
}

// ---- Credentials ----
export interface ApiCredential {
  id: string;
  title: string;
  code: string;
  type: string;
  student_name: string;
  issued_at: string;
  is_revoked: boolean;
  status: 'verified' | 'pending' | 'failed' | 'revoked';
}

export async function fetchCredentials(): Promise<ApiCredential[]> {
  const data = await apiFetch<{ credentials: ApiCredential[] }>('/credentials');
  return data.credentials;
}

export interface ApiCredentialDetail {
  meta: {
    id: string;
    title: string;
    code: string;
    type: string;
    description: string;
    locale: string | null;
    issued_at: string;
    is_revoked: boolean;
  };
  student: {
    address: string;
    name: string;
  };
  blockchain: {
    issue_tx_hash: string;
    revoke_tx_hash: string | null;
    revocation_reason: string | null;
    credential_index: number;
    academy_address: string;
    issuer_address: string;
  };
  verification: {
    payload_hash: string;
    issuer_signature: string;
  };
  payload: Record<string, any>;
}

export async function fetchCredentialById(id: string): Promise<ApiCredentialDetail> {
  const data = await apiFetch<ApiCredentialDetail>(`/credentials/${id}`);
  return data;
}

export async function revokeCredential(id: string, reason: string): Promise<void> {
  await apiFetch(`/credentials/${id}/revoke`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export async function createProfessor(payload: Record<string, any>): Promise<any> {
  return await apiFetch('/professors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createStudent(payload: Record<string, any>): Promise<any> {
  return await apiFetch('/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createCredential(payload: Record<string, any>): Promise<any> {
  return await apiFetch('/credentials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: Record<string, any>): Promise<any> {
  return await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyOtp(payload: { email: string; code: string }): Promise<any> {
  return await apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestOtp(email: string): Promise<any> {
  return await apiFetch('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}