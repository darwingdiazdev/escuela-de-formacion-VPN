import type { Teacher } from "@gestion-notas/domain";

export interface TeacherFormState {
  firstName: string;
  lastName: string;
  ci: string;
  phone: string;
  email: string;
  educationLevel: string;
  qualifiedSubjectIds: string[];
}

export const emptyTeacherForm: TeacherFormState = {
  firstName: "",
  lastName: "",
  ci: "",
  phone: "",
  email: "",
  educationLevel: "",
  qualifiedSubjectIds: [],
};

export function teacherFormFromRecord(teacher: Teacher): TeacherFormState {
  return {
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    ci: teacher.ci,
    phone: teacher.phone,
    email: teacher.email,
    educationLevel: teacher.educationLevel,
    qualifiedSubjectIds: teacher.qualifiedSubjectIds ?? [],
  };
}

export function teacherFormToPayload(form: TeacherFormState) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    ci: form.ci.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    educationLevel: form.educationLevel.trim(),
    qualifiedSubjectIds: form.qualifiedSubjectIds,
  };
}
