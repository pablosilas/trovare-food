import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import TrovareIcon from "../components/TrovareIcon.jsx";
import PasswordInput from "../components/PasswordInput.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        <div className="flex flex-col items-center mb-10">
          <div className="mb-5">
            <TrovareIcon size={56} bg="gradient" />
          </div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-1.5px",
            lineHeight: 1,
            marginBottom: "6px",
          }}>Trovare</div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.25em",
            color: "var(--accent)",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}>food · software</div>
          <p className="t-muted text-sm">Acesse sua conta</p>
        </div>

        <div className="t-card rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="t-muted block mb-1"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                E-mail
              </label>
              <input type="email" placeholder="seu@email.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="t-input w-full text-sm px-4 py-3 rounded-xl" required />
            </div>
            <div>
              <label className="t-muted block mb-1"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Senha
              </label>
              <PasswordInput
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="t-input w-full text-sm px-3 py-2 rounded-xl"
              />
            </div>

            {error && (
              <div className="text-sm text-center px-3 py-2 rounded-lg"
                style={{ background: "#FF3D6E15", color: "#FF3D6E", border: "0.5px solid #FF3D6E30" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="t-btn-primary w-full py-3 rounded-xl text-sm cursor-pointer transition-opacity mt-1"
              style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center t-faint text-xs mt-6"
          style={{ fontFamily: "'Space Mono', monospace" }}>
          trovare software © 2026
        </p>
      </div>
    </div>
  );
}