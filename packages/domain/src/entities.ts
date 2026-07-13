export type UserRole = "admin" | "teacher" | "student";

export type MaritalStatus =
  | "soltero"
  | "casado"
  | "divorciado"
  | "viudo"
  | "union_libre";

export type Gender = "M" | "F";

export type ChurchLocation = "VPN MERIDA" | "VPN TABAY";

export const CHURCH_LOCATIONS: ChurchLocation[] = ["VPN MERIDA", "VPN TABAY"];

export const PASSING_GRADE = 14;
export const MAX_GRADE = 20;

export function isPassingGrade(finalGrade: number): boolean {
  return finalGrade >= PASSING_GRADE;
}

export interface SubjectChurchOffering {
  church: ChurchLocation;
  teacherId?: string;
}

export type PaymentStatus = "paid" | "debt";

export interface StudentSubjectEnrollment {
  subjectId: string;
  church: ChurchLocation;
  paymentStatus: PaymentStatus;
  teacherId?: string;
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export interface Student extends BaseEntity {
  firstName: string;
  lastName: string;
  ci: string;
  gender: Gender;
  birthDate: Date;
  birthPlace: string;
  maritalStatus: MaritalStatus;
  address: string;
  phone: string;
  email: string;
  conversionDate: string;
  ministry: string;
  educationLevel: string;
  profession: string;
  occupation: string;
  workplace: string;
  enrollments: StudentSubjectEnrollment[];
}

export interface Teacher extends BaseEntity {
  firstName: string;
  lastName: string;
  ci: string;
  phone: string;
  email: string;
  educationLevel: string;
  qualifiedSubjectIds: string[];
}

export interface Subject extends BaseEntity {
  code: string;
  name: string;
  pensum: string;
  priceUsd: number;
  offerings: SubjectChurchOffering[];
  isActive: boolean;
}

export interface Grade extends BaseEntity {
  studentId: string;
  subjectId: string;
  church: ChurchLocation;
  finalGrade: number;
  attemptNumber: number;
  isCurrent: boolean;
}

export type CreateUserInput = Pick<User, "email" | "passwordHash" | "firstName" | "lastName" | "role">;
export type UpdateUserInput = Partial<Pick<User, "email" | "firstName" | "lastName" | "role" | "isActive">>;

export type CreateStudentInput = Omit<Student, "id" | "createdAt" | "updatedAt">;
export type UpdateStudentInput = Partial<CreateStudentInput>;

export type CreateTeacherInput = Omit<Teacher, "id" | "createdAt" | "updatedAt">;
export type UpdateTeacherInput = Partial<CreateTeacherInput>;

export type CreateSubjectInput = Omit<Subject, "id" | "createdAt" | "updatedAt" | "isActive"> & {
  isActive?: boolean;
};
export type UpdateSubjectInput = Partial<CreateSubjectInput> & {
  isActive?: boolean;
};

export type CreateGradeInput = Omit<
  Grade,
  "id" | "createdAt" | "updatedAt" | "attemptNumber" | "isCurrent"
> & {
  attemptNumber?: number;
  isCurrent?: boolean;
};
export type UpdateGradeInput = Partial<CreateGradeInput>;

export interface UserWithProfile extends User {
  student?: Student;
  teacher?: Teacher;
}
