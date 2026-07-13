import type { ChurchLocation, Gender, MaritalStatus, PaymentStatus, Student, Subject } from "@gestion-notas/domain";

export const MARITAL_STATUS_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "soltero", label: "Soltero/a" },
  { value: "casado", label: "Casado/a" },
  { value: "divorciado", label: "Divorciado/a" },
  { value: "viudo", label: "Viudo/a" },
  { value: "union_libre", label: "Unión libre" },
];

export interface StudentEnrollmentFormState {
  subjectId: string;
  church: ChurchLocation;
  paymentStatus: PaymentStatus;
}

export interface StudentFormState {
  firstName: string;
  lastName: string;
  ci: string;
  gender: Gender;
  birthDate: string;
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
  enrollments: StudentEnrollmentFormState[];
}

export interface EnrollmentOption {
  subjectId: string;
  church: ChurchLocation;
  subjectName: string;
  subjectCode: string;
}

export const emptyStudentForm: StudentFormState = {
  firstName: "",
  lastName: "",
  ci: "",
  gender: "M",
  birthDate: "",
  birthPlace: "",
  maritalStatus: "soltero",
  address: "",
  phone: "",
  email: "",
  conversionDate: "",
  ministry: "",
  educationLevel: "",
  profession: "",
  occupation: "",
  workplace: "",
  enrollments: [],
};

export function studentFormFromRecord(student: Student): StudentFormState {
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    ci: student.ci,
    gender: student.gender,
    birthDate: new Date(student.birthDate).toISOString().slice(0, 10),
    birthPlace: student.birthPlace,
    maritalStatus: student.maritalStatus,
    address: student.address,
    phone: student.phone,
    email: student.email,
    conversionDate: student.conversionDate,
    ministry: student.ministry,
    educationLevel: student.educationLevel,
    profession: student.profession,
    occupation: student.occupation,
    workplace: student.workplace,
    enrollments: (student.enrollments ?? []).map((enrollment) => ({
      subjectId: enrollment.subjectId,
      church: enrollment.church,
      paymentStatus: enrollment.paymentStatus ?? "debt",
    })),
  };
}

export function studentFormToPayload(form: StudentFormState) {
  if (!form.birthDate) {
    throw new Error("La fecha de nacimiento es obligatoria.");
  }

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    ci: form.ci.trim(),
    gender: form.gender,
    birthDate: new Date(form.birthDate),
    birthPlace: form.birthPlace.trim(),
    maritalStatus: form.maritalStatus,
    address: form.address.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    conversionDate: form.conversionDate.trim(),
    ministry: form.ministry.trim(),
    educationLevel: form.educationLevel.trim(),
    profession: form.profession.trim(),
    occupation: form.occupation.trim(),
    workplace: form.workplace.trim(),
    enrollments: form.enrollments,
  };
}

export function getEnrollmentOptions(subjects: Subject[]): EnrollmentOption[] {
  const options: EnrollmentOption[] = [];

  for (const subject of subjects) {
    if (!subject.isActive) continue;

    for (const offering of subject.offerings ?? []) {
      options.push({
        subjectId: subject.id,
        church: offering.church,
        subjectName: subject.name,
        subjectCode: subject.code,
      });
    }
  }

  return options.sort((a, b) => {
    const byName = a.subjectName.localeCompare(b.subjectName, "es");
    if (byName !== 0) return byName;
    return a.church.localeCompare(b.church, "es");
  });
}

export function isEnrollmentSelected(
  enrollments: StudentEnrollmentFormState[],
  subjectId: string,
  church: ChurchLocation,
): boolean {
  return enrollments.some(
    (enrollment) => enrollment.subjectId === subjectId && enrollment.church === church,
  );
}

export function toggleEnrollment(
  enrollments: StudentEnrollmentFormState[],
  subjectId: string,
  church: ChurchLocation,
): StudentEnrollmentFormState[] {
  if (isEnrollmentSelected(enrollments, subjectId, church)) {
    return enrollments.filter(
      (enrollment) => !(enrollment.subjectId === subjectId && enrollment.church === church),
    );
  }

  return [...enrollments, { subjectId, church, paymentStatus: "debt" }];
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

export function formatGender(gender: Gender): string {
  return GENDER_OPTIONS.find((option) => option.value === gender)?.label ?? gender;
}

export function formatBirthDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-VE");
}
