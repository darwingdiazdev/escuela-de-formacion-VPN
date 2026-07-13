import type { Subject, Teacher } from "@gestion-notas/domain";
import { FormEvent, useMemo, useState } from "react";
import { Modal } from "../components/Modal";
import { SubjectBadges } from "../components/SubjectBadges";
import { TeacherFormFields } from "../components/TeacherFormFields";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import {
  emptyTeacherForm,
  teacherFormFromRecord,
  teacherFormToPayload,
} from "../teacherForm";

export function TeachersPage() {
  const { data: teachers, loading, error, reload } = useAsync<Teacher[]>(
    () => window.api.teachers.list(),
    [],
  );
  const { data: subjects } = useAsync<Subject[]>(() => window.api.subjects.list(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyTeacherForm);

  const { page, setPage, paginatedItems, total, totalPages, pageSize } = usePagination(teachers);

  const formVisible = showForm || editing !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = teacherFormToPayload(form);

      if (editing) {
        await window.api.teachers.update(editing.id, payload);
      } else {
        await window.api.teachers.create(payload);
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
    setForm(emptyTeacherForm);
    setFormError(null);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptyTeacherForm);
    setShowForm(true);
  }

  function startEdit(teacher: Teacher) {
    setEditing(teacher);
    setShowForm(true);
    setForm(teacherFormFromRecord(teacher));
  }

  const subjectList = useMemo(() => subjects ?? [], [subjects]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-main">
          <h2>Profesores</h2>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            Añadir profesor
          </button>
        </div>
      </div>
      <ErrorBanner message={error} />

      <Modal
        open={formVisible}
        title={editing ? "Editar profesor" : "Nuevo profesor"}
        onClose={closeForm}
        size="lg"
      >
        {formError && <p className="field-hint error-text">{formError}</p>}
        <form onSubmit={handleSubmit}>
          <TeacherFormFields form={form} subjects={subjectList} onChange={setForm} />
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? "Actualizar" : "Registrar profesor"}
            </button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <LoadingState loading={loading} />
        {!loading && teachers?.length === 0 && (
          <p className="empty-state">No hay profesores registrados.</p>
        )}
        {teachers && teachers.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>Cédula</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Materias</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      {teacher.firstName} {teacher.lastName}
                    </td>
                    <td>{teacher.ci}</td>
                    <td>{teacher.phone}</td>
                    <td>{teacher.email}</td>
                    <td>
                      <SubjectBadges
                        subjectIds={teacher.qualifiedSubjectIds ?? []}
                        subjects={subjectList}
                      />
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(teacher)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
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
