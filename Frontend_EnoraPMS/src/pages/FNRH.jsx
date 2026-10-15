import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/fnrh.css";
import Modal from "../components/Modal";

export default function FNRH() {
  const [records, setRecords] = useState([
    { id: 1, guest: "Raimundo Albuquerque", document: "000.000.000-00", checkin: "2026-03-31", checkout: "2026-04-04", status: "Sincronizado" },
    { id: 2, guest: "Maria Solimões", document: "111.111.111-11", checkin: "2026-04-01", checkout: null, status: "Pendente" },
    { id: 3, guest: "Cassiane Silva", document: "222.222.222-22", checkin: "2026-04-02", checkout: "2026-04-03", status: "Sincronizado" }
  ]);
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadFNRH() {
    try {
      setLoading(true);
      const response = await api.get("/fnrh");
      if(response.data.length > 0) setRecords(response.data);
    } catch (err) { console.error("Erro ao carregar FNRH", err); }
    finally { setLoading(false); }
  }

  return (
    <div className="maintenance-container">
      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h2 className="pdv-main-title">FNRH Digital</h2>
          <p className="pdv-subtitle">Integração Ministerial via API (CADASTUR)</p>
        </div>
        <div className="pdv-action-group">
           <button className="btn-icon-secondary" onClick={() => setIsConfigOpen(true)}>
              <i className="fas fa-cog"></i> Configurar CADASTUR
           </button>
           <button onClick={loadFNRH} className="btn-pdv-primary">
              <i className="fas fa-cloud-upload-alt"></i> Sincronizar Tudo
           </button>
        </div>
      </div>

      <div className="pdv-summary-row">
        <div className="summary-card">
          <span className="summary-label">Status do CADASTUR</span>
          <div className="status-indicator online">
             <span className="dot online-pulse"></span> REGULAR
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-label">Fichas Pendentes</span>
          <h2 className="summary-value text-saida">{records.filter(r => r.status === "Pendente").length}</h2>
        </div>
        <div className="summary-card">
          <span className="summary-label">Última Sincronização</span>
          <h2 className="summary-value" style={{fontSize: '18px'}}>Hoje, 14:20</h2>
        </div>
      </div>

      <div className="table-card animate-in">
        <table className="maintenance-table">
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="linha-manutencao">
                <td style={{width: '30%'}}>
                  <span className="label-descricao">Hóspede</span>
                  <span className="dado-destaque">{record.guest}</span>
                  <span className="dado-valor" style={{display: 'block', fontSize: '12px'}}>{record.document}</span>
                </td>
                <td>
                  <span className="label-descricao">Check-in</span>
                  <span className="dado-valor">{new Date(record.checkin).toLocaleDateString('pt-BR')}</span>
                </td>
                <td>
                  <span className="label-descricao">Check-out</span>
                  <span className="dado-valor">{record.checkout ? new Date(record.checkout).toLocaleDateString('pt-BR') : "--/--/--"}</span>
                </td>
                <td>
                  <span className="label-descricao">Transmissão FNRH</span>
                  <span className={`status-fnrh ${record.status.toLowerCase()}`}>
                    <i className={`fas ${record.status === 'Sincronizado' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                    {record.status}
                  </span>
                </td>
                <td className="text-right align-actions-cell">
                  <div className="actions-wrapper">
                    {record.status === "Pendente" && (
                      <button className="btn-transmit" onClick={() => alert("Transmitindo...")}>
                        TRANSMITIR
                      </button>
                    )}
                    <button className="btn-view-eye"><i className="fas fa-eye"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIGURAÇÃO CADASTUR */}
      {isConfigOpen && (
        <Modal title="Configuração CADASTUR / SNC-H" onClose={() => setIsConfigOpen(false)}>
          <div className="fnrh-form-modern">
            <p className="form-subtitle">Credenciais de Acesso Ministerial</p>
            <div className="form-grid">
              <div className="input-group-mock full">
                <label>Usuário SNC-H</label>
                <input type="text" placeholder="Geralmente o e-mail cadastrado" />
              </div>
              <div className="input-group-mock">
                <label>Senha</label>
                <input type="password" placeholder="******" />
              </div>
              <div className="input-group-mock">
                <label>Código do Estabelecimento</label>
                <input type="text" placeholder="Ex: 15.000.254" />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setIsConfigOpen(false)}>Cancelar</button>
              <button className="btn-save-fnrh">Salvar Credenciais</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}