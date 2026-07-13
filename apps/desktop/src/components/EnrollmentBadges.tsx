import type { StudentSubjectEnrollment, Subject } from "@gestion-notas/domain";

interface EnrollmentBadgesProps {
  enrollments: StudentSubjectEnrollment[];
  subjects: Subject[];
}

export function EnrollmentBadges({ enrollments, subjects }: EnrollmentBadgesProps) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

  if (enrollments.length === 0) {
    return <span className="text-muted">Sin materias</span>;
  }

  return (
    <div className="badge-list">
      {enrollments.map((enrollment) => {
        const subject = subjectMap.get(enrollment.subjectId);
        return (
          <span
            key={`${enrollment.subjectId}-${enrollment.church}`}
            className="enrollment-badge"
            title={subject?.code}
          >
            <span className="enrollment-badge-subject">{subject?.name ?? enrollment.subjectId}</span>
            <span className="enrollment-badge-church">{enrollment.church}</span>
          </span>
        );
      })}
    </div>
  );
}
