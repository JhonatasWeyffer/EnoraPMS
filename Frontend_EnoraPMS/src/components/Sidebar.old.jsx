import { NavLink } from "react-router-dom";

// Adicionei a propriedade 'icon' para cada rota
const links = [
  { to: "/", label: "Início", icon: "bx-grid-alt" },
  { to: "/reservations", label: "Reservas", icon: "bx-calendar-check" },
  { to: "/checkin-checkout", label: "Check-in / Check-out", icon: "bx-transfer" },
  //{ to: "/rooms", label: "Quartos", icon: "bx-door-open" },
  { to: "/reservation-map", label: "Calendário de Reservas", icon: "bx-map-alt" },
  { to: "/company", label: "Convênios", icon: "bx-building" },
  { to: "/housekeeping", label: "Governança", icon: "bx-layer"},
  { to: "/maintenance", label: "Manutenção", icon: "bx-wrench" },
  { to: "/guests", label: "Hóspedes", icon: "bx-user-circle" },
 // { to: "/fnrh", label: "FNRH", icon: "bx-file" },
  { to: "/financial", label: "Caixa Diário", icon: "bx-money" },
  { to: "/reports", label: "Relatórios", icon: "bx-bar-chart-alt-2" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* <div className="sidebar-logo">
        <h2>Solimoes PMS</h2>
      </div> */}
      
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? "menu-link active" : "menu-link"
            }
          >
            {/* Ícone dinâmico baseado no objeto links */}
            <i className={`bx ${link.icon} menu-icon`}></i>
            <span className="menu-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <br />
      <div className="sidebar-footer">
        <p>v3.0.0</p>
      </div>
    </aside>
  );
}