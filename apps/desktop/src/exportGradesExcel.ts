import type { Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import * as XLSX from "xlsx";
import { formatGradeStatus, resolveTeacherForEnrollment } from "./gradeForm";

export interface GradeExportRow {
  Estudiante: string;
  CI: string;
  Materia: string;
  Código: string;
  Pensum: string;
  Iglesia: string;
  Profesor: string;
  Intento: number;
  Vigente: string;
  "Nota final": number;
  Resultado: string;
}

export function buildGradesExportRows(
  grades: Grade[],
  students: Student[],
  subjects: Subject[],
  teachers: Teacher[],
): GradeExportRow[] {
  const studentMap = new Map(students.map((student) => [String(student.id), student]));
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));

  const rows = grades.map((grade) => {
    const student = studentMap.get(String(grade.studentId));
    const subject = subjectMap.get(String(grade.subjectId));
    const enrollment = student?.enrollments?.find(
      (item) =>
        String(item.subjectId) === String(grade.subjectId) && item.church === grade.church,
    );
    const teacher = resolveTeacherForEnrollment(
      enrollment,
      subject,
      grade.church,
      teachers,
    );

    return {
      Estudiante: student ? `${student.firstName} ${student.lastName}` : "—",
      CI: student?.ci ?? "—",
      Materia: subject?.name ?? "—",
      Código: subject?.code ?? "—",
      Pensum: subject?.pensum ?? "—",
      Iglesia: grade.church,
      Profesor: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Sin asignar",
      Intento: grade.attemptNumber,
      Vigente: grade.isCurrent ? "Sí" : "No (historial)",
      "Nota final": grade.finalGrade,
      Resultado: formatGradeStatus(grade.finalGrade),
    };
  });

  return rows.sort((a, b) => {
    const byStudent = a.Estudiante.localeCompare(b.Estudiante, "es");
    if (byStudent !== 0) return byStudent;
    const bySubject = a.Materia.localeCompare(b.Materia, "es");
    if (bySubject !== 0) return bySubject;
    return a.Intento - b.Intento;
  });
}

export function gradesToExcelBuffer(rows: GradeExportRow[]): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Notas");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function defaultGradesExportFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `notas-${date}.xlsx`;
}
