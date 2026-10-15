import { useEffect, useState } from "react";
import api from "../services/api";

export default function SelectGuest({ value, onChange }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGuests() {
      try {
        const response = await api.get("/guests");
        setGuests(response.data);
      } catch (err) {
        console.error("Erro ao carregar lista de hóspedes");
      } finally {
        setLoading(false);
      }
    }
    fetchGuests();
  }, []);

  return (
    <select 
      className="input-field" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      <option value="">{loading ? "Carregando..." : "Selecione um hóspede"}</option>
      {guests.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name} - {g.document}
        </option>
      ))}
    </select>
  );
}