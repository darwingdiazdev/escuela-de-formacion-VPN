import type { Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import { isPassingGrade } from "@gestion-notas/domain";
import { useMemo } from "react";
import { formatGradeStatus, resolveTeacherForEnrollment } from "../gradeForm";
import { EditIcon, IconButton } from "./IconButton";

interface StudentGradesExpandProps {
  grades: Grade[];
  student: Student | undefined;
  subjects: Subject[];
  teachers: Teacher[];
  onEdit: (grade: Grade) => void;
}

export function StudentGradesExpand({
  grades,
  student,
  subjects,
  teachers,
  onEdit,
}: StudentGradesExpandProps) {
  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [String(subject.id), subject])),
    [subjects],
  );
  const sortedGrades = useMemo(
    () =>
      [...grades].sort((a, b) => {
        const nameA = subjectMap.get(String(a.subjectId))?.name ?? "";
        const nameB = subjectMap.get(String(b.subjectId))?.name ?? "";
        const byName = nameA.localeCompare(nameB, "es");
        if (byName !== 0) return byName;
        return a.church.localeCompare(b.church, "es");
      }),
    [grades, subjectMap],
  );

  if (grades.length === 0) {
    return <p className="student-expand-empty">Sin notas registradas.</p>;
  }

  return (
    <div className="student-expand-table-wrap">
      <table className="student-expand-table">
        <thead>
          <tr>
            <th>Materia</th>
            <th>Iglesia</th>
            <th>Profesor</th>
            <th>Nota final</th>
            <th>Resultado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedGrades.map((grade) => {
            const subject = subjectMap.get(String(grade.subjectId));
            const enrollment = student?.enrollments?.find(
              (item) =>
                String(item.subjectId) === String(grade.subjectId) &&
                item.church === grade.church,
            );
            const teacher = resolveTeacherForEnrollment(
              enrollment,
              subject,
              grade.church,
              teachers,
            );
            const passed = isPassingGrade(grade.finalGrade);

            return (
              <tr key={grade.id} className={passed ? "grade-row-pass" : "grade-row-fail"}>
                <td>{subject?.name ?? "—"}</td>
                <td>
                  <span className="tag-badge">{grade.church}</span>
                </td>
                <td>
                  {teacher ? `${teacher.firstName} ${teacher.lastName}` : "Sin asignar"}
                </td>
                <td className="grade-score">{grade.finalGrade}</td>
                <td>
                  <span className={`grade-result${passed ? " is-pass" : " is-fail"}`}>
                    {formatGradeStatus(grade.finalGrade)}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <IconButton label="Editar" onClick={() => onEdit(grade)}>
                      <EditIcon />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
