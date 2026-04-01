import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import TrovareIcon from "../TrovareIcon.jsx";

import {
  LayoutDashboard,
  UtensilsCrossed,
  BarChart2,
  TableProperties,
  BookOpen,
  ClipboardList,
  Users,
  Wallet,
  Settings,
  X,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/relatorios", label: "Relatórios", icon: BarChart2 },
  { path: "/mesas", label: "Mesas", icon: TableProperties },
  { path: "/cardapio", label: "Cardápio", icon: BookOpen },
  { path: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { path: "/garcons", label: "Garçons", icon: Users },
  { path: "/caixa", label: "Caixa", icon: Wallet },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside style={{
      width: "224px",
      flexShrink: 0,
      background: "var(--bg-tertiary)",
      borderRight: "0.5px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0,
      left: 0,
      height: "100vh",
      zIndex: 30,
      transform: open ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.25s ease",
    }}
      className="lg:relative lg:translate-x-0 lg:transform-none">

      {/* Logo */}
      <div className="p-5 flex items-center justify-between"
        style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <TrovareIcon size={36} bg="gradient" />
          <div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
            }}>Trovare</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.2em",
              color: "var(--accent)",
              textTransform: "uppercase",
            }}>food</div>
          </div>
        </div>
        <button onClick={onClose}
          className="lg:hidden cursor-pointer t-muted hover:opacity-75">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onClose}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                transition: "all 0.15s ease",
                background: isActive ? "var(--accent-bg)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              })}>
              <Icon size={15} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4" style={{ borderTop: "0.5px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
            style={{
              background: "var(--accent-bg)",
              border: "0.5px solid var(--accent-border)",
              color: "var(--accent)",
              fontFamily: "'Space Mono', monospace",
            }}>
            {user?.name?.slice(0, 2).toUpperCase() || "TR"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs t-text truncate" style={{ fontWeight: 500 }}>{user?.name}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px" }}
              className="t-muted truncate">{user?.tenant?.name}</div>
          </div>
        </div>
        <button onClick={logout}
          className="w-full text-xs py-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: "#FF3D6E", background: "#FF3D6E15", border: "0.5px solid #FF3D6E30" }}>
          Sair
        </button>
      </div>
    </aside>
  );
}