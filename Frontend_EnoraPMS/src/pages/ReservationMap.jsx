import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { NavLink } from "react-router-dom";
import "dayjs/locale/pt-br";

dayjs.extend(utc);
dayjs.locale("pt-br");

const statusTranslations = {
  LIVRE: "Livre",
  OCUPADO: "Ocupado",
  RESERVADO: "Reservado",
  LIMPEZA: "Limpeza",
  MANUTENCAO: "Manutenção"
};

export default function ReservationMap() {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [focusedDayIso, setFocusedDayIso] = useState(dayjs().format("YYYY-MM-DD"));

  // ESTADOS DO MODAL POPUP
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDetails, setModalDetails] = useState(null);
  const [modalTargetDate, setModalTargetDate] = useState("");

  useEffect(() => {
    setFocusedDayIso(startDate);
  }, [startDate]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const safeDate = dayjs.utc(startDate).add(i, "day");
    return {
      label: safeDate.format("ddd, D"), 
      iso: safeDate.format("YYYY-MM-DD"),
    };
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadMap() {
      try {
        setLoading(true);
        const response = await api.get(`/rooms/reservation-map?start=${startDate}`, {
          signal: controller.signal 
        });
        setMapData(response.data);
        
        if (response.data && response.data.length > 0 && !selectedRoom) {
          const sorted = [...response.data].sort((a, b) => {
            if (a.block !== b.block) {
              const blockOrder = [ "Presidencial", "Tucuma", "Miriti", "Babaçu", "Açaí"];

              return (
                blockOrder.indexOf(a.block) -
                blockOrder.indexOf(b.block)
              );
            }

            if (a.floor !== b.floor) {
              return a.floor - b.floor;
            }

            return parseInt(a.room, 10) - parseInt(b.room, 10);
          });

          setSelectedRoom(sorted[0]);
        }
      } catch (error) {
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
          console.log("Requisição anterior abortada.");
        } else {
          console.error("Erro ao carregar o mapa:", error);
        }
      } finally {
        setLoading(false);
      }
    }
    
    loadMap();

    return () => {
      controller.abort();
    };
  }, [startDate]);

  const blocks = useMemo(() => {
    const blockOrder = [ "Presidencial", "Tucuma", "Miriti", "Babaçu", "Açaí"];

    const grouped = {};

    blockOrder.forEach((blockName) => {
      grouped[blockName] = {};
    });

    mapData.forEach((item) => {
      const blockName = item.block;
      
      // ALTERAÇÃO AQUI: Se o bloco for Presidencial, exibe "Bloco Vip" embaixo. Senão, mantém o padrão do andar.
      const floorName = blockName === "Presidencial" ? "Bloco Vip" : `${item.floor}º Bloco`;

      if (!grouped[blockName]) {
        grouped[blockName] = {};
      }

      if (!grouped[blockName][floorName]) {
        grouped[blockName][floorName] = [];
      }

      grouped[blockName][floorName].push(item);
    });

    Object.values(grouped).forEach((floors) => {
      Object.values(floors).forEach((rooms) => {
        rooms.sort(
          (a, b) => parseInt(a.room, 10) - parseInt(b.room, 10)
        );
      });
    });

    return grouped;
  }, [mapData]);

  const getStatusIcon = (status) => {
    const cleanStatus = (status || "").toUpperCase();
    switch (cleanStatus) {
      case "LIVRE": return <i className="fas fa-thumbs-up"></i>;
      case "OCUPADO": return <i className="fas fa-lock"></i>;
      case "RESERVADO": return <i className="fas fa-calendar-check"></i>;
      case "LIMPEZA": return <i className="fas fa-trash-alt"></i>;
      case "MANUTENCAO": return <i className="fas fa-cog"></i>;
      default: return null;
    }
  };

  const activeRoomData = useMemo(() => {
    if (!selectedRoom) return null;
    return mapData.find(item => item.room === selectedRoom.room) || selectedRoom;
  }, [mapData, selectedRoom]);

  const handleCardClick = async (roomNumber, dateIso) => {
    setFocusedDayIso(dateIso);
    setModalTargetDate(dateIso);
    setModalLoading(true);
    setModalOpen(true);

    try {
      const response = await api.get(`/rooms/${roomNumber}/details?date=${dateIso}`);
      setModalDetails(response.data);
    } catch (err) {
      console.error("Erro ao buscar detalhes operacionais do quarto:", err);
      setModalDetails({
        situacao: "ERRO",
        infoAdicional: "Não foi possível carregar os detalhes do banco de dados."
      });
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="split-page-container">
      {/* Injeção de estilo para embutir uma scrollbar fina e escura na Sidebar */}
      <style>{`
        .custom-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-track {
          background: #111c30;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>

      {/* CABEÇALHO GLOBAL */}
      <div className="flex-header">
        <div> 
          <h1 className="pdv-main-title">Calendário de Reservas</h1>
          <p className="page-subtitle">Selecione o quarto à esquerda para gerenciar a linha do tempo detalhada.</p>
        </div>
        <div className="map-filters">
          <div className="filter-group">
            <i className="fas fa-calendar-alt map-icon-filter"></i> 
            <label>Análise:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>
          <button className="btn-hoje" onClick={() => setStartDate(dayjs().format("YYYY-MM-DD"))}>
            <i className="fas fa-calendar-day"></i> Hoje
          </button>
        </div>
      </div>

      {/* ÁREA SPLIT PRINCIPAL */}
      <div className="split-layout-body">
        
        {/* COLUNA ESQUERDA: LISTAGEM DE QUARTOS COM SCROLLBAR CORRIGIDA */}
        <aside className="split-left-sidebar custom-sidebar-scroll">
          {loading ? (
            <div className="split-loading">Carregando quartos...</div>
          ) : (
            Object.entries(blocks).map(([blockName, floors]) => (
              <div key={blockName} className="split-block-group">

                <h2 className="split-block-title">
                  {blockName}
                </h2>

                {Object.entries(floors)
                  .sort(([floorA], [floorB]) => {
                    const numberA = parseInt(floorA, 10);
                    const numberB = parseInt(floorB, 10);

                    return numberB - numberA;
                  })
                  .map(([floorName, rooms]) => (
                    <div key={`${blockName}-${floorName}`} className="split-floor-group">

                      <h3 className="split-floor-title">
                        {floorName}
                      </h3>

                      <div className="split-rooms-list">

                        {rooms.map((item) => {
                          const dayObj = item.availability?.[startDate];

                          const currentStatus = (
                            dayObj?.situacao || "LIVRE"
                          ).toUpperCase();

                          const isSelected =
                            activeRoomData?.room === item.room;

                          return (
                            <button
                              key={item.id}
                              className={`split-room-row-btn ${
                                currentStatus.toLowerCase()
                              } ${
                                isSelected ? "active-selection" : ""
                              }`}
                              onClick={() => setSelectedRoom(item)}
                            >
                              <div className="split-btn-left">

                                <span className="split-room-num">
                                  {item.room}
                                </span>

                                <span className="split-room-type">
                                  {item.type || "Tipo não definido"}
                                </span>

                              </div>

                              <div className="split-btn-status-badge">
                                {statusTranslations[currentStatus] ||
                                  currentStatus}
                              </div>

                            </button>
                          );
                        })}

                      </div>
                    </div>
                  ))}
              </div>
            ))
          )}
        </aside>

        {/* COLUNA DIREITA: TIMELINE DE 7 DIAS */}
        <nav className="split-right-panel">
          {activeRoomData ? (
            (() => {
              const dayNode = activeRoomData.availability?.[focusedDayIso] || { situacao: "LIVRE" };
              const currentStatus = (dayNode.situacao || "LIVRE").toUpperCase();

              return (
                <div className="focus-panel-content">
                  
                  {/* Card de Informações Principais do Quarto */}
                  <div className="focus-room-header">
                    <div className="focus-room-badge">
                      <div>
                        <h2>Quarto {activeRoomData.room}</h2>

                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                          {activeRoomData.type || 'Tipo não definido'}
                        </span>
                      </div>
                      <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                        Visualizando Linha do Tempo de 7 dias
                      </span>
                    </div>
                    <div className="focus-room-status-now">
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Status Base (Filtro):</span>
                      <div className={`status-pill ${currentStatus.toLowerCase()}`}>
                        {getStatusIcon(currentStatus)}
                        {statusTranslations[currentStatus] || currentStatus}
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO DO CALENDÁRIO DE 7 DIAS */}
                  <div className="focus-timeline-section">
                    <h3 className="section-title-timeline">
                      <i className="bx bx-time-five"></i> Linha do Tempo (Clique em um dia para abrir os detalhes)
                    </h3>
                    
                    <div className="focus-timeline-grid">
                      {days.map((day) => {
                        const cellNode = activeRoomData.availability?.[day.iso] || { situacao: "LIVRE" };
                        const cellStatus = (cellNode.situacao || "LIVRE").toUpperCase();
                        const isDaySelected = focusedDayIso === day.iso;

                        return (
                          <div 
                            key={day.iso} 
                            className={`focus-timeline-card ${cellStatus.toLowerCase()}`}
                            onClick={() => handleCardClick(activeRoomData.room, day.iso)}
                            style={{ 
                              cursor: 'pointer', 
                              border: isDaySelected ? '3px solid #ffffff' : '1px solid transparent',
                              transform: isDaySelected ? 'scale(1.03)' : 'none',
                              transition: 'all 0.1s ease'
                            }}
                          >
                            <div className="focus-card-day">{day.label}</div>
                            <div className="focus-card-icon">{getStatusIcon(cellStatus)}</div>
                            <div className="focus-card-status-name">{statusTranslations[cellStatus] || cellStatus}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AÇÕES OPERACIONAIS */}
                  <div className="focus-quick-actions">
                    <h3 className="section-title-timeline">Ações Rápidas para o Quarto {activeRoomData.room}</h3>
                    <div className="actions-button-group">
                      <NavLink to="/checkin-checkout" className="action-btn-pms primary" style={{ textDecoration: 'none' }}>
                        <i className="bx bx-check-double"></i> Ir para Balcão Check-In
                      </NavLink>
                      
                      <NavLink to="/housekeeping" className="action-btn-pms secondary" style={{ textDecoration: 'none' }}>
                        <i className="bx bx-edit"></i> Painel de Governança
                      </NavLink>
                      
                      <NavLink to="/maintenance" className="action-btn-pms outline" style={{ textDecoration: 'none' }}>
                        <i className="bx bx-block"></i> Abrir Chamado Manutenção
                      </NavLink>
                    </div>
                  </div>

                </div>
              );
            })()
          ) : (
            <div className="split-empty-state">
              <i className="bx bx-buildings" style={{ fontSize: '48px', color: '#334155' }}></i>
              <p>Nenhum quarto selecionado para gerenciar.</p>
            </div>
          )}
        </nav>
      </div>

      {/* POPUP/MODAL DE DETALHES OPERACIONAIS COMPACTO */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#1e293b', width: '100%', maxWidth: '500px',
            borderRadius: '12px', border: '1px solid #334155', padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            
            {/* Cabeçalho do Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: '800' }}>
                  Quarto {activeRoomData?.room}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Detalhamento de {dayjs(modalTargetDate).format("DD/MM/YYYY")}
                </span>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Corpo do Modal */}
            {modalLoading ? (
              <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Consultando base de dados...
              </div>
            ) : modalDetails ? (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div className={`status-pill ${(modalDetails.situacao || "LIVRE").toLowerCase()}`} style={{ display: 'inline-flex' }}>
                    {getStatusIcon(modalDetails.situacao)}
                    {statusTranslations[modalDetails.situacao] || modalDetails.situacao}
                  </div>
                </div>

                {modalDetails.hospede ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ borderLeft: '3px solid #4a6cf7', paddingLeft: '12px' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>
                        Responsável / Alocação:
                      </label>
                      <strong style={{ fontSize: '16px', color: '#fff' }}>{modalDetails.hospede}</strong>
                    </div>

                    <div style={{ borderLeft: '3px solid #4a6cf7', paddingLeft: '12px' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>
                        Período Ocupado:
                      </label>
                      <strong style={{ fontSize: '14px', color: '#e2e8f0' }}>{modalDetails.entrada} até {modalDetails.saida}</strong>
                    </div>

                    <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '700' }}>OBSERVAÇÃO OPERACIONAL:</label>
                      <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>
                        {modalDetails.infoAdicional}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                    <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '32px', display: 'block', marginBottom: '10px' }}></i>
                    <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0' }}>Quarto totalmente vago, limpo e revisado.</p>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Pronto para receber check-in imediato.</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Botão de Fechar */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setModalOpen(false)}
                style={{
                  background: '#334155', color: '#fff', border: 'none', padding: '8px 16px',
                  borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}