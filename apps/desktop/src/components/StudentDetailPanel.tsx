import type { Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import { useMemo, useState } from "react";
import {
  buildStudentCourseSummaries,
  computePensumProgress,
  formatPaymentStatus,
  groupCourseSummaries,
  type StudentCourseSummary,
} from "../studentDetail";
import {
  buildStudentDetailWorkbook,
  defaultStudentDetailExportFileName,
} from "../exportStudentDetailExcel";
import { formatGradeStatus } from "../gradeForm";
import { PensumProgressSummary } from "./PensumProgressSummary";

interface StudentDetailPanelProps {
  student: Student;
  subjects: Subject[];
  grades: Grade[];
  teachers: Teacher[];
  onRefresh: () => Promise<void>;
}

function CourseCard({
  item,
  onTogglePayment,
  onRetake,
  busy,
}: {
  item: StudentCourseSummary;
  onTogglePayment: (item: StudentCourseSummary) => void;
  onRetake: (item: StudentCourseSummary) => void;
  busy: boolean;
}) {
  const paid = item.enrollment.paymentStatus === "paid";

  return (
    <div className={`course-card course-card-${item.status}`}>
      <div className="course-card-header">
        <strong>{item.subject?.name ?? "Materia"}</strong>
        <span className="tag-badge">{item.enrollment.church}</span>
      </div>
      <div className="course-card-meta">
        <span>
          Prof: {item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : "Sin asignar"}
        </span>
        {item.grade && (
          <span>
            Nota actual (intento {item.grade.attemptNumber}): {item.grade.finalGrade}
          </span>
        )}
        {item.gradeHistory.length > 0 && (
          <div className="grade-history">
            {item.gradeHistory.map((pastGrade) => (
              <span key={pastGrade.id}>
                Intento {pastGrade.attemptNumber}: {pastGrade.finalGrade} (
                {formatGradeStatus(pastGrade.finalGrade)})
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="course-card-actions">
        <span className={`payment-badge${paid ? " is-paid" : " is-debt"}`}>
          {formatPaymentStatus(item.enrollment.paymentStatus)}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          disabled={busy}
          onClick={() => onTogglePayment(item)}
        >
          {paid ? "Deuda" : "Pagado"}
        </button>
        {item.status === "failed" && (
          <button
            type="button"
            className="btn btn-primary btn-xs"
            disabled={busy}
            onClick={() => onRetake(item)}
          >
            Re-cursar
          </button>
        )}
      </div>
    </div>
  );
}

export function StudentDetailPanel({
  student,
  subjects,
  grades,
  teachers,
  onRefresh,
}: StudentDetailPanelProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const studentGrades = useMemo(
    () => grades.filter((grade) => String(grade.studentId) === String(student.id)),
    [grades, student.id],
  );

  const summaries = useMemo(
    () => buildStudentCourseSummaries(student, subjects, studentGrades, teachers),
    [student, subjects, studentGrades, teachers],
  );

  const groups = useMemo(() => groupCourseSummaries(summaries), [summaries]);

  const pensumProgress = useMemo(
    () => computePensumProgress(student, subjects, studentGrades, teachers),
    [student, subjects, studentGrades, teachers],
  );

  async function handleTogglePayment(item: StudentCourseSummary) {
    setActionError(null);
    setBusy(true);
    try {
      const nextStatus = item.enrollment.paymentStatus === "paid" ? "debt" : "paid";
      await window.api.students.setEnrollmentPayment(
        student.id,
        item.enrollment.subjectId,
        item.enrollment.church,
        nextStatus,
      );
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al actualizar pago");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetake(item: StudentCourseSummary) {
    setActionError(null);
    setBusy(true);
    try {
      await window.api.students.retakeEnrollment(
        student.id,
        item.enrollment.subjectId,
        item.enrollment.church,
      );
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al reprogramar materia");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportExcel() {
    setActionError(null);
    setExporting(true);
    try {
      const buffer = buildStudentDetailWorkbook(student, subjects, studentGrades, teachers);
      const result = await window.api.export.saveExcel(
        new Uint8Array(buffer),
        defaultStudentDetailExportFileName(student),
      );
      if (!result.saved) return;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al exportar Excel");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="student-detail-panel">
      <div className="student-detail-header">
        <p className="page-subtitle">CI: {student.ci}</p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={exporting || busy}
          onClick={handleExportExcel}
        >
          {exporting ? "Exportando..." : "Exportar Excel"}
        </button>
      </div>

      {pensumProgress.length > 0 && (
        <section className="detail-section pensum-progress-section">
          <h4>Avance por pensum</h4>
          <PensumProgressSummary items={pensumProgress} />
        </section>
      )}

      {actionError && <p className="field-hint error-text">{actionError}</p>}

      {summaries.length === 0 ? (
        <p className="empty-state">Este estudiante no tiene materias inscritas.</p>
      ) : (
        <>
          <section className="detail-section">
            <h4>Aprobadas ({groups.approved.length})</h4>
            {groups.approved.length === 0 ? (
              <p className="field-hint">Sin materias aprobadas.</p>
            ) : (
              <div className="course-card-grid">
                {groups.approved.map((item) => (
                  <CourseCard
                    key={`${item.enrollment.subjectId}-${item.enrollment.church}`}
                    item={item}
                    busy={busy}
                    onTogglePayment={handleTogglePayment}
                    onRetake={handleRetake}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="detail-section">
            <h4>Reprobadas ({groups.failed.length})</h4>
            {groups.failed.length === 0 ? (
              <p className="field-hint">Sin materias reprobadas.</p>
            ) : (
              <div className="course-card-grid">
                {groups.failed.map((item) => (
                  <CourseCard
                    key={`${item.enrollment.subjectId}-${item.enrollment.church}`}
                    item={item}
                    busy={busy}
                    onTogglePayment={handleTogglePayment}
                    onRetake={handleRetake}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="detail-section">
            <h4>En curso / Sin calificar ({groups.pending.length})</h4>
            {groups.pending.length === 0 ? (
              <p className="field-hint">No hay materias pendientes de calificación.</p>
            ) : (
              <div className="course-card-grid">
                {groups.pending.map((item) => (
                  <CourseCard
                    key={`${item.enrollment.subjectId}-${item.enrollment.church}`}
                    item={item}
                    busy={busy}
                    onTogglePayment={handleTogglePayment}
                    onRetake={handleRetake}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
