import type { Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import { FormEvent, Fragment, useMemo, useState } from "react";
import { ExpandRowIcon } from "../components/IconButton";
import { Modal } from "../components/Modal";
import { StudentGradesExpand } from "../components/StudentGradesExpand";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import {
  emptyGradeForm,
  getEnrollmentOptionsForStudent,
  gradeFormFromRecord,
  gradeFormToPayload,
  studentLabel,
} from "../gradeForm";
import {
  buildGradesExportRows,
  defaultGradesExportFileName,
  gradesToExcelBuffer,
} from "../exportGradesExcel";

export function GradesPage() {
  const { data: grades, loading, error, reload } = useAsync<Grade[]>(
    () => window.api.grades.list(),
    [],
  );
  const { data: students } = useAsync<Student[]>(() => window.api.students.list(), []);
  const { data: subjects } = useAsync<Subject[]>(() => window.api.subjects.list(), []);
  const { data: teachers } = useAsync<Teacher[]>(() => window.api.teachers.list(), []);

  const [formError, setFormError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyGradeForm);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const formVisible = showForm || editing !== null;

  const studentMap = useMemo(
    () => new Map((students ?? []).map((student) => [String(student.id), student])),
    [students],
  );
  const teacherList = useMemo(() => teachers ?? [], [teachers]);

  const groupedStudents = useMemo(() => {
    const groups = new Map<string, Grade[]>();
    for (const grade of grades ?? []) {
      const studentId = String(grade.studentId);
      const bucket = groups.get(studentId);
      if (bucket) bucket.push(grade);
      else groups.set(studentId, [grade]);
    }

    return Array.from(groups.entries())
      .map(([studentId, studentGrades]) => ({ studentId, grades: studentGrades }))
      .sort((a, b) => {
        const studentA = studentMap.get(a.studentId);
        const studentB = studentMap.get(b.studentId);
        const nameA = studentA ? `${studentA.lastName} ${studentA.firstName}` : "";
        const nameB = studentB ? `${studentB.lastName} ${studentB.firstName}` : "";
        return nameA.localeCompare(nameB, "es");
      });
  }, [grades, studentMap]);

  const { page, setPage, paginatedItems, total, totalPages, pageSize } =
    usePagination(groupedStudents);

  const selectedStudent = form.studentId
    ? studentMap.get(String(form.studentId))
    : undefined;

  const enrollmentOptions = useMemo(() => {
    const options = getEnrollmentOptionsForStudent(selectedStudent, subjects ?? []);
    if (!editing) {
      const usedKeys = new Set(
        (grades ?? [])
          .filter((grade) => String(grade.studentId) === String(form.studentId))
          .map((grade) => `${grade.subjectId}|${grade.church}`),
      );
      return options.filter((option) => !usedKeys.has(option.key));
    }
    return options;
  }, [selectedStudent, subjects, grades, form.studentId, editing]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = gradeFormToPayload(form);

      if (editing) {
        await window.api.grades.update(editing.id, payload);
      } else {
        await window.api.grades.create(payload);
      }

      closeForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
    setForm(emptyGradeForm);
    setFormError(null);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptyGradeForm);
    setShowForm(true);
  }

  function startEdit(grade: Grade) {
    setEditing(grade);
    setShowForm(true);
    setForm(gradeFormFromRecord(grade));
  }

  function toggleExpand(studentId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function handleExportExcel() {
    setExportError(null);
    setExporting(true);
    try {
      const allGrades = await window.api.grades.listAll();
      if (!allGrades.length) return;

      const rows = buildGradesExportRows(
        allGrades,
        students ?? [],
        subjects ?? [],
        teacherList,
      );
      const buffer = gradesToExcelBuffer(rows);
      const result = await window.api.export.saveExcel(
        new Uint8Array(buffer),
        defaultGradesExportFileName(),
      );
      if (!result.saved) return;
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Error al exportar Excel");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-main">
          <h2>Notas</h2>
          <p className="page-subtitle">Notas finales por estudiante y materia</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exporting || !grades?.length}
            onClick={handleExportExcel}
          >
            {exporting ? "Exportando..." : "Descargar Excel"}
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            Registrar nota
          </button>
        </div>
      </div>
      <ErrorBanner message={error ?? exportError} />

      <Modal
        open={formVisible}
        title={editing ? "Editar nota" : "Nueva nota"}
        onClose={closeForm}
        size="md"
      >
        {formError && <p className="field-hint error-text">{formError}</p>}
        <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Estudiante
                <select
                  required
                  value={form.studentId}
                  disabled={editing !== null}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      studentId: e.target.value,
                      enrollmentKey: "",
                    })
                  }
                >
                  <option value="">Seleccione...</option>
                  {(students ?? []).map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentLabel(student)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Materia e iglesia
                <select
                  required
                  value={form.enrollmentKey}
                  disabled={!form.studentId || editing !== null}
                  onChange={(e) => setForm({ ...form, enrollmentKey: e.target.value })}
                >
                  <option value="">Seleccione...</option>
                  {enrollmentOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {form.studentId && enrollmentOptions.length === 0 && !editing && (
                  <span className="field-hint">
                    Este estudiante no tiene inscripciones pendientes de calificar.
                  </span>
                )}
              </label>
              <label>
                Nota final (0–20)
                <input
                  required
                  type="number"
                  min={0}
                  max={20}
                  step={0.01}
                  value={form.finalGrade}
                  onChange={(e) => setForm({ ...form, finalGrade: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? "Actualizar" : "Registrar nota"}
              </button>
            </div>
          </form>
      </Modal>

      <div className="card">
        <LoadingState loading={loading} />
        {!loading && grades?.length === 0 && (
          <p className="empty-state">No hay notas registradas.</p>
        )}
        {grades && grades.length > 0 && (
          <>
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="row-expand-col"></th>
                  <th>Nombre completo</th>
                  <th>CI</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((group) => {
                  const student = studentMap.get(group.studentId);
                  const expanded = expandedIds.has(group.studentId);
                  const gradeCount = group.grades.length;

                  return (
                    <Fragment key={group.studentId}>
                      <tr className={expanded ? "student-row is-expanded" : "student-row"}>
                        <td>
                          <button
                            type="button"
                            className="row-expand-btn"
                            aria-expanded={expanded}
                            aria-label={expanded ? "Ocultar notas" : "Ver notas"}
                            onClick={() => toggleExpand(group.studentId)}
                          >
                            <ExpandRowIcon expanded={expanded} />
                          </button>
                        </td>
                        <td>
                          {student
                            ? `${student.firstName} ${student.lastName}`
                            : "—"}
                        </td>
                        <td>{student?.ci ?? "—"}</td>
                        <td>
                          {gradeCount} {gradeCount === 1 ? "nota" : "notas"}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="student-expand-row">
                          <td colSpan={4}>
                            <StudentGradesExpand
                              grades={group.grades}
                              student={student}
                              subjects={subjects ?? []}
                              teachers={teacherList}
                              onEdit={startEdit}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}
