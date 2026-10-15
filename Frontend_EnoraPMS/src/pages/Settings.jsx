import { useEffect, useState, useCallback } from "react";
import toast from 'react-hot-toast';
import api from "../services/api";

const INITIAL_FORM_STATE = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "COLABORADOR"
};

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); // Estado para o modal customizado de aviso
  
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [originalRole, setOriginalRole] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null); // Guarda os dados enquanto o usuário confirma no modal

  // Estados de Formulário
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editData, setEditData] = useState({ firstName: "", lastName: "", email: "", role: "COLABORADOR" });
  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmNewPassword: "" });
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/auth/users");
      setUsers(response.data || []);
    } catch (error) {
      toast.error('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // --- LÓGICA DE CRIAÇÃO DE USUÁRIO ---
  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return toast.error("Nome e Sobrenome são obrigatórios.");
    }
    if (formData.password.length < 6) {
      return toast.error("A senha deve ter no mínimo 6 caracteres.");
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error("As senhas não coincidem.");
    }

    setSaving(true);
    const toastId = toast.loading('Criando usuário...');

    try {
      const payload = {
        nome: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.trim(),
        senha: formData.password,
        perfil: formData.role
      };

      await api.post("/auth/register", payload);
      toast.success('Usuário criado com sucesso!', { id: toastId });
      setFormData(INITIAL_FORM_STATE);
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Erro ao criar usuário';
      toast.error(typeof msg === 'string' ? msg : msg[0], { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // --- LÓGICA DE EDIÇÃO DE USUÁRIO (NOME, E-MAIL E PERFIL) ---
  const openEditModal = (user) => {
    setSelectedUserId(user.id);
    setOriginalRole(user.perfil);
    const partesNome = user.nome.split(" ");
    const primeiroNome = partesNome[0] || "";
    const sobrenome = partesNome.slice(1).join(" ") || "";

    setEditData({
      firstName: primeiroNome,
      lastName: sobrenome,
      email: user.email,
      role: user.perfil
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      return toast.error("Nome e Sobrenome são obrigatórios.");
    }

    const payload = {
      nome: `${editData.firstName.trim()} ${editData.lastName.trim()}`,
      email: editData.email.trim(),
      perfil: editData.role
    };

    // Regra de segurança: Se o usuário era privilegiado e mudou para um perfil inferior
    const privilegedRoles = ["ADMINISTRADOR", "GERENTE", "SUPORTE_TI"];
    const isDowngrading = privilegedRoles.includes(originalRole) && !privilegedRoles.includes(editData.role);

    if (isDowngrading) {
      setPendingPayload(payload);
      setIsEditModalOpen(false); // Fecha o modal de edição
      setIsConfirmModalOpen(true); // Abre o modal estilizado de aviso
      return;
    }

    executeSaveUpdate(payload);
  };

  const executeSaveUpdate = async (payload) => {
    setSaving(true);
    const toastId = toast.loading('Atualizando dados...');

    try {
      await api.patch(`/auth/users/${selectedUserId}`, payload);
      toast.success('Usuário atualizado com sucesso!', { id: toastId });
      setIsEditModalOpen(false);
      setIsConfirmModalOpen(false);
      loadUsers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Erro ao atualizar usuário';
      toast.error(typeof msg === 'string' ? msg : msg[0], { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // --- LÓGICA DE TROCA DE SENHA ---
  const openPasswordModal = (userId) => {
    setSelectedUserId(userId);
    setPasswordData({ newPassword: "", confirmNewPassword: "" });
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      return toast.error("A nova senha deve ter no mínimo 6 caracteres.");
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      return toast.error("As senhas não coincidem.");
    }

    setSaving(true);
    const toastId = toast.loading('Atualizando senha...');

    try {
      await api.patch(`/auth/users/${selectedUserId}/password`, {
        novaSenha: passwordData.newPassword
      });
      
      toast.success('Senha atualizada com sucesso!', { id: toastId });
      setIsPasswordModalOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar senha', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="maintenance-container">
      <style>{`
        .settings-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }
        .action-buttons-group {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .btn-table-action-edit {
          background-color: #3b82f6;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .btn-table-action-edit:hover { background-color: #2563eb; }

        .custom-modal-content {
          background: var(--modal-bg, #1e293b);
          color: var(--modal-text, #f8fafc);
          width: 90%;
          max-width: 500px;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid var(--modal-border, #334155);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          max-height: 90vh;
          overflow-y: auto;
        }
        body:not(.dark-mode) .custom-modal-content {
          --modal-bg: #ffffff;
          --modal-text: #0f172a;
          --modal-border: #cbd5e1;
        }
        .custom-input {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--input-border, #334155);
          background: var(--input-bg, #0f172a);
          color: var(--input-text, #fff);
          font-size: 14px;
        }
        body:not(.dark-mode) .custom-input {
          --input-bg: #f8fafc;
          --input-text: #0f172a;
          --input-border: #cbd5e1;
        }
        .custom-label {
          color: var(--label-color, #94a3b8);
          font-size: 12px;
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }
        body:not(.dark-mode) .custom-label {
          --label-color: #475569;
        }
      `}</style>

      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h1 className="pdv-main-title">Gerenciar Usuários</h1>
          <p className="pdv-subtitle">Controle de acessos, perfis e credenciais do sistema.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-pdv-primary">
          <i className='fas fa-user-plus'></i> Novo Usuário
        </button>
      </div>

      <div className="table-card animate-in">
        {loading ? (
          <div className="loading-container">
            <i className="fas fa-spinner fa-spin"></i> Carregando usuários...
          </div>
        ) : (
          <div className="settings-table-wrapper">
            <table className="guests-table">
              <thead>
                <tr className="table-header-row">
                  <th>ID</th>
                  <th>Nome Completo</th>
                  <th>E-mail</th>
                  <th>Perfil de Acesso</th>
                  <th className="text-right" style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="linha-manutencao">
                    <td><span className="dado-valor">{user.id}°</span></td>
                    <td>
                      <div className="guest-profile-cell">
                        <div className="guest-avatar">{user.nome.charAt(0)}</div>
                        <span className="dado-destaque">{user.nome}</span>
                      </div>
                    </td>
                    <td><span className="dado-valor">{user.email}</span></td>
                    <td>
                      <span className={`status-pill ${user.perfil.toLowerCase()}`} style={{ color: '#474646' }}>
                        {user.perfil}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="action-buttons-group">
                        <button 
                          className="btn-table-action-edit" 
                          onClick={() => openEditModal(user)}
                          title="Editar Dados"
                        >
                          <i className="fas fa-user-edit"></i> Editar
                        </button>
                        <button 
                          className="btn-table-action-blue" 
                          onClick={() => openPasswordModal(user.id)}
                          title="Trocar Senha"
                        >
                          <i className="fas fa-key"></i> Senha
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CRIAR NOVO USUÁRIO */}
      {isCreateModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div className="custom-modal-content">
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Criar Novo Usuário</h3>
            
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="custom-label">Primeiro Nome *</label>
                  <input required name="firstName" value={formData.firstName} onChange={handleInputChange} className="custom-input" placeholder="Ex: Marcos" />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="custom-label">Sobrenome *</label>
                  <input required name="lastName" value={formData.lastName} onChange={handleInputChange} className="custom-input" placeholder="Ex: Vinicios" />
                </div>
              </div>

              <div>
                <label className="custom-label">E-mail *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="custom-input" placeholder="email@hotel.com" />
              </div>

              <div>
                <label className="custom-label">Perfil de Acesso *</label>
                <select name="role" value={formData.role} onChange={handleInputChange} className="custom-input">
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="SUPORTE_TI">Suporte TI</option>
                  <option value="COLABORADOR">Colaborador (Recepção)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="custom-label">Senha *</label>
                  <input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="custom-input" placeholder="Mínimo 6 caracteres" />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="custom-label">Confirmar Senha *</label>
                  <input required type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="custom-input" placeholder="Repita a senha" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 16px', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {saving ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR NOME, E-MAIL E PERFIL */}
      {isEditModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div className="custom-modal-content">
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}><i className="fas fa-user-edit"></i> Editar Dados do Usuário</h3>
            
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="custom-label">Primeiro Nome *</label>
                  <input required name="firstName" value={editData.firstName} onChange={handleEditInputChange} className="custom-input" />
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="custom-label">Sobrenome *</label>
                  <input required name="lastName" value={editData.lastName} onChange={handleEditInputChange} className="custom-input" />
                </div>
              </div>

              <div>
                <label className="custom-label">E-mail *</label>
                <input required type="email" name="email" value={editData.email} onChange={handleEditInputChange} className="custom-input" />
              </div>

              <div>
                <label className="custom-label">Perfil de Acesso *</label>
                <select name="role" value={editData.role} onChange={handleEditInputChange} className="custom-input">
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="SUPORTE_TI">Suporte TI</option>
                  <option value="COLABORADOR">Colaborador (Recepção)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ESTILIZADO DE CONFIRMAÇÃO DE REBAIXAMENTO DE PERFIL */}
      {isConfirmModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="custom-modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ef4444', fontSize: '22px' }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>Atenção Necessária</h3>
            
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--modal-text, #f8fafc)', opacity: 0.9, marginBottom: '24px' }}>
              Você está alterando o perfil de <strong>"{originalRole}"</strong> para <strong>"{editData.role}"</strong>. Este usuário perderá privilégios administrativos e funções de gestão. Deseja realmente continuar?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => { setIsConfirmModalOpen(false); setIsEditModalOpen(true); }} 
                style={{ flex: 1, padding: '10px 16px', background: 'transparent', border: '1px solid var(--modal-border, #334155)', color: 'inherit', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                Voltar
              </button>
              <button 
                type="button" 
                disabled={saving}
                onClick={() => executeSaveUpdate(pendingPayload)} 
                style={{ flex: 1, padding: '10px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                {saving ? 'Salvando...' : 'Sim, continuar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TROCAR SENHA */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div className="custom-modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}><i className="fas fa-lock"></i> Redefinir Senha</h3>
            
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="custom-label">Nova Senha</label>
                <input required type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="custom-input" placeholder="Mínimo 6 caracteres" />
              </div>
              
              <div>
                <label className="custom-label">Confirmar Nova Senha</label>
                <input required type="password" name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} className="custom-input" placeholder="Repita a senha" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {saving ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}