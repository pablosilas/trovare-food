import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";

const emptyForm = { nome: "", phone: "", commissionPct: 10, status: "active", dataNascimento: "", dataNascimentoDisplay: "" };
const colors = ["#FF6B35", "#00F5A0", "#B8A8FF", "#00D9F5", "#F59E0B"];

export default function Garcons() {
  const [garcons, setGarcons] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogin, setShowLogin] = useState(null); // mostra credenciais
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [g, p] = await Promise.all([
        api.get("/food/garcons"),
        api.get("/food/pedidos"),
      ]);
      setGarcons(g.data);
      setPedidos(p.data);
    } catch (e) {
      console.error("Erro ao buscar garçons:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openNew() {
    setSelected(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(g) {
    setSelected(g);

    // Converte YYYY-MM-DD para DD/MM/YYYY para exibir
    let display = "";
    if (g.dataNascimento) {
      const d = new Date(g.dataNascimento);
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();
      display = `${dia}/${mes}/${ano}`;
    }

    setForm({
      nome: g.nome,
      phone: g.phone,
      commissionPct: g.commissionPct,
      status: g.status,
      dataNascimento: g.dataNascimento || "",
      dataNascimentoDisplay: display,
    });
    setShowModal(true);
  }

  function formatPhone(value) {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return `(${nums}`;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length <= 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    return value;
  }

  function formatDate(value) {
    const nums = value.replace(/\D/g, "").slice(0, 8);
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
    return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
  }

  function parseDate(formatted) {
    // Converte DD/MM/YYYY para YYYY-MM-DD para o backend
    const parts = formatted.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return "";
  }

  async function handleSubmit() {
    if (!form.nome) return;
    try {
      if (selected) {
        await api.put(`/food/garcons/${selected.id}`, form);
        await fetchAll();
        setShowModal(false);
      } else {
        const { data } = await api.post("/food/garcons", form);
        console.log("Resposta do backend:", data); // ← adicione isso
        await fetchAll();
        setShowModal(false);
        setShowLogin({
          nome: data.nome,
          username: data.username,
          plainPassword: data.plainPassword,
        });
      }
    } catch (e) {
      console.error("Erro ao salvar garçom:", e);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/food/garcons/${id}`);
      await fetchAll();
    } catch (e) {
      console.error("Erro ao deletar garçom:", e);
    }
  }

  async function handleGetLogin(id) {
    try {
      const { data } = await api.get(`/food/garcons/${id}/login`);
      setShowLogin({
        username: data.username,
        plainPassword: null, // não temos a senha salva
      });
    } catch (e) {
      console.error("Erro ao buscar login:", e);
    }
  }

  async function handleGenerateLogin(id) {
    try {
      const { data } = await api.post(`/food/garcons/${id}/generate-login`);
      setShowLogin({
        username: data.username,
        plainPassword: data.plainPassword,
      });
    } catch (e) {
      console.error("Erro ao gerar nova senha:", e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando garçons...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-text text-lg font-semibold">Garçons</h1>
          <p className="t-muted text-xs mt-0.5">
            {garcons.filter(g => g.status === "active").length} garçons ativos
          </p>
        </div>
        <button onClick={openNew}
          className="t-btn-primary text-sm px-4 py-2 rounded-lg cursor-pointer">
          + Novo Garçom
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: garcons.length, color: "var(--text-primary)" },
          { label: "Ativos", value: garcons.filter(g => g.status === "active").length, color: "#00F5A0" },
          {
            label: "Pedidos hoje", value: pedidos.filter(p => {
              const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
              return new Date(p.createdAt) >= hoje;
            }).length, color: "var(--accent)"
          },
        ].map((s, i) => (
          <div key={i} className="t-card rounded-xl p-5">
            <div className="t-faint text-[11px] uppercase tracking-wider mb-2"
              style={{ fontFamily: "'Space Mono', monospace" }}>{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Cards */}
      {garcons.length === 0 ? (
        <div className="t-card rounded-xl p-12 text-center">
          <div className="t-muted text-sm mb-3">Nenhum garçom cadastrado</div>
          <button onClick={openNew}
            className="text-sm cursor-pointer hover:opacity-75"
            style={{ color: "var(--accent)" }}>
            + Cadastrar primeiro garçom
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {garcons.map((g, idx) => {
            const color = colors[idx % colors.length];
            const pedidosGarcom = pedidos.filter(p => p.garcomId === g.id);
            const pedidosAtivos = pedidosGarcom.filter(p => p.status !== "fechado");
            const totalVendas = pedidosGarcom.filter(p => p.status === "fechado")
              .reduce((s, p) => s + p.total, 0);
            const comissao = totalVendas * g.commissionPct / 100;

            return (
              <div key={g.id} className="t-card rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: color + "20", border: `2px solid ${color}40`, color }}>
                      {g.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="t-text text-sm font-semibold">{g.nome}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "var(--text-muted)" }}>
                        @{g.username}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: g.status === "active" ? "#00F5A0" : "var(--text-muted)" }} />
                    <span className="text-[10px]"
                      style={{ color: g.status === "active" ? "#00F5A0" : "var(--text-muted)" }}>
                      {g.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Pedidos", value: pedidosGarcom.length },
                    { label: "Ativos", value: pedidosAtivos.length },
                    { label: "Comissão", value: `R$ ${comissao.toFixed(0)}` },
                  ].map((s, i) => (
                    <div key={i} className="t-inner rounded-lg p-2 text-center">
                      <div className="t-faint text-[9px] mb-1"
                        style={{ fontFamily: "'Space Mono', monospace" }}>{s.label}</div>
                      <div className="text-sm font-semibold" style={{ color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Comissão % */}
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="t-muted">Comissão</span>
                    <span style={{ color }}>{g.commissionPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--bg-card)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${g.commissionPct}%`, background: color }} />
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openEdit(g)}
                    className="flex-1 text-xs py-1.5 rounded-lg cursor-pointer t-inner t-muted t-hover transition-colors">
                    Editar
                  </button>
                  <button onClick={() => handleGetLogin(g.id)}
                    className="flex-1 text-xs py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)", border: "0.5px solid var(--accent-border)" }}>
                    Ver login
                  </button>
                  <button onClick={() => handleDelete(g.id)}
                    className="flex-1 text-xs py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: "#FF3D6E15", color: "#FF3D6E" }}>
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — Novo/Editar Garçom */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">
                {selected ? "Editar Garçom" : "Novo Garçom"}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Nome
                </label>
                <input type="text" placeholder="Nome completo" value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Telefone
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Data de nascimento
                </label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={form.dataNascimentoDisplay}
                  onChange={e => {
                    const display = formatDate(e.target.value);
                    const iso = parseDate(display);
                    setForm(f => ({ ...f, dataNascimentoDisplay: display, dataNascimento: iso }));
                  }}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Comissão — <span style={{ color: "var(--accent)" }}>{form.commissionPct}%</span>
                </label>
                <input type="range" min={5} max={30} value={form.commissionPct}
                  onChange={e => setForm(f => ({ ...f, commissionPct: Number(e.target.value) }))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: "var(--accent)" }}
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Status
                </label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="t-select w-full text-sm px-3 py-2 rounded-lg cursor-pointer">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              {!selected && (
                <div className="t-inner rounded-lg p-3">
                  <div className="t-muted text-xs">
                    🔐 O login será gerado automaticamente após o cadastro.
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Cancelar
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer">
                  {selected ? "Salvar" : "Cadastrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Credenciais de acesso */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Credenciais de acesso</h2>
              <button onClick={() => setShowLogin(null)}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>

            <div className="t-inner rounded-lg p-4 mb-4 text-center">
              <div className="text-2xl mb-2">🔐</div>
              <div className="t-text text-sm font-semibold mb-1">
                {showLogin.nome || "Garçom"}
              </div>
              <div className="t-muted text-xs">Credenciais para acessar o Trovare Waiter</div>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <div className="t-inner rounded-lg p-3">
                <div className="t-faint text-[10px] uppercase tracking-wider mb-1"
                  style={{ fontFamily: "'Space Mono', monospace" }}>
                  Usuário
                </div>
                <div className="t-text text-sm font-bold"
                  style={{ fontFamily: "'Space Mono', monospace" }}>
                  {showLogin.username}
                </div>
              </div>

              <div className="t-inner rounded-lg p-3">
                <div className="t-faint text-[10px] uppercase tracking-wider mb-1"
                  style={{ fontFamily: "'Space Mono', monospace" }}>
                  Senha
                </div>
                {showLogin.plainPassword ? (
                  <div className="text-sm font-bold"
                    style={{ fontFamily: "'Space Mono', monospace", color: "var(--accent)" }}>
                    {showLogin.plainPassword}
                  </div>
                ) : (
                  <div className="t-muted text-xs italic">
                    Senha não disponível — gere uma nova se necessário
                  </div>
                )}
              </div>
            </div>

            {/* Botão gerar nova senha */}
            <button
              onClick={() => {
                const garcom = garcons.find(g => g.username === showLogin.username);
                if (garcom) handleGenerateLogin(garcom.id);
              }}
              className="w-full text-sm py-2 rounded-lg cursor-pointer mb-3 transition-colors"
              style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "0.5px solid var(--border)" }}>
              Gerar nova senha
            </button>

            <button onClick={() => setShowLogin(null)}
              className="t-btn-primary w-full text-sm py-2 rounded-lg cursor-pointer">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}