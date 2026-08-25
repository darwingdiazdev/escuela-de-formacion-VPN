import type { PublicUser } from "@gestion-notas/application";
import type { UserRole } from "@gestion-notas/domain";

export interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  teacher: "Profesor",
  student: "Estudiante",
};

export const USER_ROLES: UserRole[] = ["admin", "teacher", "student"];

export const emptyUserForm: UserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "teacher",
  isActive: true,
};

export function userFormFromRecord(user: PublicUser): UserFormState {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: "",
    role: user.role,
    isActive: user.isActive,
  };
}

export function userFormToCreatePayload(form: UserFormState) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    password: form.password,
    role: form.role,
  };
}

export function userFormToUpdatePayload(form: UserFormState) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    role: form.role,
    isActive: form.isActive,
    ...(form.password.trim() ? { password: form.password } : {}),
  };
}
