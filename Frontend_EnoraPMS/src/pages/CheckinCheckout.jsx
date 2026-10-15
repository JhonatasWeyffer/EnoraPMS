import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import api from "../services/api";

const SITUACOES_HOSPEDE = [
  { id: "AGUARDANDO_CHECKIN", label: "Aguardando Check-in", cor: "#94A3B8" },
  { id: "CHECKIN_REALIZADO", label: "Check-in realizado", cor: "#3B82F6" },
  { id: "CHECKOUT_REALIZADO", label: "Check-out realizado", cor: "#10B981" },
  { id: "NOSHOW", label: "No-show", cor: "#EF4444" },
  { id: "PRECHECKIN_REALIZADO", label: "Pré-check-in", cor: "#8B5CF6" }
];

export default function CheckinCheckout() {
  const [buscaValor, setBuscaValor] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false);

  const [reserva, setReserva] = useState(null);
  const [hospedes, setHospedes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [checkinPagamento, setCheckinPagamento] = useState({ valor: "", forma: "" });
  const [checkoutPagamento, setCheckoutPagamento] = useState({ valor: "", forma: "" });

  const [listaAtrasos, setListaAtrasos] = useState([]);
  const [loadingAtrasos, setLoadingAtrasos] = useState(true);

  useEffect(() => {
    async function carregarAtrasos() {
      try {
        setLoadingAtrasos(true);
        const { data } = await api.get('/check/atrasos');
        
        // CORREÇÃO: Garante que reservas canceladas não apareçam nos atrasos
        const atrasosValidos = data.filter(atraso => 
          atraso.situacao?.toUpperCase() !== 'CANCELADA' && 
          atraso.situacao_reserva_label?.toUpperCase() !== 'CANCELADA'
        );
        
        setListaAtrasos(atrasosValidos);
      } catch (error) {
        toast.error("Erro ao carregar lista de atrasos.");
        console.error(error);
      } finally {
        setLoadingAtrasos(false);
      }
    }
    carregarAtrasos();
  }, []);

  // ============ AUTOCOMPLETAR ============
  const buscarSugestoes = async (texto) => {
    if (!texto.trim() || texto.trim().length < 2) {
      setSugestoes([]);
      setMostrarSugestoes(false);
      return;
    }

    setAutoCompleteLoading(true);
    try {
      const { data } = await api.get('/check/search-guests', { params: { q: texto } });
      
      // CORREÇÃO: Filtra sugestões para remover canceladas (se a API retornar essa info)
      const sugestoesValidas = data.filter(s => 
        s.situacao?.toUpperCase() !== 'CANCELADA' && 
        s.situacao_reserva_label?.toUpperCase() !== 'CANCELADA'
      );
      
      setSugestoes(sugestoesValidas);
      setMostrarSugestoes(true);
    } catch (error) {
      toast.error("Erro ao buscar sugestões.");
      setSugestoes([]);
      setMostrarSugestoes(false);
    } finally {
      setAutoCompleteLoading(false);
    }
  };

  const handleBuscaChange = (e) => {
    const valor = e.target.value;
    setBuscaValor(valor);
    buscarSugestoes(valor);
  };

  const selecionarHospede = async (sugestao) => {
    setBuscaValor(sugestao.nome);
    setMostrarSugestoes(false);
    await carregarReservaPorSugestao(sugestao);
  };

  const carregarReservaPorSugestao = async (sugestao) => {
    setSearching(true);
    setReserva(null);
    setHospedes([]);
    try {
      const { data: reservaData } = await api.get(`/reservations/${sugestao.reserva_id}`);
      
      // CORREÇÃO: Bloqueia a exibição caso a reserva carregada seja cancelada
      if (reservaData.situacao === 'CANCELADA' || reservaData.situacao_reserva_label?.toUpperCase() === 'CANCELADA') {
        toast.error("Esta reserva encontra-se cancelada.");
        return;
      }

      setReserva(reservaData);
      setHospedes(reservaData.hospedes || []);
      toast.success(`Hóspede: ${sugestao.nome} | Reserva: ${reservaData.numero_reserva} | ${(reservaData.hospedes || []).length} hóspede(s)`);
    } catch (error) {
      toast.error("Erro ao carregar dados da reserva.");
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const buscarPorNomeEspecifico = async (nomeCompleto) => {
    if (!nomeCompleto.trim()) {
      toast.error("Digite o nome do hóspede");
      return;
    }

    setSearching(true);
    setReserva(null);
    setHospedes([]);
    try {
      const { data } = await api.get('/check/search-guests', { params: { q: nomeCompleto } });
      
      // Filtra os cancelados na busca direta também
      const sugestoesValidas = data.filter(s => 
        s.situacao?.toUpperCase() !== 'CANCELADA' && 
        s.situacao_reserva_label?.toUpperCase() !== 'CANCELADA'
      );

      if (sugestoesValidas.length === 0) {
        toast.error("Nenhuma reserva ativa encontrada para este hóspede.");
        setSearching(false);
        return;
      }
      
      const sugestao = sugestoesValidas[0];
      if (!sugestao.reserva_id) {
        toast.error(`${sugestao.nome} não possui reserva ativa no momento.`);
        setSearching(false);
        return;
      }
      await carregarReservaPorSugestao(sugestao);
    } catch (error) {
      toast.error("Erro ao buscar hóspede");
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const buscarPorNome = async () => {
    await buscarPorNomeEspecifico(buscaValor);
  };

  const recarregarReserva = async () => {
    if (!reserva || !reserva.reserva_id) return;
    try {
      const { data } = await api.get(`/reservations/${reserva.reserva_id}`);
      setReserva(data);
      setHospedes(data.hospedes || []);
    } catch (error) {
      toast.error("Erro ao atualizar dados da reserva.");
      console.error(error);
    }
  };

  const verificarReservaFinalizada = (hospedesAtualizados) => {
    if (!hospedesAtualizados || hospedesAtualizados.length === 0) return;
    const todosFinalizados = hospedesAtualizados.every(h =>
      h.hospede.situacao_hospede_id === "CHECKOUT_REALIZADO" || h.hospede.situacao_hospede_id === "NOSHOW"
    );
    if (todosFinalizados) {
      toast.success("Todos os hóspedes finalizaram! Reserva concluída e quarto liberado.");
      setReserva(null);
      setHospedes([]);
    }
  };

  // ============ AÇÕES INDIVIDUAIS ============
  const handleCheckIn = async (hospede) => {
    // 1. Validação Financeira Rigorosa de Dupla Via
    const valorNum = parseFloat(checkinPagamento.valor);
    const temValor = !isNaN(valorNum) && valorNum > 0;
    const temForma = !!checkinPagamento.forma;

    if (temValor && !temForma) {
      toast.error("Selecione a forma de pagamento para o valor informado.");
      return;
    }
    if (temForma && !temValor) {
      toast.error("Informe um valor válido (maior que zero) para a forma de pagamento.");
      return;
    }

    setLoading(true);
    try {
      const payload = {};
      
      // 2. Anexa o payload financeiro se validado
      if (temValor && temForma) {
        payload.pagamento = {
          valor: valorNum,
          forma: checkinPagamento.forma
        };
      }
      
      await api.post(`/check/in/${hospede.hospede.hospede_id}`, payload);
      toast.success(`Check-in de ${hospede.pessoa.nome} realizado com sucesso!`);
      
      // Limpa os campos após sucesso
      setCheckinPagamento({ valor: "", forma: "" });
      await recarregarReserva();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro crítico ao processar o check-in.");
      console.error("Falha no Check-in:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (hospede) => {
    if (reserva && reserva.status_pagamento !== "pago") {
      if (!hospede.hospede.responsavel_quarto) {
        toast.error("Somente o hóspede responsável pode efetuar o pagamento.");
        return;
      }
      if (!checkoutPagamento.valor || !checkoutPagamento.forma) {
        toast.error("Pagamento pendente! Preencha os dados de pagamento para realizar o check-out.");
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {};
      if (checkoutPagamento.valor && checkoutPagamento.forma) {
        payload.pagamento = {
          valor: parseFloat(checkoutPagamento.valor),
          forma: checkoutPagamento.forma
        };
      }
      
      await api.post(`/check/out/${hospede.hospede.hospede_id}`, payload);
      toast.success(`Check-out de ${hospede.pessoa.nome} realizado com sucesso!`);
      setCheckoutPagamento({ valor: "", forma: "" });
      await recarregarReserva();
      const { data } = await api.get(`/reservations/${reserva.reserva_id}`);
      verificarReservaFinalizada(data.hospedes || []);
    } catch (error) {
      toast.error("Erro no check-out");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ============ AÇÕES EM LOTE ============
  const handleCheckInLote = async () => {
    if (!reserva || !reserva.reserva_id) return;
    const pendentes = hospedes.filter(h =>
      h.hospede.situacao_hospede_id === "AGUARDANDO_CHECKIN" ||
      h.hospede.situacao_hospede_id === "PRECHECKIN_REALIZADO"
    );
    if (pendentes.length === 0) {
      toast.error("Nenhum hóspede pendente de check-in.");
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        pendentes.map(h =>
          api.post(`/check/in/${h.hospede.hospede_id}`)
        )
      );
      toast.success(`Check-in em lote realizado! ${pendentes.length} hóspede(s) com check-in.`);
      await recarregarReserva();
    } catch (error) {
      toast.error("Erro no check-in em lote");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOutLote = async () => {
    if (!reserva || !reserva.reserva_id) return;
    const pendentes = hospedes.filter(h => h.hospede.situacao_hospede_id === "CHECKIN_REALIZADO");
    if (pendentes.length === 0) {
      toast.error("Nenhum hóspede pendente de check-out.");
      return;
    }
    if (reserva.status_pagamento !== "pago") {
      toast.error("Pagamento pendente! Regularize o pagamento antes do check-out em lote.");
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        pendentes.map(h =>
          api.post(`/check/out/${h.hospede.hospede_id}`)
        )
      );
      toast.success(`Check-out em lote realizado! ${pendentes.length} hóspede(s) com check-out.`);
      await recarregarReserva();
      const { data } = await api.get(`/reservations/${reserva.reserva_id}`);
      verificarReservaFinalizada(data.hospedes || []);
    } catch (error) {
      toast.error("Erro no check-out em lote");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ============ RENDER ============
  
  // Ordenar: responsável primeiro
  const hospedesOrdenados = [...hospedes].sort((a, b) => {
    if (a.hospede.responsavel_quarto && !b.hospede.responsavel_quarto) return -1;
    if (!a.hospede.responsavel_quarto && b.hospede.responsavel_quarto) return 1;
    return 0;
  });

  // Estados dos botões de lote
  const temPendenteCheckin = hospedes.some(h => 
    h.hospede.situacao_hospede_id === "AGUARDANDO_CHECKIN" || 
    h.hospede.situacao_hospede_id === "PRECHECKIN_REALIZADO"
  );
  const temPendenteCheckout = hospedes.some(h => 
    h.hospede.situacao_hospede_id === "CHECKIN_REALIZADO"
  );
  
  const todosCheckout = hospedes.length > 0 && hospedes.every(h => 
    h.hospede.situacao_hospede_id === "CHECKOUT_REALIZADO" || h.hospede.situacao_hospede_id === "NOSHOW"
  );

  // Verificar pendências da reserva atual
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataSaida = reserva && reserva.data_saida ? new Date(reserva.data_saida + 'T00:00:00') : null;
  const reservaVencida = dataSaida && dataSaida < hoje;
  const pendenteCheckoutVencido = reservaVencida && temPendenteCheckout;
  const pagamentoPendenteVencido = reservaVencida && reserva && reserva.status_pagamento !== "pago";

  return (
    <div className="op-container">
      <header className="op-header">
        <h1 className="pdv-main-title">Check-in / Check-out Rápido</h1>
        <p>Busque por nome do hóspede</p>
      </header>

      {/* ============ LISTA DE HÓSPEDES COM ATRASO NO CHECK-OUT ============ */}
      {loadingAtrasos ? (
        <div className="op-card">
          <div className="card-top">
            <i className="fas fa-spinner fa-spin"></i>
            <h2>Carregando atrasos...</h2>
          </div>
        </div>
      ) : listaAtrasos.length > 0 && (
        <div className="op-card">
          <div className="card-top">
            <i className="fas fa-exclamation-triangle"></i>
            <h2>Hóspedes com Check-out em Atraso</h2>
            <span style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: '#fee2e2',
              color: '#991b1b'
            }}>
              {listaAtrasos.length} reserva{listaAtrasos.length > 1 ? 's' : ''} em atraso
            </span>
          </div>
          <div className="op-body">
            <div className="card-topo">
              {listaAtrasos.map((atraso) => (
                <div 
                  key={atraso.reserva_id}
                  style={{
                    padding: '15px',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    background: '#fff5f5',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    if (atraso.reserva_id) {
                      setSearching(true);
                      api.get(`/reservations/${atraso.reserva_id}`)
                        .then(({ data }) => {
                          // CORREÇÃO NO CARD DE ATRASO: Impede carregar se foi cancelada
                          if (data.situacao === 'CANCELADA' || data.situacao_reserva_label?.toUpperCase() === 'CANCELADA') {
                            toast.error("Esta reserva foi cancelada.");
                            return;
                          }
                          setReserva(data);
                          setHospedes(data.hospedes || []);
                        })
                        .catch(() => toast.error("Erro ao carregar reserva."))
                        .finally(() => setSearching(false));
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.borderColor = '#fc8181';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff5f5';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
                    <div class= "card-topo" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <strong style={{fontSize: '14px'}}>{atraso.hospede_responsavel}</strong>
                      <span style={{marginLeft: '10px', fontSize: '12px', color: '#64748b'}}>
                        Reserva: {atraso.numero_reserva} | Quarto {atraso.quarto}
                      </span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      {atraso.status_pagamento !== "pago" && (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: '#fef3c7',
                          color: '#92400e'
                        }}>
                          <i className="fas fa-money-bill-wave"></i> Pagamento pendente
                        </span>
                      )}
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: '#fee2e2',
                        color: '#dc2626'
                      }}>
                        <i className="fas fa-clock"></i> {atraso.diasAtraso} dia{atraso.diasAtraso > 1 ? 's' : ''} de atraso
                      </span>
                      <span style={{fontSize: '12px', color: '#64748b'}}>
                        Saída: {atraso.data_saida}
                      </span>
                    </div>
                  </div>
                  <div className="userclock">
                    <i className="fas fa-user-clock"></i> {atraso.pendentesCheckout} hóspede{atraso.pendentesCheckout > 1 ? 's' : ''} pendente{atraso.pendentesCheckout > 1 ? 's' : ''} de check-out
                    {atraso.status_pagamento !== "pago" && (
                      <span style={{marginLeft: '10px'}}>
                        | Valor: R$ {parseFloat(atraso.valor_total).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ SEÇÃO DE BUSCA POR NOME ============ */}
       <div className="op-card" style={{ marginBottom: '30px', position: 'relative', zIndex: 10 }}>
        <div className="card-top">
          <i className="fas fa-search"></i>
          <h2>Buscar por Nome do Hóspede</h2>
        </div>
        <div className="op-body">
          <div className="field-group">
            <label>Nome do Hóspede</label>
<div style={{display: 'flex', gap: '10px', alignItems: 'flex-start'}}>
              
              {/* NOVO CONTAINER: Engloba APENAS o input e as sugestões */}
              <div style={{position: 'relative', flex: 1}}>
                <input 
                  type="text" 
                  placeholder="Digite o nome do hóspede responsável pela reserva..." 
                  value={buscaValor}
                  onChange={handleBuscaChange}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPorNome()}
                  onFocus={() => buscaValor.trim() && buscarSugestoes(buscaValor)}
                  style={{width: '100%'}} /* Usa todo o espaço do flex: 1 */
                />
                
                {/* Sugestões de autocompletar AGORA ESTÃO DENTRO DO MESMO CONTAINER DO INPUT */}
                {mostrarSugestoes && sugestoes.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0, /* Agora ele se limita exatamente à largura do input */
                    backgroundColor: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    marginTop: '5px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    {sugestoes.map((sugestao, index) => (
                      <div
                        key={index}
                        onClick={() => selecionarHospede(sugestao)}
                        style={{
                          padding: '10px 15px',
                          cursor: 'pointer',
                          borderBottom: index < sugestoes.length - 1 ? '1px solid #e2e8f0' : 'none',
                          transition: 'background 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div>
                          <strong>{sugestao.nome}</strong>
                          <div style={{fontSize: '11px', color: '#64748b'}}>
                            Reserva: {sugestao.numeroReserva}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div> {/* FIM DO NOVO CONTAINER */}

              {/* Botão fica do lado de fora do escopo 'relative' do dropdown */}
              <button 
                onClick={buscarPorNome} 
                disabled={searching || autoCompleteLoading}
                className="btn-confirm-in"
                style={{width: 'auto', padding: '0 20px', marginTop: 0, whiteSpace: 'nowrap', height: '48px'}}
              >
                {searching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                <span style={{marginLeft: '8px'}}>{searching ? "Buscando..." : "Buscar"}</span>
              </button>
              
            </div>
            
            <small style={{color: '#64748b', marginTop: '8px', display: 'block'}}>
              💡 Dica: Comece a digitar e veja as sugestões aparecerem automaticamente
            </small>
          </div>
        </div>
      </div>

      {/* ============ RESULTADO DA BUSCA ============ */}
      {reserva && !todosCheckout && (
        <>
          {/* Info da Reserva */}
          <div className="op-card" style={{marginBottom: '20px'}}>
            <div className="card-top">
              <i className="fas fa-info-circle"></i>
              <h2>Reserva: {reserva.numero_reserva}</h2>
              {reserva.reserva_id && (
                <span 
                  style={{ 
                    marginLeft: 'auto',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#f1f5f9',
                    color: '#475569'
                  }}
                >
                  {reserva.situacao_reserva_label}
                </span>
              )}
            </div>
            <div className="op-body">
              <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                <div className="field-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Quarto</label>
                  <span style={{fontSize: '15px', fontWeight: 500}}>
                    {reserva.quarto ? `Quarto ${reserva.quarto}` : "-"}
                  </span>
                </div>
                <div className="field-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Hóspede Responsável</label>
                  <span style={{fontSize: '15px', fontWeight: 500}}>
                    {reserva.hospede_responsavel || "-"}
                  </span>
                </div>
                <div className="field-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Entrada</label>
                  <span style={{fontSize: '15px', fontWeight: 500}}>{reserva.data_entrada}</span>
                </div>
                <div className="field-group" style={{flex: 1, minWidth: '150px'}}>
                  <label>Saída</label>
                  <span style={{fontSize: '15px', fontWeight: 500}}>{reserva.data_saida}</span>
                </div>
                {reserva.valor_total && (
                  <div className="field-group" style={{flex: 1, minWidth: '150px'}}>
                    <label>Pagamento</label>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: reserva.status_pagamento === 'pago' ? '#dcfce7' : '#fee2e2',
                      color: reserva.status_pagamento === 'pago' ? '#15803d' : '#991b1b',
                      display: 'inline-block'
                    }}>
                      {reserva.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                      {reserva.status_pagamento === 'pago' && ` - R$ ${parseFloat(reserva.valor_total).toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Alertas de pendência quando a reserva já venceu */}
              {(pendenteCheckoutVencido || pagamentoPendenteVencido) && (
                <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {pendenteCheckoutVencido && (
                    <div style={{
                      backgroundColor: '#fff5f5',
                      border: '2px solid #fc8181',
                      borderRadius: '8px',
                      padding: '12px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <i className="fas fa-exclamation-triangle" style={{color: '#e53e3e', fontSize: '20px'}}></i>
                      <div>
                        <strong style={{color: '#c53030'}}>Atenção: Reserva vencida!</strong>
                        <p style={{margin: '0', color: '#9b2c2c', fontSize: '14px'}}>
                          A data de saída ({reserva.data_saida}) já passou e há hóspedes que ainda não realizaram o check-out.
                        </p>
                      </div>
                    </div>
                  )}
                  {pagamentoPendenteVencido && (
                    <div style={{
                      backgroundColor: '#fffff0',
                      border: '2px solid #f6e05e',
                      borderRadius: '8px',
                      padding: '12px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <i className="fas fa-exclamation-circle" style={{color: '#d69e2e', fontSize: '20px'}}></i>
                      <div>
                        <strong style={{color: '#975a16'}}>Pagamento Pendente</strong>
                        <p style={{margin: '0', color: '#744210', fontSize: '14px'}}>
                          O pagamento desta reserva ainda não foi realizado. Apenas o hóspede responsável pode efetuá-lo.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões Lote */}
              {reserva.reserva_id && reserva.situacao_reserva_label !== "Concluída" && reserva.situacao_reserva_label !== "Quarto Vazio" && (
                <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                  <button 
                    onClick={handleCheckInLote} 
                    disabled={loading || !temPendenteCheckin} 
                    className="btn-confirm-in" 
                    style={{
                      flex: 1,
                      opacity: temPendenteCheckin ? 1 : 0.5,
                      cursor: temPendenteCheckin ? 'pointer' : 'not-allowed'
                    }}
                    title={!temPendenteCheckin ? "Nenhum hóspede pendente de check-in" : "Realizar check-in de todos os pendentes"}
                  >
                    <i className="fas fa-door-open"></i> Check-in em Lote
                  </button>
                  <button 
                    onClick={handleCheckOutLote} 
                    disabled={loading || !temPendenteCheckout || reserva.status_pagamento !== "pago"} 
                    className="btn-confirm-out" 
                    style={{
                      flex: 1,
                      opacity: temPendenteCheckout && reserva.status_pagamento === "pago" ? 1 : 0.5,
                      cursor: temPendenteCheckout && reserva.status_pagamento === "pago" ? 'pointer' : 'not-allowed'
                    }}
                    title={
                      !temPendenteCheckout ? "Nenhum hóspede pendente de check-out" : 
                      reserva.status_pagamento !== "pago" ? "Pagamento pendente" : 
                      "Realizar check-out de todos os pendentes"
                    }
                  >
                    <i className="fas fa-door-closed"></i> Check-out em Lote
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista de Hóspedes */}
          {reserva.reserva_id && (
            <div className="op-card">
              <div className="card-top">
                <i className="fas fa-users"></i>
                <h2>Hóspedes ({hospedesOrdenados.length})</h2>
                {reserva.status_pagamento !== "pago" && reserva.situacao_reserva_label === "Em Andamento" && (
                  <span style={{
                    marginLeft: 'auto',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#fef3c7',
                    color: '#92400e'
                  }}>
                    <i className="fas fa-exclamation-triangle"></i> Pagamento pendente
                  </span>
                )}
              </div>
              <div className="op-body">
                {hospedesOrdenados.length === 0 ? (
                  <p style={{color: '#64748b'}}>Nenhum hóspede vinculado</p>
                ) : (
                  hospedesOrdenados.map((h) => (
                    <div key={h.hospede.hospede_id} style={{
                      padding: '15px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      background: '#f8fafc',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'}}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <strong>{h.pessoa.nome}</strong>
                            {h.hospede.responsavel_quarto && (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                background: '#fef3c7',
                                color: '#92400e',
                                fontWeight: 600
                              }}>
                                Responsável
                              </span>
                            )}
                          </div>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: (SITUACOES_HOSPEDE.find(s => s.id === h.hospede.situacao_hospede_id)?.cor || '#94a3b8') + '20',
                            color: SITUACOES_HOSPEDE.find(s => s.id === h.hospede.situacao_hospede_id)?.cor || '#475569',
                            width: 'fit-content'
                          }}>
                            {h.hospede.situacao_hospede}
                          </span>
                        </div>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                          {(h.hospede.situacao_hospede_id === "AGUARDANDO_CHECKIN" || h.hospede.situacao_hospede_id === "PRECHECKIN_REALIZADO") && (
                            <button onClick={() => handleCheckIn(h)} disabled={loading} className="btn-confirm-in" style={{padding: '8px 15px', marginTop: 0, width: 'auto', height: 'auto', fontSize: '13px'}}>
                              <i className="fas fa-door-open"></i> Check-in
                            </button>
                          )}
                          
                          {h.hospede.situacao_hospede_id === "CHECKIN_REALIZADO" && (
                            <button onClick={() => handleCheckOut(h)} disabled={loading} className="btn-confirm-out" style={{padding: '8px 15px', marginTop: 0, width: 'auto', height: 'auto', fontSize: '13px'}}>
                              <i className="fas fa-door-closed"></i> Check-out
                            </button>
                          )}
                          
                          {(h.hospede.situacao_hospede_id === "CHECKOUT_REALIZADO" || h.hospede.situacao_hospede_id === "NOSHOW") && (
                            <span style={{color: '#64748b', fontSize: '12px', fontStyle: 'italic'}}>
                              <i className="fas fa-check-circle" style={{color: '#10B981'}}></i> Concluído
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pagamento no check-in – só para o responsável */}
                      {(h.hospede.situacao_hospede_id === "AGUARDANDO_CHECKIN" || h.hospede.situacao_hospede_id === "PRECHECKIN_REALIZADO") && reserva?.status_pagamento === "pendente" && h.hospede.responsavel_quarto && (
                        <div style={{marginTop: '10px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
                          <small style={{fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px'}}>
                            <i className="fas fa-money-bill"></i> Pagamento (opcional)
                          </small>
                          <div style={{display: 'flex', gap: '8px'}}>
                            <select 
                              value={checkinPagamento.forma}
                              onChange={(e) => setCheckinPagamento(prev => ({ ...prev, forma: e.target.value }))}
                              style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff'}}
                            >
                            <option value="">Selecione...</option>
                            <option value="pix">PIX</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="cartao_credito">Cartão de Crédito</option>
                            <option value="cartao_debito">Cartão de Débito</option>
                            </select>
                            <input 
                              type="number" 
                              step="0.01" 
                              placeholder="Valor R$" 
                              value={checkinPagamento.valor}
                              onChange={(e) => setCheckinPagamento(prev => ({ ...prev, valor: e.target.value }))}
                              style={{width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px'}}
                            />
                          </div>
                        </div>
                      )}

                      {/* Pagamento no check-out – só para o responsável */}
                      {h.hospede.situacao_hospede_id === "CHECKIN_REALIZADO" && reserva?.status_pagamento !== "pago" && h.hospede.responsavel_quarto && (
                        <div style={{marginTop: '10px', padding: '12px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca'}}>
                          <small style={{color: '#991b1b', fontWeight: 600, display: 'block', marginBottom: '8px'}}>
                            <i className="fas fa-exclamation-circle"></i> Pagamento obrigatório para check-out
                          </small>
                          <div style={{display: 'flex', gap: '8px'}}>
                            <select 
                              value={checkoutPagamento.forma}
                              onChange={(e) => setCheckoutPagamento(prev => ({ ...prev, forma: e.target.value }))}
                              style={{width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff'}}
                            >
                            <option value="">Selecione...</option>
                            <option value="pix">PIX</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="cartao_credito">Cartão de Crédito</option>
                            <option value="cartao_debito">Cartão de Débito</option>
                            </select>
                            <input 
                              type="number" 
                              step="0.01" 
                              placeholder="Valor R$" 
                              value={checkoutPagamento.valor}
                              onChange={(e) => setCheckoutPagamento(prev => ({ ...prev, valor: e.target.value }))}
                              style={{width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '12px'}}
                            />
                          </div>
                        </div>
                      )}
                      {/* Aviso para não-responsável com pagamento pendente */}
                      {h.hospede.situacao_hospede_id === "CHECKIN_REALIZADO" && reserva?.status_pagamento !== "pago" && !h.hospede.responsavel_quarto && (
                        <div style={{marginTop: '10px', fontSize: '12px', color: '#b45309', fontStyle: 'italic'}}>
                          <i className="fas fa-info-circle"></i> Apenas o hóspede responsável pode efetuar o pagamento.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}