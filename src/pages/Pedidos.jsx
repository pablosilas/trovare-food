import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";

const statusConfig = {
  aberto: { label: "Aberto", bg: "#FF6B3515", color: "#FF6B35" },
  preparando: { label: "Preparando", bg: "#F59E0B15", color: "#F59E0B" },
  pronto: { label: "Pronto", bg: "#00F5A015", color: "#00F5A0" },
  fechado: { label: "Fechado", bg: "#5A5A7A15", color: "#5A5A7A" },
};

const formaConfig = {
  pix: { label: "PIX", color: "#00F5A0" },
  dinheiro: { label: "Dinheiro", color: "#F59E0B" },
  credito: { label: "Cartão Crédito", color: "#B8A8FF" },
  debito: { label: "Cartão Débito", color: "#7C6AF5" },
  vr: { label: "VR", color: "#FF6B35" },
  va: { label: "VA", color: "#00D9F5" },
  ticket: { label: "Ticket", color: "#F472B6" },
  transferencia: { label: "Transferência", color: "#4ade80" },
};

const emptyForm = {
  mesaId: "", garcomId: "", origem: "local",
  nomeCliente: "", telefone: "", endereco: "",
  observacao: "", frete: "", formaPagamento: "pix",
};

function formatPhone(value) {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  return value;
}

