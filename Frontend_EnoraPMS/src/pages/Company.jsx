import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import "../styles/company.css";
import Modal from "../components/Modal";

// ================= UTILITÁRIOS DE MÁSCARA (VISUALIZAÇÃO) =================
const formatCnpjVisivel = (cnpj) => {
  if (!cnpj) return "";
  const limpo = cnpj.replace(/\D/g, "");
  if (limpo.length === 14) {
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return cnpj;
};

const formatDocVisivel = (doc, tipo) => {
  if (!doc) return "";
  if (tipo === "PASSAPORTE") return doc.toUpperCase();
  const limpo = doc.replace(/\D/g, "");
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return doc;
};

export default function Company() {
  const [companies, setCompanies] = useState([]);

  // Estados para controle dos Modais
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState(null);
  
  // ESTADO DO NOVO MODAL DE CONFIRMAÇÃO
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // Estado para capturar os dados do formulário de novo convênio
  const [convenio, setConvenio] = useState({ 
    cnpj: '', 
    razao: '', 
    discount: 0.05, 
    financeRespName: '', 
    financeRespDocType: 'CPF', 
    financeRespDocNum: '' 
  });
  
  // Estados para busca de Responsável Financeiro e Funcionários
  const [isSearchingResp, setIsSearchingResp] = useState(false);
  const [empDocType, setEmpDocType] = useState('CPF');
  const [empDocNum, setEmpDocNum] = useState('');
  const [empNameFound, setEmpNameFound] = useState('');
  const [empIdFound, setEmpIdFound] = useState(null);
  const [isSearchingEmp, setIsSearchingEmp] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const response = await api.get("/companies");
      setCompanies(response.data);
    } catch (error) {
      toast.error("Erro ao carregar convênios");
    }
  }

  const buscarPessoa = async (numeroDocumento, tipoDocumento, onSuccess, onLoading) => {
    const docLimpo = numeroDocumento.replace(/\D/g, '');
    if (tipoDocumento === "CPF" && docLimpo.length !== 11) {
      toast.error("CPF deve ter 11 dígitos para a busca.");
      return;
    }

    onLoading(true);
    try {
      const response = await api.post("/reservations/buscar-hospede", {
        tipo_documento: tipoDocumento,
        numero_documento: docLimpo,
      });
      onSuccess(response.data);
      toast.success(`Hóspede encontrado: ${response.data.nome}`);
    } catch (error) {
      onSuccess(null);
      toast.error(error.response?.data?.message || "Hóspede não encontrado no sistema.");
    } finally {
      onLoading(false);
    }
  };

  const formatInputDocument = (value, type) => {
    if (type === "PASSAPORTE") return value.toUpperCase().trim(); 
    let cleanValue = value.replace(/\D/g, "").substring(0, 11);
    return cleanValue
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const toggleStay = (employeeId) => {
    const updatedEmployees = (activeCompany.funcionarios || []).map(e => 
      e.id === employeeId ? { ...e, hospedadoAtualmente: !e.hospedadoAtualmente } : e
    );
    setActiveCompany({ ...activeCompany, funcionarios: updatedEmployees });
  };

  const getStats = (company) => {
    if (!company) return { count: 0, gross: 0, net: 0 };
    
    // 1. Conta os funcionários vinculados que estão "Ativos"
    let count = (company.funcionarios || []).filter(e => e.hospedadoAtualmente).length;
    
    // 2. REGRA DE NEGÓCIO: Se a empresa possui um Responsável Financeiro cadastrado,
    // ele viaja também, logo, soma +1 automaticamente na matemática.
    if (company.contatoFinanceiroNumDoc) {
      count += 1;
    }

    // 3. Cálculos financeiros baseados no total real
    const gross = count * (Number(company.valorBaseDiaria) || 80.00);
    const discountFactor = parseFloat(company.desconto) || 0;
    const net = gross - (gross * discountFactor);
    
    return { count, gross, net };
  };

  const handleSaveEmployee = async (companyId) => {
    if (!empIdFound) return toast.error("Busque um hóspede validado antes de adicionar.");

    try {
      const response = await api.post(`/companies/${companyId}/employees`, { hospedeId: empIdFound });
      const newEmp = response.data;
      newEmp.hospede = { nome: empNameFound }; 
      
      const currentList = activeCompany.funcionarios || [];
      const updatedCompany = { ...activeCompany, funcionarios: [...currentList, newEmp] };
      
      setActiveCompany(updatedCompany);
      setCompanies(companies.map(c => c.id === companyId ? updatedCompany : c));
      toast.success("Funcionário adicionado ao convênio.");
      setEmpDocNum(''); setEmpNameFound(''); setEmpIdFound(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao adicionar funcionário.");
    }
  };

  const handleConfirmInvoice = async () => {
    try {
      const activeEmployeeIds = (activeCompany.funcionarios || [])
        .filter(e => e.hospedadoAtualmente)
        .map(e => e.id);

      const response = await api.post(`/companies/${activeCompany.id}/close-invoice`, {
        employeeIds: activeEmployeeIds
      });

      setActiveCompany(response.data);
      toast.success("Fatura atualizada e consolidada com sucesso!");
      setIsDetailModalOpen(false);
      loadCompanies(); 
    } catch (error) {
      toast.error("Erro ao fechar fatura no servidor.");
    }
  };

  const handleUpdateFinanceResp = async () => {
    try {
      const response = await api.put(`/companies/${activeCompany.id}/finance-resp`, {
        contatoFinanceiroNome: activeCompany.contatoFinanceiroNome,
        contatoFinanceiroTipoDoc: activeCompany.contatoFinanceiroTipoDoc,
        contatoFinanceiroNumDoc: activeCompany.contatoFinanceiroNumDoc.replace(/\D/g, '') 
      });

      setActiveCompany(response.data);
      setCompanies(companies.map(c => c.id === activeCompany.id ? response.data : c));
      toast.success("Dados do Responsável atualizados.");
    } catch (error) {
      toast.error("Erro ao atualizar responsável.");
    }
  };

  // REFATORADO: Usa o novo modal de confirmação em vez do window.confirm
  const handleDeleteCompany = (companyId, name) => {
    setConfirmModal({
      isOpen: true,
      title: "Excluir Convênio",
      message: `Tem certeza que deseja encerrar o convênio com "${name}"? Todos os funcionários serão desvinculados. Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          await api.delete(`/companies/${companyId}`);
          toast.success("Convênio excluído com sucesso.");
          loadCompanies();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          toast.error(error.response?.data?.message || "Erro ao excluir convênio.");
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // REFATORADO: Usa o novo modal de confirmação em vez do window.confirm
  const handleDeleteEmployee = (e, employeeId) => {
    e.stopPropagation(); 
    setConfirmModal({
      isOpen: true,
      title: "Desvincular Funcionário",
      message: "Deseja realmente desvincular este funcionário do convênio?",
      onConfirm: async () => {
        try {
          await api.delete(`/companies/employees/${employeeId}`);
          const updatedEmployees = (activeCompany.funcionarios || []).filter(emp => emp.id !== employeeId);
          const updatedCompany = { ...activeCompany, funcionarios: updatedEmployees };
          
          setActiveCompany(updatedCompany);
          setCompanies(companies.map(c => c.id === activeCompany.id ? updatedCompany : c));
          toast.success("Funcionário desvinculado com sucesso.");
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          toast.error("Erro ao remover funcionário.");
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!convenio.razao || !convenio.cnpj) return toast.error("Preencha a Razão e o CNPJ.");

    try {
      await api.post("/companies", {
        razaoSocial: convenio.razao,
        cnpj: convenio.cnpj, 
        desconto: parseFloat(convenio.discount),
        contatoFinanceiroNome: convenio.financeRespName,
        contatoFinanceiroTipoDoc: convenio.financeRespDocType,
        contatoFinanceiroNumDoc: convenio.financeRespDocNum
      });

      toast.success("Convênio ativado!");
      setIsMainModalOpen(false);
      setConvenio({ cnpj: '', razao: '', discount: 0.05, financeRespName: '', financeRespDocType: 'CPF', financeRespDocNum: '' }); 
      loadCompanies(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao criar convênio.");
    }
  };

  return (
    <div className="maintenance-container">
      <div className="pdv-page-header">
        <div className="pdv-title-group">
          <h1 className="pdv-main-title">Convênios Empresariais</h1>
          <p className="pdv-subtitle">Gestão de faturamento corporativo e auditoria</p>
        </div>
        <button onClick={() => setIsMainModalOpen(true)} className="btn-pdv-primary">
          <i className="fas fa-plus"></i> Novo Convênio
        </button>
      </div>

      <div className="table-card animate-in">
        <table className="company-table">
          <thead>
            <tr className="table-header-row-a">
              <th>Empresa</th>
              <th>Responsável Financeiro</th>
              <th>Utilização</th>
              <th>Acordo</th>
              <th>Total Líquido</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const stats = getStats(company);
              
              return (
                <tr key={company.id} className="linha-manutencao">
                  <td>
                    <span className="dado-destaque">{company.razaoSocial}<br /></span>
                    <span className="dado-valor" style={{fontSize: '11px'}}>CNPJ: {formatCnpjVisivel(company.cnpj)} </span>
                  </td>
                  
                  <td>
                    {company.contatoFinanceiroNumDoc ? (
                      <div>
                        <span style={{ fontWeight: '500', display: 'block', color: '#333', fontSize: '13px' }}>
                          {company.contatoFinanceiroNome}
                        </span>
                        <span style={{ fontSize: '11px', color: '#0d6efd', display: 'block', marginTop: '2px' }}>
                          <i className="fas fa-file-invoice"></i> {company.contatoFinanceiroTipoDoc}: {formatDocVisivel(company.contatoFinanceiroNumDoc, company.contatoFinanceiroTipoDoc)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: '12px' }}>Não parametrizado</span>
                    )}
                  </td>

                  <td>
                    <span className="badge-stay-count">
                      <i className="fas fa-bed"></i> {stats.count} Ativos
                    </span>
                  </td>
                  <td><span className="badge-discount">{(parseFloat(company.desconto) * 100).toFixed(0)}% OFF</span></td>
                  <td><span className="final-price-highlight">R$ {stats.net.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                  <td className="text-right" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-table-action-blue" onClick={() => { setActiveCompany(company); setIsDetailModalOpen(true); }}>
                      <i className="fas fa-list-check"></i> Detalhar
                    </button>
                    <button 
                      className="btn-table-action-red" 
                      style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => handleDeleteCompany(company.id, company.razaoSocial)}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isDetailModalOpen && activeCompany && (
        <Modal title={`Consumo: ${activeCompany.razaoSocial}`} onClose={() => setIsDetailModalOpen(false)}>
          <div className="detail-modal-body">
            
             <div className="billing-summary-box">
              <div className="item">
                <span>Bruto</span>
                <strong>R$ {getStats(activeCompany).gross.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
              </div>
              <div className="item discount-text">
                <span>Desconto ({(parseFloat(activeCompany.desconto)* 100).toFixed(0)}%)</span>
                <strong>- R$ {(getStats(activeCompany).gross * parseFloat(activeCompany.desconto)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
              </div>
              <div className="item total">
                <span>Total Final</span>
                <strong>R$ {getStats(activeCompany).net.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
              </div>
            </div>

            <div className="edit-finance-section" style={{ marginTop: '15px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', margin: '0 0 10px 0' }}>
                <i className="fas fa-user-shield"></i> Atualizar Responsável Financeiro
              </p>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select 
                  className="btn-table-action-blue"
                  style={{ flex: '0 0 120px', padding: '6px', fontSize: '13px' }}
                  value={activeCompany.contatoFinanceiroTipoDoc || 'CPF'}
                  onChange={(e) => setActiveCompany({ 
                    ...activeCompany, 
                    contatoFinanceiroTipoDoc: e.target.value, 
                    contatoFinanceiroNumDoc: '',
                    contatoFinanceiroNome: '' 
                  })}
                >
                  <option value="CPF">CPF</option>
                  <option value="PASSAPORTE">Passaporte</option>
                </select>
                
                <input 
                  type="text" 
                  placeholder={activeCompany.contatoFinanceiroTipoDoc === "CPF" ? "000.000.000-00" : "Número do passaporte"}
                  className="input-padrao"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                  value={formatInputDocument(activeCompany.contatoFinanceiroNumDoc || '', activeCompany.contatoFinanceiroTipoDoc || 'CPF')}
                  onChange={(e) => {
                    const maskedValue = formatInputDocument(e.target.value, activeCompany.contatoFinanceiroTipoDoc);
                    setActiveCompany({ ...activeCompany, contatoFinanceiroNumDoc: maskedValue });
                  }}
                  onBlur={(e) => {
                    const num = e.target.value;
                    if(num.trim()) {
                      buscarPessoa(num, activeCompany.contatoFinanceiroTipoDoc, 
                        (pessoa) => { if(pessoa) setActiveCompany({...activeCompany, contatoFinanceiroNome: pessoa.nome}); },
                        setIsSearchingResp
                      );
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 2, position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Nome do Responsável (Automático)"
                    className="input-padrao"
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', backgroundColor: '#e2e8f0', color: '#475569', cursor: 'not-allowed' }}
                    value={activeCompany.contatoFinanceiroNome || ''}
                    readOnly
                  />
                  {isSearchingResp && <i className="fas fa-spinner fa-spin" style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px', color: '#64748b' }}></i>}
                </div>
                <button 
                  type="button" 
                  className="btn-pdv-primary"
                  style={{ flex: 1, padding: '6px', fontSize: '13px' }}
                  onClick={handleUpdateFinanceResp}
                  disabled={!activeCompany.contatoFinanceiroNome}
                >
                  <i className="fas fa-save"></i> Atualizar
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', marginTop: '20px' }}>
              <p className="form-subtitle" style={{ margin: 0 }}>Vincular Funcionários</p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
               <select 
                  className="select-mock"
                  style={{ flex: '0 0 100px', fontSize: '12px', padding: '6px' }}
                  value={empDocType}
                  onChange={(e) => { setEmpDocType(e.target.value); setEmpDocNum(''); setEmpNameFound(''); setEmpIdFound(null); }}
                >
                  <option value="CPF">CPF</option>
                  <option value="PASSAPORTE">Passaporte</option>
                </select>
                <input 
                  type="text" 
                  placeholder={empDocType === "CPF" ? "CPF..." : "Passaporte..."} 
                  className="input-padrao"
                  style={{ flex: '0 0 130px', padding: '6px', fontSize: '12px' }}
                  value={empDocNum}
                  onChange={(e) => setEmpDocNum(formatInputDocument(e.target.value, empDocType))}
                  onBlur={(e) => {
                    if(e.target.value.trim()) {
                      buscarPessoa(e.target.value, empDocType, 
                        (pessoa) => {
                          if(pessoa) { setEmpNameFound(pessoa.nome); setEmpIdFound(pessoa.id); } 
                          else { setEmpNameFound(''); setEmpIdFound(null); }
                        },
                        setIsSearchingEmp
                      );
                    }
                  }}
                />
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Nome preenchido..." 
                    className="input-padrao"
                    value={empNameFound}
                    readOnly
                    style={{ width: '100%', padding: '6px', fontSize: '12px', backgroundColor: '#e2e8f0', cursor: 'not-allowed' }}
                  />
                  {isSearchingEmp && <i className="fas fa-spinner fa-spin" style={{ position: 'absolute', right: '10px', top: '8px', fontSize: '12px', color: '#64748b' }}></i>}
                </div>
                <button 
                  type="button" 
                  className="btn-save-fnrh" 
                  style={{ padding: '6px 12px', fontSize: '12px', opacity: empIdFound ? 1 : 0.5 }}
                  onClick={() => handleSaveEmployee(activeCompany.id)}
                  disabled={!empIdFound}
                >
                  <i className="fas fa-plus"></i>
                </button>
            </div>

            <div className="employee-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {(activeCompany.funcionarios || []).map(emp => {
                const isAtivo = emp.hospedadoAtualmente;
                return (
                  <div key={emp.id} className={`employee-row ${isAtivo ? 'selected' : ''}`} onClick={() => toggleStay(emp.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="check-indicator">
                        {isAtivo ? <i className="fas fa-check-square"></i> : <i className="far fa-square"></i>}
                      </div>
                      <span className="emp-name">{emp.hospede?.nome || "Sem Nome"}</span>
                      {/* ALTERADO DE HOSPEDADO/AUSENTE PARA ATIVO/INATIVO COMO SOLICITADO */}
                      <span className="emp-status">{isAtivo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <button 
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px 10px' }}
                      onClick={(e) => handleDeleteEmployee(e, emp.id)}
                    >
                      <i className="fas fa-user-minus"></i>
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="form-actions">
              <button className="btn-pdv-primary" style={{width: '100%'}} onClick={handleConfirmInvoice}>
                Confirmar e Fechar Fatura
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isMainModalOpen && (
        <Modal title="Novo Convênio Corporativo" onClose={() => setIsMainModalOpen(false)}>
          <form className="fnrh-form-modern" onSubmit={handleCreateCompany}>
            <p className="form-subtitle">Configuração de Cobrança</p>
            <div className="form-grid">
              <div className="input-group-mock full">
                <label>Razão Social</label>
                <input 
                  type="text" 
                  placeholder="Ex: Frigopesca Ltda" 
                  value={convenio.razao}
                  onChange={(e) => setConvenio({ ...convenio, razao: e.target.value })}
                  required 
                />
              </div>

              <div className="input-group-mock">
                <label>CNPJ da Empresa</label>
                <input 
                  type="text" 
                  placeholder="00.000.000/0000-00" 
                  maxLength={18}
                  value={convenio.cnpj} 
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    val = val.replace(/^(\d{2})(\d)/, "$1.$2");
                    val = val.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
                    val = val.replace(/\.(\d{3})(\d)/, ".$1/$2");
                    val = val.replace(/(\d{4})(\d)/, "$1-$2");
                    setConvenio({ ...convenio, cnpj: val });
                  }}
                />
              </div>

              <div className="input-group-mock">
                <label>Acordo de Desconto</label>
                <select 
                  className="select-mock"
                  value={convenio.discount}
                  onChange={(e) => setConvenio({ ...convenio, discount: e.target.value })}
                >
                  <option value="0.05">5% OFF</option>
                  <option value="0.06">6% OFF</option>
                  <option value="0.10">10% OFF</option>
                </select>
              </div>

              <div className="input-group-mock full" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                   <i className="fas fa-search"></i> Vincular Responsável Financeiro (Hóspede Cadastrado)
                </label>
              </div>

              <div className="input-group-mock full" style={{ position: 'relative' }}>
                <label>Nome do Responsável</label>
                <input 
                  type="text" 
                  placeholder="Preenchido automaticamente após inserir o documento abaixo..." 
                  value={convenio.financeRespName}
                  readOnly
                  style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed', color: '#475569' }}
                />
                {isSearchingResp && <i className="fas fa-spinner fa-spin" style={{ position: 'absolute', right: '15px', top: '35px', color: '#64748b' }}></i>}
              </div>

              <div className="input-group-mock" style={{ width: '48%', display: 'inline-block' }}>
                <label>Tipo de Documento</label>
                <select 
                  className="select-mock"
                  value={convenio.financeRespDocType}
                  onChange={(e) => setConvenio({ 
                    ...convenio, 
                    financeRespDocType: e.target.value,
                    financeRespDocNum: '',
                    financeRespName: ''
                  })}
                >
                  <option value="CPF">CPF</option>
                  <option value="PASSAPORTE">Passaporte</option>
                </select>
              </div>

              <div className="input-group-mock" style={{ width: '48%', display: 'inline-block', float: 'right' }}>
                <label>Número do Documento</label>
                <input 
                  type="text" 
                  placeholder={convenio.financeRespDocType === "CPF" ? "000.000.000-00" : "Número do passaporte"} 
                  value={convenio.financeRespDocNum}
                  onChange={(e) => {
                    const maskedValue = formatInputDocument(e.target.value, convenio.financeRespDocType);
                    setConvenio({ ...convenio, financeRespDocNum: maskedValue });
                  }}
                  onBlur={(e) => {
                    if(e.target.value.trim()) {
                      buscarPessoa(e.target.value, convenio.financeRespDocType, 
                        (pessoa) => {
                          if(pessoa) setConvenio({...convenio, financeRespName: pessoa.nome});
                          else setConvenio({...convenio, financeRespName: ''});
                        },
                        setIsSearchingResp
                      );
                    }
                  }}
                />
              </div>

            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setIsMainModalOpen(false)} className="btn-cancel">
                Cancelar
              </button>
              <button type="submit" className="btn-save-fnrh" disabled={!convenio.financeRespName}>
                Ativar Parceria
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL DE CONFIRMAÇÃO GENÉRICO */}
      {confirmModal.isOpen && (
        <Modal 
          title={confirmModal.title} 
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        >
          <div style={{ padding: '20px' }}>
            <p style={{ marginBottom: '25px', color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-cancel" 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Cancelar
              </button>
              <button 
                className="btn-pdv-primary" 
                style={{ backgroundColor: '#dc3545', border: 'none' }} // Vermelho de perigo
                onClick={confirmModal.onConfirm}
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}