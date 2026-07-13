import type { PensumProgress } from "../studentDetail";

interface PensumProgressSummaryProps {
  items: PensumProgress[];
  compact?: boolean;
}

export function PensumProgressSummary({ items, compact = false }: PensumProgressSummaryProps) {
  if (items.length === 0) {
    return <span className="text-muted">—</span>;
  }

  if (compact) {
    return (
      <div className="pensum-progress-compact">
        {items.map((item) => (
          <span
            key={item.pensum}
            className="pensum-progress-badge"
            title={`${item.approvedSubjects} de ${item.totalSubjects} materias aprobadas`}
          >
            {item.pensum}: {item.percentage}%
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="pensum-progress-list">
      {items.map((item) => (
        <div key={item.pensum} className="pensum-progress-item">
          <div className="pensum-progress-label">
            <strong>{item.pensum}</strong>
            <span>
              {item.percentage}% aprobado ({item.approvedSubjects}/{item.totalSubjects})
            </span>
          </div>
          <div className="pensum-progress-track" aria-hidden="true">
            <div className="pensum-progress-fill" style={{ width: `${item.percentage}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