function formatPrice(value) {
  const nums = value.replace(/\D/g, "");
  if (!nums) return "";
  return (parseInt(nums, 10) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function parsePrice(formatted) {
  return parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0;
}

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
  const [filterOrigem, setFilterOrigem] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [freteDisplay, setFreteDisplay] = useState("");
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
      await api.post("/food/pedidos", {
        ...form,
        frete: parsePrice(freteDisplay),
      });
      await fetchAll();
      setShowNew(false);
      setForm(emptyForm);
      setFreteDisplay("");
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

  const filtered = pedidos
    .filter(p => filter === "all" || p.status === filter)
    .filter(p => filterOrigem === "all" || p.origem === filterOrigem);

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
          <p className="t-muted text-xs mt-0.5">
            {pedidos.filter(p => p.status !== "fechado").length} pedidos ativos
          </p>
        </div>
        <button onClick={() => { setForm(emptyForm); setFreteDisplay(""); setShowNew(true); }}
          className="t-btn-primary text-sm px-4 py-2 rounded-lg cursor-pointer">
          + Novo Pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all", label: "Todos" },
            { value: "aberto", label: "Aberto" },
            { value: "preparando", label: "Preparando" },
            { value: "pronto", label: "Pronto" },
            { value: "fechado", label: "Fechado" },
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
        <div className="flex gap-2">
          {[
            { value: "all", label: "Todos" },
            { value: "local", label: "Local" },
            { value: "delivery", label: "Delivery" },
            { value: "ifood", label: "iFood" },
          ].map(f => (
            <button key={f.value} onClick={() => setFilterOrigem(f.value)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer"
              style={{
                background: filterOrigem === f.value ? "#B8A8FF15" : "transparent",
                color: filterOrigem === f.value ? "#B8A8FF" : "var(--text-muted)",
                borderColor: filterOrigem === f.value ? "#B8A8FF40" : "var(--border)",
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Lista */}
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
                  style={{ borderColor: selected?.id === p.id ? "var(--accent)" : "var(--border)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="t-text text-sm font-semibold">Pedido #{p.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        {p.origem === "delivery" && (
                          <span className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: "#B8A8FF15", color: "#B8A8FF" }}>
                            🛵 Delivery
                          </span>
                        )}
                        {p.origem === "ifood" && (
                          <span className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: "#FF3D6E15", color: "#FF3D6E" }}>
                            iFood
                          </span>
                        )}
                      </div>
                      <div className="t-muted text-xs mt-1">
                        {p.origem === "delivery"
                          ? p.nomeCliente || "Cliente"
                          : p.mesa ? `Mesa ${p.mesa.numero}` : "Balcão"}
                        {p.garcom ? ` · ${p.garcom.nome}` : ""}
                      </div>
                    </div>
                    <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                      R$ {Number(p.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="t-muted text-xs mb-3">
                    {p.itens?.length || 0} itens · {new Date(p.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {p.frete > 0 && <span className="ml-2">· Frete R$ {Number(p.frete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {p.status === "aberto" && (
                      <button onClick={e => { e.stopPropagation(); handleStatus(p.id, "preparando"); }}
                        className="text-[10px] px-2 py-1 rounded cursor-pointer"
                        style={{ background: "#F59E0B15", color: "#F59E0B" }}>
                        Preparando
                      </button>
                    )}
                    {p.status === "preparando" && (
                      <button onClick={e => { e.stopPropagation(); handleStatus(p.id, "pronto"); }}
                        className="text-[10px] px-2 py-1 rounded cursor-pointer"
                        style={{ background: "#00F5A015", color: "#00F5A0" }}>
                        Pronto
                      </button>
                    )}
                    {p.status !== "fechado" && (
                      <button onClick={e => { e.stopPropagation(); setShowFechar(p); }}
                        className="text-[10px] px-2 py-1 rounded cursor-pointer"
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

        {/* Detalhe */}
        {selected ? (
          <div className="t-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div>
                <span className="t-text text-sm font-semibold">Pedido #{selected.id}</span>
                <span className="t-muted text-xs ml-2">
                  {selected.origem === "delivery"
                    ? `🛵 ${selected.nomeCliente || "Delivery"}`
                    : selected.mesa ? `Mesa ${selected.mesa.numero}` : "Balcão"}
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

            {/* Info delivery */}
            {selected.origem === "delivery" && (
              <div className="px-5 py-3" style={{ borderBottom: "0.5px solid var(--border)", background: "#B8A8FF08" }}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selected.nomeCliente && (
                    <div>
                      <span className="t-faint">Cliente</span>
                      <div className="t-text font-medium">{selected.nomeCliente}</div>
                    </div>
                  )}
                  {selected.telefone && (
                    <div>
                      <span className="t-faint">Telefone</span>
                      <div className="t-text font-medium">{selected.telefone}</div>
                    </div>
                  )}
                  {selected.endereco && (
                    <div className="col-span-2">
                      <span className="t-faint">Endereço</span>
                      <div className="t-text font-medium">{selected.endereco}</div>
                    </div>
                  )}
                  {selected.observacao && (
                    <div className="col-span-2">
                      <span className="t-faint">Obs</span>
                      <div className="t-text font-medium">{selected.observacao}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 flex flex-col gap-2">
              {selected.itens?.length === 0 ? (
                <div className="t-muted text-sm text-center py-6">Nenhum item adicionado</div>
              ) : (
                selected.itens?.map(ip => (
                  <div key={ip.id} className="t-inner rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="t-text text-sm font-medium">{ip.item?.nome}</div>
                      {ip.obs && <div className="t-muted text-xs">{ip.obs}</div>}
                      <div className="t-muted text-xs">{ip.quantidade}x · R$ {Number(ip.preco / ip.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                      R$ {Number(ip.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    {selected.status !== "fechado" && (
                      <button onClick={() => handleRemoveItem(ip.id)}
                        className="text-[10px] cursor-pointer hover:opacity-75"
                        style={{ color: "#FF3D6E" }}>✕</button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Total */}
            <div className="px-5 py-4" style={{ borderTop: "0.5px solid var(--border)" }}>
              {selected.frete > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="t-muted text-sm">Subtotal</span>
                  <span className="t-muted text-sm">
                    R$ {Number(selected.total - selected.frete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {selected.frete > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="t-muted text-sm">Frete</span>
                  <span className="t-muted text-sm">
                    R$ {Number(selected.frete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="t-muted text-sm">Total</span>
                <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>
                  R$ {Number(selected.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="t-card rounded-xl p-8 flex items-center justify-center">
            <div className="t-muted text-sm text-center">Clique em um pedido para ver os detalhes</div>
          </div>
        )}
      </div>

      {/* Modal — Novo Pedido */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Novo Pedido</h2>
              <button onClick={() => setShowNew(false)}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-3">

              {/* Tipo do pedido */}
              <div>
                <label className="t-muted block mb-2"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "local", label: "🪑 Local", desc: "Mesa ou balcão" },
                    { value: "delivery", label: "🛵 Delivery", desc: "Entrega em domicílio" },
                  ].map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, origem: t.value }))}
                      className="py-3 px-3 rounded-lg text-left border transition-all cursor-pointer"
                      style={{
                        background: form.origem === t.value ? "var(--accent-bg)" : "var(--bg-tertiary)",
                        borderColor: form.origem === t.value ? "var(--accent-border)" : "var(--border)",
                      }}>
                      <div className="text-sm font-semibold" style={{ color: form.origem === t.value ? "var(--accent)" : "var(--text-primary)" }}>
                        {t.label}
                      </div>
                      <div className="t-muted text-xs mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Local */}
              {form.origem === "local" && (
                <>
                  <div>
                    <label className="t-muted block mb-1"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Mesa
                    </label>
                    <select value={form.mesaId}
                      onChange={e => setForm(f => ({ ...f, mesaId: e.target.value }))}
                      className="t-select w-full text-sm px-3 py-2 rounded-lg cursor-pointer">
                      <option value="">Sem mesa (balcão)</option>
                      {mesas.filter(m => m.status !== "ocupada").map(m => (
                        <option key={m.id} value={m.id}>Mesa {m.numero}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Delivery */}
              {form.origem === "delivery" && (
                <>
                  <div>
                    <label className="t-muted block mb-1"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Nome do cliente *
                    </label>
                    <input type="text" placeholder="Nome completo" value={form.nomeCliente}
                      onChange={e => setForm(f => ({ ...f, nomeCliente: e.target.value }))}
                      className="t-input w-full text-sm px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="t-muted block mb-1"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Telefone
                    </label>
                    <input type="text" placeholder="(11) 99999-9999" value={form.telefone}
                      onChange={e => setForm(f => ({ ...f, telefone: formatPhone(e.target.value) }))}
                      className="t-input w-full text-sm px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="t-muted block mb-1"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Endereço completo
                    </label>
                    <textarea placeholder="Rua, número, bairro, complemento..." value={form.endereco}
                      onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                      rows={2} className="t-input w-full text-sm px-3 py-2 rounded-lg resize-none"
                    />
                  </div>
                  <div>
                    <label className="t-muted block mb-1"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Frete (R$)
                    </label>
                    <div className="flex items-center gap-2 t-input rounded-lg px-3 py-2">
                      <span className="t-muted text-sm shrink-0">R$</span>
                      <input type="text" placeholder="0,00" value={freteDisplay}
                        onChange={e => setFreteDisplay(formatPrice(e.target.value))}
                        style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="t-muted block mb-2"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Forma de pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "pix", label: "PIX", color: "#00F5A0" },
                        { value: "dinheiro", label: "Dinheiro", color: "#F59E0B" },
                        { value: "credito", label: "Cartão Crédito", color: "#B8A8FF" },
                        { value: "debito", label: "Cartão Débito", color: "#7C6AF5" },
                        { value: "vr", label: "VR", color: "#FF6B35" },
                        { value: "va", label: "VA", color: "#00D9F5" },
                        { value: "ticket", label: "Ticket", color: "#F472B6" },
                        { value: "transferencia", label: "Transferência", color: "#4ade80" },
                      ].map(f => (
                        <button key={f.value}
                          onClick={() => setForm(p => ({ ...p, formaPagamento: f.value }))}
                          className="py-2.5 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer text-left"
                          style={{
                            background: form.formaPagamento === f.value ? f.color + "20" : "var(--bg-tertiary)",
                            color: form.formaPagamento === f.value ? f.color : "var(--text-muted)",
                            borderColor: form.formaPagamento === f.value ? f.color + "50" : "var(--border)",
                          }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Garçom — ambos */}
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Garçom (opcional)
                </label>
                <select value={form.garcomId}
                  onChange={e => setForm(f => ({ ...f, garcomId: e.target.value }))}
                  className="t-select w-full text-sm px-3 py-2 rounded-lg cursor-pointer">
                  <option value="">Sem garçom</option>
                  {garcons.filter(g => g.status === "active").map(g => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </div>

              {/* Observação */}
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Observação
                </label>
                <input type="text" placeholder="Ex: sem cebola, alergia..." value={form.observacao}
                  onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                          {i.nome} — R$ {Number(i.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Fechar Conta</h2>
              <button onClick={() => setShowFechar(null)}
                className="t-muted hover:opacity-75 cursor-pointer text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-4">

              {/* Total */}
              <div className="t-inner rounded-lg p-4 text-center">
                <div className="t-muted text-xs mb-1">Total do pedido #{showFechar.id}</div>
                {showFechar.frete > 0 && (
                  <div className="t-muted text-xs mb-1">
                    Inclui frete R$ {Number(showFechar.frete).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                )}
                <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                  R$ {Number(showFechar.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Forma de pagamento */}
              {(!showFechar?.formaPagamento) && (
                <div>
                  <label className="t-muted block mb-2"
                    style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    Forma de pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "pix", label: "PIX", color: "#00F5A0" },
                      { value: "dinheiro", label: "Dinheiro", color: "#F59E0B" },
                      { value: "credito", label: "Cartão Crédito", color: "#B8A8FF" },
                      { value: "debito", label: "Cartão Débito", color: "#7C6AF5" },
                      { value: "vr", label: "VR", color: "#FF6B35" },
                      { value: "va", label: "VA", color: "#00D9F5" },
                      { value: "ticket", label: "Ticket", color: "#F472B6" },
                      { value: "transferencia", label: "Transferência", color: "#4ade80" },
                    ].map(f => (
                      <button key={f.value} onClick={() => setFormaPag(f.value)}
                        className="py-2.5 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer text-left"
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
              )}

              {showFechar?.formaPagamento && (
                <div className="t-inner rounded-lg p-3 flex items-center justify-between">
                  <span className="t-muted text-sm">Forma de pagamento</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    {formaConfig[showFechar.formaPagamento]?.label || showFechar.formaPagamento}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowFechar(null)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Cancelar
                </button>
                <button onClick={handleFechar}
                  className="flex-1 t-btn-primary text-sm py-2 rounded-lg cursor-pointer">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}