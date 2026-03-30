import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";

const statusConfig = {
  aberto: { label: "Aberto", className: "tag-aberto" },
  preparando: { label: "Preparando", className: "tag-preparando" },
  pronto: { label: "Pronto", className: "tag-pronto" },
  fechado: { label: "Fechado", className: "tag-fechado" },
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [garcons, setGarcons] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [formNew, setFormNew] = useState({ mesaId: "", garcomId: "" });
  const [formItem, setFormItem] = useState({ itemId: "", quantidade: 1, obs: "" });
  const [showFechar, setShowFechar] = useState(null);
  const [formaPag, setFormaPag] = useState("pix");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [p, m, g, c] = await Promise.all([
        api.get("/food/pedidos"),
        api.get("/food/mesas"),
        api.get("/food/garcons"),
        api.get("/food/cardapio/categorias"),
      ]);
      setPedidos(p.data);
      setMesas(m.data);
      setGarcons(g.data);
      setCardapio(c.data);
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleNovoPedido() {
    try {
      await api.post("/food/pedidos", formNew);
      await fetchAll();
      setShowNew(false);
      setFormNew({ mesaId: "", garcomId: "" });
    } catch (e) {
      console.error("Erro ao criar pedido:", e);
    }
  }

  async function handleAddItem() {
    if (!formItem.itemId) return;
    try {
      await api.post(`/food/pedidos/${selected.id}/itens`, formItem);
      const { data } = await api.get(`/food/pedidos/${selected.id}`);
      setSelected(data);
      await fetchAll();
      setShowAdd(false);
      setFormItem({ itemId: "", quantidade: 1, obs: "" });
    } catch (e) {
      console.error("Erro ao adicionar item:", e);
    }
  }

  async function handleRemoveItem(itemId) {
    try {
      await api.delete(`/food/pedidos/${selected.id}/itens/${itemId}`);
      const { data } = await api.get(`/food/pedidos/${selected.id}`);
      setSelected(data);
      await fetchAll();
    } catch (e) {
      console.error("Erro ao remover item:", e);
    }
  }

  async function handleStatus(id, status) {
    try {
      await api.patch(`/food/pedidos/${id}/status`, { status });
      if (selected?.id === id) {
        const { data } = await api.get(`/food/pedidos/${id}`);
        setSelected(data);
      }
      await fetchAll();
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    }
  }

  async function handleFechar() {
    try {
      await api.patch(`/food/pedidos/${showFechar.id}/fechar`, { forma: formaPag });
      await fetchAll();
      setShowFechar(null);
      if (selected?.id === showFechar.id) setSelected(null);
    } catch (e) {
      console.error("Erro ao fechar pedido:", e);
    }
  }

  const todosItens = cardapio.flatMap(c => c.itens.filter(i => i.disponivel));
  const filtered = filter === "all" ? pedidos : pedidos.filter(p => p.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="t-muted text-sm">Carregando pedidos...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-text text-lg font-semibold">Pedidos</h1>
          <p className="t-muted text-xs mt-0.5">{pedidos.filter(p => p.status !== "fechado").length} pedidos ativos</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="t-btn-primary text-sm px-4 py-2 rounded-lg cursor-pointer">
          + Novo Pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "Todos" },
          { value: "aberto", label: "Abertos" },
          { value: "preparando", label: "Preparando" },
          { value: "pronto", label: "Prontos" },
          { value: "fechado", label: "Fechados" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Lista de pedidos */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="t-card rounded-xl p-8 text-center">
              <div className="t-muted text-sm">Nenhum pedido encontrado</div>
            </div>
          ) : (
            filtered.map(p => {
              const cfg = statusConfig[p.status] || statusConfig.aberto;
              return (
                <div key={p.id}
                  onClick={() => setSelected(p)}
                  className="t-card rounded-xl p-4 cursor-pointer transition-all"
                  style={{
                    borderColor: selected?.id === p.id ? "var(--accent)" : "var(--border)",
                    borderWidth: selected?.id === p.id ? "1px" : "0.5px",
                  }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="t-text text-sm font-semibold">
                          Pedido #{p.id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="t-muted text-xs mt-1">
                        {p.mesa ? `Mesa ${p.mesa.numero}` : "Sem mesa"}
                        {p.garcom ? ` · ${p.garcom.nome}` : ""}
                        {p.origem === "ifood" ? " · iFood" : ""}
                      </div>
                    </div>
                    <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                      R$ {Number(p.total).toFixed(2)}
                    </div>
                  </div>

                  <div className="t-muted text-xs mb-3">
                    {p.itens?.length || 0} itens · {new Date(p.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex gap-2 flex-wrap">
                    {p.status === "aberto" && (
                      <button onClick={e => { e.stopPropagation(); handleStatus(p.id, "preparando"); }}
                        className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
                        style={{ background: "#F59E0B15", color: "#F59E0B" }}>
                        Preparando
                      </button>
                    )}
                    {p.status === "preparando" && (
                      <button onClick={e => { e.stopPropagation(); handleStatus(p.id, "pronto"); }}
                        className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
                        style={{ background: "#00F5A015", color: "#00F5A0" }}>
                        Pronto
                      </button>
                    )}
                    {p.status !== "fechado" && (
                      <button onClick={e => { e.stopPropagation(); setShowFechar(p); }}
                        className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
                        style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                        Fechar conta
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detalhe do pedido */}
        {selected ? (
          <div className="t-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div>
                <span className="t-text text-sm font-semibold">Pedido #{selected.id}</span>
                <span className="t-muted text-xs ml-2">
                  {selected.mesa ? `Mesa ${selected.mesa.numero}` : "Sem mesa"}
                </span>
              </div>
              <div className="flex gap-2">
                {selected.status !== "fechado" && (
                  <button onClick={() => setShowAdd(true)}
                    className="t-btn-primary text-xs px-3 py-1.5 rounded-lg cursor-pointer">
                    + Item
                  </button>
                )}
                <button onClick={() => setSelected(null)}
                  className="t-muted text-lg cursor-pointer hover:opacity-75">✕</button>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-2">
              {selected.itens?.length === 0 ? (
                <div className="t-muted text-sm text-center py-6">Nenhum item adicionado</div>
              ) : (
                selected.itens?.map(ip => (
                  <div key={ip.id} className="t-inner rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="t-text text-sm font-medium">{ip.item?.nome}</div>
                      {ip.obs && <div className="t-muted text-xs">{ip.obs}</div>}
                      <div className="t-muted text-xs">{ip.quantidade}x · R$ {Number(ip.preco).toFixed(2)}</div>
                    </div>
                    <div className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                      R$ {(ip.quantidade * ip.preco).toFixed(2)}
                    </div>
                    {selected.status !== "fechado" && (
                      <button onClick={() => handleRemoveItem(ip.id)}
                        className="text-[10px] cursor-pointer hover:opacity-75 transition-opacity"
                        style={{ color: "#FF3D6E" }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Total */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderTop: "0.5px solid var(--border)" }}>
              <span className="t-muted text-sm">Total</span>
              <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                R$ {Number(selected.total).toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="t-card rounded-xl p-8 flex items-center justify-center">
            <div className="t-muted text-sm text-center">
              Clique em um pedido para ver os detalhes
            </div>
          </div>
        )}
      </div>

      {/* Modal — Novo Pedido */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Novo Pedido</h2>
              <button onClick={() => setShowNew(false)}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Mesa
                </label>
                <select value={formNew.mesaId}
                  onChange={e => setFormNew(f => ({ ...f, mesaId: e.target.value }))}
                  className="t-select w-full text-sm px-3 py-2 rounded-lg cursor-pointer">
                  <option value="">Sem mesa (balcão)</option>
                  {mesas.filter(m => m.status !== "ocupada").map(m => (
                    <option key={m.id} value={m.id}>Mesa {m.numero}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Garçom
                </label>
                <select value={formNew.garcomId}
                  onChange={e => setFormNew(f => ({ ...f, garcomId: e.target.value }))}
                  className="t-select w-full text-sm px-3 py-2 rounded-lg cursor-pointer">
                  <option value="">Sem garçom</option>
                  {garcons.filter(g => g.status === "active").map(g => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowNew(false)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Cancelar
                </button>
                <button onClick={handleNovoPedido}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer">
                  Abrir pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Adicionar Item */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Adicionar Item</h2>
              <button onClick={() => setShowAdd(false)}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Item
                </label>
                <select value={formItem.itemId}
                  onChange={e => setFormItem(f => ({ ...f, itemId: e.target.value }))}
                  className="t-select w-full text-sm px-3 py-2 rounded-lg cursor-pointer">
                  <option value="">Selecione</option>
                  {cardapio.map(cat => (
                    <optgroup key={cat.id} label={cat.nome}>
                      {cat.itens.filter(i => i.disponivel).map(i => (
                        <option key={i.id} value={i.id}>
                          {i.nome} — R$ {Number(i.preco).toFixed(2)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Quantidade
                </label>
                <input type="number" min={1} value={formItem.quantidade}
                  onChange={e => setFormItem(f => ({ ...f, quantidade: Number(e.target.value) }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Observação
                </label>
                <input type="text" placeholder="Ex: sem cebola..." value={formItem.obs}
                  onChange={e => setFormItem(f => ({ ...f, obs: e.target.value }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Cancelar
                </button>
                <button onClick={handleAddItem}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Fechar Conta */}
      {showFechar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Fechar Conta</h2>
              <button onClick={() => setShowFechar(null)}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="t-inner rounded-lg p-4 text-center">
                <div className="t-muted text-xs mb-1">Total do pedido #{showFechar.id}</div>
                <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                  R$ {Number(showFechar.total).toFixed(2)}
                </div>
              </div>
              <div>
                <label className="t-muted block mb-2"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Forma de pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "pix", label: "PIX", color: "#00F5A0" },
                    { value: "cartao", label: "Cartão", color: "#B8A8FF" },
                    { value: "dinheiro", label: "Dinheiro", color: "#F59E0B" },
                  ].map(f => (
                    <button key={f.value} onClick={() => setFormaPag(f.value)}
                      className="py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer"
                      style={{
                        background: formaPag === f.value ? f.color + "20" : "var(--bg-tertiary)",
                        color: formaPag === f.value ? f.color : "var(--text-muted)",
                        borderColor: formaPag === f.value ? f.color + "50" : "var(--border)",
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowFechar(null)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Cancelar
                </button>
                <button onClick={handleFechar}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer">
                  Confirmar pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}