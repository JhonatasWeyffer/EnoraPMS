import { useEffect, useState } from "react";
import api from "../services/api";

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    loadComplaints();
  }, []);

  async function loadComplaints() {
    const response = await api.get("/complaints");
    setComplaints(response.data);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reclamações & Feedbacks</h1>

      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Hóspede</th>
              <th className="p-3">Quarto</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-3">{c.guest}</td>
                <td className="p-3 text-center">{c.room}</td>
                <td className="p-3">{c.description}</td>
                <td className="p-3 text-center font-semibold text-blue-600">
                  {c.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
