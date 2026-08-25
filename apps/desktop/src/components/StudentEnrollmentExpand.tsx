import type { Student, Subject } from "@gestion-notas/domain";
import { countDebts } from "../studentDetail";
import { EnrollmentBadges } from "./EnrollmentBadges";

interface StudentEnrollmentExpandProps {
  student: Student;
  subjects: Subject[];
}

export function StudentEnrollmentExpand({ student, subjects }: StudentEnrollmentExpandProps) {
  const enrollments = student.enrollments ?? [];
  const debts = countDebts(enrollments);

  if (enrollments.length === 0) {
    return <p className="student-expand-empty">Sin materias inscritas.</p>;
  }

  return (
    <div className="student-expand">
      <EnrollmentBadges enrollments={enrollments} subjects={subjects} />
      {debts > 0 ? (
        <span className="payment-badge is-debt">
          {debts} deuda{debts === 1 ? "" : "s"}
        </span>
      ) : (
        <span className="payment-badge is-paid">Al día</span>
      )}
    </div>
  );
}
