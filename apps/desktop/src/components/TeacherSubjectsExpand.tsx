import type { Subject, Teacher } from "@gestion-notas/domain";
import { SubjectBadges } from "./SubjectBadges";

interface TeacherSubjectsExpandProps {
  teacher: Teacher;
  subjects: Subject[];
}

export function TeacherSubjectsExpand({ teacher, subjects }: TeacherSubjectsExpandProps) {
  const subjectIds = teacher.qualifiedSubjectIds ?? [];

  if (subjectIds.length === 0) {
    return <p className="student-expand-empty">Sin materias asignadas.</p>;
  }

  return (
    <div className="student-expand">
      <SubjectBadges subjectIds={subjectIds} subjects={subjects} />
    </div>
  );
}
