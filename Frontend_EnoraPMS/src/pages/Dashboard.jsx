import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import api from "../services/api"; 

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const getStatusBadge = (status) => {
  switch (status) {
    case 'EM_ANDAMENTO':
      return { class: "status-checkin", label: "Hospedado" };
    case 'CRIADA':
      return { class: "status-pendente", label: "Pendente" };
    case 'CONCLUIDA':
      return { class: "status-checkout", label: "Check-out" };
    case 'CANCELADA':
    case 'NOSHOW':
      return { class: "status-checkout", label: "Cancelada" };
    default:
      return { class: "status-pendente", label: status };
  }
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  const [stats, setStats] = useState({
    entradas: 0,
    saidas: 0,
    ocupacao: "0%",
    pendencias: 0,
    livres: 0,
    limpeza: 0
  });

  // Guardamos as recentes do dashboard e a lista que realmente vai para a tela
  const [movimentacoesRecentes, setMovimentacoesRecentes] = useState([]);
  const [hospedesExibidos, setHospedesExibidos] = useState([]);
  
  const [graficoData, setGraficoData] = useState({
    labels: [],
    dados: []
  });

  const [filtro, setFiltro] = useState("");

  // 1. Carga inicial do Dashboard (Resumo)
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const response = await api.get("/dashboard/summary");
        
        setStats(response.data.stats);
        setMovimentacoesRecentes(response.data.movimentacoes || []);
        setHospedesExibidos(response.data.movimentacoes || []);
        setGraficoData(response.data.grafico);
        
      } catch (error) {
        console.error("Erro ao carregar dashboard", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // 2. Busca Global via API (com Debounce de 300ms)
  useEffect(() => {
    if (!filtro.trim()) {
      setHospedesExibidos(movimentacoesRecentes);
      return;
    }

    const delayTimer = setTimeout(async () => {
      try {
        setLoadingBusca(true);
        
        const response = await api.get("/reservations", {
          params: { search: filtro }
        });

        // O NestJS retorna { data: [...], meta: {...} }
        const listaReservas = response.data?.data || [];

        // Mapeamento 1:1 com os retornos do snakeReservation
        const formatados = listaReservas.map((item) => {
          // Formata a data AAAA-MM-DD para DD/MM/AAAA
          let dataFormatada = "N/A";
          if (item.data_saida) {
            const [ano, mes, dia] = item.data_saida.split('-');
            dataFormatada = `${dia}/${mes}/${ano}`;
          }

          return {
            reserva: item.numero_reserva || "S/N",
            status: item.situacao_reserva_label || item.situacao_reserva_id || "CRIADA",
            nome: item.hospede_responsavel || "Não informado",
            quarto: item.quarto || "N/A",
            saida: dataFormatada
          };
        });

        setHospedesExibidos(formatados);
      } catch (error) {
        console.error("Erro ao buscar reservas no banco", error);
      } finally {
        setLoadingBusca(false);
      }
    }, 300);

    return () => clearTimeout(delayTimer);
  }, [filtro, movimentacoesRecentes]);

  const chartData = {
    labels: graficoData.labels,
    datasets: [{
      label: "Previsão de Ocupação (%)",
      data: graficoData.dados,
      borderColor: "#4a6cf7",
      backgroundColor: "rgba(74, 108, 247, 0.1)",
      tension: 0.4,
      fill: true
    }]
  };

  return (
    <div className="dashboard-container">
      {/* GRID DE MOVIMENTAÇÃO */}
      <div className="indicadores-grid">
        <div className="card-info card-vendas">
          <div>
            <span>Entradas (Hoje)</span>
            <strong>{stats.entradas} Hóspedes</strong>
          </div>
          <i className="fas fa-door-open icon-bg"></i>
        </div>
        <div className="card-info card-recebido">
          <div>
            <span>Quartos Livres</span>
            <strong>{stats.livres} Unidades</strong>
          </div>
          <i className="fas fa-check-circle icon-bg"></i>
        </div>
        <div className="card-info card-confirmados">
          <div>
            <span>Saídas (Hoje)</span>
            <strong>{stats.saidas} Check-outs</strong>
          </div>
          <i className="fas fa-walking icon-bg"></i>
        </div>
        <div className="card-info card-pendentes">
          <div>
            <span>Taxa de Ocupação</span>
            <strong>{stats.ocupacao}</strong>
          </div>
          <i className="fas fa-bed icon-bg"></i>
        </div>
        <div className="card-info card-expirar">
          <div>
            <span>Pendências</span>
            <strong>{stats.pendencias} Reservas</strong>
          </div>
          <i className="fas fa-clock icon-bg"></i>
        </div>
        <div className="card-info card-expirado">
          <div>
            <span>Em Limpeza</span>
            <strong>{stats.limpeza} Quartos</strong>
          </div>
          <i className="fas fa-broom icon-bg"></i>
        </div>
      </div>

      {/* TABELA COM BUSCA GLOBAL */}
      <div className="secao-tabela">
        {loading ? (
           <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
             Atualizando painel...
           </div>
        ) : (
          <>
            <table>
              <tbody>
                {hospedesExibidos.map((h, index) => {
                  const badge = getStatusBadge(h.status);
                  
                  return (
                    <tr key={h.reserva || h.id || index} className="linha-hospede">
                      <td>
                        <span className="label-descricao-2">Reserva</span>
                        {h.reserva || h.codigo}
                      </td>
                      <td>
                        <span className="label-descricao-2">Status</span>
                        <span className={`status-pill ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        <span className="label-descricao-2">Hóspede</span>
                        <span className="font-medium-2">{h.nome || h.hospedeNome}</span>
                      </td>
                      <td>
                        <span className="label-descricao-2">Quarto</span>
                        {h.quarto || h.numeroQuarto}
                      </td>
                      <td>
                        <span className="label-descricao-2">Saída</span>
                        {h.saida || h.dataSaida}
                      </td>
                    </tr>
                  );
                })}
                
                {loadingBusca && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#4a6cf7' }}>
                      Buscando no banco de dados...
                    </td>
                  </tr>
                )}

                {!loadingBusca && hospedesExibidos.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      Nenhuma reserva ou hóspede encontrado para "{filtro}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="search-container">
              <span className="search-label">Consultar Hóspede:</span>
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Digite nome ou reserva para buscar no sistema..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* GRÁFICO */}
      <div className="secao-grafico">
        <div className="grafico-header">
          <span>Previsão de Movimentação Semanal</span>
          <i className="fas fa-chart-line"></i>
        </div>
        <div className="grafico-body">
          <div style={{ height: '350px' }}>
            <Line 
              data={chartData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}