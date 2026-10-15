import axios from "axios";

// O Vite expõe as variáveis através de import.meta.env em vez de process.env 
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/v2` 
  : "http://localhost:3000/v2"; // Fallback apenas para desenvolvimento local

const api = axios.create({
  baseURL: baseURL, 
});

// Adiciona o token em cada requisição automaticamente
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;
