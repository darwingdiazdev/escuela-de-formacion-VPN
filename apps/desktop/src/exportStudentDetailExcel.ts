import type { Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import * as XLSX from "xlsx";
import { buildStudentCourseSummaries, type CourseStatus } from "./studentDetail";

function formatCourseStatus(status: CourseStatus): string {
  switch (status) {
    case "approved":
      return "Aprobada";
    case "failed":
      return "No aprobada";
    case "pending":
      return "En curso";
  }
}

function sanitizeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildStudentDetailWorkbook(
  student: Student,
  subjects: Subject[],
  grades: Grade[],
  teachers: Teacher[],
): ArrayBuffer {
  const summaries = buildStudentCourseSummaries(student, subjects, grades, teachers);

  const maxAttempts = summaries.reduce((max, item) => {
    const attempts = item.gradeHistory.length + (item.grade ? 1 : 0);
    return Math.max(max, attempts);
  }, 0);

  const noteHeaders =
    maxAttempts <= 1
      ? ["Nota"]
      : Array.from({ length: maxAttempts }, (_, index) => `Nota intento ${index + 1}`);

  const headers = ["Materia", "Código", "Iglesia", "Estado", ...noteHeaders];

  const rows: (string | number)[][] = [
    [`Estudiante: ${student.firstName} ${student.lastName}`, `CI: ${student.ci}`],
    [],
    headers,
  ];

  if (summaries.length === 0) {
    rows.push(["Sin materias asignadas", "", "", "", ...noteHeaders.map(() => "")]);
  } else {
    for (const item of summaries) {
      const allAttempts = [...item.gradeHistory, ...(item.grade ? [item.grade] : [])].sort(
        (a, b) => a.attemptNumber - b.attemptNumber,
      );

      const notes = noteHeaders.map((_, index) => {
        const grade = allAttempts[index];
        return grade ? grade.finalGrade : "";
      });

      rows.push([
        item.subject?.name ?? "—",
        item.subject?.code ?? "—",
        item.enrollment.church,
        formatCourseStatus(item.status),
        ...notes,
      ]);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 32 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    ...noteHeaders.map(() => ({ wch: 16 })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Materias");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function defaultStudentDetailExportFileName(student: Student): string {
  const date = new Date().toISOString().slice(0, 10);
  const name = sanitizeFilePart(`${student.lastName}-${student.firstName}`) || "estudiante";
  const ci = sanitizeFilePart(student.ci) || "sin-ci";
  return `detalle-${name}-${ci}-${date}.xlsx`;
}
