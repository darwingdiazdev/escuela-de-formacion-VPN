import { ReactNode, useState } from "react";

interface FiltersPanelProps {
  children: ReactNode;
  title?: string;
}

export function FiltersPanel({ children, title = "Filtros" }: FiltersPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`filters-panel${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="filters-panel-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{title}</span>
        <span className="filters-panel-chevron" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>
      <div className="filters-panel-body">{children}</div>
    </div>
  );
}
