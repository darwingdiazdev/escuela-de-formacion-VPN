import type { Subject } from "@gestion-notas/domain";
import { useMemo } from "react";
import type { TeacherFormState } from "../teacherForm";

interface TeacherFormFieldsProps {
  form: TeacherFormState;
  subjects: Subject[];
  onChange: (form: TeacherFormState) => void;
}

export function TeacherFormFields({ form, subjects, onChange }: TeacherFormFieldsProps) {
  const catalogSubjects = useMemo(() => {
    const byCode = new Map<string, Subject>();
    for (const subject of subjects) {
      if (!byCode.has(subject.code)) {
        byCode.set(subject.code, subject);
      }
    }
    return Array.from(byCode.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [subjects]);

  function isCodeSelected(code: string): boolean {
    return form.qualifiedSubjectIds.some(
      (id) => subjects.find((subject) => subject.id === id)?.code === code,
    );
  }

  function toggleSubjectCode(code: string) {
    const selected = isCodeSelected(code);
    if (selected) {
      onChange({
        ...form,
        qualifiedSubjectIds: form.qualifiedSubjectIds.filter(
          (id) => subjects.find((subject) => subject.id === id)?.code !== code,
        ),
      });
      return;
    }

    const subject = subjects.find((item) => item.code === code);
    if (!subject) return;

    onChange({
      ...form,
      qualifiedSubjectIds: [...form.qualifiedSubjectIds, subject.id],
    });
  }

  return (
    <>
      <div className="form-grid">
        <label>
          Nombre
          <input
            required
            value={form.firstName}
            onChange={(e) => onChange({ ...form, firstName: e.target.value })}
          />
        </label>
        <label>
          Apellido
          <input
            required
            value={form.lastName}
            onChange={(e) => onChange({ ...form, lastName: e.target.value })}
          />
        </label>
        <label>
          Cédula
          <input
            required
            value={form.ci}
            onChange={(e) => onChange({ ...form, ci: e.target.value })}
          />
        </label>
        <label>
          Teléfono
          <input
            required
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
          />
        </label>
        <label>
          Correo
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Grado de instrucción
          <input
            required
            placeholder="Ej: Universitario"
            value={form.educationLevel}
            onChange={(e) => onChange({ ...form, educationLevel: e.target.value })}
          />
        </label>
      </div>

      <fieldset className="form-section">
        <legend>Materias aptas para dictar</legend>
        {catalogSubjects.length === 0 ? (
          <p className="field-hint">Registre materias primero para marcar aptitud.</p>
        ) : (
          <div className="badge-toggle-list">
            {catalogSubjects.map((subject) => {
              const selected = isCodeSelected(subject.code);
              return (
                <button
                  key={subject.code}
                  type="button"
                  className={`tag-badge-toggle${selected ? " is-selected" : ""}`}
                  title={subject.code}
                  aria-pressed={selected}
                  onClick={() => toggleSubjectCode(subject.code)}
                >
                  {subject.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    </>
  );
}
