import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";

const emptyForm = { nome: "", phone: "", commissionPct: 10, status: "active" };
const colors = ["#FF6B35", "#00F5A0", "#B8A8FF", "#00D9F5", "#F59E0B"];

export default function Garcons() {
  const [garcons, setGarcons] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
    setForm({ nome: g.nome, phone: g.phone, commissionPct: g.commissionPct, status: g.status });
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.nome) return;
    try {
      if (selected) {
        await api.put(`/food/garcons/${selected.id}`, form);
      } else {
        await api.post("/food/garcons", form);
      }
      await fetchAll();
      setShowModal(false);
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
                      <div className="t-muted text-xs">{g.phone || "Sem telefone"}</div>
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

                {/* Stats do garçom */}
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

                <div className="flex gap-2">
                  <button onClick={() => openEdit(g)}
                    className="flex-1 text-xs py-1.5 rounded-lg cursor-pointer t-inner t-muted t-hover transition-colors">
                    Editar
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
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
                <input type="text" placeholder="(11) 99999-0000" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
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
    </div>
  );
}