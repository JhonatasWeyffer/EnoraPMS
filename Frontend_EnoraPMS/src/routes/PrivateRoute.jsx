import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoute() {
  const userJson = localStorage.getItem("user");
  
  let isAuthenticated = false;
  let user = null; // Definimos a variável aqui fora para usar no log depois

  try {
    if (userJson) {
      user = JSON.parse(userJson);
      isAuthenticated = !!(user && user.token);
    }
  } catch (e) {
    console.error("Erro ao ler JSON do localStorage", e);
    isAuthenticated = false;
  }

  // Agora sim o console.log funciona, pois 'user' já foi processado
  // Usamos o ?. para evitar erro caso o user seja null
  console.log("Verificando autenticação do usuário:", user?.username || "Nenhum usuário logado");

  if (!isAuthenticated) {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}