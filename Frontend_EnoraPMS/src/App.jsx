import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import DefaultLayout from "./layouts/DefaultLayout";
import Support from './components/Support'; 

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ReservationMap from "./pages/ReservationMap";
import Rooms from "./pages/Rooms";
import Reservations from "./pages/Reservations";
import CheckinCheckout from "./pages/CheckinCheckout";
import Financial from "./pages/Financial";
import Maintenance from "./pages/Maintenance";
import Guests from "./pages/Guests";           
import Housekeeping from "./pages/Housekeeping";
import Reports from "./pages/Reports.jsx";
import Company from "./pages/Company.jsx";
import Settings from "./pages/Settings.jsx";
import { Toaster } from 'react-hot-toast';

import api from "./services/api"; 

/* ===== PROTEÇÃO DE ROTA BÁSICA ===== */
function PrivateRoute({ children }) {
  const user = localStorage.getItem("user");
  return user ? children : <Navigate to="/login" />;
  // return children;
}

/* ===== PROTEÇÃO DE ROTA AVANÇADA (POR CARGO) ===== */
function RoleProtectedRoute({ blockedRoles }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role || user?.perfil;

  // Se o cargo do usuário estiver na lista de bloqueados, ele é chutado para a Dashboard
  if (blockedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // Se passou na verificação, renderiza as telas filhas livremente
  return <Outlet />;
}

export default function App() {
  const [sessionExpired, setSessionExpired] = useState(
    localStorage.getItem("sessionExpired") === "true"
  );

  useEffect(() => {
    // Interceptor Global
    const interceptor = api.interceptors.response.use(
      (response) => response, 
      (error) => {
        // 1. Identifica se a requisição que falhou era de autenticação (Login)
        const isLoginRequest = error.config?.url?.includes('login') || error.config?.url?.includes('auth');
        const isLoginPage = window.location.pathname === '/login';

        // 2. Se for erro 401, E NÃO for uma tentativa de login, bloqueia o sistema
        if (error.response && error.response.status === 401 && !isLoginRequest && !isLoginPage) {
          setSessionExpired(true);
          localStorage.setItem("sessionExpired", "true");
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const handleForceLogout = () => {
    localStorage.clear(); 
    window.location.href = "/login";
  };

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            fontSize: '14px',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            style: {
              background: '#065f46',
              color: '#d1fae5',
              border: '1px solid #059669',
            },
            iconTheme: { primary: '#34d399', secondary: '#064e3b' },
          },
          error: {
            style: {
              background: '#7f1d1d',
              color: '#fee2e2',
              border: '1px solid #dc2626',
            },
            iconTheme: { primary: '#f87171', secondary: '#7f1d1d' },
            duration: 7000,
          },
          loading: {
            style: {
              background: '#1e3a5f',
              color: '#dbeafe',
              border: '1px solid #3b82f6',
            },
          },
        }}
        containerStyle={{ bottom: 20, right: 20, zIndex: 999999 }}
      />

      {/* ===== MODAL GLOBAL DE SESSÃO EXPIRADA ===== */}
      {sessionExpired && window.location.pathname !== '/login' && (
        <div style={overlayStyle}>
          <div style={modalContentStyle}>
            <div style={iconContainerStyle}>
              <i className="fas fa-lock" style={{ fontSize: '24px', color: '#ef4444' }}></i>
            </div>
            <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '20px' }}>Sessão Expirada</h3>
            
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5', marginBottom: '15px' }}>
              Por motivos de segurança, sua conexão com o sistema foi encerrada. Isso pode ocorrer pelas seguintes razões:
            </p>
            
            <ul style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6', paddingLeft: '20px', marginBottom: '20px', textAlign: 'left' }}>
              <li>Muito tempo de inatividade no sistema;</li>
              <li>Alteração nas credenciais de acesso;</li>
              <li>A conta foi conectada em outro dispositivo;</li>
              <li>Token de segurança corrompido ou vencido.</li>
            </ul>

            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '25px', fontStyle: 'italic' }}>
              Se o problema persistir após entrar novamente, contate o Suporte Técnico.
            </p>

            <button 
              onClick={handleForceLogout}
              style={buttonStyle}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              Fazer Login Novamente
            </button>
          </div>
        </div>
      )}

      <Routes>
        {/* ===== ROTA PÚBLICA ===== */}
        <Route path="/login" element={<Login />} />
        <Route path="/support" element={<Support />} />
        
        {/* ===== ROTAS PRIVADAS ===== */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DefaultLayout />
            </PrivateRoute>
          }
        >
          {/* Rotas de Acesso Global (Qualquer utilizador autenticado acede) */}
          <Route index element={<Dashboard />} />
          <Route path="reservation-map" element={<ReservationMap />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="checkin-checkout" element={<CheckinCheckout />} />
          <Route path="guests" element={<Guests />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="housekeeping" element={<Housekeeping />} />
          <Route path="company" element={<Company />} />

          {/* Rota da Página de Configurações / Gerenciamento de Usuários */}
          <Route element={<RoleProtectedRoute blockedRoles={["COLABORADOR"]} />}>
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Rotas de Acesso Restrito (Colaboradores não entram aqui) */}
          <Route element={<RoleProtectedRoute blockedRoles={["COLABORADOR"]} />}>
            <Route path="financial" element={<Financial />} />
            <Route path="reports" element={<Reports />} />
          </Route>

        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

// ===== ESTILOS INLINE =====
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
  backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999999,
};

const modalContentStyle = {
  backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px',
  width: '90%', maxWidth: '450px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  textAlign: 'center', position: 'relative'
};

const iconContainerStyle = {
  width: '50px', height: '50px', backgroundColor: '#fee2e2',
  borderRadius: '50%', display: 'flex', justifyContent: 'center',
  alignItems: 'center', margin: '0 auto 20px auto'
};

const buttonStyle = {
  backgroundColor: '#3b82f6', color: '#ffffff', border: 'none',
  padding: '12px 24px', borderRadius: '6px', fontSize: '14px',
  fontWeight: '600', cursor: 'pointer', width: '100%', transition: 'background 0.2s',
};