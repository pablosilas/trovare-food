import { useState, useEffect, useCallback } from "react";
import { X, Check, Ban, Bike, Armchair, Banknote, Rocket } from "lucide-react";
import api from "../services/api.js";
import EnderecoForm from "../components/EnderecoForm.jsx";


const statusConfig = {
  aberto: { label: "Aberto", bg: "#FF6B3515", color: "#FF6B35" },
  preparando: { label: "Preparando", bg: "#F59E0B15", color: "#F59E0B" },
  pronto: { label: "Pronto", bg: "#00F5A015", color: "#00F5A0" },
  aguardando_pagamento: { label: "Aguard. pagamento", bg: "#7C6AF515", color: "#7C6AF5" },
  cancelado: { label: "Cancelado", bg: "#FF3D6E15", color: "#FF3D6E" },
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
  nomeCliente: "", telefone: "",
  endereco: {
    cep: "", logradouro: "", numero: "",
    complemento: "", bairro: "", cidade: "", estado: "",
  },
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
  const [step, setStep] = useState(1);
  const [carrinho, setCarrinho] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState("");
  const [showCancelar, setShowCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  async function handleCancelar() {
    try {
      await api.patch(`/food/pedidos/${showCancelar.id}/cancelar`, {
        motivo: motivoCancelamento,
      });
      await fetchAll();
      setShowCancelar(null);
      setMotivoCancelamento("");
      if (selected?.id === showCancelar.id) setSelected(null);
    } catch (e) {
      console.error("Erro ao cancelar pedido:", e);
    }
  }

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

  function formatarEndereco(e) {
    const parts = [
      e.logradouro,
      e.numero ? `nº ${e.numero}` : "",
      e.complemento,
      e.bairro,
      e.cidade,
      e.estado,
      e.cep,
    ].filter(Boolean);
    return parts.join(", ");
  }

  async function handleNovoPedido() {
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      if (carrinho.length === 0) return;
      setStep(3);
      return;
    }

    // Step 3 — envia
    try {
      const { data: pedido } = await api.post("/food/pedidos", {
        ...form,
        endereco: formatarEndereco(form.endereco),
        frete: parsePrice(freteDisplay),
      });

      for (const item of carrinho) {
        await api.post(`/food/pedidos/${pedido.id}/itens`, {
          itemId: item.id,
          quantidade: item.quantidade,
          obs: item.obs || "",
        });
      }

      await fetchAll();
      setShowNew(false);
      setForm(emptyForm);
      setFreteDisplay("");
      setCarrinho([]);
      setStep(1);
    } catch (e) {
      console.error("Erro ao criar pedido:", e);
    }
  }

  function addItem(item) {
    setCarrinho(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { ...item, quantidade: 1 }];
    });
  }

  function removeItem(itemId) {
    setCarrinho(prev => {
      const exists = prev.find(i => i.id === itemId);
      if (exists?.quantidade > 1) return prev.map(i => i.id === itemId ? { ...i, quantidade: i.quantidade - 1 } : i);
      return prev.filter(i => i.id !== itemId);
    });
  }

  function getQtd(itemId) {
    return carrinho.find(i => i.id === itemId)?.quantidade || 0;
  }

  const totalCarrinho = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const catAtiva = cardapio.find(c => c.id === activeCat);
  const itensFiltrados = catAtiva?.itens.filter(i =>
    i.disponivel && i.nome.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
        <button onClick={() => {
          setForm(emptyForm);
          setFreteDisplay("");
          setCarrinho([]);
          setStep(1);
          if (cardapio.length > 0) setActiveCat(cardapio[0].id);
          setShowNew(true);
        }}
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
            { value: "aguardando_pagamento", label: "Aguard. pagamento", icon: Banknote },
            { value: "fechado", label: "Fechado" },
            { value: "cancelado", label: "Cancelados" },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer"
              style={{
                background: filter === f.value ? "var(--accent-bg)" : "transparent",
                color: filter === f.value ? "var(--accent)" : "var(--text-muted)",
                borderColor: filter === f.value ? "var(--accent-border)" : "var(--border)",
              }}>
              {f.icon && <f.icon className="w-3 h-3" />}
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
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded"
                            style={{ background: "#B8A8FF15", color: "#B8A8FF" }}>
                            <Bike className="w-3 h-3" /> Delivery
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

                  <div className="flex gap-2 flex-wrap mt-3 pt-3" style={{ borderTop: "0.5px solid var(--border-soft)" }}>
                    {p.status === "aberto" && (
                      <button onClick={e => { e.stopPropagation(); handleStatus(p.id, "preparando"); }}
                        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-all"
                        style={{
                          background: "#F59E0B",
                          color: "#fff",
                          border: "none",
                        }}>
                        Preparando
                      </button>
                    )}
                    {p.status === "preparando" && (
                      <button onClick={e => { e.stopPropagation(); handleStatus(p.id, "pronto"); }}
                        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-all"
                        style={{
                          background: "#00F5A0",
                          color: "#080810",
                          border: "none",
                        }}>
                        <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Pronto</span>
                      </button>
                    )}
                    {!["fechado", "aguardando_pagamento", "cancelado"].includes(p.status) && (
                      <button onClick={e => { e.stopPropagation(); setShowFechar(p); }}
                        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-all"
                        style={{
                          background: "var(--accent)",
                          color: "#fff",
                          border: "none",
                        }}>
                        Fechar conta
                      </button>
                    )}
                    {!["fechado", "cancelado", "aguardando_pagamento"].includes(p.status) && (
                      <button onClick={e => { e.stopPropagation(); setShowCancelar(p); }}
                        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium"
                        style={{ background: "#FF3D6E", color: "#fff", border: "none" }}>
                        Cancelar
                      </button>
                    )}
                    {p.status === "aguardando_pagamento" && (
                      <button onClick={e => { e.stopPropagation(); setShowFechar(p); }}
                        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium transition-all"
                        style={{
                          background: "var(--accent)",
                          color: "#fff",
                          border: "none",
                        }}>
                        <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> Registrar pagamento</span>
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
                <span className="t-muted text-xs ml-2 flex items-center gap-1">
                  {selected.origem === "delivery" && <Bike className="w-3 h-3" />}
                  {selected.origem === "delivery"
                    ? selected.nomeCliente || "Delivery"
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
                  className="t-muted cursor-pointer hover:opacity-75"><X className="w-4 h-4" /></button>
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
                        className="cursor-pointer hover:opacity-75"
                        style={{ color: "#FF3D6E" }}><X className="w-3 h-3" /></button>
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

      {/* Modal — Cancelar Pedido */}
      {showCancelar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="t-text text-sm font-semibold">Cancelar Pedido</h2>
              <button onClick={() => setShowCancelar(null)}
                className="t-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="t-inner rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Ban className="w-6 h-6" style={{ color: "#FF3D6E" }} />
                </div>
                <div className="t-text text-sm font-semibold">Pedido #{showCancelar.id}</div>
                <div className="t-muted text-xs mt-1">
                  {showCancelar.mesa ? `Mesa ${showCancelar.mesa.numero}` : showCancelar.nomeCliente || "Balcão"}
                </div>
                <div className="text-sm font-bold mt-2" style={{ color: "#FF3D6E" }}>
                  R$ {Number(showCancelar.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className="t-muted block mb-1"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Motivo (opcional)
                </label>
                <input type="text" placeholder="Ex: cliente desistiu, erro no pedido..."
                  value={motivoCancelamento}
                  onChange={e => setMotivoCancelamento(e.target.value)}
                  className="t-input w-full text-sm px-3 py-2 rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCancelar(null)}
                  className="flex-1 t-inner t-muted text-sm py-2 rounded-lg cursor-pointer t-hover">
                  Voltar
                </button>
                <button onClick={handleCancelar}
                  className="flex-1 text-sm py-2 rounded-lg cursor-pointer font-semibold"
                  style={{ background: "#FF3D6E", color: "#fff", border: "none" }}>
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Novo Pedido */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="t-modal rounded-xl w-full max-w-lg flex flex-col"
            style={{ maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4"
              style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div>
                <h2 className="t-text text-sm font-semibold">Novo Pedido</h2>
                <div className="t-muted text-xs mt-0.5"
                  style={{ fontFamily: "'Space Mono', monospace" }}>
                  Passo {step} de 3
                </div>
              </div>
              <div className="flex items-center gap-3">
                {carrinho.length > 0 && (
                  <div className="text-xs px-2 py-1 rounded-lg font-semibold"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                    {carrinho.reduce((s, i) => s + i.quantidade, 0)} itens
                  </div>
                )}
                <button onClick={() => { setShowNew(false); setStep(1); setCarrinho([]); }}
                  className="t-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Progress */}
            <div className="flex gap-1 px-6 py-3"
              style={{ borderBottom: "0.5px solid var(--border)" }}>
              {["Informações", "Cardápio", "Confirmar"].map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height: "3px", borderRadius: "2px", marginBottom: "4px",
                    background: step > i ? "var(--accent)" : "var(--border)",
                    transition: "background 0.3s",
                  }} />
                  <div className="t-faint text-[9px] uppercase tracking-wider"
                    style={{ fontFamily: "'Space Mono', monospace", color: step > i ? "var(--accent)" : "var(--text-faint)" }}>
                    {s}
                  </div>
                </div>
              ))}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* Step 1 — Informações */}
              {step === 1 && (
                <div className="flex flex-col gap-3">

                  {/* Tipo */}
                  <div>
                    <label className="t-muted block mb-2"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Tipo
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "local", icon: Armchair, label: "Local", desc: "Mesa ou balcão" },
                        { value: "delivery", icon: Bike, label: "Delivery", desc: "Entrega em domicílio" },
                      ].map(t => (
                        <button key={t.value} onClick={() => setForm(f => ({ ...f, origem: t.value }))}
                          className="py-3 px-3 rounded-lg text-left border transition-all cursor-pointer"
                          style={{
                            background: form.origem === t.value ? "var(--accent-bg)" : "var(--bg-tertiary)",
                            borderColor: form.origem === t.value ? "var(--accent-border)" : "var(--border)",
                          }}>
                          <div className="flex items-center gap-1.5 text-sm font-semibold"
                            style={{ color: form.origem === t.value ? "var(--accent)" : "var(--text-primary)" }}>
                            <t.icon className="w-4 h-4" />
                            {t.label}
                          </div>
                          <div className="t-muted text-xs mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Local */}
                  {form.origem === "local" && (
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
                        <label className="t-muted block mb-2"
                          style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                          Endereço de entrega
                        </label>
                        <EnderecoForm
                          value={form.endereco}
                          onChange={endereco => setForm(f => ({ ...f, endereco }))}
                          inputClass="t-input w-full text-sm px-3 py-2 rounded-lg"
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
                              className="py-2 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer text-left"
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

                  {/* Garçom */}
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
                    <input type="text" placeholder="Ex: cliente alérgico..." value={form.observacao}
                      onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                      className="t-input w-full text-sm px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Step 2 — Cardápio */}
              {step === 2 && (
                <div>
                  <input className="t-input w-full text-sm px-3 py-2 rounded-lg mb-3"
                    placeholder="Buscar item..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />

                  {/* Categorias */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {cardapio.map(cat => (
                      <button key={cat.id}
                        onClick={() => { setActiveCat(cat.id); setSearch(""); }}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0"
                        style={{
                          background: activeCat === cat.id ? "var(--accent-bg)" : "transparent",
                          color: activeCat === cat.id ? "var(--accent)" : "var(--text-muted)",
                          borderColor: activeCat === cat.id ? "var(--accent-border)" : "var(--border)",
                        }}>
                        {cat.nome}
                      </button>
                    ))}
                  </div>

                  {/* Itens */}
                  <div className="flex flex-col gap-2">
                    {itensFiltrados.length === 0 ? (
                      <div className="t-inner rounded-lg p-8 text-center">
                        <div className="t-muted text-sm">Nenhum item encontrado</div>
                      </div>
                    ) : (
                      itensFiltrados.map(item => {
                        const qtd = getQtd(item.id);
                        return (
                          <div key={item.id} className="t-inner rounded-lg p-3 flex items-center gap-3">
                            <div style={{ flex: 1 }}>
                              <div className="t-text text-sm font-medium">{item.nome}</div>
                              {item.descricao && (
                                <div className="t-muted text-xs">{item.descricao}</div>
                              )}
                              <div className="text-sm font-semibold mt-1" style={{ color: "var(--accent)" }}>
                                R$ {Number(item.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {qtd > 0 && (
                                <>
                                  <button onClick={() => removeItem(item.id)}
                                    className="w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center text-lg font-bold"
                                    style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}>
                                    −
                                  </button>
                                  <span className="text-sm font-bold w-5 text-center"
                                    style={{ color: "var(--accent)" }}>
                                    {qtd}
                                  </span>
                                </>
                              )}
                              <button onClick={() => addItem(item)}
                                className="w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center text-lg font-bold"
                                style={{ background: "var(--accent)", border: "none", color: "#fff" }}>
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Step 3 — Confirmar */}
              {step === 3 && (
                <div className="flex flex-col gap-3">

                  {/* Info */}
                  <div className="t-inner rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="t-muted text-sm">Tipo</span>
                      <span className="flex items-center gap-1.5 t-text text-sm font-semibold">
                        {form.origem === "local" ? <Armchair className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                        {form.origem === "local" ? "Local" : "Delivery"}
                      </span>
                    </div>
                    {form.origem === "local" && (
                      <div className="flex justify-between">
                        <span className="t-muted text-sm">Mesa</span>
                        <span className="t-text text-sm font-semibold">
                          {mesas.find(m => m.id === Number(form.mesaId))
                            ? `Mesa ${mesas.find(m => m.id === Number(form.mesaId)).numero}`
                            : "Balcão"}
                        </span>
                      </div>
                    )}
                    {form.origem === "delivery" && form.nomeCliente && (
                      <div className="flex justify-between">
                        <span className="t-muted text-sm">Cliente</span>
                        <span className="t-text text-sm font-semibold">{form.nomeCliente}</span>
                      </div>
                    )}
                    {form.garcomId && (
                      <div className="flex justify-between mt-2">
                        <span className="t-muted text-sm">Garçom</span>
                        <span className="t-text text-sm font-semibold">
                          {garcons.find(g => g.id === Number(form.garcomId))?.nome}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Itens */}
                  <div className="t-inner rounded-lg p-4">
                    <div className="t-faint text-[10px] uppercase tracking-wider mb-3"
                      style={{ fontFamily: "'Space Mono', monospace" }}>
                      Itens do pedido
                    </div>
                    {carrinho.map(item => (
                      <div key={item.id} className="flex justify-between items-center mb-3">
                        <div>
                          <div className="t-text text-sm font-medium">{item.nome}</div>
                          <div className="t-muted text-xs">
                            {item.quantidade}x · R$ {Number(item.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                          R$ {(item.quantidade * item.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3" style={{ borderTop: "0.5px solid var(--border)" }}>
                      <span className="t-text text-sm font-semibold">Total</span>
                      <span className="text-base font-bold" style={{ color: "var(--accent)" }}>
                        R$ {(totalCarrinho + parsePrice(freteDisplay)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: "0.5px solid var(--border)" }}>
              <button
                onClick={() => step > 1 ? setStep(step - 1) : setShowNew(false)}
                className="flex-1 t-inner t-muted text-sm py-2.5 rounded-lg cursor-pointer t-hover">
                {step === 1 ? "Cancelar" : "Voltar"}
              </button>
              <button
                onClick={handleNovoPedido}
                disabled={step === 2 && carrinho.length === 0}
                className="flex-2 t-btn-primary text-sm py-2.5 rounded-lg cursor-pointer"
                style={{
                  flex: 2,
                  opacity: step === 2 && carrinho.length === 0 ? 0.5 : 1,
                }}>
                {step === 1 ? "Próximo — Cardápio" :
                  step === 2 ? `Revisar · R$ ${totalCarrinho.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` :
                    <span className="flex items-center gap-1.5 justify-center">Abrir pedido <Rocket className="w-4 h-4" /></span>}
              </button>
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
                className="t-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
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
                className="t-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
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