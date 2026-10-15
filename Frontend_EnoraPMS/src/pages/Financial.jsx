import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import MoneyInput from "../components/MoneyInput";
import Modal from "../components/Modal";
import "../styles/financial.css";


export default function Financial() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showEditSelector, setShowEditSelector] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showReminders, setShowReminders] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({ titulo: "", descricao: "" });
  const [hotelStatus, setHotelStatus] = useState({ checkIns: 0, checkOuts: 0, ocupacao: 0 });
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  
  // Estado do formulário perfeitamente alinhado com o Backend (Prisma)
  const [formData, setFormData] = useState({ 
    descricao: "", 
    valor: 0, 
    metodo: "Pix", 
    tipo: "RECEITA" 
  });

  useEffect(() => { 
    loadCash();
    loadHotelStatus(); 
  }, []);

  async function loadCash() {
    try {
      const response = await api.get("/financial/today");
      setTransactions(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (e) { 
      console.error("Erro ao carregar caixa:", e); 
      toast.error("Erro ao carregar as movimentações do dia.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.descricao.trim() || formData.valor <= 0) {
      toast.error("Preencha a descrição e informe um valor maior que zero.");
      return;
    }

    const finalAmount = formData.tipo === "DESPESA" ? -Math.abs(formData.valor) : Math.abs(formData.valor);

    try {
      if (editingId) {
        await api.put(`/financial/${editingId}`, {
          descricao: formData.descricao,
          valor: finalAmount,
          metodo: formData.metodo,
          tipo: formData.tipo
        });
        toast.success("Lançamento updated com sucesso!");
      } else {
        await api.post("/financial", {
          descricao: formData.descricao,
          valor: finalAmount,
          metodo: formData.metodo,
          tipo: formData.tipo
        });
        toast.success("Lançamento registrado com sucesso!");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ descricao: "", valor: 0, metodo: "Pix", tipo: "RECEITA" });
      loadCash();
      loadHotelStatus();
    } catch (e) {
      console.error("Erro ao salvar:", e);
      toast.error(e.response?.data?.message || "Erro ao registrar o lançamento.");
    }
  }

  async function loadReminders() {
    try {
      const res = await api.get('/financial/turn-reminders');
      const dadosDoBackend = res.data || [];
      const vistosNoLocal = JSON.parse(localStorage.getItem('lembretes_vistos') || '[]');
      
      const dadosMapeados = dadosDoBackend.map(r => ({
        ...r,
        lido: vistosNoLocal.includes(r.id)
      }));

      setReminders(dadosMapeados);
    } catch (e) {
      console.error('Erro ao carregar lembretes:', e);
      toast.error('Erro ao carregar lembretes.');
    }
  }

  async function handleSaveReminder(e) {
    e.preventDefault();
    if (!newReminder.descricao.trim()) {
      toast.error('Digite a descrição do lembrete antes de salvar.');
      return;
    }
    try {
      await api.post('/financial/turn-reminders', newReminder);
      toast.success('Lembrete salvo com sucesso!');
      setNewReminder({ titulo: '', descricao: '' });
      await loadReminders();
    } catch (err) {
      console.error('Erro ao salvar lembrete:', err);
      toast.error(err.response?.data?.message || 'Erro ao salvar lembrete.');
    }
  }

  // Função para o botão "Visto" funcionar
  async function handleMarkRemindersSeen() {
    if (selectedReminderIds.length === 0) {
      toast.error('Selecione ao menos um lembrete no quadradinho.');
      return;
    }

    // 1. Busca os IDs salvos anteriormente no navegador
    const vistosAntigos = JSON.parse(localStorage.getItem('lembretes_vistos') || '[]');
    
    // 2. Mescla com os IDs que o usuário acabou de marcar nos checkboxes
    const todosVistos = Array.from(new Set([...vistosAntigos, ...selectedReminderIds]));
    
    // 3. Salva a lista final no localStorage
    localStorage.setItem('lembretes_vistos', JSON.stringify(todosVistos));

    // 4. Atualiza o estado do React para mudar a cor apenas dos lembretes selecionados
    setReminders(prev => prev.map(r => 
      selectedReminderIds.includes(r.id) ? { ...r, lido: true } : r
    ));

    // 5. Limpa os quadradinhos selecionados
    setSelectedReminderIds([]);

    toast.success('Lembretes selecionados foram marcados como vistos!');
  }

  async function loadHotelStatus() {
    try {
      const response = await api.get("/financial/hotel-status");
      setHotelStatus(response.data);
    } catch (e) {
      console.error("Erro ao carregar status operacional do hotel:", e);
    }
  }

  const totalReceitas = transactions
    .filter(t => Number(t.valor) > 0)
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const totalDespesas = transactions
    .filter(t => Number(t.valor) < 0)
    .reduce((acc, t) => acc + Math.abs(Number(t.valor)), 0);

  return (
    <div className="pdv-dashboard-container">
      
      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h1 className="pdv-main-title">PDV / Caixa Diário</h1>
          <p className="pdv-subtitle">Fluxo de vendas e caixa automatizado</p>
        </div>
        <div className="pdv-action-group">
          <button
            onClick={() => {
              const isClosing = showForm;
              setShowForm(!showForm);
              if (isClosing) {
                setFormData({ descricao: "", valor: 0, metodo: "Pix", tipo: "RECEITA" });
                setEditingId(null);
              }
            }}
            className={`btn-pdv-primary-b ${showForm ? 'active' : ''}`}
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i> 
            {showForm ? " Cancelar" : " Nova Venda / Lançamento"}
          </button>

          <button
            onClick={() => setShowEditSelector(true)}
            className="btn-icon-secondary"
          >
            <i className="fas fa-edit"></i>
            Editar lançamento
          </button>

          <button
            onClick={() => {
              setShowReminders(true);
              loadReminders();
            }}
            className="btn-icon-secondary"
          >
            <i className="fas fa-bell"></i>
            Lembretes
          </button>
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="pdv-summary-grid">
        <div className="summary-card balance-card">
          <div className="card-inner">
            <span className="summary-label">Saldo em Caixa (Diário)</span>
            <h2 className={`summary-value ${total >= 0 ? 'text-entrada' : 'text-saida'}`}>
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div className="summary-card income-card">
          <div className="card-inner">
            <span className="summary-label">Total Recebido Hoje</span>
            <h2 className="summary-value text-entrada" style={{ fontSize: "28px" }}>
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div className="summary-card expense-card">
          <div className="card-inner">
            <span className="summary-label">Total Pago Hoje</span>
            <h2 className="summary-value text-saida" style={{ fontSize: "28px" }}>
              R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div className="summary-card count-card">
          <div className="card-inner">
            <span className="summary-label">Movimentações</span>
            <h2 className="summary-value" style={{ fontSize: "28px", color: "#64748b" }}>
              {transactions.length}
            </h2>
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO */}
      {showForm && (
        <div className="pdv-form-wrapper animate-in">
          <form onSubmit={handleSubmit} className="pdv-form">
            <div className="input-group">
              <label className="label-descricao">Descrição da Venda/Lançamento</label>
              <input 
                value={formData.descricao}
                onChange={e => setFormData({...formData, descricao: e.target.value})}
                required
                placeholder="Ex: Diária Suíte 102 ou Compra de Materiais"
                className="input-padrao"
              />
            </div>

            <div className="input-group">
              <label className="label-descricao">Tipo</label>
              <select 
                className="input-padrao"
                value={formData.tipo} 
                onChange={e => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="RECEITA">Recebimento (+)</option>
                <option value="DESPESA">Pagamento (-)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label-descricao">Forma de Pagto</label>
              <select 
                className="input-padrao"
                value={formData.metodo} 
                onChange={e => setFormData({...formData, metodo: e.target.value})}
              >
                <option value="Pix">Pix</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            <div className="input-group">
              <MoneyInput 
                label="Valor Total"
                value={formData.valor}
                onChange={(val) => setFormData({...formData, valor: val})}
              />
            </div>

            <button type="submit" className="btn-confirm-sale">
              <i className="fas fa-check"></i> Finalizar
            </button>
          </form>
        </div>
      )}

      {/* LAYOUT EM DUAS COLUNAS */}
      <div className="pdv-main-content-layout">
        
        {/* COLUNA ESQUERDA: Tabela de Movimentações */}
        <div className="pdv-table-wrapper" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
          <table className="pdv-table">
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <tr key={t.id} className="linha-pdv">
                    <td className="col-hora">
                      <span className="label-descricao">Hora</span>
                      <span className="dado-valor">{t.time ?? '—'}</span>
                    </td>
                    <td className="col-desc">
                      <span className="label-descricao">Descrição do Lançamento</span>
                      <span className="dado-valor strong-desc">{t.descricao}</span>
                    </td>
                    <td className="col-pagto">
                      <span className="label-descricao">Pagamento</span>
                      <span className="method-pill">{t.metodo}</span>
                    </td>
                    <td className="col-valor text-right">
                      <span className="label-descricao">Valor</span>
                      <span className={`dado-valor font-bold ${Number(t.valor) < 0 ? 'text-saida' : 'text-entrada'}`}>
                        {Number(t.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-row-pdv">
                    <div className="empty-state">
                      <i className="fas fa-shopping-cart"></i>
                      <span>Aguardando a primeira venda ou lançamento do dia...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* COLUNA DIREITA: Cockpit Operacional */}
        <div className="hotel-ops-sidebar animate-in">
          <h3 className="sidebar-title">
            <i className="fas fa-hotel"></i> Operação do Hotel (Hoje)
          </h3>
          <p className="sidebar-subtitle">Fique de olho nos fluxos de balcão</p>
          
          <div className="ops-list">
            <div className="ops-item">
              <div className="ops-icon-wrapper checkin">
                <i className="fas fa-sign-in-alt"></i>
              </div>
              <div className="ops-info">
                <span className="ops-label">Check-ins Pendentes</span>
                <span className="ops-qty">
                  {hotelStatus.checkIns} {hotelStatus.checkIns === 1 ? 'quarto' : 'quartos'}
                </span>
              </div>
            </div>

            <div className="ops-item">
              <div className="ops-icon-wrapper checkout">
                <i className="fas fa-sign-out-alt"></i>
              </div>
              <div className="ops-info">
                <span className="ops-label">Check-outs Aguardados</span>
                <span className="ops-qty">
                  {hotelStatus.checkOuts} {hotelStatus.checkOuts === 1 ? 'quarto' : 'quartos'}
                </span>
              </div>
            </div>

            <div className="ops-item">
              <div className="ops-icon-wrapper occupation">
                <i className="fas fa-bed"></i>
              </div>
              <div className="ops-info">
                <span className="ops-label">Taxa de Ocupação</span>
                <span className="ops-qty">{hotelStatus.ocupacao}%</span>
              </div>
            </div>
          </div>

          <div className="sidebar-footer-tip">
            <i className="fas fa-lightbulb text-warning"></i>
            <span>Dica: Lembre-se de conferir consumos de frigobar antes do encerramento de conta.</span>
          </div>
        </div>

      </div>

      {/* MODAL DE EDIÇÃO */}
      {showEditSelector && (
        <Modal title="Selecione um lançamento para editar" onClose={() => setShowEditSelector(false)}>
          {transactions.length > 0 ? (
            <table className="pdv-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Descrição</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="linha-pdv">
                    <td>{t.time ?? '—'}</td>
                    <td>{t.descricao}</td>
                    <td>{t.metodo}</td>
                    <td className={Number(t.valor) < 0 ? 'text-saida' : 'text-entrada'}>
                      {Number(t.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon-secondary"
                        onClick={() => {
                          setFormData({
                            descricao: t.descricao || "",
                            valor: Math.abs(Number(t.valor) || 0),
                            metodo: t.metodo || "Pix",
                            tipo: Number(t.valor) < 0 ? "DESPESA" : "RECEITA"
                          });
                          setEditingId(t.id);
                          setShowForm(true);
                          setShowEditSelector(false);
                        }}
                      >
                        Selecionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <i className="fas fa-info-circle"></i>
              <span>Nenhum lançamento disponível para editar.</span>
            </div>
          )}
        </Modal>
      )}

      {/* MODAL DE LEMBRETE */}
      {showReminders && (
        <Modal title="Lembretes do Turno" onClose={() => setShowReminders(false)}>
          <div className="reminders-modal-grid">
            
            {/* PAINEL ESQUERDO: Lista com Quadradinho (Checkbox) */}
            <section className="reminders-panel">
              <h3>Lembretes recentes</h3>
              <div className="reminders-scroll-container">
                {reminders.length > 0 ? (
                  <ul className="reminders-list" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
                    {reminders.map(r => {
                      const isChecked = selectedReminderIds.includes(r.id);
                      return (
                        <li key={r.id} className={`reminder-item ${r.lido ? 'read' : ''}`} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          
                          {/* O Quadradinho (Checkbox) */}
                          <input 
                            type="checkbox"
                            checked={r.lido || isChecked}
                            disabled={r.lido} /* Se já foi visto antes, fica desabilitado */
                            style={{ marginTop: '5px', width: '18px', height: '18px', cursor: r.lido ? 'default' : 'pointer' }}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedReminderIds(selectedReminderIds.filter(id => id !== r.id));
                              } else {
                                setSelectedReminderIds([...selectedReminderIds, r.id]);
                              }
                            }}
                          />

                          <div style={{ flex: 1 }}>
                            <strong>{r.titulo || 'Sem título'}</strong>
                            <div className="reminder-description">{r.descricao}</div>
                            <div className="reminder-meta">
                              {new Date(r.criadoEm).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="empty-state-modal">
                    <i className="fas fa-info-circle"></i>
                    <span>Nenhum lembrete encontrado.</span>
                  </div>
                )}
              </div>
            </section>

            {/* PAINEL DIREITO: Formulário Estilizado e Botões Alinhados */}
            <section className="reminder-form-panel">
              <h3>Novo lembrete</h3>
              <form onSubmit={handleSaveReminder} className="reminder-form-flex">
                <div className="form-group">
                  <input
                    className="input-padrao"
                    placeholder="Título (opcional)"
                    value={newReminder.titulo}
                    onChange={e => setNewReminder({...newReminder, titulo: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <textarea
                    className="input-padrao reminder-textarea"
                    placeholder="Digite aqui o alerta ou lembrete do turno..."
                    value={newReminder.descricao}
                    onChange={e => setNewReminder({...newReminder, descricao: e.target.value})}
                  />
                </div>
                
                {/* Container de botões alinhados */}
                <div className="reminder-actions-row">
                  <button
                    type="button"
                    className={`btn-visto-action ${selectedReminderIds.length === 0 ? 'disabled' : ''}`}
                    disabled={selectedReminderIds.length === 0}
                    onClick={handleMarkRemindersSeen}
                  >
                    Visto
                  </button>
                  <button 
                    type="button" 
                    className="btn-fechar-action" 
                    onClick={() => setShowReminders(false)}
                  >
                    Fechar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-salvar-action"
                  >
                    Salvar Lembrete
                  </button>
                </div>
              </form>
            </section>

          </div>
        </Modal>
      )}

    </div>
  );
}