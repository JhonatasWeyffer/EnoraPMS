import { Link } from "react-router-dom";
import UserMenu from "./UserMenu";
import { useState } from "react";

export default function Header() {
  // 1. Recupera o usuário e o perfil armazenado no login (Igual ao seu Sidebar)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role || user?.perfil; 
  
  const [menuOpen, setMenuOpen] = useState(false);

  // 2. Matriz de rotas do Header com as travas de bloqueio (Blocklist)
  const links = [
    { to: "/reservation-map", label: "CALENDÁRIO", icon: "fa-calendar-alt" },
    { to: "/checkin-checkout", label: "CHECK-IN/OUT", icon: "fa-door-open" },
    
    // Bloqueados apenas para o operador comum (Colaborador)
    { to: "/reports", label: "RELATÓRIOS", icon: "fa-chart-bar", blockedFor: ["COLABORADOR"] },
    { to: "/financial", label: "PDV", icon: "fa-cash-register", blockedFor: ["COLABORADOR"] },
    
    // Aparecem para o Colaborador (Bloqueados para Admin, Gerente e Suporte se não quiser duplicar no topo)
    { to: "/guests", label: "HÓSPEDES", icon: "fa-user-friends", blockedFor: ["ADMINISTRADOR", "GERENTE"] },
    { to: "/reservations", label: "RESERVAS", icon: "fa-book", blockedFor: ["ADMINISTRADOR", "GERENTE"] },
  ];

  // 3. O mesmo motor de renderização que filtra a lista antes de desenhar o Header
  const visibleLinks = links.filter((link) => {
    if (link.blockedFor && link.blockedFor.includes(role)) {
      return false; // Remove se o perfil atual estiver na lista de bloqueados
    }
    return true;
  });

  return (
    <header className="app-header">
      {/* Botão Hambúrguer para Mobile */}
      <div className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </div>

      <div className="header-left">
        <img src="/img/LogoSesc.png" alt="Logo" className="header-logo" draggable="false" />
      </div>

      {/* Navegação Dinâmica Baseada no Filtro da Matriz */}
      <nav className={`header-nav ${menuOpen ? 'active' : ''}`}>
        {visibleLinks.map((link) => (
          <Link 
            key={link.to} 
            to={link.to} 
            onClick={() => setMenuOpen(false)}
          >
            <i className={`fas ${link.icon}`}></i>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="header-right">
        <UserMenu user={user} />
      </div>
    </header>
  );
}