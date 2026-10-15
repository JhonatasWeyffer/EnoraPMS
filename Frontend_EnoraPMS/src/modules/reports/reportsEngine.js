import { ReportsAPI } from "./reportsAPI";

const MODULES = [
  "Reservas",
  "Check-in/Check-out",
  "Quartos",
  "Governança",
  "Manutenção",
  "Hóspedes",
  "Financeiro",
  "Reclamações"
];

let events = [];

function nowISO() {
  return new Date().toISOString();
}

function normalize(input) {
  return {
    id: crypto.randomUUID(),
    module: String(input?.module || "Desconhecido"),
    type: String(input?.type || "SEM_TIPO").toUpperCase(),
    message: input?.message || "",
    value: typeof input?.value === "number" ? input.value : null,
    meta: input?.meta || null,
    createdAt: input?.createdAt || nowISO()
  };
}

export const ReportsEngine = {
  async load() {
    const data = await ReportsAPI.fetchEvents();
    events = data.map(normalize)
      .sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  },

  async addEvent(ev){
    const n = normalize(ev);
    await ReportsAPI.pushEvent(n);
    events.unshift(n);
  },

  getAll(){
    return [...events];
  },

  getModules(){
    return [...MODULES];
  },

  async clearAll(){
    await ReportsAPI.clearAll();
    events = [];
  }
};