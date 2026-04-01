import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import api from "../services/api.js";

const statusConfig = {
  livre: { label: "Livre", className: "tag-livre" },
  ocupada: { label: "Ocupada", className: "tag-ocupada" },
  reservada: { label: "Reservada", className: "tag-reservada" },
};

const emptyForm = { numero: "", capacidade: 4 };

export default function Mesas() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");

  const fetchMesas = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/food/mesas");
      setMesas(data);
    } catch (e) {
      console.error("Erro ao buscar mesas:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMesas(); }, [fetchMesas]);

  function openNew() {
    setSelected(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(mesa) {
    setSelected(mesa);
    setForm({ numero: mesa.numero, capacidade: mesa.capacidade });
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.numero) return;
    try {
      if (selected) {
        await api.put(`/food/mesas/${selected.id}`, form);
      } else {
        await api.post("/food/mesas", form);
      }
      await fetchMesas();
      setShowModal(false);
    } catch (e) {
      console.error("Erro ao salvar mesa:", e);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/food/mesas/${id}`);
      await fetchMesas();
    } catch (e) {
      console.error("Erro ao deletar mesa:", e);
    }
  }

  async function handleStatus(id, status) {
    try {
      await api.patch(`/food/mesas/${id}/status`, { status });
      await fetchMesas();
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    }
  }

  const filtered = filter === "all" ? mesas : mesas.filter(m => m.status === filter);

  const livres = mesas.filter(m => m.status === "livre").length;
  const ocupadas = mesas.filter(m => m.status === "ocupada").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando mesas...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-text text-lg font-semibold">Mesas</h1>
          <p className="t-muted text-xs mt-0.5">{mesas.length} mesas cadastradas</p>
        </div>
        <button onClick={openNew}
          className="t-btn-primary text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer">
          + Nova Mesa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: mesas.length, color: "var(--text-primary)" },
          { label: "Livres", value: livres, color: "#00F5A0" },
          { label: "Ocupadas", value: ocupadas, color: "var(--accent)" },
        ].map((s, i) => (
          <div key={i} className="t-card rounded-xl p-5">
            <div className="t-faint text-[11px] uppercase tracking-wider mb-2"
              style={{ fontFamily: "'Space Mono', monospace" }}>{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "Todas" },
          { value: "livre", label: "Livres" },
          { value: "ocupada", label: "Ocupadas" },
          { value: "reservada", label: "Reservadas" },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer"
            style={{
              background: filter === f.value ? "var(--accent-bg)" : "transparent",
              color: filter === f.value ? "var(--accent)" : "var(--text-muted)",
              borderColor: filter === f.value ? "var(--accent-border)" : "var(--border)",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid de mesas */}
      {filtered.length === 0 ? (
        <div className="t-card rounded-xl p-12 text-center">
          <div className="t-muted text-sm mb-3">Nenhuma mesa encontrada</div>
          <button onClick={openNew}
            className="text-sm cursor-pointer hover:opacity-75"
            style={{ color: "var(--accent)" }}>
            + Cadastrar primeira mesa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(mesa => {
            const cfg = statusConfig[mesa.status] || statusConfig.livre;
            const pedidoAtivo = mesa.pedidos?.find(p => p.status !== "fechado");
            return (
              <div key={mesa.id} className="t-card rounded-xl p-4 flex flex-col gap-3">

                {/* Número da mesa */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="t-faint text-[10px] uppercase tracking-wider mb-1"
                      style={{ fontFamily: "'Space Mono', monospace" }}>Mesa</div>
                    <div className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
                      {String(mesa.numero).padStart(2, "0")}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Capacidade */}
                <div className="t-muted text-xs">
                  {mesa.capacidade} lugares
                </div>

                {/* Pedido ativo */}
                {pedidoAtivo && (
                  <div className="t-inner rounded-lg p-2">
                    <div className="t-faint text-[10px] mb-1"
                      style={{ fontFamily: "'Space Mono', monospace" }}>
                      pedido #{pedidoAtivo.id}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                      R$ {pedidoAtivo.total.toFixed(2)}
                    </div>
                    <div className="t-muted text-[10px]">
                      {pedidoAtivo.itens?.length || 0} itens
                    </div>
                  </div>
                )}

                {/* Ações de status */}
                <div className="flex gap-1 flex-wrap">
                  {mesa.status !== "livre" && (
                    <button onClick={() => handleStatus(mesa.id, "livre")}
                      className="text-[10px] px-2 py-1 rounded cursor-pointer hover:opacity-75 transition-opacity"
                      style={{ background: "#00F5A015", color: "#00F5A0" }}>
                      Liberar
                    </button>
                  )}
                  {mesa.status !== "ocupada" && (
                    <button onClick={() => handleStatus(mesa.id, "ocupada")}
                      className="text-[10px] px-2 py-1 rounded cursor-pointer hover:opacity-75 transition-opacity"
                      style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                      Ocupar
                    </button>
                  )}
                  {mesa.status !== "reservada" && (
                    <button onClick={() => handleStatus(mesa.id, "reservada")}
                      className="text-[10px] px-2 py-1 rounded cursor-pointer hover:opacity-75 transition-opacity"
                      style={{ background: "#B8A8FF15", color: "#B8A8FF" }}>
                      Reservar
                    </button>
                  )}
                </div>

                {/* Editar / Remover */}
                <div className="flex gap-2 pt-1" style={{ borderTop: "0.5px solid var(--border-soft)" }}>
                  <button onClick={() => openEdit(mesa)}
                    className="flex-1 text-[11px] py-1 rounded cursor-pointer t-inner t-muted t-hover transition-colors">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(mesa.id)}
                    className="flex-1 text-[11px] py-1 rounded cursor-pointer transition-colors"
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
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">
                {selected ? "Editar Mesa" : "Nova Mesa"}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="t-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Número da mesa
                </label>
                <input type="number" placeholder="01" value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Capacidade — <span style={{ color: "var(--accent)" }}>{form.capacidade} lugares</span>
                </label>
                <input type="range" min={1} max={20} value={form.capacidade}
                  onChange={e => setForm(f => ({ ...f, capacidade: Number(e.target.value) }))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: "var(--accent)" }}
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer transition-colors">
                  {selected ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}