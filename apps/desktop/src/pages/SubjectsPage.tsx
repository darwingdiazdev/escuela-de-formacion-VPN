import type { ChurchLocation, Subject, Teacher } from "@gestion-notas/domain";
import { FormEvent, useMemo, useState } from "react";
import { Modal } from "../components/Modal";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import {
  CHURCH_OPTIONS,
  DEFAULT_SUBJECT_PRICE_USD,
  buildTeacherAssignmentCache,
  emptySubjectForm,
  isChurchSelected,
  normalizeTeacherId,
  offeringsToPayload,
  PENSUM_OPTIONS,
  setOfferingTeacher,
  toggleChurchOffering,
  type PensumOption,
  type TeacherAssignmentCache,
} from "../subjectForm";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function SubjectsPage() {
  const { data: subjects, loading, error, reload } = useAsync<Subject[]>(
    () => window.api.subjects.list(),
    [],
  );
  const { data: teachers } = useAsync<Teacher[]>(() => window.api.teachers.list(), []);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySubjectForm);
  const [teacherCache, setTeacherCache] = useState<TeacherAssignmentCache>({});

  const { page, setPage, paginatedItems, total, totalPages, pageSize } = usePagination(subjects);
  const formVisible = showForm || editing !== null;

  const teacherLabel = (teacher: Teacher) => `${teacher.firstName} ${teacher.lastName} (${teacher.ci})`;

  const eligibleTeachers = useMemo(() => {
    if (!teachers || !subjects) return [];

    const subjectCode = editing?.code ?? form.code.trim();
    const editingSubjectId = editing?.id;

    const qualified = teachers.filter((teacher) =>
      (teacher.qualifiedSubjectIds ?? []).some((subjectId) => {
        const qualifiedSubject = subjects.find(
          (subject) => String(subject.id) === String(subjectId),
        );
        if (!qualifiedSubject) return false;
        if (editingSubjectId) {
          return qualifiedSubject.id === editingSubjectId;
        }
        return subjectCode !== "" && qualifiedSubject.code === subjectCode;
      }),
    );

    const assignedIds = new Set(
      form.offerings
        .map((offering) => normalizeTeacherId(offering.teacherId))
        .filter(Boolean),
    );

    const assigned = teachers.filter((teacher) => assignedIds.has(String(teacher.id)));
    const byId = new Map(qualified.map((teacher) => [String(teacher.id), teacher]));
    for (const teacher of assigned) {
      byId.set(String(teacher.id), teacher);
    }

    return Array.from(byId.values()).sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "es"),
    );
  }, [teachers, subjects, editing, form.code, form.offerings]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const priceUsd = Number(form.priceUsd);
      if (!Number.isFinite(priceUsd) || priceUsd < 0) {
        throw new Error("Ingrese un valor válido (0 o mayor).");
      }

      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        pensum: form.pensum,
        priceUsd,
        offerings: offeringsToPayload(form.offerings),
        isActive: form.isActive,
      };

      if (editing) {
        await window.api.subjects.update(editing.id, payload);
      } else {
        await window.api.subjects.create(payload);
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
    setForm(emptySubjectForm);
    setTeacherCache({});
    setFormError(null);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptySubjectForm);
    setShowForm(true);
  }

  function startEdit(subject: Subject) {
    setEditing(subject);
    setShowForm(true);
    const pensum = PENSUM_OPTIONS.includes(subject.pensum as PensumOption)
      ? (subject.pensum as PensumOption)
      : "Pensum 2";
    const offerings = (subject.offerings ?? []).map((offering) => ({
      church: offering.church,
      teacherId: normalizeTeacherId(offering.teacherId),
    }));
    setForm({
      code: subject.code,
      name: subject.name,
      pensum,
      priceUsd: String(subject.priceUsd ?? DEFAULT_SUBJECT_PRICE_USD),
      offerings,
      isActive: subject.isActive,
    });
    setTeacherCache(buildTeacherAssignmentCache(offerings));
  }

  function toggleChurch(church: ChurchLocation) {
    setForm((current) => {
      const nextOfferings = toggleChurchOffering(current.offerings, church, teacherCache);
      return {
        ...current,
        offerings: nextOfferings,
      };
    });
  }

  function updateOfferingTeacher(church: ChurchLocation, teacherId: string) {
    setTeacherCache((current) => ({
      ...current,
      [church]: teacherId,
    }));
    setForm((current) => ({
      ...current,
      offerings: setOfferingTeacher(current.offerings, church, teacherId),
    }));
  }

  function findTeacherById(teacherId: string | null | undefined) {
    const normalizedId = normalizeTeacherId(teacherId);
    if (!normalizedId || !teachers) return undefined;
    return teachers.find((teacher) => String(teacher.id) === normalizedId);
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-main">
          <h2>Materias</h2>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            Añadir materia
          </button>
        </div>
      </div>
      <ErrorBanner message={error} />

      <Modal
        open={formVisible}
        title={editing ? "Editar materia" : "Nueva materia"}
        onClose={closeForm}
        size="lg"
      >
        {formError && <p className="field-hint error-text">{formError}</p>}
        <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Código
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </label>
              <label>
                Nombre
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Pensum
                <select
                  required
                  value={form.pensum}
                  onChange={(e) => setForm({ ...form, pensum: e.target.value as PensumOption })}
                >
                  {PENSUM_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor (USD)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceUsd}
                  onChange={(e) => setForm({ ...form, priceUsd: e.target.value })}
                />
              </label>
            </div>

            <fieldset className="form-section">
              <legend>Estado</legend>
              <div className="badge-toggle-list">
                <button
                  type="button"
                  className={`tag-badge-toggle${form.isActive ? " is-selected" : ""}`}
                  aria-pressed={form.isActive}
                  onClick={() => setForm({ ...form, isActive: true })}
                >
                  Activa
                </button>
                <button
                  type="button"
                  className={`tag-badge-toggle${!form.isActive ? " is-selected" : ""}`}
                  aria-pressed={!form.isActive}
                  onClick={() => setForm({ ...form, isActive: false })}
                >
                  Inactiva
                </button>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Iglesias donde se imparte</legend>
              <div className="badge-toggle-list">
                {CHURCH_OPTIONS.map((church) => {
                  const selected = isChurchSelected(form.offerings, church);
                  return (
                    <button
                      key={church}
                      type="button"
                      className={`tag-badge-toggle${selected ? " is-selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => toggleChurch(church)}
                    >
                      {church}
                    </button>
                  );
                })}
              </div>
              {form.offerings.length === 0 && (
                <p className="field-hint">Seleccione al menos una iglesia si la materia ya se está dictando.</p>
              )}
            </fieldset>

            {form.offerings.length > 0 && (
              <fieldset className="form-section">
                <legend>Profesor por iglesia</legend>
                {form.offerings.map((offering) => (
                  <label key={offering.church} className="offering-assignment">
                    <span>{offering.church}</span>
                    <select
                      value={offering.teacherId ?? ""}
                      onChange={(e) => updateOfferingTeacher(offering.church, e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {eligibleTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacherLabel(teacher)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                {eligibleTeachers.length === 0 && (
                  <p className="field-hint">
                    Marque profesores aptos para esta materia en la sección Profesores.
                  </p>
                )}
              </fieldset>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? "Actualizar" : "Registrar materia"}
              </button>
            </div>
          </form>
      </Modal>

      <div className="card">
        <LoadingState loading={loading} />
        {!loading && subjects?.length === 0 && (
          <p className="empty-state">No hay materias registradas.</p>
        )}
        {subjects && subjects.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Iglesias</th>
                  <th>Pensum</th>
                  <th>Valor</th>
                  <th>Profesores</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((subject) => {
                  const offerings = subject.offerings ?? [];
                  return (
                    <tr key={subject.id}>
                      <td>
                        <span className="tag-badge">{subject.code}</span>
                      </td>
                      <td>{subject.name}</td>
                      <td>
                        <span className={`status-badge${subject.isActive ? " is-active" : " is-inactive"}`}>
                          {subject.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td>
                        {offerings.length > 0 ? (
                          <div className="badge-list">
                            {offerings.map((offering) => (
                              <span key={offering.church} className="tag-badge">
                                {offering.church}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge">{subject.pensum}</span>
                      </td>
                      <td>{formatPrice(subject.priceUsd)}</td>
                      <td>
                        {offerings.length > 0 ? (
                          <div className="offering-list">
                            {offerings.map((offering) => {
                              const teacher = findTeacherById(offering.teacherId);
                              return (
                                <div key={offering.church} className="offering-row">
                                  <span className="offering-church">{offering.church}</span>
                                  <span>{teacher ? teacherLabel(teacher) : "Sin asignar"}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(subject)}>
                          Editar
                        </button>
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
