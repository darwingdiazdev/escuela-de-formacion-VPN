import { useEffect, useState } from "react";
import { SidebarBrand } from "./components/SidebarBrand";
import { NAV_ICONS } from "./navIcons";
import { GradesPage } from "./pages/GradesPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentsPage } from "./pages/StudentsPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { TeachersPage } from "./pages/TeachersPage";
import { UsersPage } from "./pages/UsersPage";
import { useAuth } from "./useAuth";
import { USER_ROLE_LABELS } from "./userForm";

type Section = "students" | "teachers" | "subjects" | "grades" | "users";

const sections: { id: Section; label: string; adminOnly?: boolean }[] = [
  { id: "students", label: "Estudiantes" },
  { id: "subjects", label: "Materias" },
  { id: "teachers", label: "Profesores" },
  { id: "grades", label: "Notas" },
  { id: "users", label: "Usuarios", adminOnly: true },
];

export default function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const [section, setSection] = useState<Section>("students");
  const [menuOpen, setMenuOpen] = useState(() =>
    window.matchMedia("(min-width: 901px)").matches,
  );

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  if (!isAuthenticated || !user) {
    return <LoginPage onLogin={login} />;
  }

  const visibleSections = sections.filter(
    (item) => !item.adminOnly || user.role === "admin",
  );
  const activeSection = visibleSections.some((item) => item.id === section)
    ? section
    : visibleSections[0]?.id ?? "students";
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : " menu-collapsed"}`}>
      <aside className="sidebar" aria-hidden={false}>
        <button
          type="button"
          className="sidebar-toggle"
          aria-label={menuOpen ? "Contraer menú" : "Expandir menú"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "«" : "»"}
        </button>
        <div className="sidebar-top">
          <SidebarBrand />
        </div>
        <nav className="sidebar-nav">
          {visibleSections.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activeSection === item.id ? "active" : ""}`}
              title={item.label}
              onClick={() => setSection(item.id)}
            >
              <span className="nav-btn-icon">{NAV_ICONS[item.id]}</span>
              <span className="nav-btn-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <div className="session-info" title={`${user.firstName} ${user.lastName}`}>
            <span className="session-initials">{initials}</span>
            <span className="session-details">
              <span>
                {user.firstName} {user.lastName}
              </span>
              <span className="badge">{USER_ROLE_LABELS[user.role]}</span>
            </span>
          </div>
          <button
            type="button"
            className="nav-btn logout-btn"
            title="Cerrar sesión"
            onClick={logout}
          >
            <span className="nav-btn-icon">{NAV_ICONS.logout}</span>
            <span className="nav-btn-label">Cerrar sesión</span>
          </button>
        </footer>
      </aside>

      <main className="content">
        {activeSection === "students" && <StudentsPage />}
        {activeSection === "teachers" && <TeachersPage />}
        {activeSection === "subjects" && <SubjectsPage />}
        {activeSection === "grades" && <GradesPage />}
        {activeSection === "users" && <UsersPage />}
      </main>
    </div>
  );
}
