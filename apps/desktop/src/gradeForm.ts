import type { ChurchLocation, Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import { isPassingGrade } from "@gestion-notas/domain";

export const emptyGradeForm = {
  studentId: "",
  enrollmentKey: "",
  finalGrade: "",
};

export type GradeFormState = typeof emptyGradeForm;

export function enrollmentKey(subjectId: string, church: ChurchLocation): string {
  return `${subjectId}|${church}`;
}

export function parseEnrollmentKey(key: string): { subjectId: string; church: ChurchLocation } {
  const separatorIndex = key.indexOf("|");
  if (separatorIndex === -1) {
    throw new Error("Inscripción inválida.");
  }

  return {
    subjectId: key.slice(0, separatorIndex),
    church: key.slice(separatorIndex + 1) as ChurchLocation,
  };
}

export function gradeFormFromRecord(grade: Grade): GradeFormState {
  return {
    studentId: grade.studentId,
    enrollmentKey: enrollmentKey(grade.subjectId, grade.church),
    finalGrade: String(grade.finalGrade),
  };
}

export function gradeFormToPayload(form: GradeFormState) {
  if (!form.studentId) {
    throw new Error("Seleccione un estudiante.");
  }
  if (!form.enrollmentKey) {
    throw new Error("Seleccione la materia e iglesia.");
  }

  const finalGrade = Number(form.finalGrade);
  if (!Number.isFinite(finalGrade)) {
    throw new Error("Ingrese una nota final válida.");
  }

  const { subjectId, church } = parseEnrollmentKey(form.enrollmentKey);

  return {
    studentId: form.studentId,
    subjectId,
    church,
    finalGrade,
  };
}

export function getTeacherForEnrollment(
  enrollment: { teacherId?: string },
  teachers: Teacher[],
): Teacher | undefined {
  if (!enrollment.teacherId) return undefined;
  return teachers.find((teacher) => String(teacher.id) === String(enrollment.teacherId));
}

export function resolveTeacherForEnrollment(
  enrollment: { teacherId?: string; church: ChurchLocation } | undefined,
  subject: Subject | undefined,
  church: ChurchLocation,
  teachers: Teacher[],
): Teacher | undefined {
  const teacherFromEnrollment = enrollment
    ? getTeacherForEnrollment(enrollment, teachers)
    : undefined;
  if (teacherFromEnrollment) return teacherFromEnrollment;

  return getTeacherForGrade(subject, church, teachers);
}

export function getTeacherForGrade(
  subject: Subject | undefined,
  church: ChurchLocation,
  teachers: Teacher[],
): Teacher | undefined {
  const teacherId = subject?.offerings?.find((offering) => offering.church === church)?.teacherId;
  if (teacherId == null || teacherId === "") return undefined;
  return teachers.find((teacher) => String(teacher.id) === String(teacherId));
}

export function formatGradeStatus(finalGrade: number): string {
  return isPassingGrade(finalGrade) ? "Aprobado" : "Reprobado";
}

export function studentLabel(student: Student): string {
  return `${student.firstName} ${student.lastName} (${student.ci})`;
}

export interface EnrollmentOption {
  key: string;
  label: string;
  subjectId: string;
  church: ChurchLocation;
}

export function getEnrollmentOptionsForStudent(
  student: Student | undefined,
  subjects: Subject[],
): EnrollmentOption[] {
  if (!student) return [];

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

  return (student.enrollments ?? [])
    .map((enrollment) => {
      const subject = subjectMap.get(enrollment.subjectId);
      if (!subject) return null;

      return {
        key: enrollmentKey(enrollment.subjectId, enrollment.church),
        label: `${subject.name} — ${enrollment.church}`,
        subjectId: enrollment.subjectId,
        church: enrollment.church,
      };
    })
    .filter((option): option is EnrollmentOption => option !== null)
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
