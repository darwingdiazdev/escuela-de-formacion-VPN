import { LOGO_EDUCACION, LOGO_VPN } from "../branding";

export function SidebarBrand() {
  return (
    <div className="sidebar-brand">
      <img src={LOGO_VPN} alt="VPN" className="sidebar-logo sidebar-logo-vpn" />
      <span className="sidebar-logo-divider" aria-hidden="true">
        |
      </span>
      <img
        src={LOGO_EDUCACION}
        alt="Educación Cristiana"
        className="sidebar-logo sidebar-logo-educacion"
      />
    </div>
  );
}
