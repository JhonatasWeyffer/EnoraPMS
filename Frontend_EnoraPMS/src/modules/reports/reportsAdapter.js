import { ReportsEngine } from "./reportsEngine";

export const Relatorios = {
  track: (payload)=> ReportsEngine.addEvent(payload)
};