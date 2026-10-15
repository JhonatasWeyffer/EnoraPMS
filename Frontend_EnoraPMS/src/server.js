import app from "./app.js"; // Ajustado para .js (padrão de módulos Express no Node)

[span_10](start_span)// O Dokploy gerencia a porta do container, priorizando process.env.PORT[span_10](end_span)
const PORT = process.env.PORT || 3000;

[span_11](start_span)// Ouvir em "0.0.0.0" permite que o container Docker receba conexões externas[span_11](end_span)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend SmartInn rodando com sucesso no ambiente de produção.`);
});
