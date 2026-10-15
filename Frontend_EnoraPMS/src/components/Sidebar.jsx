import { NavLink } from "react-router-dom";

export default function Sidebar() {
  // 1. Recupera o usuário e o perfil armazenado no login
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Cobre as duas nomenclaturas possíveis vindas do seu auth.service.ts
  const role = user?.role || user?.perfil; 

  // 2. Matriz de rotas com a regra de bloqueio (Blocklist)
  const links = [
    { to: "/", label: "Início", icon: "bx-grid-alt" },
    { to: "/guests", label: "Hóspedes", icon: "bx-user-circle" },
    { to: "/reservations", label: "Reservas", icon: "bx-calendar-check" },
    { to: "/reservation-map", label: "Calendário de Reservas", icon: "bx-map-alt" },
    { to: "/checkin-checkout", label: "Check-in / Check-out", icon: "bx-transfer" },
    { to: "/housekeeping", label: "Governança", icon: "bx-layer" },
    { to: "/maintenance", label: "Manutenção", icon: "bx-wrench" },
    { to: "/company", label: "Convênios", icon: "bx-building" },
    // Aplicação da trava: bloqueado APENAS para colaboradores
    { to: "/financial", label: "Caixa Diário", icon: "bx-money", blockedFor: ["COLABORADOR"] },
    { to: "/reports", label: "Relatórios", icon: "bx-bar-chart-alt-2", blockedFor: ["COLABORADOR"] },
  ];

  // 3. O motor de renderização filtra a lista antes de desenhar o menu
  const visibleLinks = links.filter((link) => {
    if (link.blockedFor && link.blockedFor.includes(role)) {
      return false; // Remove da barra lateral se a regra de bloqueio atingir o perfil
    }
    return true;
  });

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? "menu-link active" : "menu-link"
            }
          >
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