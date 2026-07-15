import type { Subject, Teacher } from "@gestion-notas/domain";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { confirmAction, showError } from "../alerts";
import { FiltersPanel } from "../components/FiltersPanel";
import { Modal } from "../components/Modal";
import { SubjectBadges } from "../components/SubjectBadges";
import { TeacherFormFields } from "../components/TeacherFormFields";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import { includesSearch } from "../search";
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
  const [nameFilter, setNameFilter] = useState("");
  const [ciFilter, setCiFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const subjectList = useMemo(() => subjects ?? [], [subjects]);

  const filteredTeachers = useMemo(() => {
    const list = teachers ?? [];
    return list.filter((teacher) => {
      const fullName = `${teacher.firstName} ${teacher.lastName}`;
      if (!includesSearch(fullName, nameFilter)) return false;
      if (!includesSearch(teacher.ci, ciFilter)) return false;
      if (subjectFilter) {
        const qualified = (teacher.qualifiedSubjectIds ?? []).some(
          (subjectId) => String(subjectId) === String(subjectFilter),
        );
        if (!qualified) return false;
      }
      return true;
    });
  }, [teachers, nameFilter, ciFilter, subjectFilter]);

  const { page, setPage, paginatedItems, total, totalPages, pageSize } =
    usePagination(filteredTeachers);

  useEffect(() => {
    setPage(1);
  }, [nameFilter, ciFilter, subjectFilter, setPage]);

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

  async function handleDelete(teacher: Teacher) {
    const confirmed = await confirmAction({
      title: "Eliminar profesor",
      text: `¿Eliminar al profesor ${teacher.firstName} ${teacher.lastName}? Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;

    setFormError(null);
    try {
      await window.api.teachers.delete(teacher.id);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar";
      setFormError(message);
      await showError("No se pudo eliminar", message);
    }
  }

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
      <ErrorBanner message={error ?? formError} />

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
                  Cédula
                  <input
                    value={ciFilter}
                    onChange={(e) => setCiFilter(e.target.value)}
                    placeholder="Buscar por cédula"
                  />
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

            {filteredTeachers.length === 0 ? (
              <p className="filters-empty">Ningún profesor coincide con los filtros.</p>
            ) : (
              <>
                <div className="table-scroll">
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
                          <div className="table-actions">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => startEdit(teacher)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(teacher)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
