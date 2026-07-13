import type { Subject } from "@gestion-notas/domain";
import { useMemo } from "react";
import type { StudentFormState } from "../studentForm";
import {
  GENDER_OPTIONS,
  getEnrollmentOptions,
  isEnrollmentSelected,
  MARITAL_STATUS_OPTIONS,
  toggleEnrollment,
} from "../studentForm";

interface StudentFormFieldsProps {
  form: StudentFormState;
  subjects: Subject[];
  onChange: (form: StudentFormState) => void;
}

export function StudentFormFields({ form, subjects, onChange }: StudentFormFieldsProps) {
  const enrollmentOptions = useMemo(() => getEnrollmentOptions(subjects), [subjects]);

  function toggleEnrollmentOption(subjectId: string, church: StudentFormState["enrollments"][number]["church"]) {
    onChange({
      ...form,
      enrollments: toggleEnrollment(form.enrollments, subjectId, church),
    });
  }

  return (
    <>
      <fieldset className="form-section">
        <legend>Datos personales</legend>
        <div className="form-grid">
          <label>
            Nombres
            <input
              required
              value={form.firstName}
              onChange={(e) => onChange({ ...form, firstName: e.target.value })}
            />
          </label>
          <label>
            Apellidos
            <input
              required
              value={form.lastName}
              onChange={(e) => onChange({ ...form, lastName: e.target.value })}
            />
          </label>
          <label>
            Cédula de identidad
            <input
              required
              value={form.ci}
              onChange={(e) => onChange({ ...form, ci: e.target.value })}
            />
          </label>
          <label>
            Sexo
            <select
              required
              value={form.gender}
              onChange={(e) =>
                onChange({ ...form, gender: e.target.value as StudentFormState["gender"] })
              }
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha de nacimiento
            <input
              required
              type="date"
              value={form.birthDate}
              onChange={(e) => onChange({ ...form, birthDate: e.target.value })}
            />
          </label>
          <label>
            Lugar de nacimiento
            <input
              required
              value={form.birthPlace}
              onChange={(e) => onChange({ ...form, birthPlace: e.target.value })}
            />
          </label>
          <label>
            Estado civil
            <select
              required
              value={form.maritalStatus}
              onChange={(e) =>
                onChange({
                  ...form,
                  maritalStatus: e.target.value as StudentFormState["maritalStatus"],
                })
              }
            >
              {MARITAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Dirección de habitación
            <input
              required
              value={form.address}
              onChange={(e) => onChange({ ...form, address: e.target.value })}
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
            Fecha de conversión
            <input
              value={form.conversionDate}
              placeholder="Ej: Desde niño"
              onChange={(e) => onChange({ ...form, conversionDate: e.target.value })}
            />
          </label>
          <label>
            Ministerio donde sirve
            <input
              value={form.ministry}
              onChange={(e) => onChange({ ...form, ministry: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Información académica</legend>
        <div className="form-grid">
          <label>
            Grado de instrucción
            <input
              value={form.educationLevel}
              placeholder="Ej: Bachiller"
              onChange={(e) => onChange({ ...form, educationLevel: e.target.value })}
            />
          </label>
          <label>
            Profesión
            <input
              value={form.profession}
              onChange={(e) => onChange({ ...form, profession: e.target.value })}
            />
          </label>
          <label>
            Ocupación
            <input
              value={form.occupation}
              onChange={(e) => onChange({ ...form, occupation: e.target.value })}
            />
          </label>
          <label>
            Lugar de trabajo
            <input
              value={form.workplace}
              onChange={(e) => onChange({ ...form, workplace: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Inscripción en materias</legend>
        <p className="field-hint section-hint">
          Seleccione cada materia junto con la iglesia donde la cursa. Puede combinar materias de VPN MERIDA y VPN TABAY.
        </p>

        {enrollmentOptions.length === 0 ? (
          <p className="field-hint">
            No hay materias activas disponibles. Actívelas y asígnelas a una iglesia en la sección Materias.
          </p>
        ) : (
          <div className="badge-toggle-list">
            {enrollmentOptions.map((option) => {
              const selected = isEnrollmentSelected(form.enrollments, option.subjectId, option.church);
              return (
                <button
                  key={`${option.subjectId}-${option.church}`}
                  type="button"
                  className={`enrollment-toggle${selected ? " is-selected" : ""}`}
                  title={option.subjectCode}
                  aria-pressed={selected}
                  onClick={() => toggleEnrollmentOption(option.subjectId, option.church)}
                >
                  <span className="enrollment-toggle-subject">{option.subjectName}</span>
                  <span className="enrollment-toggle-church">{option.church}</span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    </>
  );
}
