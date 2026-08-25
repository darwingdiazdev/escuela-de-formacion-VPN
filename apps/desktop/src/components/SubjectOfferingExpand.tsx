import type { Subject, Teacher } from "@gestion-notas/domain";
import { normalizeTeacherId } from "../subjectForm";

interface SubjectOfferingExpandProps {
  subject: Subject;
  teachers: Teacher[];
}

export function SubjectOfferingExpand({ subject, teachers }: SubjectOfferingExpandProps) {
  const offerings = subject.offerings ?? [];

  function teacherLabel(teacherId: string | undefined) {
    const id = normalizeTeacherId(teacherId);
    if (!id) return "Sin asignar";
    const teacher = teachers.find((item) => String(item.id) === id);
    if (!teacher) return "Sin asignar";
    return `${teacher.firstName} ${teacher.lastName}`;
  }

  if (offerings.length === 0) {
    return <p className="student-expand-empty">Sin iglesias ni profesores asignados.</p>;
  }

  return (
    <div className="student-expand">
      <div className="badge-list enrollment-badges-compact">
        {offerings.map((offering) => (
          <span key={offering.church} className="enrollment-badge" title={offering.church}>
            <span className="enrollment-badge-subject">{teacherLabel(offering.teacherId)}</span>
            <span className="enrollment-badge-church">{offering.church}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
