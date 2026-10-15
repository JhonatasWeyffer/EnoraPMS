import React, { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
import api from "../services/api";
import dayjs from "dayjs";

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const chartInstances = useRef([]);

  // --- SISTEMA DE PAGINAÇÃO ---
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10; // Exatamente 10 logs por vez

  const [filters, setFilters] = useState({
    startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    tipo: "", 
    busca: ""
  });

  const [dashboardData, setDashboardData] = useState({
    kpis: { totalEventos: 0, hoje: 0, atualizacao: "--:--", topModulo: "-" },
    charts: { 
      modulos: [0, 0, 0, 0], 
      financeiro: [0, 0],
      semanal: { labels: [], data: [] },
      suporte: { labels: [], data: [] }
    },
    logs: []
  });

  const fetchReports = async (overrideFilters = null) => {
    const activeFilters = overrideFilters || filters;
    
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard', {
        params: { startDate: activeFilters.startDate, endDate: activeFilters.endDate }
      });
      setDashboardData(response.data);
      setCurrentPage(1); // Volta à página 1 sempre que buscar dados novos
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se o utilizador escrever na barra de "Busca rápida" ou mudar o "Tipo", volta para a página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.busca, filters.tipo]);

  const handlePrint = () => window.print();
  
  const handleApplyFilters = () => fetchReports();
  
  const handleClearFilters = () => {
    const resetFilters = {
      startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
      tipo: "",
      busca: ""
    };
    setFilters(resetFilters);
    fetchReports(resetFilters); 
  };

  useEffect(() => {
    chartInstances.current.forEach(c => c.destroy());
    chartInstances.current = [];

    const config = {
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    };

    const render = (id, type, label, labels, data, color) => {
      const ctx = document.getElementById(id);
      if (ctx) {
        chartInstances.current.push(new Chart(ctx, {
          type,
          data: { labels, datasets: [{ label, data, backgroundColor: color, borderColor: color, tension: 0.4 }] },
          options: config
        }));
      }
    };

    if (!loading) {
      render('chartModulos', 'bar', 'Eventos', ['Res.', 'Fin.', 'Check.', 'Man.'], dashboardData.charts.modulos, '#3b82f6');
      render('chartDias', 'line', 'Movimento (Novas Reservas)', dashboardData.charts.semanal.labels, dashboardData.charts.semanal.data, '#10b981');
      
      const ctxFin = document.getElementById('chartFinanceiro');
      if (ctxFin) {
        chartInstances.current.push(new Chart(ctxFin, {
          type: 'doughnut',
          data: { 
            labels: ['Entradas', 'Saídas'], 
            datasets: [{ data: dashboardData.charts.financeiro, backgroundColor: ['#3b82f6', '#ef4444'], borderWidth: 0 }] 
          },
          options: { maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } } }
        }));
      }

      render('chartReclamacoes', 'bar', 'Casos por Prioridade', dashboardData.charts.suporte.labels, dashboardData.charts.suporte.data, '#f59e0b');
    }

    return () => chartInstances.current.forEach(c => c.destroy());
  }, [dashboardData, loading]);

  // --- LÓGICA MATEMÁTICA DE FILTRAGEM E PAGINAÇÃO ---
  const getFilteredLogs = () => {
    return dashboardData.logs.filter(item => {
      const matchBusca = item.msg.toLowerCase().includes(filters.busca.toLowerCase());
      
      let matchTipo = true;
      if (filters.tipo === "entrada") matchTipo = item.tipo === "financeiro" || item.tipo === "check-in";
      if (filters.tipo === "saida") matchTipo = item.tipo === "financeiro" && item.msg.includes("Despesa");
      
      return matchBusca && matchTipo;
    });
  };

  const visibleLogs = getFilteredLogs();
  
  // Calcula o total de páginas e os índices de corte
  const totalPages = Math.ceil(visibleLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  
  // Extrai apenas os 10 logs da página atual
  const currentLogs = visibleLogs.slice(indexOfFirstLog, indexOfLastLog);

  return (
    <div id="relatorios-root">
      <header className="topo-final">
        <div className="topo-final__info">
          <h1 className="pdv-main-title">Relatórios</h1>
          <p>Módulo conectado aos dados do sistema</p>
        </div>
        <div className="topo-final__btns">
          <button onClick={handlePrint} className="btn-f padrao">Imprimir</button>
          <button onClick={handlePrint} className="btn-f primary">Salvar PDF</button>
          <button onClick={() => fetchReports()} className="btn-f padrao">
            {loading ? "Carregando..." : "Atualizar"}
          </button>
          <button onClick={handleClearFilters} className="btn-f danger">Limpar Filtros</button>
        </div>
      </header>

      <main className="dashboard-final">
        <section className="filtros-container">
          <div className="filtros-linha">
            
            <div className="f-grupo" style={{ flex: 2, minWidth: '220px' }}>
              <label className="label">Módulos (Origem)</label>
              <div id="modulosChips" className="chips-container" style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
                {dashboardData.logs.length > 0 ? (
                  <span 
                    className="chip-placeholder" 
                    style={{
                      fontSize: 'clamp(13px, 1.2vw, 15px)',
                      color: '#3b82f6', 
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      fontWeight: '600', 
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      display: 'inline-block',
                      maxWidth: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    Última ação: {
                      {
                        'check-in': 'Reservas',
                        'financeiro': 'Financeiro',
                        'manutencao': 'Manutenção',
                        'limpeza': 'Governança'
                      }[dashboardData.logs[0].tipo] || dashboardData.logs[0].tipo
                    }
                  </span>
                ) : (
                  <span className="chip-placeholder" style={{ color: '#94a3b8' }}>Aguardando dados...</span>
                )}
              </div>
            </div>

            <div className="f-grupo" style={{ flex: 1.5 }}>
              <label className="label">Período do Relatório</label>
              <div className="duas-datas">
                <div className="date-field">
                  <small>Início</small>
                  <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
                </div>
                <div className="date-field">
                  <small>Fim</small>
                  <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="f-grupo" style={{ flex: 1 }}>
              <label className="label">Tipo</label>
              <select className="select-f" value={filters.tipo} onChange={(e) => setFilters({...filters, tipo: e.target.value})}>
                <option value="">Todos</option>
                <option value="entrada">Entradas / Receitas</option>
                <option value="saida">Saídas / Despesas</option>
              </select>
            </div>

            <div className="f-grupo" style={{ flex: 1.5 }}>
              <label className="label">Busca rápida</label>
              <input className="input-f" placeholder="Ex.: reserva ou nome..." value={filters.busca} onChange={(e) => setFilters({...filters, busca: e.target.value})} />
            </div>

            <div className="f-btns">
              <button onClick={handleClearFilters} className="btn-f ghost">Limpar</button>
              <button onClick={handleApplyFilters} className="btn-f primary">Aplicar</button>
            </div>
          </div>
        </section>

        <section className="kpis-row">
          <div className="kpi-card"><span className="kpi-label">Total eventos</span><strong className="kpi-value">{dashboardData.kpis.totalEventos}</strong></div>
          <div className="kpi-card"><span className="kpi-label">Hoje</span><strong className="kpi-value">{dashboardData.kpis.hoje}</strong></div>
          <div className="kpi-card"><span className="kpi-label">Atualização</span><strong className="kpi-value">{dashboardData.kpis.atualizacao}</strong></div>
          <div className="kpi-card"><span className="kpi-label">Top Módulo</span><strong className="kpi-value">{dashboardData.kpis.topModulo}</strong></div>
        </section>

        <section className="charts-grid">
          <article className="chart-item"><div className="chart-header">Distribuição</div><div className="canvas-container"><canvas id="chartModulos"></canvas></div></article>
          <article className="chart-item"><div className="chart-header">Semanal</div><div className="canvas-container"><canvas id="chartDias"></canvas></div></article>
          <article className="chart-item"><div className="chart-header">Financeiro</div><div className="canvas-container"><canvas id="chartFinanceiro"></canvas></div></article>
          <article className="chart-item"><div className="chart-header">Suporte (Prioridade)</div><div className="canvas-container"><canvas id="chartReclamacoes"></canvas></div></article>
          
          <article className="chart-item full-width" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="chart-header">Log de Eventos Recentes</div>
            
            <div style={{ flex: 1, minHeight: '300px' }}>
              <ul className="lista-log">
                {currentLogs.map((item) => (
                  <li key={item.id} className="log-item">
                    <span className="log-time">{item.time}</span>
                    <span className="log-msg">{item.msg}</span>
                    <span className={`log-tag ${item.tipo}`}>{item.tipo}</span>
                  </li>
                ))}
                {currentLogs.length === 0 && (
                  <li style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Nenhum evento corresponde aos filtros.</li>
                )}
              </ul>
            </div>

            {/* CONTROLES DE PAGINAÇÃO */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '15px 20px', 
                borderTop: '1px solid rgba(255,255,255,0.05)',
                marginTop: 'auto'
              }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  className="btn-f ghost"
                  style={{ padding: '6px 12px', fontSize: '13px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <i className="bx bx-chevron-left"></i> Anterior
                </button>
                
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
                  Página {currentPage} de {totalPages}
                </span>
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  className="btn-f ghost"
                  style={{ padding: '6px 12px', fontSize: '13px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Próxima <i className="bx bx-chevron-right"></i>
                </button>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}