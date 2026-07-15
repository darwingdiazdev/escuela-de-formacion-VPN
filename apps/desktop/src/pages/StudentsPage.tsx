import type { Grade, Student, Subject, Teacher } from "@gestion-notas/domain";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { confirmAction, showError } from "../alerts";
import { FiltersPanel } from "../components/FiltersPanel";
import { Modal } from "../components/Modal";
import { EnrollmentBadges } from "../components/EnrollmentBadges";
import { StudentDetailPanel } from "../components/StudentDetailPanel";
import { StudentFormFields } from "../components/StudentFormFields";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import { includesSearch } from "../search";
import { countDebts } from "../studentDetail";
import {
  emptyStudentForm,
  studentFormFromRecord,
  studentFormToPayload,
} from "../studentForm";

type PaymentFilter = "all" | "paid" | "debt";

export function StudentsPage() {
  const { data: students, loading, error, reload } = useAsync<Student[]>(
    () => window.api.students.list(),
    [],
  );
  const { data: subjects } = useAsync<Subject[]>(() => window.api.subjects.list(), []);
  const { data: grades, reload: reloadGrades } = useAsync<Grade[]>(
    () => window.api.grades.listAll(),
    [],
  );
  const { data: teachers } = useAsync(() => window.api.teachers.list(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyStudentForm);
  const [nameFilter, setNameFilter] = useState("");
  const [ciFilter, setCiFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("");

  const formVisible = showForm || editing !== null;
  const subjectList = useMemo(() => subjects ?? [], [subjects]);
  const teacherList = useMemo(() => teachers ?? [], [teachers]);
  const gradeList = useMemo(() => grades ?? [], [grades]);

  const filteredStudents = useMemo(() => {
    const list = students ?? [];
    return list.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`;
      if (!includesSearch(fullName, nameFilter)) return false;
      if (!includesSearch(student.ci, ciFilter)) return false;

      const enrollments = student.enrollments ?? [];
      if (subjectFilter) {
        const enrollment = enrollments.find(
          (item) => String(item.subjectId) === String(subjectFilter),
        );
        if (!enrollment) return false;
        if (paymentFilter === "debt" && enrollment.paymentStatus !== "debt") return false;
        if (paymentFilter === "paid" && enrollment.paymentStatus !== "paid") return false;
        return true;
      }

      const debts = countDebts(enrollments);
      if (paymentFilter === "debt" && debts === 0) return false;
      if (paymentFilter === "paid" && debts > 0) return false;
      return true;
    });
  }, [students, nameFilter, ciFilter, paymentFilter, subjectFilter]);

  const { page, setPage, paginatedItems, total, totalPages, pageSize } =
    usePagination(filteredStudents);

  useEffect(() => {
    setPage(1);
  }, [nameFilter, ciFilter, paymentFilter, subjectFilter, setPage]);

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

  async function handleDelete(student: Student) {
    const confirmed = await confirmAction({
      title: "Eliminar estudiante",
      text: `¿Eliminar a ${student.firstName} ${student.lastName}? Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;

    setFormError(null);
    try {
      await window.api.students.delete(student.id);
      if (detailStudentId === student.id) setDetailStudentId(null);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar";
      setFormError(message);
      await showError("No se pudo eliminar", message);
    }
  }

  function openDetail(student: Student) {
    setShowForm(false);
    setEditing(null);
    setDetailStudentId(student.id);
  }

  async function refreshDetail() {
    await Promise.all([reload(), reloadGrades()]);
  }

  const hasActiveFilters =
    nameFilter.trim() !== "" ||
    ciFilter.trim() !== "" ||
    paymentFilter !== "all" ||
    subjectFilter !== "";

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
      <ErrorBanner message={error ?? formError} />

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
            <FiltersPanel>
              <div className="filters-bar">
                <label>
                  Nombre
                  <input
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Buscar por nombre"
                  />
                </label>
                <label>
                  CI
                  <input
                    value={ciFilter}
                    onChange={(e) => setCiFilter(e.target.value)}
                    placeholder="Buscar por CI"
                  />
                </label>
                <label>
                  Estado de pago
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                  >
                    <option value="all">Todos</option>
                    <option value="paid">Al día</option>
                    <option value="debt">Con deuda</option>
                  </select>
                </label>
                <label>
                  Materia
                  <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                    <option value="">Todas</option>
                    {subjectList.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </FiltersPanel>

            {filteredStudents.length === 0 ? (
              <p className="filters-empty">
                {hasActiveFilters
                  ? "Ningún estudiante coincide con los filtros."
                  : "No hay estudiantes inscritos."}
              </p>
            ) : (
              <>
                <div className="table-scroll">
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
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openDetail(student)}
                              >
                                Detalle
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => startEdit(student)}
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(student)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
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
          </>
        )}
      </div>
    </>
  );
}
