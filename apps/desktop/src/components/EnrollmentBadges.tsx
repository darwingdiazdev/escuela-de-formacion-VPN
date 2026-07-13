import type { StudentSubjectEnrollment, Subject } from "@gestion-notas/domain";

interface EnrollmentBadgesProps {
  enrollments: StudentSubjectEnrollment[];
  subjects: Subject[];
}

const VISIBLE_COUNT = 2;

export function EnrollmentBadges({ enrollments, subjects }: EnrollmentBadgesProps) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

  if (enrollments.length === 0) {
    return <span className="text-muted">Sin materias</span>;
  }

  const visible = enrollments.slice(0, VISIBLE_COUNT);
  const hidden = enrollments.slice(VISIBLE_COUNT);

  function renderBadge(enrollment: StudentSubjectEnrollment) {
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
  }

  return (
    <div className="badge-list enrollment-badges-compact">
      {visible.map(renderBadge)}
      {hidden.length > 0 && (
        <span className="enrollment-more" tabIndex={0}>
          <span className="enrollment-more-trigger">+{hidden.length}</span>
          <span className="enrollment-more-popup" role="tooltip">
            {hidden.map(renderBadge)}
          </span>
        </span>
      )}
    </div>
  );
}
