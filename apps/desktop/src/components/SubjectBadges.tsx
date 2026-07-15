import type { Subject } from "@gestion-notas/domain";

interface SubjectBadgesProps {
  subjectIds: string[];
  subjects: Subject[];
}

const VISIBLE_COUNT = 2;

export function SubjectBadges({ subjectIds, subjects }: SubjectBadgesProps) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const matched = subjectIds
    .map((id) => subjectMap.get(id))
    .filter((subject): subject is Subject => subject !== undefined);

  const uniqueByCode = new Map<string, Subject>();
  for (const subject of matched) {
    if (!uniqueByCode.has(subject.code)) {
      uniqueByCode.set(subject.code, subject);
    }
  }
  const uniqueSubjects = Array.from(uniqueByCode.values());

  if (uniqueSubjects.length === 0) {
    return <span className="text-muted">Sin materias</span>;
  }

  const visible = uniqueSubjects.slice(0, VISIBLE_COUNT);
  const hidden = uniqueSubjects.slice(VISIBLE_COUNT);

  function renderBadge(subject: Subject) {
    return (
      <span key={subject.code} className="tag-badge" title={subject.code}>
        {subject.name}
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
