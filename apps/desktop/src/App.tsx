import { useState } from "react";
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

  if (!isAuthenticated || !user) {
    return <LoginPage onLogin={login} />;
  }

  const visibleSections = sections;
  const activeSection = visibleSections.some((item) => item.id === section)
    ? section
    : visibleSections[0]?.id ?? "students";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <SidebarBrand />
        <nav className="sidebar-nav">
          {visibleSections.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activeSection === item.id ? "active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <p className="sidebar-footer-system">Escuela de formación bíblica "Equipados para la obra"</p>
          <div className="session-info">
            <span>{user.firstName} {user.lastName}</span>
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
