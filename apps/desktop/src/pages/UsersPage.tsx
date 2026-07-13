import type { User, UserRole } from "@gestion-notas/domain";
import { FormEvent, useState } from "react";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  teacher: "Profesor",
  student: "Estudiante",
};

export function UsersPage() {
  const { data: users, loading, error, reload } = useAsync<User[]>(
    () => window.api.users.list(),
    [],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "student" as UserRole,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      if (editing) {
        await window.api.users.update(editing.id, {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        });
      } else {
        await window.api.users.create(form);
      }
      setForm({ email: "", password: "", firstName: "", lastName: "", role: "student" });
      setEditing(null);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  function startEdit(user: User) {
    setEditing(user);
    setForm({
      email: user.email,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  }

  return (
    <>
      <div className="page-header">
        <h2>Usuarios</h2>
      </div>
      <ErrorBanner message={error ?? formError} />

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3>{editing ? "Editar usuario" : "Nuevo usuario"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Nombre
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </label>
            <label>
              Apellido
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
            <label>
              Correo
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            {!editing && (
              <label>
                Contraseña
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
            )}
            <label>
              Rol
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <option value="admin">Administrador</option>
                <option value="teacher">Profesor</option>
                <option value="student">Estudiante</option>
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary">
              {editing ? "Actualizar" : "Crear"}
            </button>
            {editing && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditing(null);
                  setForm({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    role: "student",
                  });
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <LoadingState loading={loading} />
        {!loading && users?.length === 0 && (
          <p className="empty-state">No hay usuarios registrados.</p>
        )}
        {users && users.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge">{roleLabels[user.role]}</span>
                  </td>
                  <td>{user.isActive ? "Activo" : "Inactivo"}</td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => startEdit(user)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
