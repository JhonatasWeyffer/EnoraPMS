import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, RefreshCw, LogOut, ChevronDown, Moon, Sun, Volume2, VolumeX } from "lucide-react";

export default function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

  // Estados para Preferências
  const [isDark, setIsDark] = useState(localStorage.getItem("theme") === "dark");
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem("notifications_sound") !== "false");

  // Alternar Modo Escuro
  const toggleTheme = () => {
    const newTheme = !isDark ? "dark" : "light";
    setIsDark(!isDark);
    localStorage.setItem("theme", newTheme);
    document.body.classList.toggle("dark-mode");
  };

  // Alternar Som de Notificação
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem("notifications_sound", newState);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    // Aplica o tema ao carregar
    if (localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark-mode");
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Lógica blindada de controle de acesso (RBAC Frontend)
  const userRole = user?.role || user?.perfil || "";
  const canAccessSettings = ["ADMINISTRADOR", "GERENTE", "SUPORTE_TI"].includes(userRole.toUpperCase());

  return (
    <div className={`user-scope ${isDark ? 'dark-mode' : ''}`} ref={menuRef}>
      <button className="user-pill" onClick={() => setIsOpen(!isOpen)}>
        <div className="avatar-circle">
          {user?.nome ? user.nome.charAt(0).toUpperCase() : <User size={18} />}
        </div>
        <div className="user-label">
          <span className="u-name">{user?.nome || user?.name}</span>
        </div>
        <ChevronDown className={`u-arrow ${isOpen ? 'rotated' : ''}`} size={16} />
      </button>

      {isOpen && (
        <div className="user-flyout">
          <div className="flyout-header">
            <p className="f-title">Minha Conta</p>
            <p className="f-email">{user?.email}</p>
          </div>
          
          <div className="flyout-items">
            {/* Opção: MODO ESCURO */}
            <button onClick={toggleTheme}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>
            </button>

            {/* Opção: SOM DE NOTIFICAÇÃO */}
            <button onClick={toggleSound}>
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span>Som: {soundEnabled ? "Ativado" : "Mudo"}</span>
            </button>
            
            {/* Opção: GERENCIAR USUÁRIOS (Acesso Restrito) */}
            {canAccessSettings && (
              <button onClick={() => navigate('/settings')}>
                <Settings size={18} />
                <span>Configurações</span>
              </button>
            )}

            <div className="flyout-divider"></div>
            
            <button className="f-logout" onClick={handleLogout}>
              <LogOut size={18} /> <span>Sair do Sistema</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}