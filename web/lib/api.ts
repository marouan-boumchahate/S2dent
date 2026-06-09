const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ---- Token helpers ----
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
}

export function setTokens(access: string, refresh: string) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userRole');
}

function getHttpFriendlyMessage(status: number, serverMsg?: string): string {
    if (serverMsg && serverMsg.trim() !== '' && serverMsg.toLowerCase() !== 'unknown error') {
        return serverMsg;
    }

    switch (status) {
        case 400:
            return "The request was invalid. Please check the information you entered.";
        case 401:
            return "Your session has expired. Please log in again.";
        case 403:
            return "You do not have permission to perform this action.";
        case 404:
            return "The requested information or resource could not be found in the system. Please verify details and try again.";
        case 422:
            return "The details you provided are invalid or already exist in the system. Please check your information and try again.";
        default:
            if (status >= 500) {
                return "Something went wrong on the server side. Our system checks are running; please try again shortly.";
            }
            return "An unexpected server communication error occurred. Please try again.";
    }
}

// ---- Core fetch wrapper (The Interceptor) ----
export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    let token = getAccessToken();

    // 1. Make the initial request
    let res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    // 2. Intercept 401 Unauthorized errors
    if (res.status === 401) {
        const refresh = getRefreshToken();
        
        // If we don't have a refresh token, log them out
        if (!refresh) {
            clearTokens();
            if (typeof window !== 'undefined') window.location.href = '/login';
            throw new Error('Session expired. Please log in again.');
        }

        try {
            // 3. Attempt to silently refresh the token
            const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refresh }),
            });

            const refreshData = await refreshRes.json();

            // 4. If refresh fails, kill the session
            if (!refreshRes.ok || !refreshData.success) {
                clearTokens();
                if (typeof window !== 'undefined') window.location.href = '/login';
                throw new Error('Session completely expired.');
            }

            // 5. Save the new tokens!
            token = refreshData.data.access_token;
            setTokens(refreshData.data.access_token, refreshData.data.refresh_token);

            // 6. Retry the exact same request with the new access token
            res = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    ...options.headers,
                },
            });
            
        } catch (error) {
            clearTokens();
            if (typeof window !== 'undefined') window.location.href = '/login';
            throw error;
        }
    }

    const json = await res.json();

    if (!res.ok || !json.success) {
        console.log(`API error on ${path}:`, json);
        if (res.status === 403) {
            if (
                typeof window !== 'undefined' && 
                window.location.pathname !== '/profile' && 
                window.location.pathname !== '/login' &&
                window.location.pathname !== '/verify' &&
                !window.location.pathname.startsWith('/enrolled-students') &&
                !window.location.pathname.startsWith('/academic-credentials')
            ) {
                window.location.href = '/profile';
            }
        }
        throw new Error(getHttpFriendlyMessage(res.status, json?.message));
    }

    // The API Reference always wraps the actual data in a "data" object
    return json.data as T;
}

