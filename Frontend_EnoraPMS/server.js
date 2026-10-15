import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 

const app = express();
// Configura para ler a porta do ambiente ou assumir a 5174 que você escolheu.
const PORT = process.env.PORT || 5174;

// Serve os arquivos gerados pelo 'npm run build' na pasta dist.
app.use(express.static(path.join(__dirname, "dist")));

// Suporte para SPA (Single Page Application): redireciona todas as rotas para o index.html 
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Faz o bind em 0.0.0.0 para expor a porta para fora do container Docker 
app.listen(PORT, "0.0.0.0", () => {
  console.log(`💻 Frontend Server ativo e aguardando conexões na porta ${PORT}`);
});
