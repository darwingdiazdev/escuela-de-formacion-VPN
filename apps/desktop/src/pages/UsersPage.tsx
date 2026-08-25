import type { PublicUser } from "@gestion-notas/application";
import type { UserRole } from "@gestion-notas/domain";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiltersPanel } from "../components/FiltersPanel";
import { Modal } from "../components/Modal";
import { UserFormFields } from "../components/UserFormFields";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import { includesSearch } from "../search";
import {
  emptyUserForm,
  USER_ROLE_LABELS,
  USER_ROLES,
  userFormFromRecord,
  userFormToCreatePayload,
  userFormToUpdatePayload,
} from "../userForm";

type StatusFilter = "all" | "active" | "inactive";

export function UsersPage() {
  const { data: users, loading, error, reload } = useAsync<PublicUser[]>(
    () => window.api.users.list(),
    [],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyUserForm);
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredUsers = useMemo(() => {
    const list = users ?? [];
    return list.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`;
      if (!includesSearch(fullName, nameFilter)) return false;
      if (!includesSearch(user.email, emailFilter)) return false;
      if (roleFilter && user.role !== roleFilter) return false;
      if (statusFilter === "active" && !user.isActive) return false;
      if (statusFilter === "inactive" && user.isActive) return false;
      return true;
    });
  }, [users, nameFilter, emailFilter, roleFilter, statusFilter]);

  const { page, setPage, paginatedItems, total, totalPages, pageSize } =
    usePagination(filteredUsers);

  useEffect(() => {
    setPage(1);
  }, [nameFilter, emailFilter, roleFilter, statusFilter, setPage]);

  const formVisible = showForm || editing !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      if (editing) {
        await window.api.users.update(editing.id, userFormToUpdatePayload(form));
      } else {
        await window.api.users.create(userFormToCreatePayload(form));
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
    setForm(emptyUserForm);
    setFormError(null);
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptyUserForm);
    setShowForm(true);
  }

  function startEdit(user: PublicUser) {
    setEditing(user);
    setShowForm(true);
    setForm(userFormFromRecord(user));
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-main">
          <h2>Usuarios</h2>
          <p className="page-subtitle">Cuentas de acceso al sistema</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            Añadir usuario
          </button>
        </div>
      </div>
      <ErrorBanner message={error ?? formError} />

      <Modal
        open={formVisible}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
        onClose={closeForm}
        size="lg"
      >
        {formError && <p className="field-hint error-text">{formError}</p>}
        <form onSubmit={handleSubmit}>
          <UserFormFields form={form} isEditing={editing !== null} onChange={setForm} />
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? "Actualizar" : "Crear usuario"}
            </button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <LoadingState loading={loading} />
        {!loading && users?.length === 0 && (
          <p className="empty-state">No hay usuarios registrados.</p>
        )}
        {users && users.length > 0 && (
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
                  Correo
                  <input
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    placeholder="Buscar por correo"
                  />
                </label>
                <label>
                  Rol
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as "" | UserRole)}
                  >
                    <option value="">Todos</option>
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {USER_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </label>
              </div>
            </FiltersPanel>

            {filteredUsers.length === 0 ? (
              <p className="filters-empty">Ningún usuario coincide con los filtros.</p>
            ) : (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Nombre completo</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((user) => (
                        <tr key={user.id}>
                          <td>
                            {user.firstName} {user.lastName}
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <span className="badge">{USER_ROLE_LABELS[user.role]}</span>
                          </td>
                          <td>
                            <span
                              className={`status-badge${user.isActive ? " is-active" : " is-inactive"}`}
                            >
                              {user.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => startEdit(user)}
                              >
                                Editar
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