// ---- Departments ----
export interface ApiDepartment {
    id: string;
    code: string;
    name: string;
    faculty: string;
    total_years: number;
    description: string;
    is_active: boolean;
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

// ---- Students ----
export interface ApiStudent {
    [key: string]: any; 
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
    [key: string]: any; 
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
    wallet_address: string;
    identity: {
        student_id_hash: string;
        national_id_hash: string;
        public_key: string;
        signature: string;
        full_name: string;
        nationality: string;
        academy_name: string;
        department: string;
        country: string;
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
    // Ensure wallet_address is populated from the path if not in response
    if (!data.wallet_address) data.wallet_address = walletAddress;
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
  return await apiFetch<ApiCredentialDetail>(`/credentials/${id}`);
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

export async function requestOtp(email: string): Promise<any> {
  return await apiFetch('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ---- Identity issuance ----
export interface RequestIssuancePayload {
  email: string;
  otp: string;
  signature: string;
}

export interface RequestIssuanceResponse {
  wallet_address: string;
}

export async function requestIdentityIssuance(
  payload: RequestIssuancePayload,
): Promise<RequestIssuanceResponse> {
  const data = await apiFetch<RequestIssuanceResponse>(
    '/identity/students/request-issuance',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return data;
}

export async function fetchStudentByWallet(wallet: string): Promise<{ name: string; wallet_address: string } | null> {
  try {
    const data = await apiFetch<{ student: { name: string; wallet_address: string } }>(`/students/wallet/${wallet}`);
    return data.student;
  } catch {
    return null;
  }
}

// ---- Create User (Step 1 of professor creation) ----
export async function createUser(payload: {
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  national_id: string;
  email: string;
  phone?: string;
  photo_url?: string;
}): Promise<{ id: string }> {
  const data = await apiFetch<{ user: { id: string } }>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
}

// ---- Create Address (Step 2 of professor creation) ----
export async function createAddress(payload: {
  user_id: string;
  city: string;
  country: string;
  address_line1?: string;
  address_line2?: string;
  street?: string;
  district?: string;
  state?: string;
  postal_code?: string;
}): Promise<void> {
  await apiFetch('/addresses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---- Professor on-chain identity (by user_id) ----
export interface ApiProfessorIdentity {
  wallet_address: string;
  issue_identity_tx_hash?: string | null;
  identity: {
    employee_id_hash: string;
    national_id_hash: string;
    public_key: string;
    signature: string;
    full_name: string;
    rank: string;
    employment_type: string;
    hire_date: string;
  };
  status: {
    issued_at: string;
    issuer: string;
    is_revoked: boolean;
    revoked_at: string | null;
    revoker: string | null;
  };
}

export async function fetchProfessorIdentity(user_id: string): Promise<ApiProfessorIdentity | null> {
  try {
    return await apiFetch<ApiProfessorIdentity>(`/identity/professors/by-id/${user_id}`);
  } catch {
    return null; // no identity yet = pending
  }
}

// ---- Fetch Academy by ID ----
export async function fetchAcademyById(id: string): Promise<{ id: string; name: string; short_name: string }> {
  const data = await apiFetch<{ academy: { id: string; name: string; short_name: string } }>(`/academies/${id}`);
  return data.academy;
}

// ---- Fetch User by ID (full_name, photo_url, email, etc.) ----
export interface ApiUser {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  national_id: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
}

export async function fetchUserById(id: string): Promise<ApiUser | null> {
  try {
    const data = await apiFetch<{ user: ApiUser }>(`/users/${id}`);
    return data.user;
  } catch {
    return null;
  }
}
// ---- Identity schema fetch (Step 1 before issuing) ----
export interface IdentitySchema {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, { name: string; type: string }[]>;
  message: Record<string, string>;
}

export async function fetchProfessorIdentitySchema(walletAddress: string): Promise<IdentitySchema> {
  return await apiFetch<IdentitySchema>(
    `/identity/professors/pending/${walletAddress}/schema`
  );
}

export async function fetchStudentIdentitySchema(walletAddress: string): Promise<IdentitySchema> {
  return await apiFetch<IdentitySchema>(
    `/identity/students/pending/${walletAddress}/schema`
  );
}

// ---- Issue identity (Step 2 after signing schema) ----
export async function issueProfessorIdentity(
  professorAddress: string,
  signature: string,
): Promise<void> {
  await apiFetch('/identity/professors/issue', {
    method: 'POST',
    body: JSON.stringify({ professor_address: professorAddress, signature }),
  });
}

export async function issueStudentIdentity(
  studentAddress: string,
  signature: string,
): Promise<void> {
  await apiFetch('/identity/students/issue', {
    method: 'POST',
    body: JSON.stringify({ student_address: studentAddress, signature }),
  });
}
// ---- Waiting identities (pending issuance list) ----
export interface WaitingIdentity {
  wallet_address: string;
  role: 'student' | 'professor';
  full_name: string;
  email: string;
  status: 'waiting';
}

export async function fetchWaitingIdentities(): Promise<WaitingIdentity[]> {
  const data = await apiFetch<WaitingIdentity[]>('/identities/waiting');
  return data;
}
// ---- Settings / Authenticated Profile Fetchers ----

export interface ApiAcademyDetail {
  id: string;
  serial_number: string;
  email: string;
  name: string;
  short_name: string;
  type: string;
  description: string;
  website: string;
  logo_url: string;
  phone: string;
  legal_name: string;
  registration_number: string;
  tax_id: string;
  billing_email: string;
}

export interface ApiAcademyIdentity {
  wallet_address: string;
  identity: {
    academy_id_hash: string;
    public_key: string;
    name: string;
    short_name: string;
    academy_type: string;
  };
  proofs: {
    legal_name: string;
    registration_number: string;
    tax_id: string;
    billing_email: string;
  };
  cert: {
    fingerprint: string;
    certificate: string;
    chain: string;
    issued_at: string;
    expires_at: string;
  };
  status: {
    issued_at: string;
    issuer: string;
    is_revoked: boolean;
    revoked_at: string | null;
    revoker: string | null;
    revoke_reason: string | null;
  };
}

export async function fetchAcademyMe(): Promise<ApiAcademyDetail> {
  const data = await apiFetch<{ academy: ApiAcademyDetail }>('/academies/me');
  return data.academy;
}

export async function fetchAcademyIdentityMe(): Promise<ApiAcademyIdentity | null> {
  try {
    return await apiFetch<ApiAcademyIdentity>('/identity/academies/me');
  } catch {
    return null;
  }
}

export async function updateAcademyMe(payload: {
  description?: string;
  website?: string;
  logo_url?: string;
  phone?: string;
}): Promise<ApiAcademyDetail> {
  const data = await apiFetch<{ academy: ApiAcademyDetail }>('/academies/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.academy;
}

export async function fetchProfessorMe(): Promise<ApiProfessorDetail> {
  const data = await apiFetch<{ professor: ApiProfessorDetail }>('/professors/me');
  return data.professor;
}

export async function fetchUserMe(): Promise<ApiUser> {
  const data = await apiFetch<{ user: ApiUser }>('/users/me');
  return data.user;
}

export async function fetchProfessorIdentityMe(): Promise<ApiProfessorIdentity | null> {
  try {
    return await apiFetch<ApiProfessorIdentity>('/identity/professors/me');
  } catch {
    return null;
  }
}

export async function fetchMyDepartment(): Promise<ApiDepartment> {
  const data = await apiFetch<{ department: ApiDepartment }>('/departments/me');
  return data.department;
}

export async function updateUserMe(payload: { phone?: string; photo_url?: string }): Promise<ApiUser> {
  const data = await apiFetch<{ user: ApiUser }>('/users', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function uploadMedia(file: File): Promise<string> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${BASE_URL}/media/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Image upload failed');
  }
  return json.data.url;
}

export async function fetchAcademySummary(): Promise<any> {
  return await apiFetch<any>('/academies/summary');
}