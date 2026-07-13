import type { PublicUser } from "@gestion-notas/application";
import type {
  ChurchLocation,
  CreateGradeInput,
  CreateStudentInput,
  CreateSubjectInput,
  CreateTeacherInput,
  PaymentStatus,
  UpdateGradeInput,
  UpdateStudentInput,
  UpdateSubjectInput,
  UpdateTeacherInput,
  UpdateUserInput,
  UserRole,
} from "@gestion-notas/domain";

const TOKEN_KEY = "gestion-notas-token";

interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

function apiBase(): string {
  const configured = import.meta.env.VITE_API_URL;
  return typeof configured === "string" ? configured.replace(/\/$/, "") : "";
}

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function installHttpApi() {
  const api = {
    auth: {
      login: async (email: string, password: string) => {
        const result = await request<{ user: PublicUser; token: string }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        sessionStorage.setItem(TOKEN_KEY, result.token);
        return result.user;
      },
    },
    users: {
      list: () => request("/users"),
      create: (input: CreateUserPayload) =>
        request("/users", { method: "POST", body: JSON.stringify(input) }),
      update: (id: string, input: UpdateUserInput) =>
        request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    },
    students: {
      list: () => request("/students"),
      create: (input: CreateStudentInput) =>
        request("/students", { method: "POST", body: JSON.stringify(input) }),
      update: (id: string, input: UpdateStudentInput) =>
        request(`/students/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
      setEnrollmentPayment: (
        studentId: string,
        subjectId: string,
        church: ChurchLocation,
        paymentStatus: PaymentStatus,
      ) =>
        request(`/students/${studentId}/enrollment-payment`, {
          method: "POST",
          body: JSON.stringify({ subjectId, church, paymentStatus }),
        }),
      retakeEnrollment: (studentId: string, subjectId: string, church: ChurchLocation) =>
        request(`/students/${studentId}/retake-enrollment`, {
          method: "POST",
          body: JSON.stringify({ subjectId, church }),
        }),
    },
    teachers: {
      list: () => request("/teachers"),
      create: (input: CreateTeacherInput) =>
        request("/teachers", { method: "POST", body: JSON.stringify(input) }),
      update: (id: string, input: UpdateTeacherInput) =>
        request(`/teachers/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    },
    subjects: {
      list: () => request("/subjects"),
      create: (input: CreateSubjectInput) =>
        request("/subjects", { method: "POST", body: JSON.stringify(input) }),
      update: (id: string, input: UpdateSubjectInput) =>
        request(`/subjects/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    },
    grades: {
      list: () => request("/grades"),
      listAll: () => request("/grades/all"),
      create: (input: CreateGradeInput) =>
        request("/grades", { method: "POST", body: JSON.stringify(input) }),
      update: (id: string, input: UpdateGradeInput) =>
        request(`/grades/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    },
    export: {
      saveExcel: async (data: Uint8Array, defaultFileName: string) => {
        const blob = new Blob([data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = defaultFileName;
        anchor.click();
        URL.revokeObjectURL(url);
        return { saved: true as const, filePath: defaultFileName };
      },
    },
  };

  window.api = api;
}
