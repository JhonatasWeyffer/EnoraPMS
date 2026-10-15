import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/rooms.css"; // Certifique-se de que o caminho está correto

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Função para carregar os quartos
  async function loadRooms() {
    try {
      setLoading(true);
      const response = await api.get(`/rooms?date=${filterDate}`); 
      setRooms(
  response.data.map((room) => ({
    number: room.number,
    status:
      room.statuses.length > 0
        ? room.statuses[0].status
        : 'free',
  }))
);
    } catch (error) {
      console.error("Erro ao carregar quartos:", error);
      // Fallback para teste visual (Mock com 32 quartos)
     /* const fallbackRooms = Array.from({ length: 32 }, (_, i) => ({
        number: (i + 1).toString().padStart(2, '0'),
        status: 'free'
      }));
      setRooms(fallbackRooms); */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, [filterDate]); 

  // Função que envia a mudança para o servidor e atualiza a cor na hora
 const updateRoomStatus = async (roomNumber, newStatus) => {
  // 1. Atualiza no Estado Local PRIMEIRO (Garante que a cor mude na hora)
  setRooms(prevRooms => 
    prevRooms.map(room => 
      room.number === roomNumber ? { ...room, status: newStatus } : room
    )
  );

  // 2. Tenta salvar no servidor em "background"
  try {
    await api.patch(`/rooms/${roomNumber}`, { 
      status: newStatus,
      date: filterDate 
    });
    console.log(`Status do quarto ${roomNumber} atualizado no servidor.`);
  } catch (error) {
    // Silenciamos o 'alert' de erro para não atrapalhar a experiência do usuário
    // Já que o frontend já atualizou visualmente.
    console.warn("Backend offline. Alteração mantida apenas localmente (Mock Mode).");
  }
};

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.includes(searchTerm);
    const matchesStatus = statusFilter === "todos" || room.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="rooms-module">
      <header className="op-header">
        <h1 className="pdv-main-title">Mapa de Quartos</h1>
        <p>Gerencie seus quartos</p>
      </header>
      <div className="rooms-filter-bar">
        <div className="rooms-filter-group">
          <label>BUSCAR NÚMERO</label>
          <input 
            type="text" 
            placeholder="Ex: 05" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="rooms-filter-group">
          <label>FILTRAR POR STATUS</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos os Quartos</option>
              <option value="free">Livres</option>
              <option value="occupied">Ocupados</option>
              <option value="reserved">Reservados</option>
              <option value="cleaning">Limpeza</option>
              <option value="maintenance">Manutenção</option>
          </select>
        </div>
        <div className="rooms-filter-group">
          <label>DATA / PERÍODO</label>
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-txt">Carregando ocupação...</div>
      ) : (
        <div className="rooms-grid-container">
          {filteredRooms.map((room) => (
            /* A key combinada força a atualização do componente quando o status muda */
            <div key={`${room.number}-${room.status}`} className="room-card-unit">
              {/* Barra lateral colorida baseada no status */}
              <div className={`room-status-bar bg-${room.status}`}></div>
              
              <div className="room-card-content">
                <p className="room-number-label">Quarto {room.number}</p>
                
                {/* O select muda de cor dinamicamente com a classe text-status */}
                <select 
                  className={`room-status-select text-${room.status}`} 
                  value={room.status}
                  onChange={(e) => updateRoomStatus(room.number, e.target.value)}
                >
<option value="free">Livre</option>
<option value="occupied">Ocupado</option>
<option value="reserved">Reservado</option>
<option value="cleaning">Limpeza</option>
<option value="maintenance">Manutenção</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}