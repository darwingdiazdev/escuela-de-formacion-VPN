import type {
  Grade,
  PaymentStatus,
  Student,
  StudentSubjectEnrollment,
  Subject,
  Teacher,
} from "@gestion-notas/domain";
import { isPassingGrade } from "@gestion-notas/domain";
import { resolveTeacherForEnrollment } from "./gradeForm";
import { PENSUM_OPTIONS } from "./subjectForm";

export type CourseStatus = "approved" | "failed" | "pending";

export interface StudentCourseSummary {
  enrollment: StudentSubjectEnrollment;
  subject?: Subject;
  grade?: Grade;
  gradeHistory: Grade[];
  teacher?: Teacher;
  status: CourseStatus;
}

export interface PensumProgress {
  pensum: string;
  totalSubjects: number;
  approvedSubjects: number;
  percentage: number;
}

export function formatPaymentStatus(status: PaymentStatus): string {
  return status === "paid" ? "Pagado" : "Deuda";
}

export function countDebts(enrollments: StudentSubjectEnrollment[]): number {
  return enrollments.filter((enrollment) => enrollment.paymentStatus === "debt").length;
}

export function buildStudentCourseSummaries(
  student: Student,
  subjects: Subject[],
  grades: Grade[],
  teachers: Teacher[],
): StudentCourseSummary[] {
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));
  const studentGrades = grades.filter(
    (grade) => String(grade.studentId) === String(student.id),
  );

  const gradesByEnrollment = new Map<string, Grade[]>();
  for (const grade of studentGrades) {
    const key = `${String(grade.subjectId)}|${grade.church}`;
    const list = gradesByEnrollment.get(key) ?? [];
    list.push(grade);
    gradesByEnrollment.set(key, list);
  }

  return (student.enrollments ?? []).map((enrollment) => {
    const key = `${String(enrollment.subjectId)}|${enrollment.church}`;
    const enrollmentGrades = (gradesByEnrollment.get(key) ?? []).sort(
      (a, b) => a.attemptNumber - b.attemptNumber,
    );
    const currentGrade = enrollmentGrades.find((grade) => grade.isCurrent);
    const gradeHistory = enrollmentGrades.filter((grade) => !grade.isCurrent);
    const subject = subjectMap.get(String(enrollment.subjectId));
    const teacher = resolveTeacherForEnrollment(
      enrollment,
      subject,
      enrollment.church,
      teachers,
    );

    let status: CourseStatus = "pending";
    if (currentGrade) {
      status = isPassingGrade(currentGrade.finalGrade) ? "approved" : "failed";
    }

    return {
      enrollment,
      subject,
      grade: currentGrade,
      gradeHistory,
      teacher,
      status,
    };
  });
}

export function groupCourseSummaries(summaries: StudentCourseSummary[]) {
  return {
    approved: summaries.filter((item) => item.status === "approved"),
    failed: summaries.filter((item) => item.status === "failed"),
    pending: summaries.filter((item) => item.status === "pending"),
  };
}

export function computePensumProgress(
  student: Student,
  subjects: Subject[],
  grades: Grade[],
  teachers: Teacher[],
): PensumProgress[] {
  const summaries = buildStudentCourseSummaries(student, subjects, grades, teachers);
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));

  const catalogByPensum = new Map<string, Set<string>>();
  for (const subject of subjects) {
    const codes = catalogByPensum.get(subject.pensum) ?? new Set<string>();
    codes.add(subject.code);
    catalogByPensum.set(subject.pensum, codes);
  }

  const enrolledByPensum = new Map<string, Set<string>>();
  for (const enrollment of student.enrollments ?? []) {
    const subject = subjectMap.get(String(enrollment.subjectId));
    if (!subject) continue;
    const codes = enrolledByPensum.get(subject.pensum) ?? new Set<string>();
    codes.add(subject.code);
    enrolledByPensum.set(subject.pensum, codes);
  }

  const approvedByPensum = new Map<string, Set<string>>();
  for (const item of summaries) {
    if (item.status !== "approved" || !item.subject) continue;
    const codes = approvedByPensum.get(item.subject.pensum) ?? new Set<string>();
    codes.add(item.subject.code);
    approvedByPensum.set(item.subject.pensum, codes);
  }

  return PENSUM_OPTIONS.map((pensum) => {
    const totalSubjects = catalogByPensum.get(pensum)?.size ?? 0;
    const approvedSubjects = approvedByPensum.get(pensum)?.size ?? 0;
    const percentage =
      totalSubjects > 0 ? Math.round((approvedSubjects / totalSubjects) * 100) : 0;

    return {
      pensum,
      totalSubjects,
      approvedSubjects,
      percentage,
    };
  })
    .filter((item) => item.totalSubjects > 0)
    .filter(
      (item) =>
        item.pensum === "Pensum 2" || (enrolledByPensum.get(item.pensum)?.size ?? 0) > 0,
    );
}

export function formatPensumProgress(item: PensumProgress): string {
  return `${item.percentage}% aprobado de ${item.pensum} (${item.approvedSubjects}/${item.totalSubjects})`;
}
