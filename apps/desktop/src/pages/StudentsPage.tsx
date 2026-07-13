import type { Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import { FormEvent, useMemo, useState } from "react";
import { Modal } from "../components/Modal";
import { EnrollmentBadges } from "../components/EnrollmentBadges";
import { StudentDetailPanel } from "../components/StudentDetailPanel";
import { StudentFormFields } from "../components/StudentFormFields";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import { countDebts } from "../studentDetail";
import {
  emptyStudentForm,
  studentFormFromRecord,
  studentFormToPayload,
} from "../studentForm";

export function StudentsPage() {
  const { data: students, loading, error, reload } = useAsync<Student[]>(
    () => window.api.students.list(),
    [],
  );
  const { data: subjects } = useAsync<Subject[]>(() => window.api.subjects.list(), []);
  const { data: grades } = useAsync<Grade[]>(() => window.api.grades.listAll(), []);
  const { data: teachers } = useAsync(() => window.api.teachers.list(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyStudentForm);

  const { page, setPage, paginatedItems, total, totalPages, pageSize } = usePagination(students);
  const formVisible = showForm || editing !== null;
  const subjectList = useMemo(() => subjects ?? [], [subjects]);
  const teacherList = useMemo(() => teachers ?? [], [teachers]);
  const gradeList = useMemo(() => grades ?? [], [grades]);

  const detailStudent = useMemo(
    () => (students ?? []).find((student) => student.id === detailStudentId) ?? null,
    [students, detailStudentId],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = studentFormToPayload(form);

      if (editing) {
        await window.api.students.update(editing.id, payload);
      } else {
        await window.api.students.create(payload);
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
    setForm(emptyStudentForm);
    setFormError(null);
  }

  function openCreateForm() {
    setDetailStudentId(null);
    setEditing(null);
    setForm(emptyStudentForm);
    setShowForm(true);
  }

  function startEdit(student: Student) {
    setDetailStudentId(null);
    setEditing(student);
    setShowForm(true);
    setForm(studentFormFromRecord(student));
  }

  function openDetail(student: Student) {
    setShowForm(false);
    setEditing(null);
    setDetailStudentId(student.id);
  }

  async function refreshDetail() {
    await reload();
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-main">
          <h2>Estudiantes</h2>
          <p className="page-subtitle">Ficha de inscripción</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            Añadir estudiante
          </button>
        </div>
      </div>
      <ErrorBanner message={error} />

      <Modal
        open={formVisible}
        title={editing ? "Editar estudiante" : "Nuevo estudiante"}
        onClose={closeForm}
        size="xl"
      >
        {formError && <p className="field-hint error-text">{formError}</p>}
        <form onSubmit={handleSubmit}>
          <StudentFormFields form={form} subjects={subjectList} onChange={setForm} />
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? "Actualizar" : "Inscribir estudiante"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailStudent !== null}
        title={
          detailStudent
            ? `${detailStudent.firstName} ${detailStudent.lastName}`
            : "Detalle del estudiante"
        }
        onClose={() => setDetailStudentId(null)}
        size="xl"
      >
        {detailStudent && (
          <StudentDetailPanel
            student={detailStudent}
            subjects={subjectList}
            grades={gradeList}
            teachers={teacherList}
            onRefresh={refreshDetail}
          />
        )}
      </Modal>

      <div className="card">
        <LoadingState loading={loading} />
        {!loading && students?.length === 0 && (
          <p className="empty-state">No hay estudiantes inscritos.</p>
        )}
        {students && students.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>CI</th>
                  <th>Materias e iglesias</th>
                  <th>Pago</th>
                  <th>Teléfono</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((student) => {
                  const debts = countDebts(student.enrollments ?? []);
                  return (
                    <tr key={student.id}>
                      <td>
                        {student.firstName} {student.lastName}
                      </td>
                      <td>{student.ci}</td>
                      <td>
                        <EnrollmentBadges
                          enrollments={student.enrollments ?? []}
                          subjects={subjectList}
                        />
                      </td>
                      <td>
                        {debts > 0 ? (
                          <span className="payment-badge is-debt">{debts} deuda(s)</span>
                        ) : (
                          <span className="payment-badge is-paid">Al día</span>
                        )}
                      </td>
                      <td>{student.phone}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openDetail(student)}>
                            Detalle
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => startEdit(student)}>
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
