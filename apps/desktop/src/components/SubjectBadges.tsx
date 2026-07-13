import type { Subject } from "@gestion-notas/domain";

interface SubjectBadgesProps {
  subjectIds: string[];
  subjects: Subject[];
}

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

  return (
    <div className="badge-list">
      {uniqueSubjects.map((subject) => (
        <span key={subject.code} className="tag-badge" title={subject.code}>
          {subject.name}
        </span>
      ))}
    </div>
  );
}
