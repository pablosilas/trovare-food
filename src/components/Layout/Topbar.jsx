import { useState, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext.jsx";

export default function Topbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const [status, setStatus] = useState("connecting");
  const [lastUpdate, setLastUpdate] = useState(null);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  useEffect(() => {
    async function checkConnection() {
      try {
        await fetch(import.meta.env.VITE_API_URL || "http://localhost:3333");
        setStatus("online");
        setLastUpdate(new Date());
      } catch {
        setStatus("offline");
      }
    }
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    connecting: { color: "#B8A8FF", label: "Conectando...", pulse: true },
    online: { color: "#00F5A0", label: "Online", pulse: true },
    offline: { color: "#FF3D6E", label: "Offline", pulse: false },
  };

  const cfg = statusConfig[status];

  return (
    <div className="h-14 flex items-center px-4 gap-3 shrink-0"
      style={{ background: "var(--bg-tertiary)", borderBottom: "0.5px solid var(--border)" }}>

      <button onClick={onMenuClick}
        className="lg:hidden cursor-pointer t-muted hover:opacity-75 shrink-0 text-xl">
        ☰
      </button>

      <div className="flex-1 t-muted hidden sm:block truncate"
        style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px" }}>
        {hoje}
      </div>
      <div className="flex-1 lg:hidden" />

      {lastUpdate && (
        <div className="t-faint hidden lg:block shrink-0"
          style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px" }}>
          sync · {lastUpdate.toLocaleTimeString("pt-BR")}
        </div>
      )}

      {/* Toggle tema */}
      <button onClick={toggleTheme}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shrink-0"
        style={{
          background: "var(--bg-secondary)",
          border: "0.5px solid var(--border)",
          color: "var(--text-secondary)",
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
        }}>
        {theme === "dark" ? "☀" : "☾"}
        <span className="hidden sm:inline">{theme === "dark" ? "light" : "dark"}</span>
      </button>

      {/* Status */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full"
          style={{
            background: cfg.color,
            boxShadow: `0 0 6px ${cfg.color}`,
            animation: cfg.pulse ? "pulse 2s infinite" : "none",
          }} />
        <span className="hidden sm:inline"
          style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}