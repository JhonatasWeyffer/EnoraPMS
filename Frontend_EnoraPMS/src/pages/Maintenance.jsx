import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import "../styles/maintenance.css";

// Mapeamento dos Enums do Prisma para Labels amigáveis do Frontend
const STATUS_LABELS = {
  EM_ABERTO: "Em Aberto",
  EM_ANDAMENTO: "Em Manutenção",
  CONCLUIDA: "Finalizada",
  CANCELADA: "Cancelada"
};

const PRIORIDADE_LABELS = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta"
};

export default function Maintenance() {
  const [issues, setIssues] = useState([]);
  
  // DECLARAÇÃO QUE FALTAVA: Cria o estado para armazenar os quartos
  const [quartos, setQuartos] = useState([]); 
  
  const [editingId, setEditingId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);
  
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    quartoId: "",
    tipo: "Corretiva",
    prioridade: "MEDIA"
  });

  useEffect(() => {
    loadIssues();
    loadQuartos(); // CARREGAMENTO QUE FALTAVA: Chama os quartos ao abrir a tela
  }, []);

  async function loadIssues() {
    try {
      const response = await api.get("/maintenance");
      setIssues(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar", error);
      toast.error("Erro ao carregar ordens de serviço.");
    }
  }

  // FUNÇÃO QUE FALTAVA: Busca a lista de quartos no backend
  async function loadQuartos() {
    try {
      const response = await api.get("/rooms/lista-simples");
      setQuartos(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar quartos:", error);
      toast.error("Erro ao carregar lista de quartos disponíveis.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!problemTitle) {
      toast.error("O título do problema é obrigatório.");
      return;
    }

    try {
      const payload = {
        quartoId: parseInt(formData.quartoId, 10),
        descricao: `${problemTitle}||${problemDescription}`,
        tipo: formData.tipo,
        prioridade: formData.prioridade
      };

      if (editingId) {
        await api.put(`/maintenance/${editingId}`, payload);
        toast.success("Ordem de serviço atualizada com sucesso!");
      } else {
        await api.post("/maintenance", payload);
        toast.success("Ordem de serviço gerada com sucesso!");
      }

      cancelarEdicao();
      loadIssues();
    } catch (error) {
      console.error("Erro ao salvar ordem de serviço:", error);
      toast.error("Erro ao salvar a ordem de serviço.");
    }
  }

  function handleEdit(issue) {
    setEditingId(issue.id);
    setFormData({
      quartoId: issue.quartoId || issue.quarto?.id || "",
      tipo: issue.tipo,
      prioridade: issue.prioridade
    });

    const partesDescricao = issue.descricao?.split("||") || [];
    setProblemTitle(partesDescricao[0] || "");
    setProblemDescription(partesDescricao[1] || "");
    
    setShowForm(true);
  }

  function cancelarEdicao() {
    setEditingId(null);
    setProblemTitle("");
    setProblemDescription("");
    setFormData({
      quartoId: "",
      tipo: "Corretiva",
      prioridade: "MEDIA"
    });
    setShowForm(false);
  }

  return (
    <div className="maintenance-container">
      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h1 className="pdv-main-title">Gestão de Manutenção Inteligente</h1>
          <p className="pdv-subtitle">Monitoramento em tempo real e antecipação de falhas</p>
        </div>
        <button 
          className={`btn-pdv-primary ${showForm ? 'btn-cancelar' : ''}`} 
          onClick={() => {
            if (showForm) {
              cancelarEdicao();
            } else {
              setShowForm(true);
            }
          }}>
          <i className={`fas ${showForm ? 'fa-times' : 'fa-tools'}`}></i>
          {showForm ? " Cancelar" : " Abrir Ordem de Serviço"}
        </button>
      </div>

      {showForm && (
        <div className="pdv-form-wrapper animate-in">
          <form onSubmit={handleSubmit} className="pdv-form maintenance-grid-form">
            <div className="input-group">
              <label className="label-descricao">Quarto / Local</label>
              <select 
                id="quartoId" 
                className="input-padrao-d" 
                value={formData.quartoId} 
                onChange={e => setFormData({...formData, quartoId: e.target.value})}
                required
              >
                <option value="">Selecione...</option>
                {/* MAPEAMENTO REAL DOS QUARTOS */}
                {quartos.map((quarto) => (
                  <option key={quarto.id} value={quarto.id}>
                    Quarto {quarto.numero}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="label-descricao">Descrição do Problema</label>
              <div
                className="input-padrao-c detalhes-trigger"
                onClick={() => setShowProblemModal(true)}
              >
                {problemTitle.length > 40
                  ? problemTitle.substring(0, 40) + "..."
                  : problemTitle || "Clique para adicionar detalhes"
                }
              </div>
            </div>

            <div className="input-group">
              <label className="label-descricao">Tipo</label>
              <select 
                className="input-padrao"
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="Corretiva">Corretiva</option>
                <option value="Preventiva">Preventiva</option>
                <option value="Preditiva">Preditiva</option>
              </select>
            </div>

            <div className="input-group">
              <label className="label-descricao">Prioridade</label>
              <select 
                className="input-padrao"
                value={formData.prioridade}
                onChange={e => setFormData({...formData, prioridade: e.target.value})}
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>

            <button type="submit" className="btn-confirm-sale">
              <i className="fas fa-check"></i>
              {editingId ? " Salvar Alterações" : " Gerar O.S."}
            </button>
          </form>
        </div>
      )}

      {/* DASHBOARD DE INDICADORES */}
      <div className="pdv-summary-row">
        <div className="summary-card">
          <span className="summary-label">Manutenções Ativas</span>
          <h2 className="summary-value">
            {issues.filter(i => i.status !== "CONCLUIDA" && i.status !== "CANCELADA").length}
          </h2>
        </div>
        <div className="summary-card">
          <span className="summary-label">Preventivas (Mês)</span>
          <h2 className="summary-value text-entrada">
            {issues.filter(issue => issue.tipo === "Preventiva").length}
          </h2>
        </div>
        <div className="summary-card">
          <span className="summary-label">Saúde dos Ativos</span>
          <h2 className="summary-value" style={{ color: '#0ea5e9' }}>
            {`${Math.max(0, Math.round((((quartos.length || 33) - issues.filter(i => i.status !== "CONCLUIDA" && i.status !== "CANCELADA").length) / (quartos.length || 33)) * 100))}%`}
          </h2>   
        </div>
      </div>

      {/* TABELA DE MANUTENÇÃO */}
      <div className="table-card animate-in">
        <table className="maintenance-table">
          <tbody>
            {[...issues]
              .sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm))
              .map((issue) => (
              <tr key={issue.id} className="linha-manutencao">
                <td className="col-quarto">
                  <span className="label-descricao">Local</span>
                  <span className="dado-destaque">Quarto {issue.quarto?.numero || issue.quartoId}</span>
                </td>
                <td className="col-problema">
                  <span className="label-descricao">Descrição do Ativo / Falha</span>
                  <span
                    className="dado-valor strong-desc titulo-problema"
                    onClick={() => {
                      setSelectedIssue(issue);
                      setShowDetails(true);
                    }}
                  >
                    {(issue.descricao?.split("||")[0] || issue.descricao).length > 18
                      ? (issue.descricao?.split("||")[0] || issue.descricao).substring(0, 18) + "..."
                      : (issue.descricao?.split("||")[0] || issue.descricao)}
                  </span>
                </td>
                <td className="col-tipo">
                  <span className="label-descricao">Categoria</span>
                  <span className={`badge-tipo ${issue.tipo?.toLowerCase()}`}>
                    {issue.tipo}
                  </span>
                </td>

                <td className="col-status">
                  <span className="label-descricao">Urgência</span>
                  <span className={`priority-indicator ${issue.prioridade?.toLowerCase()}`}>
                    {PRIORIDADE_LABELS[issue.prioridade] || issue.prioridade}
                  </span>
                </td>

                <td className="col-acao text-right">
                  <button
                    className="btn-editar-g"
                    onClick={() => handleEdit(issue)}
                  >
                    Editar
                  </button>
                  <select
                    className={`status-select ${
                      issue.status === "EM_ABERTO" ? "status-aberto"
                      : issue.status === "EM_ANDAMENTO" ? "status-manutencao"
                      : "status-finalizado"
                    }`}
                    value={issue.status}
                    onChange={async (e) => {
                      try {
                        await api.patch(`/maintenance/${issue.id}`, {
                          status: e.target.value
                        });
                        toast.success("Status alterado!");
                        loadIssues();
                      } catch (error) {
                        console.error("Erro ao atualizar status", error);
                        toast.error("Falha ao mudar status.");
                      }
                    }} 
                  >
                    <option value="EM_ABERTO">Em Aberto</option>
                    <option value="EM_ANDAMENTO">Em Manutenção</option>
                    <option value="CONCLUIDA">Finalizado</option>
                    <option value="CANCELADA">Cancelado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showProblemModal && (
          <div className="modal-overlay">
            <div className="modal-detalhes">
              <div className="modal-header">
                <h2>Detalhes da Ocorrência</h2>
                <button
                  className="btn-fechar"
                  onClick={() => setShowProblemModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="modal-section">
                  <span className="modal-label">Título</span>
                  <input
                    className="input-padrao-c"
                    placeholder="Ex: Ar-condicionado"
                    maxLength={40}
                    value={problemTitle}
                    onChange={(e) => setProblemTitle(e.target.value)}
                  />
                </div>
                <div className="modal-section">
                  <span className="modal-label">Descrição</span>
                  <textarea
                    className="textarea-problema"
                    placeholder="Descreva detalhadamente a ocorrência..."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                  />
                </div>
                <button
                  className="btn-confirm-sale"
                  type="button"
                  onClick={() => {
                    if(!problemTitle.trim()) {
                      toast.error("Preencha ao menos o título");
                      return;
                    }
                    setShowProblemModal(false);
                  }}
                >
                  Confirmar Detalhes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDetails && selectedIssue && (
        <div className="modal-overlay">
          <div className="modal-detalhes">
            <div className="modal-header">
              <h2>Detalhes da Ocorrência</h2>
              <button
                className="btn-fechar"
                onClick={() => setShowDetails(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <span className="modal-label">Título</span>
                <h3 className="modal-titulo">
                  {selectedIssue.descricao?.split("||")[0] || selectedIssue.descricao}
                </h3>
              </div>
              <div className="modal-section">
                <span className="modal-label">Descrição</span>
                <p className="modal-descricao">
                  {selectedIssue.descricao?.split("||")[1] || "Sem descrição detalhada."}
                </p>
                <p
                  style={{
                    textAlign: "right",
                    position: "relative",
                    top: "50px",
                    fontWeight: "700",
                    color: "#64748b"
                  }}
                >
                  Quarto {selectedIssue.quarto?.numero || selectedIssue.quartoId}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}