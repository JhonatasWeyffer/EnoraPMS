import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import "../styles/housekeeping.css";

const STATUS_MAP = {
  PENDENTE: { label: "Sujo", cssClass: "sujo" },
  EM_ANDAMENTO: { label: "Em Limpeza", cssClass: "em-limpeza" },
  CONCLUIDA: { label: "Pronto", cssClass: "pronto" }
};

const PRIORIDADE_MAP = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta"
};

export default function Housekeeping() {
  const [tasks, setTasks] = useState([]);
  const [quartos, setQuartos] = useState([]); // Estado para quartos reais
  const [stats, setStats] = useState({ pendente: 0, em_limpeza: 0, pronto: 0, total: 0 });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    quartoId: "",
    tipo: "Check-out",
    titulo: "", 
    descricao: "",
    status: "PENDENTE",
    prioridade: "MEDIA"
  });

  const [showProblemModal, setShowProblemModal] = useState(false);
  const [filters, setFilters] = useState({ room: "", description: "", type: "", priority: "" });

  useEffect(() => {
    loadTasks();
    loadStats();
    loadQuartos(); // Carrega os quartos reais do banco
  }, []);

  async function loadTasks() {
    try {
      const response = await api.get("/housekeeping");
      setTasks(response.data || []);
    } catch (error) {
      toast.error("Erro ao carregar tarefas.");
    }
  }

  async function loadStats() {
    try {
      const response = await api.get("/housekeeping/stats");
      setStats(response.data || { pendente: 0, em_limpeza: 0, pronto: 0, total: 0 });
    } catch (error) {
      console.error("Erro ao carregar estatísticas");
    }
  }

  async function loadQuartos() {
    try {
      const response = await api.get("/rooms/lista-simples");
      setQuartos(response.data || []);
    } catch (error) {
      toast.error("Erro ao carregar lista de quartos.");
    }
  }

  function clearForm() {
    setFormData({ quartoId: "", tipo: "Check-out", titulo: "", descricao: "", status: "PENDENTE", prioridade: "MEDIA" });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.quartoId) return toast.error("Selecione um quarto.");
    if (!formData.titulo.trim()) return toast.error("Adicione um título.");

    try {
      const descricaoComTitulo = `[${formData.titulo.trim()}] ${formData.descricao.trim()}`;
      const payload = {
        quartoId: parseInt(formData.quartoId, 10),
        tipo: formData.tipo,
        status: formData.status,
        prioridade: formData.prioridade,
        descricao: descricaoComTitulo
      };

      if (editingId) {
        await api.patch(`/housekeeping/${editingId}`, payload);
        toast.success("Tarefa atualizada!");
      } else {
        await api.post("/housekeeping", payload);
        toast.success("Tarefa criada!");
      }
      clearForm();
      loadTasks();
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao salvar.");
    }
  }

  function handleEdit(task) {
    setEditingId(task.id);
    let titulo = "", descricao = task.descricao || "";
    if (descricao.startsWith("[")) {
      const fim = descricao.indexOf("]");
      titulo = descricao.substring(1, fim);
      descricao = descricao.substring(fim + 1).trim();
    }
    setFormData({
      quartoId: task.quartoId || "",
      tipo: task.tipo,
      titulo,
      descricao,
      status: task.status,
      prioridade: task.prioridade
    });
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Deletar esta tarefa?")) return;
    await api.delete(`/housekeeping/${id}`);
    loadTasks();
    loadStats();
  }

  const filteredTasks = tasks.filter(task => {
    const numQuarto = task.quarto?.numero || String(task.quartoId);
    return (!filters.room || numQuarto.includes(filters.room)) &&
           (!filters.description || (task.descricao || "").toLowerCase().includes(filters.description.toLowerCase())) &&
           (!filters.type || task.tipo === filters.type) &&
           (!filters.priority || task.prioridade === filters.priority);
  });

  return (
    <div className="maintenance-container">
      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h1 className="pdv-main-title">Gestão de Governança</h1>
          <p className="pdv-subtitle">Monitoramento de limpeza e preparação de unidades</p>
        </div>
        <button className={`btn-pdv-primary ${showForm ? "btn-cancelar" : ""}`} onClick={() => showForm ? clearForm() : setShowForm(true)}>
          <i className={`fas ${showForm ? "fa-times" : "fa-plus"}`}></i> {showForm ? " Cancelar" : " Nova Tarefa"}
        </button>
      </div>

      {showForm && (
        <div className="pdv-form-wrapper animate-in">
          <form onSubmit={handleSubmit} className="pdv-form housekeeping-grid-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="input-group">
              <label className="label-descricao">Quarto / Unidade</label>
              <select className="input-padrao-d" value={formData.quartoId} onChange={e => setFormData({...formData, quartoId: e.target.value})} required>
                <option value="">Selecione...</option>
                {quartos.map(q => <option key={q.id} value={q.id}>Quarto {q.numero}</option>)}
              </select>
            </div>
            
            <div className="input-group">
              <label className="label-descricao">Tipo</label>
              <select className="input-padrao" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                <option value="Check-out">Check-out</option>
                <option value="Check-in">Check-in</option>
                <option value="Ocupado">Ocupado</option>
                <option value="Retoque">Retoque</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label-descricao">Descrição</label>
              <button type="button" className="btn-icon-secondary" onClick={() => setShowProblemModal(true)} style={{ height: 40, width: '100%' }}>
                {formData.titulo ? formData.titulo : "Adicionar Descrição"}
              </button>
            </div>

            <div className="input-group">
              <label className="label-descricao">Prioridade</label>
              <select className="input-padrao" value={formData.prioridade} onChange={e => setFormData({...formData, prioridade: e.target.value})}>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>

            <button type="submit" className="btn-liberar-final" style={{ height: 40, alignSelf: 'flex-end' }}>Salvar</button>
          </form>
        </div>
      )}

      {/* FILTROS */}
      <div className="filtros-wrapper">
        <div className="filtro-grupo">
        <label>Quarto</label>
        <select
          className="input-padrao-filtro"
          value={filters.room}
          onChange={e => setFilters({ ...filters, room: e.target.value })}
        >
          <option value="">Todos</option>
          {/* Usamos a lista real vinda do banco de dados */}
          {quartos.map((quarto) => (
            <option key={quarto.id} value={quarto.numero}>
              Quarto {quarto.numero}
            </option>
          ))}
        </select>
      </div>

        <div className="filtro-grupo">
          <label>Descrição</label>
          <input
            type="text"
            className="input-padrao-filtro"
            placeholder="Buscar..."
            value={filters.description}
            onChange={e => setFilters({ ...filters, description: e.target.value })}
          />
        </div>

        <div className="filtro-grupo">
          <label>Tipo</label>
          <select
            className="input-padrao-filtro"
            value={filters.type}
            onChange={e => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="Check-out">Check-out</option>
            <option value="Check-in">Check-in</option>
            <option value="Ocupado">Ocupado</option>
            <option value="Retoque">Retoque</option>
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Prioridade</label>
          <select
            className="input-padrao-filtro"
            value={filters.priority}
            onChange={e => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
          </select>
        </div>
      </div>

      {/* DASHBOARD DE INDICADORES */}
      <div className="pdv-summary-row">
        <div className="summary-card">
          <span className="summary-label">Quartos Sujos</span>
          <h2 className="summary-value">{stats.pendente}</h2>
        </div>
        <div className="summary-card">
          <span className="summary-label">Em Limpeza</span>
          <h2 className="summary-value" style={{ color: "#f59e0b" }}>
            {stats.em_limpeza}
          </h2>
        </div>
        <div className="summary-card">
          <span className="summary-label">Prontos para Check-in</span>
          <h2 className="summary-value" style={{ color: "#10b981" }}>
            {stats.pronto}
          </h2>
        </div>
      </div>

      {/* TABELA DE TAREFAS */}
      <div className="table-card animate-in">
        <table className="maintenance-table">
          <tbody>
            {filteredTasks.map((task) => {
              const statusData = STATUS_MAP[task.status] || { label: task.status, cssClass: "sujo" };
              const prioridadeLabel = PRIORIDADE_MAP[task.prioridade] || task.prioridade;

              return (
                <tr key={task.id} className="linha-manutencao">
                  <td className="col-quarto">
                    <span className="label-descricao">Unidade</span>
                    <span className="dado-destaque">Quarto {task.quarto?.numero || task.quartoId}</span>
                    <br />
                    <span className={`priority-tag ${task.prioridade?.toLowerCase()}`}>
                      {prioridadeLabel}
                    </span>
                  </td>
                 <td className="col-problema">
                    <span className="label-descricao">Descrição da Tarefa</span>
                    {task.descricao && task.descricao.startsWith("[") && task.descricao.includes("]") ? (
                      <>
                        <strong className="dado-valor strong-desc" style={{ display: 'block', marginBottom: '4px' }}>
                          {task.descricao.substring(1, task.descricao.indexOf("]"))}
                        </strong>
                        <span className="dado-valor" style={{ fontSize: '13px', color: '#64748b' }}>
                          {task.descricao.substring(task.descricao.indexOf("]") + 1).trim() || "Sem observações adicionais"}
                        </span>
                      </>
                    ) : (
                      <span className="dado-valor strong-desc">{task.descricao}</span>
                    )}
                  </td>
                  <td className="col-tipo">
                    <span className="label-descricao">Tipo de Serviço</span>
                    <span className={`badge-tipo ${task.tipo?.toLowerCase()}`}>
                      {task.tipo}
                    </span>
                  </td>
                  <td className="col-status">
                    <span className="label-descricao">Status</span>
                    <select
                      className={`select-status-hk ${statusData.cssClass}`}
                      value={task.status}
                      onChange={async (e) => {
                        try {
                          await api.patch(`/housekeeping/${task.id}`, { status: e.target.value });
                          toast.success("Status atualizado!");
                          loadTasks();
                          loadStats();
                        } catch (err) {
                          toast.error("Erro ao mudar o status");
                        }
                      }}
                    >
                      <option value="PENDENTE">Sujo</option>
                      <option value="EM_ANDAMENTO">Em Limpeza</option>
                      <option value="CONCLUIDA">Pronto</option>
                    </select>
                  </td>
                  <td className="col-acao text-right">
                    <button
                      className="btn-editar"
                      onClick={() => handleEdit(task)}
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i> Editar
                    </button>
                    <button
                      className="btn-deletar"
                      onClick={() => handleDelete(task.id)}
                      title="Deletar"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="avisos" style={{ padding: "40px", textAlign: "center", color: "#999" }}>
            <p>Nenhuma tarefa encontrada para o dia atual.</p>
          </div>
        )}
        {/* MODAL DE DETALHES DA DESCRIÇÃO (Modelo idêntico ao de manutenção) */}
        {showProblemModal && (
          <div className="modal-overlay">
            <div className="modal-detalhes">
              <div className="modal-header">
                <h2>Descrição Detalhada da Tarefa</h2>
                <button
                  className="btn-fechar"
                  type="button"
                  onClick={() => setShowProblemModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="modal-section">
                  <span className="modal-label">Título do Serviço</span>
                  <input
                    className="input-padrao-c"
                    placeholder="Ex: Limpeza pesada / Troca de enxoval"
                    maxLength={40}
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  />
                </div>
                <div className="modal-section">
                  <span className="modal-label">Observações Adicionais</span>
                  <textarea
                    className="textarea-problema"
                    placeholder="Especifique detalhes como: focar no banheiro, repor frigobar, etc..."
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  />
                </div>
                <button
                  className="btn-confirm-sale"
                  type="button"
                  onClick={() => {
                    if (!formData.titulo.trim()) {
                      toast.error("Por favor, preencha pelo menos o título.");
                      return;
                    }
                    setShowProblemModal(false);
                  }}
                >
                  Confirmar Informações
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}