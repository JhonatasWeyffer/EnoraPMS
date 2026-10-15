import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import "../styles/reservations.css";

// Constantes FNRH (lookups estáticos)
const SITUACOES_RESERVA = [
  { id: "", label: "Todas" },
  { id: "CRIADA", label: "Criada", cor: "#3B82F6" },
  { id: "EM_ANDAMENTO", label: "Em Andamento", cor: "#F59E0B" },
  { id: "CONCLUIDA", label: "Concluída", cor: "#10B981" },
  { id: "CANCELADA", label: "Cancelada", cor: "#EF4444" },
  { id: "NOSHOW", label: "No-Show", cor: "#6B7280" }
];

const SITUACOES_HOSPEDE = [
  { id: "AGUARDANDO_CHECKIN", label: "Aguardando Check-in", cor: "#94A3B8" },
  { id: "PRECHECKIN_PENDENTE", label: "Pré-check-in Pendente", cor: "#A78BFA" },
  { id: "PRECHECKIN_REALIZADO", label: "Pré-check-in", cor: "#8B5CF6" },
  { id: "CHECKIN_REALIZADO", label: "Check-in realizado", cor: "#3B82F6" },
  { id: "CHECKOUT_REALIZADO", label: "Check-out realizado", cor: "#10B981" },
  { id: "NOSHOW", label: "No-show", cor: "#EF4444" }
];

const ORIGENS_RESERVA = [
  { id: "MEIOHOSPEDAGEM", label: "Meio de Hospedagem" },
];

// 1. BASE DE DADOS COMPLETA E OFICIAL - EXATAMENTE AS 30 ACOMODAÇÕES (Sem limite de capacidade)
const OFICIAL_ROOMS_RECORDS = [
  // Chalés (30 ao 45)
  { room: "30", category: "CHALÉ" },
  { room: "31", category: "CHALÉ" },
  { room: "32", category: "CHALÉ" },
  { room: "33", category: "CHALÉ" },
  { room: "34", category: "CHALÉ" },
  { room: "35", category: "CHALÉ" },
  { room: "36", category: "CHALÉ" },
  { room: "37", category: "CHALÉ" },
  { room: "38", category: "CHALÉ" },
  { room: "39", category: "CHALÉ" },
  { room: "40", category: "CHALÉ" },
  { room: "41", category: "CHALÉ" },
  { room: "42", category: "CHALÉ" },
  { room: "43", category: "CHALÉ" },
  { room: "44", category: "CHALÉ" },
  { room: "45", category: "CHALÉ" },
  // Quartos Hotel
  { room: "101", category: "HOTEL" },
  { room: "102", category: "HOTEL" },
  { room: "103", category: "HOTEL" },
  { room: "104", category: "HOTEL" },
  { room: "105", category: "HOTEL" },
  { room: "107", category: "HOTEL" },
  { room: "108", category: "HOTEL" },
  { room: "109", category: "HOTEL" },
  { room: "201", category: "HOTEL" },
  { room: "202", category: "HOTEL" },
  { room: "203", category: "HOTEL" },
  { room: "204", category: "HOTEL" },
  { room: "205", category: "HOTEL" },
  { room: "206", category: "HOTEL" }
];

const MEIOS_TRANSPORTE = [
  { id: "ONIBUS", label: "Ônibus" },
  { id: "AUTOMOVEL", label: "Automóvel" },
  { id: "AVIAO", label: "Avião" },
  { id: "MOTO", label: "Moto" },
  { id: "NAVIO_BARCO", label: "Navio/Barco" },
  { id: "PE", label: "A pé" },
  { id: "TREM", label: "Trem" },
  { id: "BICICLETA", label: "Bicicleta" }
];

const MOTIVOS_VIAGEM = [
  { id: "COMPRAS", label: "Compras" },
  { id: "CONGRESSO_FEIRA", label: "Congresso/Feira" },
  { id: "ESTUDOS_CURSOS", label: "Estudos/Cursos" },
  { id: "LAZER_FERIAS", label: "Lazer/Férias" },
  { id: "NEGOCIOS", label: "Negócios" },
  { id: "PARENTES_AMIGOS", label: "Parentes/Amigos" },
  { id: "RELIGIAO", label: "Religião" },
  { id: "SAUDE", label: "Saúde" }
];

// Helper global para máscara de CPF na renderização
const formatarCpfTexto = (num, tipo) => {
  if (tipo !== "CPF" || !num) return num;
  const limpo = num.replace(/\D/g, "");
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return num;
};

