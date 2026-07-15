import { useEffect, useState } from "react";
import { SidebarBrand } from "./components/SidebarBrand";
import { GradesPage } from "./pages/GradesPage";
import { LoginPage } from "./pages/LoginPage";
import { StudentsPage } from "./pages/StudentsPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { TeachersPage } from "./pages/TeachersPage";
import { useAuth } from "./useAuth";

type Section = "students" | "teachers" | "subjects" | "grades";

const sections: { id: Section; label: string }[] = [
  { id: "students", label: "Estudiantes" },
  { id: "subjects", label: "Materias" },
  { id: "teachers", label: "Profesores" },
  { id: "grades", label: "Notas" },
];

export default function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const [section, setSection] = useState<Section>("students");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (!isAuthenticated || !user) {
    return <LoginPage onLogin={login} />;
  }

  const visibleSections = sections;
  const activeSection = visibleSections.some((item) => item.id === section)
    ? section
    : visibleSections[0]?.id ?? "students";
  const activeLabel =
    visibleSections.find((item) => item.id === activeSection)?.label ?? "Menú";

  function goToSection(id: Section) {
    setSection(id);
    setMenuOpen(false);
  }

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="hamburger-btn"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <strong className="mobile-topbar-title">{activeLabel}</strong>
        <span className="mobile-topbar-spacer" />
      </header>

      <div
        className="sidebar-backdrop"
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      <aside className="sidebar" aria-hidden={false}>
        <div className="sidebar-mobile-header">
          <span>Menú</span>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>
        <SidebarBrand />
        <nav className="sidebar-nav">
          {visibleSections.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activeSection === item.id ? "active" : ""}`}
              onClick={() => goToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <div className="session-info">
            <span>
              {user.firstName} {user.lastName}
            </span>
            <span className="badge">{user.role}</span>
          </div>
          <button type="button" className="nav-btn logout-btn" onClick={logout}>
            Cerrar sesión
          </button>
        </footer>
      </aside>

      <main className="content">
        {activeSection === "students" && <StudentsPage />}
        {activeSection === "teachers" && <TeachersPage />}
        {activeSection === "subjects" && <SubjectsPage />}
        {activeSection === "grades" && <GradesPage />}
      </main>
    </div>
  );
}
