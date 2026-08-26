import type {
  CreateFinanceOtherIncomeInput,
  CreateFinanceOutflowInput,
  CreateFinancePaymentInput,
  CreateGradeInput,
  CreateStudentInput,
  CreateSubjectInput,
  CreateTeacherInput,
  ChurchLocation,
  UpdateGradeInput,
  UpdateStudentInput,
  UpdateSubjectInput,
  UpdateTeacherInput,
} from "@gestion-notas/domain";
import type {
  CreateUserPayload,
  PublicUser,
  UpdateUserPayload,
} from "@gestion-notas/application";
import { contextBridge, ipcRenderer } from "electron";

export type { CreateUserPayload, UpdateUserPayload };

const api = {
  auth: {
    login: (email: string, password: string) =>
      ipcRenderer.invoke("auth:login", email, password) as Promise<PublicUser>,
  },
  users: {
    list: () => ipcRenderer.invoke("users:list") as Promise<PublicUser[]>,
    create: (input: CreateUserPayload) =>
      ipcRenderer.invoke("users:create", input) as Promise<PublicUser>,
    update: (id: string, input: UpdateUserPayload) =>
      ipcRenderer.invoke("users:update", id, input) as Promise<PublicUser>,
  },
  students: {
    list: () => ipcRenderer.invoke("students:list"),
    create: (input: CreateStudentInput) => ipcRenderer.invoke("students:create", input),
    update: (id: string, input: UpdateStudentInput) =>
      ipcRenderer.invoke("students:update", id, input),
    delete: (id: string) => ipcRenderer.invoke("students:delete", id),
    retakeEnrollment: (studentId: string, subjectId: string, church: ChurchLocation) =>
      ipcRenderer.invoke("students:retakeEnrollment", studentId, subjectId, church),
  },
  teachers: {
    list: () => ipcRenderer.invoke("teachers:list"),
    create: (input: CreateTeacherInput) => ipcRenderer.invoke("teachers:create", input),
    update: (id: string, input: UpdateTeacherInput) =>
      ipcRenderer.invoke("teachers:update", id, input),
    delete: (id: string) => ipcRenderer.invoke("teachers:delete", id),
  },
  subjects: {
    list: () => ipcRenderer.invoke("subjects:list"),
    create: (input: CreateSubjectInput) => ipcRenderer.invoke("subjects:create", input),
    update: (id: string, input: UpdateSubjectInput) =>
      ipcRenderer.invoke("subjects:update", id, input),
    delete: (id: string) => ipcRenderer.invoke("subjects:delete", id),
  },
  grades: {
    list: () => ipcRenderer.invoke("grades:list"),
    listAll: () => ipcRenderer.invoke("grades:listAll"),
    create: (input: CreateGradeInput) => ipcRenderer.invoke("grades:create", input),
    update: (id: string, input: UpdateGradeInput) =>
      ipcRenderer.invoke("grades:update", id, input),
  },
  payments: {
    list: () => ipcRenderer.invoke("payments:list"),
    create: (input: CreateFinancePaymentInput) => ipcRenderer.invoke("payments:create", input),
    void: (id: string) => ipcRenderer.invoke("payments:void", id),
  },
  outflows: {
    list: () => ipcRenderer.invoke("outflows:list"),
    create: (input: CreateFinanceOutflowInput) => ipcRenderer.invoke("outflows:create", input),
    void: (id: string) => ipcRenderer.invoke("outflows:void", id),
  },
  incomes: {
    list: () => ipcRenderer.invoke("incomes:list"),
    create: (input: CreateFinanceOtherIncomeInput) => ipcRenderer.invoke("incomes:create", input),
    void: (id: string) => ipcRenderer.invoke("incomes:void", id),
  },
  export: {
    saveExcel: (data: Uint8Array, defaultFileName: string) =>
      ipcRenderer.invoke("export:saveExcel", data, defaultFileName) as Promise<
        { saved: true; filePath: string } | { saved: false }
      >,
  },
};

contextBridge.exposeInMainWorld("api", api);

export type DesktopApi = typeof api;
