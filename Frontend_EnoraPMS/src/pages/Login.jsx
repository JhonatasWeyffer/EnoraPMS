import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("remembered_user");
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { 
        email: username,
        senha: password 
      });

      const { access_token, user } = response.data;

      if (rememberMe) {
        localStorage.setItem("remembered_user", username);
      } else {
        localStorage.removeItem("remembered_user");
      }

      // CORREÇÃO: Usamos o spread operator (...user) para garantir que 
      // id, nome e role fiquem no mesmo nível do token no LocalStorage.
      localStorage.setItem("user", JSON.stringify({
        token: access_token, 
        ...user 
      }));

      // Limpa qualquer flag de bloqueio residual de sessões passadas
      localStorage.removeItem("sessionExpired");

      navigate("/");
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message || "Usuário ou senha inválidos");
      } else {
        setError("Erro ao conectar com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="wrapper">
        <div className="login_box">
          <form onSubmit={handleSubmit}>
            <div className="logo">
              <img src="/img/logo_enora2.png" alt="Logo" draggable="false" />
            </div>

            <h1>Login</h1>

            {error && (
              <p style={{ color: "#ff6b6b", textAlign: "center", marginBottom: "1rem" }}>
                {error}
              </p>
            )}

            <div className="input-box">
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder=" "
                disabled={loading}
              />
              <label className="label">Usuário</label>
              <i className="bx bx-user icon"></i>
            </div>

            <div className="input-box">
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder=" "
                disabled={loading}
              />
              <label className="label">Senha</label>
              <i className="bx bx-lock-alt icon"></i>
            </div>

            <div className="remember-forgot">
              <label>
                
              </label>
              <Link to="/support" className="forgot-link">Esqueceu a senha?</Link>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="register-link">
              <p>Não possui conta? <a href="#">Registre-se</a></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}