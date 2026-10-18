import { useEffect, useState, useCallback } from "react";
import toast from 'react-hot-toast';
import api from "../services/api";

// ============================================================
// UTILITÁRIOS
// ============================================================

const maskCPF = (value) =>
  value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');

const INITIAL_FORM_STATE = {
  firstName: "",
  lastName: "",
  email: "",
  cpf: "",
  password: "",
  confirmPassword: "",
  role: "COLABORADOR"
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function Settings() {
  // --- Aba ativa ---
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'fnrh'

  // --- Usuários ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [originalRole, setOriginalRole] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editData, setEditData] = useState({ firstName: "", lastName: "", email: "", cpf: "", role: "COLABORADOR" });
  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmNewPassword: "" });
  const [saving, setSaving] = useState(false);

  // --- FNRH / Serpro ---
  const [fnrhConfig, setFnrhConfig] = useState({ serpro_usuario: '', serpro_chave: '' });
  const [fnrhStatus, setFnrhStatus] = useState({ configurado: false, serpro_usuario: null });
  const [savingFnrh, setSavingFnrh] = useState(false);
  const [loadingFnrh, setLoadingFnrh] = useState(false);

  // ============================================================
  // CARGA DE DADOS
  // ============================================================

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

  const loadFnrhConfig = useCallback(async () => {
    setLoadingFnrh(true);
    try {
      const response = await api.get("/fnrh/config");
      setFnrhStatus(response.data);
      setFnrhConfig(prev => ({
        ...prev,
        serpro_usuario: response.data.serpro_usuario || '',
      }));
    } catch (error) {
      // Silencioso — pode não estar configurado ainda
    } finally {
      setLoadingFnrh(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadFnrhConfig();
  }, [loadUsers, loadFnrhConfig]);

  // ============================================================
  // HANDLERS — USUÁRIOS
  // ============================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, cpf: maskCPF(value) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setEditData(prev => ({ ...prev, cpf: maskCPF(value) }));
      return;
    }
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return toast.error("Nome e Sobrenome são obrigatórios.");
    }
    const cpfLimpo = formData.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return toast.error("CPF inválido. Informe os 11 dígitos.");
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
        cpf: cpfLimpo,
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
      cpf: user.cpf ? maskCPF(user.cpf) : '',
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
      cpf: editData.cpf ? editData.cpf.replace(/\D/g, '') : undefined,
      perfil: editData.role
    };

    const privilegedRoles = ["ADMINISTRADOR", "GERENTE", "SUPORTE_TI"];
    const isDowngrading = privilegedRoles.includes(originalRole) && !privilegedRoles.includes(editData.role);

    if (isDowngrading) {
      setPendingPayload(payload);
      setIsEditModalOpen(false);
      setIsConfirmModalOpen(true);
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

  // ============================================================
  // HANDLERS — FNRH / SERPRO
  // ============================================================

  const handleFnrhInputChange = (e) => {
    const { name, value } = e.target;
    setFnrhConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveFnrhConfig = async (e) => {
    e.preventDefault();

    if (!fnrhConfig.serpro_usuario?.trim() || !fnrhConfig.serpro_chave?.trim()) {
      return toast.error('Preencha o Usuário API e a Chave API.');
    }

    setSavingFnrh(true);
    const toastId = toast.loading('Salvando credenciais...');

    try {
      await api.post('/fnrh/config', {
        serpro_usuario: fnrhConfig.serpro_usuario.trim(),
        serpro_chave: fnrhConfig.serpro_chave.trim(),
      });
      toast.success('Credenciais FNRH salvas com sucesso!', { id: toastId });
      setFnrhConfig(prev => ({ ...prev, serpro_chave: '' })); // Limpa a chave da tela
      loadFnrhConfig(); // Recarrega o status
    } catch (error) {
      const msg = error.response?.data?.message || 'Erro ao salvar credenciais';
      toast.error(typeof msg === 'string' ? msg : msg[0], { id: toastId });
    } finally {
      setSavingFnrh(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="maintenance-container">
      <style>{`
        /* ---- TABS ---- */
        .settings-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 2px solid var(--tab-border, #1e293b);
          margin-bottom: 24px;
        }
        .tab-btn {
          padding: 10px 20px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: var(--tab-inactive, #64748b);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s, border-color 0.2s;
        }
        .tab-btn.active {
          color: var(--tab-active, #4a6cf7);
          border-bottom-color: var(--tab-active, #4a6cf7);
        }
        .tab-btn:hover:not(.active) { color: var(--tab-hover, #94a3b8); }
        body:not(.dark-mode) .tab-btn { --tab-inactive: #475569; --tab-hover: #1e293b; }

        /* ---- STATUS FNRH ---- */
        .fnrh-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }
        .fnrh-status-badge.ok { background: rgba(16,185,129,0.12); color: #10b981; }
        .fnrh-status-badge.pending { background: rgba(245,158,11,0.12); color: #f59e0b; }

        /* ---- SETTINGS TABLE ---- */
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

        /* ---- MODAIS ---- */
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
          box-sizing: border-box;
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
        body:not(.dark-mode) .custom-label { --label-color: #475569; }

        /* ---- CARD FNRH ---- */
        .fnrh-config-card {
          background: var(--card-bg, #1e293b);
          border: 1px solid var(--card-border, #334155);
          border-radius: 12px;
          padding: 24px;
          max-width: 560px;
        }
        body:not(.dark-mode) .fnrh-config-card {
          --card-bg: #f8fafc;
          --card-border: #e2e8f0;
        }
        .fnrh-config-card h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
        }
        .fnrh-config-card p {
          margin: 0 0 20px 0;
          font-size: 13px;
          opacity: 0.7;
          line-height: 1.5;
        }
      `}</style>

      {/* CABEÇALHO */}
      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h1 className="pdv-main-title">Configurações</h1>
          <p className="pdv-subtitle">Gerenciamento de usuários e integrações do sistema.</p>
        </div>

        {/* Botão contextual por aba */}
        {activeTab === 'usuarios' && (
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-pdv-primary">
            <i className='fas fa-user-plus'></i> Novo Usuário
          </button>
        )}
      </div>

      {/* SISTEMA DE ABAS */}
      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          <i className="fas fa-users"></i> Usuários
        </button>
        <button
          className={`tab-btn ${activeTab === 'fnrh' ? 'active' : ''}`}
          onClick={() => setActiveTab('fnrh')}
        >
          <i className="fas fa-plug"></i> Integração FNRH
        </button>
      </div>

      {/* ============================================================ */}
      {/* ABA 1 — USUÁRIOS                                              */}
      {/* ============================================================ */}
      {activeTab === 'usuarios' && (
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
                    <th>CPF</th>
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
                        <span className="dado-valor" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {user.cpf ? maskCPF(user.cpf) : '—'}
                        </span>
                      </td>
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
      )}

      {/* ============================================================ */}
      {/* ABA 2 — INTEGRAÇÃO FNRH / SERPRO                             */}
      {/* ============================================================ */}
      {activeTab === 'fnrh' && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Status atual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>Status da integração:</span>
            {loadingFnrh ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : fnrhStatus.configurado ? (
              <span className="fnrh-status-badge ok">
                <i className="fas fa-check-circle"></i> Configurada
              </span>
            ) : (
              <span className="fnrh-status-badge pending">
                <i className="fas fa-exclamation-circle"></i> Não configurada
              </span>
            )}
          </div>

          {/* Formulário de credenciais */}
          <div className="fnrh-config-card">
            <h3><i className="fas fa-key" style={{ marginRight: '8px', color: '#4a6cf7' }}></i>Credenciais API Serpro</h3>
            <p>
              Insira as credenciais fornecidas pelo Serpro para habilitar a consulta automática
              de hóspedes por CPF (FNRH v2 — homologação / produção).
            </p>

            {fnrhStatus.configurado && fnrhStatus.serpro_usuario && (
              <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <i className="fas fa-info-circle" style={{ color: '#10b981', marginRight: '6px' }}></i>
                Usuário atual: <strong>{fnrhStatus.serpro_usuario}</strong>
                {' — '}Para atualizar, preencha os campos abaixo e salve.
              </div>
            )}

            <form onSubmit={handleSaveFnrhConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="custom-label">Usuário API *</label>
                <input
                  required
                  name="serpro_usuario"
                  value={fnrhConfig.serpro_usuario}
                  onChange={handleFnrhInputChange}
                  className="custom-input"
                  placeholder="Usuário fornecido pelo Serpro"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="custom-label">Chave API (senha) *</label>
                <input
                  required
                  type="password"
                  name="serpro_chave"
                  value={fnrhConfig.serpro_chave}
                  onChange={handleFnrhInputChange}
                  className="custom-input"
                  placeholder={fnrhStatus.configurado ? '••••••••  (deixe em branco para manter atual)' : 'Chave fornecida pelo Serpro'}
                  autoComplete="new-password"
                />
                {fnrhStatus.configurado && (
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    A chave não é exibida por segurança. Preencha apenas para atualizá-la.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={savingFnrh}
                  style={{ padding: '10px 20px', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {savingFnrh ? (
                    <><i className="fas fa-spinner fa-spin"></i> Salvando...</>
                  ) : (
                    <><i className="fas fa-save"></i> Salvar Credenciais</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Info técnica */}
          <div style={{ padding: '14px 16px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.15)', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', maxWidth: '560px' }}>
            <strong><i className="fas fa-shield-alt" style={{ marginRight: '6px', color: '#4a6cf7' }}></i>Como funciona a segurança:</strong>
            <br />
            Cada consulta ao Serpro envia automaticamente o <code>Authorization: Basic {'{credenciais}'}</code> e o
            header <code>cpf_solicitante</code> com o CPF do operador logado, garantindo rastreabilidade
            completa das consultas conforme exigido pela FNRH v2.
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CRIAR NOVO USUÁRIO                                     */}
      {/* ============================================================ */}
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
                <label className="custom-label">CPF * <span style={{ fontSize: '11px', opacity: 0.7 }}>(usado como identificador de auditoria na FNRH)</span></label>
                <input
                  required
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className="custom-input"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  style={{ fontFamily: 'monospace' }}
                />
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

      {/* ============================================================ */}
      {/* MODAL: EDITAR NOME, E-MAIL, CPF E PERFIL                      */}
      {/* ============================================================ */}
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
                <label className="custom-label">CPF</label>
                <input
                  name="cpf"
                  value={editData.cpf}
                  onChange={handleEditInputChange}
                  className="custom-input"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  style={{ fontFamily: 'monospace' }}
                />
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