export default function Reservations() {
  // ============ ESTADOS ============
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filtros
  const [filterSituacao, setFilterSituacao] = useState("");
  const [filterDataEntrada, setFilterDataEntrada] = useState("");
  const [filterDataSaida, setFilterDataSaida] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal Formulário (criar/editar)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    tipo_documento_busca: "CPF",
    documento_busca: "",
    hospede_nome: "",
    hospede_id: null,
    numero_reserva_ota: "",
    data_entrada: "",
    data_saida: "",
    origem_reserva_id: "MEIOHOSPEDAGEM",
    quarto: "",
    quantidade_hospede_adulto: 1, 
    quantidade_hospede_menor: 0,  
    meio_transporte: "",
    motivo_viagem: "",
    valor_total: "",
    forma_pagamento: "",
    status_pagamento: "pendente",
    pago_em: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [buscandoPessoa, setBuscandoPessoa] = useState(false);
  const [pessoaEncontrada, setPessoaEncontrada] = useState(null);
  
  // Controle de Faturamento Corporativo
  const [guestCompany, setGuestCompany] = useState(null);

  // Modal Detalhes
  const [showDetail, setShowDetail] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);

  // Modal Gerenciar Hóspedes
  const [showGuestManage, setShowGuestManage] = useState(false);
  const [guestManageReserva, setGuestManageReserva] = useState(null);
  const [hospedesManage, setHospedesManage] = useState([]);
  const [loadingManage, setLoadingManage] = useState(false);

  // Modal Adicionar Pessoa
  const [showAddPessoa, setShowAddPessoa] = useState(false);
  const [addPessoaDocType, setAddPessoaDocType] = useState("CPF");
  const [cpfBusca, setCpfBusca] = useState("");
  const [addToReservaId, setAddToReservaId] = useState(null);

  // Modal Check-in/out Individual
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkTipo, setCheckTipo] = useState("in");
  const [selectedHospede, setSelectedHospede] = useState(null);
  const [checkDateTime, setCheckDateTime] = useState("");

  // Modal Confirmação
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Quartos disponíveis
  const [quartosDisponiveis, setQuartosDisponiveis] = useState([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const obterNomeOperadorLogado = useCallback(() => {
    const dadosSessao = localStorage.getItem("user");
    let nomeOperador = localStorage.getItem("usuario_nome");

    if (dadosSessao) {
      try {
        const sessaoObjeto = JSON.parse(dadosSessao);
        nomeOperador = sessaoObjeto.user?.nome || sessaoObjeto.user?.name || sessaoObjeto.nome || sessaoObjeto.name;
      } catch (err) {
        console.error("Erro ao parsear sessão no Reservations:", err);
      }
    }

    return nomeOperador || "Usuario Desconhecido";
  }, []);

  // ============ FUNÇÕES DE API ============

  const checkGuestCompany = async (hospedeId, numeroDocumento = null) => {
    if (!hospedeId) {
      setGuestCompany(null);
      return;
    }
    try {
      const res = await api.get('/companies');
      const companies = res.data;
      
      const docLimpo = numeroDocumento ? String(numeroDocumento).replace(/\D/g, '') : null;

      const company = companies.find(c => 
        (docLimpo && c.contatoFinanceiroNumDoc === docLimpo) || 
        c.funcionarios?.some(f => f.hospedeId === hospedeId) || 
        c.employees?.some(f => f.hospedeId === hospedeId)
      );
      setGuestCompany(company ? (company.razaoSocial || company.name) : null);
    } catch (error) {
      console.error("Erro ao verificar convênio", error);
      setGuestCompany(null);
    }
  };

  const buscarPessoaPorDocumento = async (numeroDocumento, tipoDocumento) => {
    const docLimpo = numeroDocumento.replace(/\D/g, '');

    if (tipoDocumento === "CPF" && docLimpo.length !== 11) {
      toast.error("CPF deve ter 11 dígitos");
      return;
    }

    setBuscandoPessoa(true);
    setPessoaEncontrada(null);
    setGuestCompany(null);

    try {
      const response = await api.post("/reservations/buscar-hospede", {
        tipo_documento: tipoDocumento,
        numero_documento: docLimpo,
      });

      const pessoa = response.data;
      setPessoaEncontrada(pessoa);
      setFormData(prev => ({
        ...prev,
        hospede_nome: pessoa.nome,
        hospede_id: pessoa.id,
        documento_busca: tipoDocumento === "CPF"
          ? docLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          : docLimpo,
      }));
      
      checkGuestCompany(pessoa.id, docLimpo);
      
      toast.success(`Hóspede encontrado: ${pessoa.nome}`);
    } catch (error) {
      setFormData(prev => ({ ...prev, hospede_nome: "", hospede_id: null }));
      toast.error(error.response?.data?.message || "Erro ao buscar hóspede");
    } finally {
      setBuscandoPessoa(false);
    }
  };

   const atualizarQuartosDisponiveis = async (dataEntrada, dataSaida, reservaIdIgnorar = null) => {
    if (!dataEntrada || !dataSaida) {
      setQuartosDisponiveis([]);
      return;
    }

    const anoEntrada = dataEntrada.split('-')[0];
    const anoSaida = dataSaida.split('-')[0];
    if (anoEntrada.length < 4 || anoSaida.length < 4 || Number(anoEntrada) < 2000 || Number(anoSaida) < 2000) {
      setQuartosDisponiveis([]);
      return;
    }

    try {
      const params = {
        data_entrada: dataEntrada,
        data_saida: dataSaida,
      };
      if (reservaIdIgnorar) params.exclude_reserva_id = reservaIdIgnorar;

      const response = await api.get("/reservations/available-rooms", { params });
      setQuartosDisponiveis(response.data);
    } catch {
      setQuartosDisponiveis([]);
    }
  };

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (filterSituacao) params.situacao = filterSituacao;
      if (filterDataEntrada) params.dataEntrada = filterDataEntrada;
      if (filterDataSaida) params.dataSaida = filterDataSaida;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get("/reservations", { params });
      setReservations(response.data.data || []);
      setTotalPages(response.data.meta?.totalPages || 1);
    } catch (error) {
      console.error("Erro ao carregar reservas:", error);
      toast.error("Erro ao carregar reservas");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterSituacao, filterDataEntrada, filterDataSaida, searchTerm]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const resetForm = () => {
    setFormData({
      tipo_documento_busca: "CPF",
      documento_busca: "",
      hospede_nome: "",
      hospede_id: null,
      numero_reserva_ota: "",
      data_entrada: "",
      data_saida: "",
      origem_reserva_id: "MEIOHOSPEDAGEM",
      quarto: "",
      quantidade_hospede_adulto: 1, 
      quantidade_hospede_menor: 0,  
      meio_transporte: "",
      motivo_viagem: "",
      valor_total: "",
      forma_pagamento: "",
      status_pagamento: "pendente",
      pago_em: ""
    });
    setFormErrors({});
    setEditingId(null);
    setPessoaEncontrada(null);
    setQuartosDisponiveis([]);
    setGuestCompany(null);
  };

  const handleNewReserva = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditReserva = (reserva) => {
    setEditingId(reserva.reserva_id);
    setFormData({
      tipo_documento_busca: "CPF",
      documento_busca: "",
      hospede_nome: reserva.hospede_responsavel || "",
      hospede_id: reserva.hospede_responsavel_id || null,
      numero_reserva_ota: reserva.numero_reserva_ota || "",
      data_entrada: reserva.data_entrada || "",
      data_saida: reserva.data_saida || "",
      origem_reserva_id: reserva.origem_reserva_id || "MEIOHOSPEDAGEM",
      quarto: reserva.quarto || "",
      quantidade_hospede_adulto: reserva.quantidade_hospede_adulto || 1, 
      quantidade_hospede_menor: reserva.quantidade_hospede_menor || 0,  
      meio_transporte: reserva.meio_transporte || "",
      motivo_viagem: reserva.motivo_viagem || "",
      valor_total: reserva.valor_total || "",
      forma_pagamento: reserva.forma_pagamento || "",
      status_pagamento: reserva.status_pagamento || "pendente",
      pago_em: reserva.pago_em || ""
    });
    setFormErrors({});
    
    const titular = reserva.hospedes?.find(h => h.hospede.responsavel_quarto);
    const docTitular = titular ? titular.pessoa.numero : null;

    if (reserva.hospede_responsavel_id) {
      checkGuestCompany(reserva.hospede_responsavel_id, docTitular);
    } else {
      setGuestCompany(null);
    }

    if (reserva.data_entrada && reserva.data_saida) {
      atualizarQuartosDisponiveis(reserva.data_entrada, reserva.data_saida, reserva.reserva_id);
    }
    setShowForm(true);
  };

  const handleSaveReserva = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.hospede_nome && !formData.hospede_id) errors.hospede_responsavel = "Busque um hóspede pelo CPF ou Passaporte";
    if (!formData.data_entrada) errors.data_entrada = "Data de entrada é obrigatória";
    if (!formData.data_saida) errors.data_saida = "Data de saída é obrigatória";
    if (formData.data_entrada && formData.data_saida && formData.data_saida <= formData.data_entrada) {
      errors.data_saida = "Data de saída deve ser posterior à entrada";
    }
    
    if (!formData.quarto) {
      errors.quarto = "Quarto é obrigatório";
    } else {
      const isQuartoLivre = quartosDisponiveis.some(q => String(q.numero) === String(formData.quarto));
      if (!isQuartoLivre) {
        errors.quarto = "Quarto indisponível (em limpeza, manutenção ou já ocupado nestas datas). Bloqueio ativado.";
      }
    }

    if (formData.quantidade_hospede_adulto < 1) {
      errors.quantidade_hospede_adulto = "A reserva deve ter pelo menos 1 adulto.";
    }

    if (!formData.meio_transporte) errors.meio_transporte = "Meio de transporte é obrigatório";
    if (!formData.motivo_viagem) errors.motivo_viagem = "Motivo de viagem é obrigatório";
    
    if (formData.forma_pagamento === 'convenio' && !guestCompany) {
      errors.forma_pagamento = "Hóspede não possui convênio vinculado. Não é possível salvar.";
    }

    if (formData.forma_pagamento && formData.forma_pagamento !== 'convenio' && !formData.valor_total) {
      errors.valor_total = "O valor total é obrigatório ao informar uma forma de pagamento.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

  setSaving(true);
    try {
      const ehPago = formData.valor_total && formData.forma_pagamento && formData.forma_pagamento !== 'convenio';

      const payload = {
        ...(formData.hospede_id ? { hospede_id: formData.hospede_id } : {
          hospede_nome: formData.hospede_nome,
          tipo_documento: formData.tipo_documento_busca,
          numero_documento: formData.documento_busca.replace(/\D/g, ''),
        }),
        data_entrada: formData.data_entrada,
        data_saida: formData.data_saida,
        quarto: formData.quarto,
        quantidade_hospede_adulto: parseInt(formData.quantidade_hospede_adulto, 10), 
        quantidade_hospede_menor: parseInt(formData.quantidade_hospede_menor, 10) || 0, 
        meio_transporte: formData.meio_transporte,
        motivo_viagem: formData.motivo_viagem,
        origem_reserva_id: formData.origem_reserva_id,
        valor_total: formData.valor_total ? parseFloat(formData.valor_total) : undefined,
        forma_pagamento: formData.forma_pagamento || undefined,
        
        status_pagamento: ehPago ? "pago" : "pendente",
        pago_em: ehPago ? (formData.pago_em || new Date().toISOString().split('T')[0]) : undefined,
      };

      if (editingId) {
        await api.put(`/reservations/${editingId}`, payload);
      } else {
        await api.post("/reservations", payload);
      }

      toast.success(editingId ? "Reserva atualizada com sucesso!" : "Reserva criada com sucesso!");
      setShowForm(false);
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarReserva = async (id) => {
    try {
      await api.patch(`/reservations/${id}/cancel`);
      toast.success("Reserva cancelada");
      fetchReservations();
      if (selectedReserva?.reserva_id === id) {
        setSelectedReserva(prev => ({ 
          ...prev, 
          situacao_reserva_id: "CANCELADA", 
          situacao_reserva_label: "Cancelada",
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao cancelar reserva");
    }
  };
  const confirmDestructiveAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "cancelar") handleCancelarReserva(confirmAction.id);
    setShowConfirm(false);
    setConfirmAction(null);
  };

  const openDetail = (reserva) => {
    setSelectedReserva(reserva);
    setShowDetail(true);
  };

  // ========== GERENCIAMENTO DE HÓSPEDES ==========

  const fetchHospedesManage = async (reservaId) => {
    setLoadingManage(true);
    try {
      const response = await api.get(`/reservations/${reservaId}`);
      const data = response.data;
      setHospedesManage(data.hospedes || []);
      setGuestManageReserva(data);
    } catch {
      toast.error("Erro ao carregar hóspedes da reserva");
    } finally {
      setLoadingManage(false);
    }
  };

  const handleRemoveGuest = async (reservaId, guestId) => {
    try {
      await api.delete(`/reservations/${reservaId}/guests/${guestId}`);
      toast.success("Hóspede removido da reserva.");
      fetchHospedesManage(reservaId);
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao remover hóspede");
    }
  };

  const buscarPessoaParaAdicionar = async () => {
    const docLimpo = cpfBusca.replace(/\D/g, "");
    if (addPessoaDocType === "CPF" && docLimpo.length !== 11) {
      toast.error("Digite um CPF válido com 11 dígitos");
      return;
    }

    setBuscandoPessoa(true);
    setPessoaEncontrada(null);

    try {
      const response = await api.post("/reservations/buscar-hospede", {
        tipo_documento: addPessoaDocType,
        numero_documento: addPessoaDocType === "CPF" ? docLimpo : cpfBusca.trim(),
      });
      setPessoaEncontrada(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao buscar pessoa");
    } finally {
      setBuscandoPessoa(false);
    }
  };

  const adicionarPessoaReserva = async () => {
    if (!pessoaEncontrada || !addToReservaId) return;
    try {
      await api.post(`/reservations/${addToReservaId}/guests`, {
        hote_guest_id: pessoaEncontrada.id,
      });
      toast.success(`${pessoaEncontrada.nome} adicionado à reserva`);
      setShowAddPessoa(false);
      setCpfBusca("");
      setPessoaEncontrada(null);
      fetchHospedesManage(addToReservaId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao adicionar pessoa");
    }
  };

  const handleCheckIndividual = async () => {
    if (!selectedHospede || !checkDateTime) {
      toast.error("Selecione a data e hora");
      return;
    }
    try {
      const status = checkTipo === "in" ? "CHECKIN_REALIZADO" : "CHECKOUT_REALIZADO";
      await api.patch(
        `/reservations/${guestManageReserva?.reserva_id}/guests/${selectedHospede.hospede.hospede_id}/status`,
        { status, data_hora: checkDateTime }
      );
      toast.success(`Check-${checkTipo === "in" ? "in" : "out"} realizado com sucesso!`);
      setShowCheckModal(false);
      setSelectedHospede(null);
      fetchHospedesManage(guestManageReserva.reserva_id);
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao atualizar status");
    }
  };

  const openCheckModal = (hospede, tipo) => {
    setSelectedHospede(hospede);
    setCheckTipo(tipo);
    setCheckDateTime(new Date().toISOString().slice(0, 16));
    setShowCheckModal(true);
  };

  // ============ RENDER ============
  return (
    <div className="reserva-module">
<header className="reserva-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className= "pdv-main-title" style={{ margin: 0 }}>Gestão de Reservas</h1>
          <p style={{ margin: 0 }}>Ficha Nacional de Registro de Hóspedes (FNRH)</p>
        </div>
        
        <button 
          onClick={handleNewReserva} 
          className="btn-pdv-primary" 
          style={{ marginLeft: 'auto' }}
        >
          <i className='fas fa-user-plus'></i> Nova Reserva
        </button>
      </header>

      <div className="fnrh-filter-bar">
        <select
          value={filterSituacao}
          onChange={(e) => { setFilterSituacao(e.target.value); setPage(1); }}
          className="filter-select"
        >
          {SITUACOES_RESERVA.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterDataEntrada}
          onChange={(e) => setFilterDataEntrada(e.target.value)}
          placeholder="Data entrada"
          className="filter-date"
        />

        <input
          type="date"
          value={filterDataSaida}
          onChange={(e) => setFilterDataSaida(e.target.value)}
          placeholder="Data saída"
          className="filter-date"
        />

        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Buscar por nome do hóspede ou quarto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button onClick={() => { setPage(1); fetchReservations(); }} className="btn-filter">
          <i className="fas fa-filter"></i> Filtrar
        </button>
      </div>

      <div className="reserva-table-card animate-in">
        {loading ? (
          <div className="loading-container">
            <i className="fas fa-spinner fa-spin"></i> Carregando reservas...
          </div>
        ) : (
          <>
            <table className="reserva-table">
              <thead>
                <tr>
                  <th>Nº Reserva</th>
                  <th>Hóspede Resp.</th>
                  <th>Quarto</th>
                  <th>Período</th>
                  <th>Situação</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '4px 4px' }}>
                    
                    <div className="empty-state2">
                      Nenhuma reserva encontrada
                    </div>
                    
                  </td>
                </tr>
                ) : (
                  reservations.map((r) => (
                    <tr key={r.reserva_id}>
                      <td>
                        <strong className="guest-name">{r.numero_reserva}</strong>
                      </td>
                      <td>
                        <span style={{fontWeight: 500}}>{r.hospede_responsavel || "-"}</span>
                      </td>
                      <td>
                        {r.quarto ? (
                          <span className="room-badge" style={{backgroundColor: '#1a2b45'}}>
                            Quarto {r.quarto}
                          </span>
                        ) : "-"}
                      </td>
                      <td>
                        <span style={{fontSize: '13px'}}>{r.data_entrada} → {r.data_saida}</span>
                      </td>
                      <td>
                        <span
                          className="badge-status"
                          style={{
                            backgroundColor: (SITUACOES_RESERVA.find(s => s.id === r.situacao_reserva_id)?.cor || '#94a3b8') + '20',
                            color: SITUACOES_RESERVA.find(s => s.id === r.situacao_reserva_id)?.cor || '#475569'
                          }}
                        >
                          {r.situacao_reserva_label}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons-container">
                          {r.situacao_reserva_id === "CRIADA" && (
                            <>
                          <button
                            className="btn-action-icon add-guest"
                            onClick={() => {
                              fetchHospedesManage(r.reserva_id);
                              setShowGuestManage(true);
                            }}
                            title="Gerenciar Hóspedes"
                          >
                            <i className="fas fa-user-plus"></i>
                          </button>
                              <button className="btn-action-icon edit" onClick={() => handleEditReserva(r)} title="Editar">
                                <i className="fas fa-edit"></i>
                              </button>
                              <button className="btn-action-icon cancel" onClick={() => { setConfirmAction({ type: "cancelar", id: r.reserva_id }); setShowConfirm(true); }} title="Cancelar">
                                <i className="fas fa-ban"></i>
                              </button>
                            </>
                          )}
                          <button className="btn-action-icon edit" onClick={() => openDetail(r)} title="Ver detalhes">
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-page"
                >
                  Anterior
                </button>
                <span className="page-info">Página {page} de {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-page"
                >
                  Próximo
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-detail" style={{maxWidth: '750px'}}>
            <div className="modal-header">
              <h2>{editingId ? "Editar Reserva" : "Nova Reserva"}</h2>
              <button onClick={() => setShowForm(false)} className="btn-close-modal">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveReserva}>
              <div style={{padding: '20px 25px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>

                  <div style={{gridColumn: 'span 2'}}>
                    <label style={{display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px', letterSpacing: '0.3px'}}>
                      Hóspede Responsável *
                    </label>
                    <div className="hospede-search-group">
                      <div className="doc-type-select">
                        <select
                          value={formData.tipo_documento_busca || "CPF"}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              tipo_documento_busca: e.target.value,
                              documento_busca: "",
                              hospede_nome: "",
                              hospede_id: null
                            }));
                            setPessoaEncontrada(null);
                            setGuestCompany(null);
                          }}
                          disabled={!!editingId}
                          style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: formErrors.hospede_responsavel ? '1px solid #ef4444' : '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff'}}
                        >
                          <option value="CPF">CPF</option>
                          <option value="PASSAPORTE">Passaporte</option>
                        </select>
                      </div>
                      {/* Campo do Hóspede Responsável - Input de CPF / Passaporte */}
                      <div className="doc-number-input">
                        {(formData.tipo_documento_busca === "CPF" || !formData.tipo_documento_busca) ? (
                          <input
                            type="text"
                            value={formData.documento_busca || ""}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              val = val.replace(/(\d{3})(\d)/, '$1.$2');
                              val = val.replace(/(\d{3})(\d)/, '$1.$2');
                              val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                              setFormData(prev => ({ ...prev, documento_busca: val }));
                            }}
                            onBlur={async () => {
                              const cpfLimpo = formData.documento_busca?.replace(/\D/g, '');
                              if (cpfLimpo && cpfLimpo.length === 11 && !editingId) {
                                await buscarPessoaPorDocumento(cpfLimpo, "CPF");
                              }
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); 
                                const cpfLimpo = formData.documento_busca?.replace(/\D/g, '');
                                if (cpfLimpo && cpfLimpo.length === 11 && !editingId) {
                                  await buscarPessoaPorDocumento(cpfLimpo, "CPF");
                                }
                              }
                            }}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            disabled={!!editingId}
                            style={formErrors.hospede_responsavel ? {borderColor: '#ef4444', width: '25%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ef4444', fontSize: '14px', backgroundColor: '#fff'} : {width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff'}}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData.documento_busca || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, documento_busca: e.target.value }))}
                            onBlur={async () => {
                              if (formData.documento_busca?.trim() && !editingId) {
                                await buscarPessoaPorDocumento(formData.documento_busca.trim(), "PASSAPORTE");
                              }
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); 
                                if (formData.documento_busca?.trim() && !editingId) {
                                  await buscarPessoaPorDocumento(formData.documento_busca.trim(), "PASSAPORTE");
                                }
                              }
                            }}
                            placeholder="Número do passaporte"
                            disabled={!!editingId}
                            style={formErrors.hospede_responsavel ? {borderColor: '#ef4444', width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ef4444', fontSize: '14px', backgroundColor: '#fff'} : {width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff'}}
                          />
                        )}
                      </div>
                    </div>

                    {buscandoPessoa && (
                      <span className="search-indicator">
                        <i className="fas fa-spinner fa-spin"></i> Buscando hóspede...
                      </span>
                    )}

                    {formData.hospede_nome && (
                      <div className="hospede-confirmado">
                        <i className="fas fa-check-circle"></i>
                        <span><strong>Hóspede:</strong> {formData.hospede_nome}</span>
                      </div>
                    )}

                    {formErrors.hospede_responsavel && (
                      <span style={{color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px'}}>{formErrors.hospede_responsavel}</span>
                    )}
                  </div>

                  <div>
                    <label>Data de Entrada *</label>
                    <input
                      type="date"
                      value={formData.data_entrada}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, data_entrada: e.target.value }));
                        atualizarQuartosDisponiveis(e.target.value, formData.data_saida, editingId);
                      }}
                      style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: formErrors.data_entrada ? '1px solid #ef4444' : '1px solid #cbd5e1'}}
                    />
                    {formErrors.data_entrada && <span style={{color: '#ef4444', fontSize: '11px'}}>{formErrors.data_entrada}</span>}
                  </div>

                  <div>
                    <label>Data de Saída *</label>
                    <input
                      type="date"
                      value={formData.data_saida}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, data_saida: e.target.value }));
                        atualizarQuartosDisponiveis(formData.data_entrada, e.target.value, editingId);
                      }}
                      style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: formErrors.data_saida ? '1px solid #ef4444' : '1px solid #cbd5e1'}}
                    />
                    {formErrors.data_saida && <span style={{color: '#ef4444', fontSize: '11px'}}>{formErrors.data_saida}</span>}
                  </div>

                  <div>
                  <label>
                    Quarto *
                  </label>
                 <select
    value={formData.quarto || ""}
    onChange={(e) => setFormData(prev => ({ ...prev, quarto: e.target.value }))}
    style={{
      width: "100%",
      height: "42px",
      padding: "0 12px",
      borderRadius: "8px",
      border: formErrors.quarto ? "1px solid #ef4444" : "1px solid #cbd5e1",
      backgroundColor: "#fff",
      fontSize: "15px",
      color: "#1e293b",
      fontFamily: "inherit",
      cursor: "pointer",
      outline: "none"
    }}
  >
    <option value="">Selecione uma acomodação...</option>
    
    {quartosDisponiveis.map((item) => {
      const numero = item.numero;
      const dadosEstaticos = OFICIAL_ROOMS_RECORDS.find(r => String(r.room) === String(numero));
      const categoria = dadosEstaticos?.category === "CHALÉ" ? "Chalé" : "Quarto";

      return (
        <option key={numero} value={numero}>
          {categoria} {numero}
        </option>
      );
    })}
  </select>

  {/* Mensagem de Erro Única */}
  {formErrors.quarto && (
    <span style={{ color: "#ef4444", fontSize: "11px", display: "block", marginTop: "4px", fontFamily: "inherit" }}>
      {formErrors.quarto}
    </span>
  )}

  {/* Detalhe Informativo Premium */}
  {formData.quarto && (() => {
    const dadosAcomodacao = OFICIAL_ROOMS_RECORDS.find(r => String(r.room) === String(formData.quarto));
    if (!dadosAcomodacao) return null;

    const cat = dadosAcomodacao?.category || "";
    const ehChale = cat.includes('CHALÉ') || cat.includes('CHALE');

    // Paleta de cores dinâmica para o Card
    const bgColor = ehChale ? '#f0fdf4' : '#eff6ff';
    const borderColor = ehChale ? '#bbf7d0' : '#bfdbfe';
    const borderLeftColor = ehChale ? '#10b981' : '#3b82f6';
    const textColor = ehChale ? '#166534' : '#1e40af';
    const badgeBg = ehChale ? '#dcfce7' : '#dbeafe';

    return (
      <div style={{
        marginTop: '10px',
        padding: '10px 14px',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${borderLeftColor}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        fontSize: '13px',
        fontFamily: 'inherit',
        color: textColor,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}>
        {/* Badge da Categoria */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: '500', opacity: 0.8 }}>Tipo de Acomodação:</span>
          <span style={{ 
            backgroundColor: badgeBg, 
            padding: '2px 8px', 
            borderRadius: '6px', 
            fontWeight: '700',
            fontSize: '11px',
            letterSpacing: '0.5px'
          }}>
            {ehChale ? 'CHALÉ' : 'QUARTO'}
          </span>
        </div>
      </div>
    );
  })()}
                </div>

                                    <div>
                    <label>Origem da Reserva *</label>
                    <select
                      value={formData.origem_reserva_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, origem_reserva_id: e.target.value }))}
                      style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff'}}
                    >
                      {ORIGENS_RESERVA.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Qtd. Adultos *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantidade_hospede_adulto}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade_hospede_adulto: e.target.value }))}
                      style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: formErrors.quantidade_hospede_adulto ? '1px solid #ef4444' : '1px solid #cbd5e1'}}
                    />
                    {formErrors.quantidade_hospede_adulto && <span style={{color: '#ef4444', fontSize: '11px'}}>{formErrors.quantidade_hospede_adulto}</span>}
                  </div>

                  <div>
                    <label>Qtd. Menores</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantidade_hospede_menor}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade_hospede_menor: e.target.value }))}
                      style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                    />
                  </div>

                  <div>
                    <label>Meio de Transporte *</label>
                    <select
                      value={formData.meio_transporte}
                      onChange={(e) => setFormData(prev => ({ ...prev, meio_transporte: e.target.value }))}
                      style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: formErrors.meio_transporte ? '1px solid #ef4444' : '1px solid #cbd5e1', backgroundColor: '#fff'}}
                    >
                      <option value="">Selecione...</option>
                      {MEIOS_TRANSPORTE.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                    {formErrors.meio_transporte && <span style={{color: '#ef4444', fontSize: '11px'}}>{formErrors.meio_transporte}</span>}
                  </div>

                  <div>
                    <label>Motivo de Viagem *</label>
                    <select
                      value={formData.motivo_viagem}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo_viagem: e.target.value }))}
                      style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: formErrors.motivo_viagem ? '1px solid #ef4444' : '1px solid #cbd5e1', backgroundColor: '#fff'}}
                    >
                      <option value="">Selecione...</option>
                      {MOTIVOS_VIAGEM.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                    {formErrors.motivo_viagem && <span style={{color: '#ef4444', fontSize: '11px'}}>{formErrors.motivo_viagem}</span>}
                  </div>
                </div>

                <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '15px'}}>
                  <h4 style={{margin: '0 0 15px 0', color: '#1a2b45', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <i className="fas fa-money-bill-wave"></i> Pagamento antecipado (Opcional)
                  </h4>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                    <div>
                      <label>Forma de Pagamento</label>
                      <select
                        value={formData.forma_pagamento}
                        onChange={(e) => {
                           setFormData(prev => ({ ...prev, forma_pagamento: e.target.value }));
                           setFormErrors(prev => ({ ...prev, valor_total: null }));
                        }}
                        style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff'}}
                      >
                        <option value="">Selecione...</option>
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="convenio">Convênio</option>
                      </select>
                    </div>
                    
                    {formData.forma_pagamento === 'convenio' ? (
                      <div>
                        <label>Faturamento Corporativo</label>
                        {guestCompany ? (
                          <div style={{ padding: '10px 12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '14px', fontWeight: '500', height: '42px', display: 'flex', alignItems: 'center' }}>
                            <i className="fas fa-building" style={{marginRight: '8px'}}></i> Empresa: {guestCompany}
                          </div>
                        ) : (
                          <div style={{ padding: '10px 12px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px', fontWeight: '500', height: '42px', display: 'flex', alignItems: 'center' }}>
                            <i className="fas fa-exclamation-circle" style={{marginRight: '8px'}}></i> Hóspede sem convênio
                          </div>
                        )}
                        {formErrors.forma_pagamento && <span style={{color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px'}}>{formErrors.forma_pagamento}</span>}
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <label>
                           Valor Total da Estadia {formData.forma_pagamento && formData.forma_pagamento !== 'convenio' && <span style={{color: '#ef4444'}}>*</span>}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.valor_total}
                          onChange={(e) => {
                             setFormData(prev => ({ ...prev, valor_total: e.target.value }));
                             if (e.target.value) setFormErrors(prev => ({ ...prev, valor_total: null }));
                          }}
                          placeholder="R$ 0,00"
                          style={{
                             width: '100%', 
                             padding: '10px 12px', 
                             borderRadius: '8px', 
                             border: formErrors.valor_total ? '1px solid #ef4444' : '1px solid #cbd5e1'
                          }}
                        />
                        {formErrors.valor_total && <span style={{color: '#ef4444', fontSize: '11px', marginTop: '4px'}}>{formErrors.valor_total}</span>}
                      </div>
                    )}

                    {formData.status_pagamento === 'pago' && formData.forma_pagamento !== 'convenio' && (
                      <div>
                        <label>Pago em</label>
                        <input
                          type="date"
                          value={formData.pago_em}
                          onChange={(e) => setFormData(prev => ({ ...prev, pago_em: e.target.value }))}
                          style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1'}}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px'}}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-reserva btn-reserva--edit" disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save" disabled={saving}>
                    {saving ? (
                      <><i className="fas fa-spinner fa-spin"></i> Salvando...</>
                    ) : (
                      editingId ? "Atualizar Reserva" : "Criar Reserva"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetail && selectedReserva && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetail(false); }}>
          <div className="modal-detail">
            <div className="modal-header">
              <div>
                <h2>Reserva: {selectedReserva.numero_reserva}</h2>
                <span
                  className="badge-status"
                  style={{
                    backgroundColor: (SITUACOES_RESERVA.find(s => s.id === selectedReserva.situacao_reserva_id)?.cor || '#94a3b8') + '20',
                    color: SITUACOES_RESERVA.find(s => s.id === selectedReserva.situacao_reserva_id)?.cor || '#475569'
                  }}
                >
                  {selectedReserva.situacao_reserva_label}
                </span>
              </div>
              <button onClick={() => setShowDetail(false)} className="btn-close-modal">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="tab-dados">
                <div className="info-grid">
                  <div className="info-item">
                    <label>Nº Reserva (Gerado)</label>
                    <span className="room-badge" style={{backgroundColor: '#1a2b45', display: 'inline-block', padding: '4px 10px', color: '#fff'}}>{selectedReserva.numero_reserva}</span>
                  </div>
                  <div className="info-item"><label>Origem</label><span>{selectedReserva.origem_reserva_label}</span></div>
                  <div className="info-item"><label>Hóspede Responsável</label><span>{selectedReserva.hospede_responsavel || "-"}</span></div>
                  <div className="info-item"><label>Quarto</label><span>{selectedReserva.quarto ? `Quarto ${selectedReserva.quarto}` : "Não definido"}</span></div>
                  <div className="info-item"><label>Data de Entrada</label><span>{selectedReserva.data_entrada}</span></div>
                  <div className="info-item"><label>Data de Saída</label><span>{selectedReserva.data_saida}</span></div>
                  
                  {/* NOVOS CAMPOS NA VISUALIZAÇÃO DE DETALHES */}
                  <div className="info-item"><label>Qtd. Adultos</label><span>{selectedReserva.quantidade_hospede_adulto || 1}</span></div>
                  <div className="info-item"><label>Qtd. Menores</label><span>{selectedReserva.quantidade_hospede_menor || 0}</span></div>
                  {/* FIM DOS NOVOS CAMPOS */}

                  <div className="info-item">
                    <label>Meio de Transporte</label>
                    <span>{MEIOS_TRANSPORTE.find(m => m.id === selectedReserva.meio_transporte)?.label || selectedReserva.meio_transporte || "-"}</span>
                  </div>
                  <div className="info-item">
                    <label>Motivo de Viagem</label>
                    <span>{MOTIVOS_VIAGEM.find(m => m.id === selectedReserva.motivo_viagem)?.label || selectedReserva.motivo_viagem || "-"}</span>
                  </div>

                  {selectedReserva.valor_total && selectedReserva.forma_pagamento !== 'convenio' && (
                    <>
                      <div className="info-item"><label>Valor Total</label><span>R$ {parseFloat(selectedReserva.valor_total).toFixed(2)}</span></div>
                      <div className="info-item"><label>Forma Pagamento</label><span>{selectedReserva.forma_pagamento || '-'}</span></div>
                      <div className="info-item">
                        <label>Status Pagamento</label>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                          backgroundColor: selectedReserva.status_pagamento === 'pago' ? '#dcfce7' : '#fee2e2',
                          color: selectedReserva.status_pagamento === 'pago' ? '#15803d' : '#991b1b',
                          display: 'inline-block'
                        }}>
                          {selectedReserva.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                      {selectedReserva.pago_em && <div className="info-item"><label>Pago em</label><span>{selectedReserva.pago_em}</span></div>}
                    </>
                  )}
                  
                  {selectedReserva.forma_pagamento === 'convenio' && (
                     <div className="info-item" style={{ gridColumn: 'span 2' }}>
                       <label>Forma de Pagamento</label>
                       <span style={{ color: '#1e40af', fontWeight: '600' }}><i className="fas fa-building"></i> Faturado via Convênio Corporativo</span>
                     </div>
                  )}

                  <div className="info-item" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                    <label>Reserva Criada por</label>
                    <span style={{ color: '#1e3a8a', fontWeight: 600 }}><i className="fas fa-user-shield"></i> {selectedReserva.criado_por || "Sistema"}</span>
                  </div>
                  {selectedReserva.atualizado_por && (
                    <div className="info-item" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                      <label>Última Modificação por</label>
                      <span style={{ color: '#b45309', fontWeight: 600 }}><i className="fas fa-user-edit"></i> {selectedReserva.atualizado_por}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Hóspedes */}
      {showGuestManage && guestManageReserva && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGuestManage(false); }}>
          <div className="modal-detail">
            <div className="modal-header">
              <div>
                <h2>Gerenciar Hóspedes - {guestManageReserva.numero_reserva}</h2>
              </div>
              <button onClick={() => setShowGuestManage(false)} className="btn-close-modal">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <button
                onClick={() => {
                  setAddToReservaId(guestManageReserva.reserva_id);
                  setAddPessoaDocType("CPF");
                  setCpfBusca("");
                  setPessoaEncontrada(null);
                  setShowAddPessoa(true);
                }}
                className="btn-add-hospede"
                style={{marginBottom: '15px'}}
              >
                <i className="fas fa-user-plus"></i> Adicionar Pessoa
              </button>

              {loadingManage ? (
                <div className="loading-container">
                  <i className="fas fa-spinner fa-spin"></i> Carregando...
                </div>
              ) : hospedesManage.length === 0 ? (
                <div className="empty-state">Nenhum hóspede vinculado a esta reserva</div>
              ) : (
                <table className="hospedes-table">
                  <thead>
                    <tr>
                      <th>Hóspede</th>
                      <th>Documento</th>
                      <th>Situação</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospedesManage.map((h) => (
                      <tr key={h.hospede.hospede_id}>
                        <td>
                          <div className="guest-name-cell">
                            <strong>{h.pessoa.nome}</strong>
                            {h.hospede.responsavel_quarto && (
                              <span className="badge-responsavel">Responsável</span>
                            )}
                          </div>
                        </td>
                        <td>{h.pessoa.tipo_documento_id}: {formatarCpfTexto(h.pessoa.numero, h.pessoa.tipo_documento_id)}</td>
                        <td>
                          <span
                            style={{
                              backgroundColor: (SITUACOES_HOSPEDE.find(s => s.id === h.hospede.situacao_hospede_id)?.cor || '#94a3b8') + '20',
                              color: SITUACOES_HOSPEDE.find(s => s.id === h.hospede.situacao_hospede_id)?.cor || '#475569',
                              padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600
                            }}
                          >
                            {h.hospede.situacao_hospede}
                          </span>
                        </td>
                        <td className="text-right">
                          {!h.hospede.responsavel_quarto ? (
                            <button
                              className="btn-action-icon cancel"
                              onClick={() => handleRemoveGuest(guestManageReserva.reserva_id, h.pessoa.id)}
                              title="Remover hóspede"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Titular</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Pessoa (Refatorado com Busca Híbrida) */}
      {showAddPessoa && addToReservaId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddPessoa(false); }}>
          <div className="modal-small">
            <h3>Adicionar Pessoa à Reserva</h3>
            <p className="modal-subtitle">Busque uma pessoa já cadastrada no sistema</p>

            <div className="cpf-search" style={{display: 'flex', gap: '8px', marginBottom: '15px'}}>
              <select
                className="select-mock"
                value={addPessoaDocType}
                onChange={(e) => { setAddPessoaDocType(e.target.value); setCpfBusca(""); setPessoaEncontrada(null); }}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                <option value="CPF">CPF</option>
                <option value="PASSAPORTE">Passaporte</option>
              </select>
              <input
                type="text"
                placeholder={addPessoaDocType === "CPF" ? "000.000.000-00" : "Número do passaporte"}
                value={cpfBusca}
                onChange={(e) => {
                  if (addPessoaDocType === "CPF") {
                    let val = e.target.value.replace(/\D/g, '');
                    val = val.replace(/(\d{3})(\d)/, '$1.$2');
                    val = val.replace(/(\d{3})(\d)/, '$1.$2');
                    val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    setCpfBusca(val);
                  } else {
                    setCpfBusca(e.target.value);
                  }
                }}
                maxLength={addPessoaDocType === "CPF" ? 14 : 20}
                style={{flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px'}}
              />
              <button
                onClick={buscarPessoaParaAdicionar}
                disabled={buscandoPessoa || !cpfBusca}
                className="btn-buscar"
                style={{ padding: '0 15px' }}
              >
                {buscandoPessoa ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
              </button>
            </div>

            {pessoaEncontrada && (
              <div className="pessoa-card">
                <div className="pessoa-card-info">
                  <strong>{pessoaEncontrada.nome}</strong>
                  <span>{addPessoaDocType}: {formatarCpfTexto(pessoaEncontrada.numero_documento, addPessoaDocType)}</span>
                  {pessoaEncontrada.email && <span>{pessoaEncontrada.email}</span>}
                </div>
                <button onClick={adicionarPessoaReserva} className="btn-confirm-add">
                  <i className="fas fa-plus"></i> Adicionar
                </button>
              </div>
            )}

            <div style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end'}}>
              <button
                onClick={() => { setShowAddPessoa(false); setCpfBusca(""); setPessoaEncontrada(null); }}
                className="btn-reserva btn-reserva--edit"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Check-in/out Individual */}
      {showCheckModal && selectedHospede && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCheckModal(false); }}>
          <div className="modal-small">
            <h3>{checkTipo === "in" ? "Check-in" : "Check-out"} Individual</h3>
            <p className="modal-subtitle">Hóspede: <strong>{selectedHospede.pessoa?.nome}</strong></p>

            <div style={{marginTop: '15px'}}>
              <label>Data e Hora</label>
              <input
                type="datetime-local"
                value={checkDateTime}
                onChange={(e) => setCheckDateTime(e.target.value)}
                style={{width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px'}}
              />
            </div>

            <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button onClick={() => setShowCheckModal(false)} className="btn-reserva btn-reserva--edit">Cancelar</button>
              <button
                onClick={handleCheckIndividual}
                className="btn-save"
                style={checkTipo === "out" ? {background: '#dc2626'} : {}}
              >
                <i className={`fas fa-${checkTipo === "in" ? "door-open" : "door-closed"}`}></i>
                Confirmar {checkTipo === "in" ? "Check-in" : "Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação */}
      {showConfirm && confirmAction && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}>
          <div className="modal-small">
            <h3>{confirmAction.type === "cancelar" ? "Cancelar Reserva" : "Excluir Reserva"}</h3>
            <p style={{margin: '15px 0', color: '#64748b'}}>
              {confirmAction.type === "cancelar"
                ? "Tem certeza que deseja cancelar esta reserva?"
                : "Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita."}
            </p>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button onClick={() => setShowConfirm(false)} className="btn-reserva btn-reserva--edit">Voltar</button>
              <button
                onClick={confirmDestructiveAction}
                className="btn-save"
                style={{background: '#dc2626'}}
              >
                <i className="fas fa-check"></i> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
