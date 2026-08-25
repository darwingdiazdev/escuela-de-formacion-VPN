import type { UserRole } from "@gestion-notas/domain";
import type { UserFormState } from "../userForm";
import { USER_ROLE_LABELS, USER_ROLES } from "../userForm";

interface UserFormFieldsProps {
  form: UserFormState;
  isEditing: boolean;
  onChange: (form: UserFormState) => void;
}

export function UserFormFields({ form, isEditing, onChange }: UserFormFieldsProps) {
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
          Correo
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Contraseña
          <input
            required={!isEditing}
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => onChange({ ...form, password: e.target.value })}
            placeholder={isEditing ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
            autoComplete="new-password"
          />
        </label>
        <label>
          Rol
          <select
            value={form.role}
            onChange={(e) => onChange({ ...form, role: e.target.value as UserRole })}
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isEditing && (
        <fieldset className="form-section">
          <legend>Estado</legend>
          <div className="badge-toggle-list">
            <button
              type="button"
              className={`tag-badge-toggle${form.isActive ? " is-selected" : ""}`}
              aria-pressed={form.isActive}
              onClick={() => onChange({ ...form, isActive: true })}
            >
              Activo
            </button>
            <button
              type="button"
              className={`tag-badge-toggle${!form.isActive ? " is-selected" : ""}`}
              aria-pressed={!form.isActive}
              onClick={() => onChange({ ...form, isActive: false })}
            >
              Inactivo
            </button>
          </div>
        </fieldset>
      )}
    </>
  );
}
